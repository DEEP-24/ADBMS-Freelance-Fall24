import { TrashIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { OrderType, PaymentMethod } from "@prisma/client";
import type { ActionFunctionArgs, LoaderFunctionArgs, SerializeFrom } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Link, useFetcher, useLoaderData } from "@remix-run/react";
import * as React from "react";
import { toast } from "sonner";
import { TailwindContainer } from "~/components/TailwindContainer";
import { Button } from "~/components/ui/button";
import DatePicker from "~/components/ui/date-picker";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import type { StaffCartItem } from "~/context/StaffCartContext";
import { useStaffCart } from "~/context/StaffCartContext";
import { db } from "~/lib/db.server";
import { createOrder } from "~/lib/order.server";
import { getAllRestaurants } from "~/lib/restaurant.server";
import { requireUser } from "~/lib/session.server";
import { daysOfWeek, titleCase } from "~/utils/misc";
import { badRequest } from "~/utils/misc.server";

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  const user = await requireUser(request);
  const { custId } = params;

  if (!custId) {
    return redirect("/staff/customers");
  }

  const customer = await db.user.findFirst({
    where: {
      id: custId,
    },
  });

  if (!customer) {
    return redirect("/staff/customers");
  }

  const items = await db.item.findMany({
    where: {
      restaurantId: user?.foodTruckId as string,
    },
  });
  const foodTrucks = await getAllRestaurants();

  return json({ customer, items, foodTrucks });
};

type ActionData = Partial<{
  success: boolean;
  message: string;
}>;

export async function action({ request, params }: ActionFunctionArgs) {
  const formData = await request.formData();

  const { custId } = params;
  const intent = formData.get("intent")?.toString();

  if (!custId || !intent) {
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

      const products = JSON.parse(stringifiedProducts) as Array<StaffCartItem>;

      await createOrder({
        userId: custId,
        items: products,
        amount: Number(amount),
        paymentMethod: paymentMethod as PaymentMethod,
        orderType: orderType as OrderType,
        pickupDateTime: pickupDateTime ? new Date(pickupDateTime) : null,
      });

      return redirect("/staff/orders?success=true");
    }
  }
}

export default function CreateOrder() {
  const { customer, items } = useLoaderData<typeof loader>();
  const { clearCart } = useStaffCart();

  const [isOrderModalOpen, setIsOrderModalOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const filteredItems = React.useMemo(() => {
    if (!search) {
      return items;
    }

    return items.filter((item) => {
      return item.name.toLowerCase().includes(search.toLowerCase());
    });
  }, [search, items]);

  return (
    <>
      <TailwindContainer className="rounded-md">
        <div className="mt-2 px-4 py-10 sm:px-6 lg:px-8">
          <div className="sm:flex sm:flex-auto sm:items-center sm:justify-between">
            <div>
              <Button size="sm" color="blue">
                <Link to="..">Back</Link>
              </Button>
              <div className="flex flex-col gap-1 rounded-md border border-slate-500 p-2 mt-2">
                <h1 className="text-lg font-semibold text-gray-900">Customer</h1>
                <div className="mt-1 text-sm text-gray-600">
                  <p>
                    {customer.firstName} {customer.lastName}
                  </p>
                  <p>{customer.email}</p>
                  <p>{customer.phoneNo}</p>
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  placeholder="Search"
                  className="w-full sm:w-64"
                  value={search}
                  onChange={(e) => setSearch(e.currentTarget.value)}
                />
                {search && (
                  <Button color="blue" className="ml-2" onClick={() => setSearch("")}>
                    <XMarkIcon className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  className="bg-orange-500 text-white hover:bg-orange-400"
                  onClick={() => setIsOrderModalOpen(true)}
                >
                  View Order
                </Button>
                <Dialog open={isOrderModalOpen} onOpenChange={() => setIsOrderModalOpen(false)}>
                  <DialogContent>
                    <CartItems />
                  </DialogContent>
                </Dialog>
                <Button onClick={() => clearCart()} color="red">
                  Clear
                </Button>
              </div>
            </div>
          </div>
          <div className="mt-6 grid w-full grid-cols-2 gap-8">
            {filteredItems.map((item) => {
              return (
                <ItemRow item={item} openModal={() => setIsOrderModalOpen(true)} key={item.id} />
              );
            })}
          </div>
        </div>
      </TailwindContainer>
    </>
  );
}

function ItemRow({
  item,
  openModal,
}: {
  item: SerializeFrom<typeof loader>["items"][0];
  openModal: () => void;
}) {
  const { addItemToCart } = useStaffCart();
  const [quantity, setQuantity] = React.useState(1);

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuantity = Number.parseInt(e.target.value, 10);
    if (!Number.isNaN(newQuantity) && newQuantity > 0) {
      setQuantity(newQuantity);
    }
  };

  return (
    <div key={item.id} className="flex items-center gap-4">
      <div className="flex flex-1 items-center gap-4">
        <img
          src={item.image}
          alt={item.name}
          className="h-10 w-10 object-cover object-center rounded-lg shadow-lg overflow-hidden"
        />

        <div>
          <h3 className="text-sm text-gray-700">
            <Link to={item.slug} prefetch="intent">
              {item.name}
            </Link>
          </h3>

          <p className="mt-1 text-sm font-medium text-gray-900">${item.price}</p>
        </div>
      </div>
      <div className="grid w-full max-w-sm items-center gap-1.5">
        <Label htmlFor="quantity">Quantity</Label>
        <Input type="number" value={quantity} min={1} onChange={handleQuantityChange} />
      </div>
      <Button
        type="submit"
        onClick={() => {
          addItemToCart({
            ...item,
            quantity,
          });

          openModal();
        }}
      >
        Add
      </Button>
    </div>
  );
}

function PaymentButton() {
  const id = React.useId();
  const { foodTrucks } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<ActionData>();

  const { itemsInCart, totalPrice } = useStaffCart();

  const [orderType, setOrderType] = React.useState<OrderType>(OrderType.PICKUP);
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>(
    PaymentMethod.CREDIT_CARD,
  );
  const [pickupDate, setPickupDate] = React.useState<Date | null>(
    new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000),
  );
  const [pickupTime, setPickupTime] = React.useState<Date | null>(null);

  const [cardNumber, setCardNumber] = React.useState<string>("1234567891234567");
  const [cardExpiry, setCardExpiry] = React.useState<Date | null>(new Date("2026-12-31"));
  const [displayExpiryDate, setDisplayExpiryDate] = React.useState<string>("");
  const [cardCvv, setCardCvv] = React.useState<string>("123");
  const [errors, setErrors] = React.useState<{
    cardNumber?: string;
    cardExpiry?: string;
    cardCvv?: string;
  }>({
    cardNumber: "",
    cardExpiry: "",
    cardCvv: "",
  });

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
    if (isCashPayment) {
      setErrors({
        cardNumber: "",
        cardExpiry: "",
        cardCvv: "",
      });

      if (cardNumber.replace(/[_ ]/g, "").length !== 16) {
        setErrors((prevError) => ({
          ...prevError,
          cardNumber: "Card number must be 16 digits",
        }));
      }

      if (!cardExpiry) {
        setErrors((prevError) => ({
          ...prevError,
          cardExpiry: "Card expiry is required",
        }));
      }

      if (!cardCvv || cardCvv.length !== 3) {
        setErrors((prevError) => ({
          ...prevError,
          cardCvv: "Card CVV must be 3 digits",
        }));
      }

      if (Object.values(errors).some((error) => error !== "")) {
        return;
      }
    }

    const pickupDateTime =
      pickupDate && pickupTime
        ? new Date(pickupDate.setHours(pickupTime.getHours(), pickupTime.getMinutes(), 0, 0))
        : null;
    fetcher.submit(
      {
        "products[]": JSON.stringify(itemsInCart),
        amount: totalPrice.toString(),
        intent: "place-order",
        orderType,
        paymentMethod,
        pickupDate: pickupDate?.toISOString() ?? "",
        pickupTime: pickupDateTime?.toISOString() ?? "",
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

    if (!fetcher.data) {
      toast.error(fetcher.data);
      return;
    }
  }, [fetcher.data]);

  const isFoodTruckOpen = React.useMemo(() => {
    const currentFoodTruck = foodTrucks.find(
      (foodTruck) => foodTruck.id === itemsInCart[0]?.restaurantId,
    );

    if (!currentFoodTruck) {
      return false;
    }

    const selectedPickupDate = pickupDate ?? new Date();
    const selectedPickupTime = pickupTime ?? new Date();

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
      <Dialog>
        <DialogTrigger>
          <Button color="green" disabled={itemsInCart.length === 0}>
            Make payment
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            {!isFoodTruckOpen ? (
              <>
                <p className="text-sm text-red-500">
                  Food truck is currently closed for the pickup date time you've selected.
                </p>
              </>
            ) : null}

            <div className="flex flex-col gap-2">
              <h2 className="text-sm text-gray-600">
                <span className="font-semibold">Amount: </span>
                <span>${totalPrice}</span>
              </h2>
            </div>

            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="orderType">Order Type</Label>
              <Select
                name="orderType"
                value={orderType}
                onValueChange={(value) => setOrderType(value as OrderType)}
              >
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
                name="paymentMethod"
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
                </SelectContent>
              </Select>
            </div>

            {!isCashPayment && (
              <>
                <div className="grid w-full max-w-sm items-center gap-1.5">
                  <Label htmlFor={id}>Credit card number</Label>
                  <Input
                    id={id}
                    placeholder="XXXX XXXX XXXX XXXX"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                  />

                  {errors.cardNumber && <p className="text-sm text-red-500">{errors.cardNumber}</p>}
                </div>
                <div className="flex items-center gap-4">
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
              </div>
            </div>

            <DialogFooter>
              <div className="mt-6 flex items-center gap-4 sm:justify-end">
                <DialogClose>
                  <Button color="red">Cancel</Button>
                </DialogClose>

                <Button onClick={() => placeOrder()} disabled={!isFoodTruckOpen && isSubmitting}>
                  Place order
                </Button>
              </div>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CartItems() {
  const { itemsInCart, removeItemFromCart, totalPrice } = useStaffCart();

  return (
    <>
      {itemsInCart.map((item) => {
        const itemTotalPrice = item.price * item.quantity;

        return (
          <div key={item.id} className="flex justify-between p-5">
            <div className="flex items-center gap-3">
              <img
                src={item.image}
                alt={item.name}
                className="h-14 w-14 object-cover object-center rounded-full"
              />
              <p>{item.name}</p>
            </div>

            <div className="py-6 pr-8">(x{item.quantity})</div>
            <div className="py-6 pr-8 font-semibold">${itemTotalPrice.toFixed(2)}</div>
            <div className="flex items-center justify-center">
              <Button onClick={() => removeItemFromCart(item.id!)} variant="outline">
                <TrashIcon className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          </div>
        );
      })}

      <div className="h-1 w-30rem bg-gray-300" />

      <div className="flex items-center justify-between">
        <div className="mt-4 flex items-center gap-4">
          <span className="font-bold">Total</span>
          <span>${totalPrice.toFixed(2)}</span>
        </div>

        <div className="mt-4 flex items-center gap-4">
          <PaymentButton />
        </div>
      </div>
    </>
  );
}
