import { ArrowDownIcon, ArrowUpIcon } from "@heroicons/react/24/solid";
import { PaymentMethod } from "@prisma/client";
import { type ActionFunctionArgs, type LoaderFunctionArgs, json } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import React from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { db } from "~/lib/db.server";
import { requireUserId } from "~/lib/session.server";
import { formatDate, titleCase } from "~/utils/misc";
import { useFetcherCallback } from "~/utils/use-fetcher-callback";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const userId = await requireUserId(request);

  const wallet = await db.wallet.findUnique({
    where: {
      userId,
    },
    select: {
      balance: true,
      transactions: true,
    },
  });

  return json({ wallet });
};

type ActionData = Partial<{
  success: boolean;
  message: string;
}>;

export const action = async ({ request }: ActionFunctionArgs) => {
  const userId = await requireUserId(request);

  const formData = await request.formData();

  const amount = formData.get("amount");

  // Save the transaction
  await db.wallet.update({
    where: {
      userId,
    },
    data: {
      balance: {
        increment: Number(amount),
      },
      transactions: {
        create: {
          amount: Number(amount),
          type: "DEPOSIT",
        },
      },
    },
  });

  return json({ success: true, message: "Deposit successful" });
};

export default function Wallet() {
  const { wallet } = useLoaderData<typeof loader>();

  const fetcher = useFetcherCallback<ActionData>({
    onSuccess: () => {
      closePaymentModal();
    },
  });

  const [isPaymentModalOpen, setIsPaymentModalOpen] = React.useState(false);

  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>(
    PaymentMethod.CREDIT_CARD,
  );

  const id = React.useId();
  const [amount, setAmount] = React.useState<number>(0);
  const [cardHolderName, setCardHolderName] = React.useState<string>("");
  const [cardNumber, setCardNumber] = React.useState<string>("1234567891234567");
  const [cardExpiry, setCardExpiry] = React.useState<Date | null>(new Date("2026-12-31"));
  const [displayExpiryDate, setDisplayExpiryDate] = React.useState<string>("");
  const [cardCvv, setCardCvv] = React.useState<string>("123");
  const [errors, setErrors] = React.useState<{
    cardHolderName?: string;
    cardNumber?: string;
    cardExpiry?: string;
    cardCvv?: string;
    amount?: string;
  }>({});

  const closePaymentModal = () => {
    setIsPaymentModalOpen(false);
    setErrors({});
    resetForm();
  };

  const resetForm = () => {
    setAmount(0);
    setCardHolderName("");
    setCardNumber("");
    setCardExpiry(null);
    setDisplayExpiryDate("");
    setCardCvv("");
  };

  const showPaymentModal = () => setIsPaymentModalOpen(true);

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

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!amount || Number.parseFloat(amount.toString()) <= 0) {
      newErrors.amount = "Amount must be greater than 0";
    }

    if (!cardHolderName.trim()) {
      newErrors.cardHolderName = "Card holder name is required";
    }

    if (cardNumber.replace(/\s/g, "").length !== 16) {
      newErrors.cardNumber = "Card number must be 16 digits";
    }

    if (!cardExpiry) {
      newErrors.cardExpiry = "Card expiry is required";
    }

    if (!cardCvv || cardCvv.length !== 3) {
      newErrors.cardCvv = "Card CVV must be 3 digits";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onDeposit = () => {
    if (validateForm()) {
      fetcher.submit(
        {
          amount: amount,
        },
        {
          method: "post",
        },
      );
    }
  };

  return (
    <div className="container mx-auto p-4 px-40 h-full">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Wallet Balance</CardTitle>
            <CardDescription>Your current balance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              <span>${wallet?.balance.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Deposit Money</CardTitle>
            <CardDescription>Add funds to your wallet</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Button onClick={() => showPaymentModal()}>Deposit</Button>
            </div>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>Recent activity in your wallet</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              {(wallet?.transactions ?? []).length > 0 ? (
                wallet?.transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between py-4 border-b"
                  >
                    <div className="flex items-center">
                      {transaction.type === "DEPOSIT" ? (
                        <ArrowUpIcon className="mr-2 text-green-500" />
                      ) : (
                        <ArrowDownIcon className="mr-2 text-red-500" />
                      )}
                      <div>
                        <p className="font-medium">
                          {transaction.type === "DEPOSIT" ? "Deposit" : "Purchase"}
                        </p>
                        <p className="text-sm text-gray-500">{formatDate(transaction.createdAt)}</p>
                      </div>
                    </div>
                    <div
                      className={`font-bold ${
                        transaction.type === "DEPOSIT" ? "text-green-500" : "text-red-500"
                      }`}
                    >
                      {transaction.type === "DEPOSIT" ? "+" : "-"}${transaction.amount.toFixed(2)}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500">No transactions to show</p>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isPaymentModalOpen} onOpenChange={closePaymentModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deposit</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 p-6">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="amount">Amount</Label>
              <Input
                type="number"
                name="amount"
                value={amount}
                onChange={(e) => setAmount(Number.parseFloat(e.target.value))}
                required
              />

              {errors.amount && <p className="text-sm text-red-500">{errors.amount}</p>}
            </div>

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
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select
                value={paymentMethod}
                onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(PaymentMethod)
                    .filter((method) => method !== PaymentMethod.CASH)
                    .map((method) => (
                      <SelectItem key={method} value={method}>
                        {titleCase(method.replace(/_/g, " "))}
                      </SelectItem>
                    ))}
                </SelectContent>{" "}
              </Select>
            </div>

            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="cardNumber">Credit/Debit card Number</Label>
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
                {errors.cardExpiry && <p className="text-sm text-red-500">{errors.cardExpiry}</p>}
              </div>
            </div>

            <DialogFooter>
              <DialogClose>
                <Button variant="destructive" onClick={closePaymentModal}>
                  Cancel
                </Button>
              </DialogClose>

              <Button onClick={onDeposit}>Deposit</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
