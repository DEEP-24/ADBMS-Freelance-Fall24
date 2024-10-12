import { CheckCircleIcon, MinusCircleIcon, ShoppingCartIcon } from "@heroicons/react/24/solid";
import { OrderStatus, OrderType } from "@prisma/client";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigation, useSearchParams, useSubmit } from "@remix-run/react";
import { set } from "date-fns";
import * as React from "react";
import invariant from "tiny-invariant";
import { TailwindContainer } from "~/components/TailwindContainer";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useStaffCart } from "~/context/StaffCartContext";
import { db } from "~/lib/db.server";
import { requireUser } from "~/lib/session.server";
import { titleCase } from "~/utils/misc";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await requireUser(request);

  const orders = await db.order.findMany({
    where: {
      items: {
        some: {
          item: {
            restaurantId: user.foodTruckId!,
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    include: {
      invoice: true,
      items: {
        include: {
          item: true,
        },
      },
      user: true,
    },
  });

  return json({ orders });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();

  const intent = formData.get("intent")?.toString();
  invariant(intent, "Invalid intent");

  const orderId = formData.get("orderId")?.toString();
  invariant(orderId, "Invalid order id");

  switch (intent) {
    case "approve-order": {
      await db.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.PREPARING },
      });

      return json({ success: true });
    }

    case "reject-order": {
      await db.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.REJECTED },
      });

      return json({ success: true });
    }

    case "update-order-status": {
      const status = formData.get("status")?.toString();
      invariant(status, "Invalid status");

      await db.order.update({
        where: { id: orderId },
        data: { status: status as OrderStatus },
      });

      return json({ success: true });
    }

    default:
      return json({ success: false, message: "Invalid intent" }, { status: 400 });
  }
};

export default function Orders() {
  const { orders } = useLoaderData<typeof loader>();
  const transition = useNavigation();
  const submit = useSubmit();

  const [items, setProducts] = React.useState<(typeof orders)[number]["items"]>([]);
  const [modalOpen, setModalOpen] = React.useState(false);
  // const [isOpen, modalHandler] = useDisclosure(false, {
  //   onClose: () => setProducts([]),
  // });

  const isSubmitting = transition.state !== "idle";
  const [searchParams, setSearchParams] = useSearchParams();
  const { clearCart } = useStaffCart();

  React.useEffect(() => {
    const success = searchParams.get("success");
    if (success) {
      clearCart();
      setSearchParams({}, { replace: true });
      return;
    }
  }, [clearCart, searchParams, setSearchParams]);

  return (
    <>
      <TailwindContainer className="mt-16">
        <div className="px-4 sm:px-6 lg:px-8">
          <div>
            <div className="flex items-center justify-center">
              <h1 className="text-4xl font-semibold text-gray-900">Orders</h1>
            </div>
          </div>
          <div className="mt-8 flex flex-col">
            <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                <div className="shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                  {orders.length > 0 ? (
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th
                            scope="col"
                            className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                          >
                            Name
                          </th>
                          <th
                            scope="col"
                            className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                          >
                            Type
                          </th>
                          <th
                            scope="col"
                            className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                          >
                            Status
                          </th>
                          <th
                            scope="col"
                            className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                          >
                            Products
                          </th>
                          <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {orders.map((order) => {
                          const isPending = order.status === OrderStatus.PENDING;
                          const isCancelled = order.status === OrderStatus.CANCELLED;
                          const isRejected = order.status === OrderStatus.REJECTED;

                          const statusOptions =
                            order.type === OrderType.PICKUP
                              ? ["PREPARING", "READYFORPICKUP", "COMPLETED"]
                              : ["PREPARING", "DELIVERED", "COMPLETED"];
                          const isOrderCompleted = order.status === "COMPLETED";

                          const isOrderDelivered = order.status === OrderStatus.DELIVERED;

                          return (
                            <tr key={order.id}>
                              <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                                <div className="font-medium text-gray-900">
                                  {order.user.firstName} {order.user.lastName}
                                </div>
                                <div className="text-gray-500">{order.user.email}</div>
                              </td>

                              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                <div className="text-gray-900">{titleCase(order.type)}</div>
                                <div className="text-gray-500">
                                  (
                                  {order.invoice?.paymentMethod
                                    ? order.invoice?.paymentMethod.replace("_", " ")
                                    : "-"}
                                  )
                                </div>
                              </td>
                              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                <Badge
                                  className={
                                    isPending
                                      ? "bg-gray-500 text-white hover:bg-gray-500"
                                      : isCancelled
                                        ? "bg-indigo-500 text-white hover:bg-indigo-500"
                                        : isRejected
                                          ? "bg-red-500 text-white hover:bg-red-500"
                                          : "bg-green-500 text-white hover:bg-green-500"
                                  }
                                >
                                  {titleCase(order.status)}
                                </Badge>
                              </td>
                              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                <Button
                                  onClick={() => {
                                    setProducts(order.items);
                                    setModalOpen(true);
                                  }}
                                >
                                  View all
                                </Button>
                              </td>
                              <td className="relative flex items-center justify-center whitespace-nowrap py-4 pl-3 pr-4 text-sm font-medium sm:pr-6">
                                <div className="flex items-center gap-2">
                                  {isPending ? (
                                    <>
                                      <Button
                                        className="bg-green-500 hover:bg-green-600"
                                        color="green"
                                        disabled={isSubmitting || !isPending}
                                        onClick={() =>
                                          submit(
                                            {
                                              intent: "approve-order",
                                              orderId: order.id,
                                            },
                                            {
                                              method: "post",
                                              replace: true,
                                            },
                                          )
                                        }
                                      >
                                        <CheckCircleIcon className="h-6" />
                                      </Button>
                                      <Button
                                        className="bg-red-500 hover:bg-red-600"
                                        color="red"
                                        type="submit"
                                        name="intent"
                                        value="reject-order"
                                        disabled={isSubmitting || !isPending}
                                        onClick={() => {
                                          submit(
                                            {
                                              intent: "reject-order",
                                              orderId: order.id,
                                            },
                                            {
                                              method: "post",
                                              replace: true,
                                            },
                                          );
                                        }}
                                      >
                                        <MinusCircleIcon className="h-7" />
                                      </Button>
                                    </>
                                  ) : !isRejected &&
                                    !isCancelled &&
                                    !isOrderDelivered &&
                                    !isOrderCompleted ? (
                                    <Select
                                      defaultValue={order.status}
                                      onValueChange={(value) => {
                                        submit(
                                          {
                                            intent: "update-order-status",
                                            orderId: order.id,
                                            status: value,
                                          },
                                          {
                                            method: "post",
                                            replace: true,
                                          },
                                        );
                                      }}
                                    >
                                      <SelectTrigger className="w-48">
                                        <SelectValue placeholder="Select status" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {statusOptions.map((status) => (
                                          <SelectItem key={status} value={status}>
                                            {status}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="relative block w-full rounded-lg border-2 border-dashed border-gray-300 bg-white p-12 text-center">
                      <ShoppingCartIcon className="mx-auto h-9 w-9 text-gray-500" />
                      <span className="mt-4 block text-sm font-medium text-gray-500">
                        No orders placed yet. <br />
                        Come back later.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </TailwindContainer>

      <Dialog open={modalOpen && items.length > 0} onOpenChange={() => setModalOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Products</DialogTitle>
          </DialogHeader>
          <table className="mt-4 w-full text-gray-500 sm:mt-6">
            <caption className="sr-only">Ice-cream</caption>
            <thead className="sr-only text-left text-sm text-gray-500 sm:not-sr-only">
              <tr>
                <th scope="col" className="py-3 pr-8 font-normal sm:w-2/5 lg:w-1/3">
                  Item
                </th>
                <th scope="col" className="hidden w-1/5 py-3 pr-8 font-normal sm:table-cell">
                  Quantity
                </th>
                <th scope="col" className="hidden py-3 pr-8 font-normal sm:table-cell">
                  Price
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 border-b border-gray-200 text-sm sm:border-t">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="py-6 pr-8">
                    <div className="flex items-center">
                      <img
                        src={item.item.image}
                        alt={item.item.name}
                        className="mr-6 h-16 w-16 rounded object-cover object-center"
                      />
                      <div className="flex flex-col">
                        <div className="font-medium text-gray-900">{item.item.name}</div>
                      </div>
                    </div>
                  </td>

                  <td className="hidden py-6 pr-8 sm:table-cell">{item.quantity}</td>

                  <td className="hidden py-6 pr-8 sm:table-cell">
                    ${(item.item.price * item.quantity).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DialogContent>
      </Dialog>
    </>
  );
}
