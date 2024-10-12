import { ShoppingCartIcon, TrashIcon } from "@heroicons/react/24/solid";
import type { FoodTruck } from "@prisma/client";
import { OrderType, PaymentMethod } from "@prisma/client";
import { DialogTitle } from "@radix-ui/react-dialog";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Link, useFetcher, useLoaderData } from "@remix-run/react";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import DatePicker from "~/components/ui/date-picker";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import TimePickerInput from "~/components/ui/time-picker-input";
import type { CartItem } from "~/context/CartContext";
import { useCart } from "~/context/CartContext";
import { db } from "~/lib/db.server";
import { createOrder } from "~/lib/order.server";
import { requireUserId } from "~/lib/session.server";
import { useAppData } from "~/utils/hooks";
import { daysOfWeek, titleCase } from "~/utils/misc";
import { badRequest } from "~/utils/misc.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const userId = await requireUserId(request, request.url);

  const wallet = await db.wallet.findUnique({
    where: { userId },
    select: { balance: true },
  });

  return json({ wallet });
};

type ActionData = Partial<{
  success: boolean;
  message: string;
}>;

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();

  const userId = await requireUserId(request, request.url);

  const intent = formData.get("intent")?.toString();

  if (!intent) {
    return json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  switch (intent) {
    case "place-order": {
      const stringifiedProducts = formData.get("products[]")?.toString();
      const amount = formData.get("amount")?.toString();
      const orderType = formData.get("orderType")?.toString();
      const paymentMethod = formData.get("paymentMethod")?.toString();
      const pickupDateTime = formData.get("pickupTime")?.toString();

      if (!stringifiedProducts || !amount || !paymentMethod || !orderType) {
        return badRequest<ActionData>({
          success: false,
          message: "Invalid request body",
        });
      }

      if (orderType === OrderType.PICKUP && !pickupDateTime) {
        return badRequest<ActionData>({
          success: false,
          message: "Pickup time is required for pickup",
        });
      }

      const products = JSON.parse(stringifiedProducts) as Array<CartItem>;

      await createOrder({
        userId,
        items: products,
        amount: Number(amount),
        paymentMethod: paymentMethod as PaymentMethod,
        orderType: orderType as OrderType,
        pickupDateTime: pickupDateTime ? new Date(pickupDateTime) : null,
      });

      return redirect("/order-history/?success=true");
    }
  }
}

export default function Cart() {
  const id = React.useId();
  const { foodTrucks } = useAppData();
  const fetcher = useFetcher<ActionData>();
  const { wallet } = useLoaderData<typeof loader>();

  const { clearCart, itemsInCart, totalPrice } = useCart();

  const [orderType, setOrderType] = React.useState<OrderType>(OrderType.PICKUP);
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>(
    PaymentMethod.CREDIT_CARD,
  );
  const [pickupDate, setPickupDate] = React.useState<Date | null>(
    new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000),
  );
  const [pickupTime, setPickupTime] = React.useState<Date | null>(null);

  const [cardHolderName, setCardHolderName] = React.useState<string>("");
  const [isPaymentModalOpen, setIsPaymentModalOpen] = React.useState(false);
  const [cardNumber, setCardNumber] = React.useState<string>();
  const [cardExpiry, setCardExpiry] = React.useState<Date | null>();
  const [displayExpiryDate, setDisplayExpiryDate] = React.useState<string>("");
  const [cardCvv, setCardCvv] = React.useState<string>();
  const [errors, setErrors] = React.useState<{
    cardHolderName?: string;
    cardNumber?: string;
    cardExpiry?: string;
    cardCvv?: string;
    wallet?: string;
    pickup?: string;
  }>({});

  const closePaymentModal = () => {
    setIsPaymentModalOpen(false);
    setErrors({});
  };
  const showPaymentModal = () => setIsPaymentModalOpen(true);

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!pickupDate) {
      newErrors.pickup = "Pickup date is  required";
    } else if (!pickupTime) {
      newErrors.pickup = "Pickup time is required";
    }

    if (paymentMethod === PaymentMethod.WALLET) {
      if ((wallet?.balance ?? 0) < totalPrice) {
        newErrors.wallet = "Insufficient wallet balance";
      }
    } else if (paymentMethod === PaymentMethod.CASH) {
      // No additional validation needed for cash payments
    } else {
      // Credit/Debit card validation
      if (!cardHolderName.trim()) {
        newErrors.cardHolderName = "Card holder name is required";
      }
      if (cardNumber?.replace(/[_ ]/g, "").length !== 16) {
        newErrors.cardNumber = "Card number must be 16 digits";
      }
      if (!cardExpiry) {
        newErrors.cardExpiry = "Card expiry is required";
      }
      if (!cardCvv || cardCvv.length !== 3) {
        newErrors.cardCvv = "Card CVV must be 3 digits";
      }
    }

    return newErrors;
  };

  const handleExpiryDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value.replace(/\D/g, "");
    if (input.length > 4) {
      input = input.slice(0, 4);
    }

    let formattedValue = "";
    if (input.length > 0) {
      let month = input.slice(0, 2);
      if (month.length === 1 && Number.parseInt(month) > 1) {
        month = `0${month}`;
      }
      formattedValue = month;
      if (input.length > 2) {
        formattedValue += `/${input.slice(2)}`;
      }
    }

    setDisplayExpiryDate(formattedValue);

    let newDateValue: Date | null = null;

    // Parse the input into a Date object
    if (input.length === 4) {
      const month = Number.parseInt(input.slice(0, 2)) - 1; // JS months are 0-indexed
      const year = Number.parseInt(`20${input.slice(2)}`);
      const date = new Date(year, month);

      // Validate the date
      if (date.getMonth() === month && date.getFullYear() === year) {
        newDateValue = date;
      }
    }

    setCardExpiry(newDateValue);
  };

  const placeOrder = () => {
    const formErrors = validateForm();

    console.log("FormErrors", formErrors);

    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    const pickupDateTime =
      pickupDate && pickupTime
        ? new Date(pickupDate.setHours(pickupTime.getHours(), pickupTime.getMinutes(), 0, 0))
        : null;

    if (!pickupDateTime) {
      setErrors({ pickup: "Pickup date and time are required" });
      return;
    }

    console.log("Order details:", {
      products: itemsInCart,
      amount: totalPrice,
      orderType,
      paymentMethod,
      pickupDate: pickupDate?.toISOString(),
      pickupTime: pickupDateTime.toISOString(),
    });

    fetcher.submit(
      {
        "products[]": JSON.stringify(itemsInCart),
        amount: totalPrice.toString(),
        intent: "place-order",
        orderType,
        paymentMethod,
        pickupDate: pickupDate?.toISOString() ?? "",
        pickupTime: pickupDateTime.toISOString(),
      },
      {
        method: "post",
      },
    );
  };

  const isSubmitting = fetcher.state !== "idle";

  React.useEffect(() => {
    if (fetcher.data !== "done") {
      return;
    }

    if (!fetcher.data.success) {
      toast.error(fetcher.data.message);
      return;
    }
  }, [fetcher.data]);

  const isFoodTruckOpen = React.useMemo(() => {
    const currentFoodTruck = foodTrucks.find(
      (foodTruck: FoodTruck) => foodTruck.id === itemsInCart[0]?.restaurantId,
    );

    if (!currentFoodTruck) {
      return false;
    }

    const selectedPickupDate = pickupDate ?? new Date();
    const selectedPickupTime = pickupTime ?? new Date();

    // console.log("selectedPickupDate", selectedPickupDate);
    // console.log("selectedPickupTime", selectedPickupTime);

    const pickupDay = selectedPickupDate.getDay();
    const pickupDateTime = new Date(
      selectedPickupDate.getFullYear(),
      selectedPickupDate.getMonth(),
      selectedPickupDate.getDate(),
      selectedPickupTime.getHours(),
      selectedPickupTime.getMinutes(),
    );

    return currentFoodTruck.schedule.some(({ day, startTime, endTime }) => {
      const foodTruckDayNumber = daysOfWeek.indexOf(day);

      const foodTruckOpenTime = new Date(
        selectedPickupDate.getFullYear(),
        selectedPickupDate.getMonth(),
        selectedPickupDate.getDate(),
        new Date(startTime).getHours(),
        new Date(startTime).getMinutes(),
      );
      const foodTruckCloseTime = new Date(
        selectedPickupDate.getFullYear(),
        selectedPickupDate.getMonth(),
        selectedPickupDate.getDate(),
        new Date(endTime).getHours(),
        new Date(endTime).getMinutes(),
      );

      return (
        pickupDay === foodTruckDayNumber &&
        pickupDateTime.getTime() >= foodTruckOpenTime.getTime() &&
        pickupDateTime.getTime() <= foodTruckCloseTime.getTime()
      );
    });
  }, [foodTrucks, itemsInCart, pickupDate, pickupTime]);

  const isCashPayment = paymentMethod === PaymentMethod.CASH;

  return (
    <>
      <div className="flex flex-col gap-4 p-4 px-40 min-h-screen">
        <div className="bg-white">
          <div className="px-4 py-7 sm:px-4">
            <div className="mt-8">
              <div className="flex flex-col gap-12">
                {itemsInCart.length > 0 ? <CartItems /> : <EmptyState />}
              </div>
            </div>
            <div className="mt-3 flex items-center justify-end">
              {itemsInCart.length > 0 ? (
                <div className="space-x-2">
                  <Button
                    color="red"
                    onClick={() => clearCart()}
                    disabled={isSubmitting}
                    variant="destructive"
                  >
                    Clear cart
                  </Button>

                  <Button
                    onClick={() => showPaymentModal()}
                    variant="default"
                    className="bg-orange-500 text-white hover:bg-orange-400"
                  >
                    PROCEED TO CHECKOUT
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isPaymentModalOpen} onOpenChange={closePaymentModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 p-6">
            {!isFoodTruckOpen ? (
              <div>
                <p className="text-sm text-red-500">
                  Food truck is currently closed for the pickup date time you've selected.
                </p>
              </div>
            ) : null}

            <div className="flex flex-col gap-2">
              <h2 className="text-sm text-gray-600">
                <span className="font-semibold">Amount: </span>
                <span className="font-bold">${totalPrice}</span>
              </h2>
            </div>

            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="orderType">Order type</Label>
              <Select value={orderType} onValueChange={(value) => setOrderType(value as OrderType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select order type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(OrderType).map((type) => (
                    <SelectItem key={type} value={type}>
                      {titleCase(type.replace(/_/g, " "))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select
                value={paymentMethod}
                onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(PaymentMethod).map((method) => (
                    <SelectItem key={method} value={method}>
                      {titleCase(method.replace(/_/g, " "))}
                    </SelectItem>
                  ))}
                </SelectContent>{" "}
              </Select>

              {paymentMethod === PaymentMethod.WALLET && (
                <div className="text-sm">
                  <p>Wallet Balance: ${wallet?.balance.toFixed(2)}</p>
                  {errors.wallet && <p className="text-red-500">{errors.wallet}</p>}
                </div>
              )}
            </div>

            {!isCashPayment && paymentMethod !== PaymentMethod.WALLET && (
              <>
                <div className="grid w-full max-w-sm items-center gap-1.5">
                  <Label htmlFor="cardHolderName">Card Holder Name</Label>
                  <Input
                    type="text"
                    name="cardHolderName"
                    value={cardHolderName}
                    onChange={(e) => setCardHolderName(e.target.value)}
                    required
                  />
                  {errors.cardHolderName && (
                    <p className="text-sm text-red-500">{errors.cardHolderName}</p>
                  )}
                </div>

                <div className="grid w-full max-w-sm items-center gap-1.5">
                  <Label htmlFor="cardNumber">Credit card Number</Label>
                  <Input
                    id={id}
                    placeholder="XXXX XXXX XXXX XXXX"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                  />
                  {errors.cardNumber && <p className="text-sm text-red-500">{errors.cardNumber}</p>}
                </div>

                <div className="flex items-center justify-center gap-4">
                  <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Label htmlFor="cvv">CVV</Label>
                    <Input
                      id={`${id}cvv`}
                      name="cvv"
                      placeholder="XXX"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                    />
                    {errors.cardCvv && <p className="text-sm text-red-500">{errors.cardCvv}</p>}
                  </div>

                  <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Label htmlFor="expiryDate">Expiry Date</Label>
                    <Input
                      type="text"
                      value={displayExpiryDate}
                      onChange={handleExpiryDateChange}
                      placeholder="MM/YY"
                      maxLength={5}
                    />
                    {errors.cardExpiry && (
                      <p className="text-sm text-red-500">{errors.cardExpiry}</p>
                    )}

                    {/* {cardExpiry && <p>Selected Date: {cardExpiry.toLocaleDateString()}</p>}
                    {displayExpiryDate.length === 5 && !cardExpiry && <p>Invalid date</p>} */}
                  </div>
                </div>
              </>
            )}

            <div className="flex items-center justify-center gap-4">
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label>Pickup Date</Label>
                <DatePicker
                  value={pickupDate || undefined}
                  onChange={(date) => setPickupDate(date || null)}
                  className="w-full"
                />
              </div>

              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="pickupTime">Pickup Time</Label>
                <TimePickerInput
                  value={pickupTime}
                  onChange={(time) => setPickupTime(time)}
                  date={pickupDate}
                />

                {errors.pickup && <p className="text-sm text-red-500">{errors.pickup}</p>}
              </div>
            </div>

            <DialogFooter className="mt-14 flex items-center gap-4 justify-between">
              <DialogClose>
                <Button variant="destructive" onClick={() => closePaymentModal()}>
                  Cancel
                </Button>
              </DialogClose>

              <Button
                onClick={() => {
                  console.log("Place order button clicked");
                  placeOrder();
                }}
                disabled={!isFoodTruckOpen}
              >
                Place order
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CartItems() {
  const { itemsInCart, removeItemFromCart, totalPrice, updateItemQuantity } = useCart();

  const handleQuantityChange = (itemId: string, quantity: number) => {
    if (quantity < 1) {
      removeItemFromCart(itemId);
    } else {
      updateItemQuantity(itemId, quantity);
    }
  };

  return (
    <>
      <table className="mt-4 w-full text-gray-500 sm:mt-6">
        <thead className="sr-only text-left text-sm text-gray-500 sm:not-sr-only">
          <tr>
            <th scope="col" className="py-3 pr-8 font-normal sm:w-2/5 lg:w-1/3">
              Products
            </th>
            <th scope="col" className="hidden py-3 pr-8 font-normal sm:table-cell">
              Quantity
            </th>
            <th scope="col" className="hidden py-3 pr-8 font-normal sm:table-cell">
              Price
            </th>

            <th scope="col" className="w-0 py-3 text-right font-normal" />
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-200 text-sm sm:border-t">
          {itemsInCart.map((item) => {
            const itemTotalPrice = item.price * item.quantity;

            return (
              <tr key={item.id}>
                <td className="py-6 pr-8">
                  <div className="flex items-center">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="mr-6 h-16 w-16 rounded object-cover object-center"
                    />
                    <div>
                      <div className="flex flex-col font-medium text-gray-900">
                        <Link to={`/items/${item.slug}`}>{item.name}</Link>
                      </div>
                    </div>
                  </div>
                </td>

                <td className="hidden items-center justify-center  py-6 pr-8 sm:table-cell">
                  <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      type="number"
                      value={item.quantity}
                      min={1}
                      onChange={(e) =>
                        handleQuantityChange(item.id as string, Number(e.target.value))
                      }
                    />
                  </div>
                </td>
                <td className="hidden py-6 pr-8 font-semibold sm:table-cell">
                  ${itemTotalPrice.toFixed(2)}
                </td>
                <td className="whitespace-nowrap py-6 text-right font-medium">
                  <Button onClick={() => removeItemFromCart(item.id!)} variant="outline">
                    <TrashIcon className="h-4 w-4 text-red-500" />
                  </Button>
                </td>
              </tr>
            );
          })}
          <tr>
            <td className="py-6 pr-8">
              <div className="flex items-center">
                <div>
                  <div className="font-medium text-gray-900" />
                  <div className="mt-1 sm:hidden" />
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div className="flex items-center justify-end">
        <div className="flex flex-col items-center justify-center">
          <h1 className="mb-3 text-2xl font-semibold">Cart Totals</h1>
          <div className="flex items-center justify-between gap-10 border-t p-4">
            <span className="text-lg font-medium text-gray-500">Total</span>
            <span className="text-lg font-semibold text-gray-700">${totalPrice.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </>
  );
}

function EmptyState() {
  return (
    <div className="relative block w-full rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
      <ShoppingCartIcon className="mx-auto h-9 w-9 text-gray-500" />
      <span className="mt-4 block text-sm font-medium text-gray-500">Your cart is empty</span>
    </div>
  );
}
