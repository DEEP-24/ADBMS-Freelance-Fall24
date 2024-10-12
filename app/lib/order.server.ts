import { type Invoice, type Order, type OrderType, PaymentMethod, type User } from "@prisma/client";
import { OrderStatus } from "@prisma/client";
import type { CartItem } from "~/context/CartContext";
import { db } from "~/lib/db.server";

export function getOrders(userId: User["id"]) {
  return db.order.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      invoice: true,
      id: true,
      status: true,
      pickupDateTime: true,
      items: {
        include: {
          item: true,
        },
      },
      feedback: true,
      createdAt: true,
    },
  });
}

export function createOrder({
  userId,
  items,
  amount,
  orderType,
  paymentMethod,
  pickupDateTime,
}: {
  userId: User["id"];
  items: Array<CartItem>;
  amount: Invoice["amount"];
  paymentMethod: PaymentMethod;
  orderType: OrderType;
  pickupDateTime: Order["pickupDateTime"];
}) {
  return db.$transaction(async (tx) => {
    // If payment method is wallet, check balance and deduct amount
    if (paymentMethod === PaymentMethod.WALLET) {
      const wallet = await tx.wallet.findUnique({
        where: { userId },
        select: { id: true, balance: true },
      });

      if (!wallet) {
        throw new Error("Wallet not found");
      }

      if (wallet.balance < amount) {
        throw new Error("Insufficient wallet balance");
      }

      // Deduct amount from wallet
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: amount } },
      });

      // Create a wallet transaction record
      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          amount: -amount,
          type: "PAYMENT",
        },
      });
    }

    // Create the order
    const order = await tx.order.create({
      data: {
        userId,
        type: orderType,
        status: OrderStatus.PENDING,
        pickupDateTime,
        items: {
          createMany: {
            data: items.map((item) => ({
              itemId: item.id,
              quantity: item.quantity,
            })),
          },
        },
        invoice: {
          create: {
            amount,
            totalAmount: amount,
            paymentMethod,
          },
        },
      },
    });

    return order;
  });
}

export async function cancelOrder(orderId: Order["id"]) {
  const order = await db.order.findUnique({
    where: {
      id: orderId,
    },
    include: {
      items: {
        include: {
          item: true,
        },
      },
    },
  });

  if (!order) {
    throw new Error("Order not found");
  }

  return db.order.update({
    where: {
      id: orderId,
    },
    data: {
      status: OrderStatus.CANCELLED,
    },
  });
}
