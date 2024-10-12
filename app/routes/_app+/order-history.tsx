import { ShoppingBagIcon } from "@heroicons/react/24/outline";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import { OrderStatus } from "@prisma/client";
import type { ActionFunctionArgs, LoaderFunctionArgs, SerializeFrom } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useFetcher, useLoaderData, useSearchParams } from "@remix-run/react";
import * as React from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { useCart } from "~/context/CartContext";
import { db } from "~/lib/db.server";
import { cancelOrder, getOrders } from "~/lib/order.server";
import { requireUserId } from "~/lib/session.server";
import { formatDate, formatTime, titleCase } from "~/utils/misc";
import { badRequest, unauthorized } from "~/utils/misc.server";

const dateFormatter = new Intl.DateTimeFormat("en-US");

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const userId = await requireUserId(request);
  const orders = await getOrders(userId);
  return json({ orders });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const userId = await requireUserId(request);
  const formData = await request.formData();

  const intent = formData.get("intent")?.toString();
  if (!userId || !intent) {
    return unauthorized({ success: false, message: "Unauthorized" });
  }

  switch (intent) {
    case "cancel-order": {
      const orderId = formData.get("orderId")?.toString();
      if (!orderId) {
        return badRequest({ success: false, message: "Invalid order id" });
      }

      return cancelOrder(orderId)
        .then(() => json({ success: true }))
        .catch((e) => json({ success: false, message: e.message }, { status: 500 }));
    }

    case "publish-feedback": {
      const orderId = formData.get("orderId")?.toString();
      const feedback = formData.get("feedback")?.toString();
      if (!orderId || !feedback) {
        return badRequest({ success: false, message: "Invalid order id" });
      }

      await db.order.update({
        where: { id: orderId },
        data: { feedback },
      });

      return json({ success: true });
    }

    default:
      return badRequest({ success: false, message: "Invalid intent" });
  }
};
export default function OrderHistory() {
  const { orders } = useLoaderData<typeof loader>();

  const [searchParams, setSearchParams] = useSearchParams();
  const { clearCart } = useCart();

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
      <div className="md:max-w-full h-full">
        <div className="p-2 ">
          <div className="mt-16">
            <h2 className="sr-only">Recent orders</h2>
            <div className="mx-auto max-w-7xl sm:px-2 lg:px-8">
              <div className="mx-auto max-w-2xl space-y-8 sm:px-4 lg:max-w-full lg:px-0">
                {orders.length > 0 ? (
                  <>
                    {orders.map((order) => (
                      <Order order={order} key={order.id} />
                    ))}
                  </>
                ) : (
                  <EmptyState />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function EmptyState() {
  return (
    <div className="relative block w-full rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
      <ShoppingBagIcon className="mx-auto h-9 w-9 text-gray-500" />
      <span className="mt-4 block text-sm font-medium text-gray-500">No previous orders</span>
    </div>
  );
}

function Order({
  order,
}: {
  order: SerializeFrom<typeof loader>["orders"][number];
}) {
  const cancelOrder = useFetcher();
  // const feedbackFetcher = useFetcher();
  // const [feedback, setFeedback] = React.useState("");

  // const isCancellingOrder = cancelOrder.state !== "idle";
  // const isSubmittingFeedback = feedbackFetcher.state !== "idle";

  const isOrderPending = order.status === OrderStatus.PENDING;
  const isOrderCancelled = order.status === OrderStatus.CANCELLED;
  const isOrderRejected = order.status === OrderStatus.REJECTED;
  const isOrderFulfilled =
    order.status === OrderStatus.READY || order.status === OrderStatus.DELIVERED;
  const isOrderInProgress =
    !isOrderPending && !isOrderCancelled && !isOrderRejected && !isOrderFulfilled;

  // React.useEffect(() => {
  //   if (!feedbackFetcher.data || feedbackFetcher.state !== "idle") {
  //     return;
  //   }

  //   handleFeedbackModal.close();
  // }, [feedbackFetcher.data, feedbackFetcher.state, handleFeedbackModal]);

  return (
    <>
      <div className="border-t border-b border-gray-200 bg-white shadow-sm sm:rounded-lg sm:border">
        <h3 className="sr-only">
          Order placed on{" "}
          <time dateTime={order.createdAt}>{dateFormatter.format(new Date(order.createdAt))}</time>
        </h3>

        <div className="flex items-center justify-between py-6 px-4 sm:gap-6 sm:px-6 lg:gap-8">
          <dl className="flex items-center gap-8">
            <div>
              <dt className="font-medium text-gray-900">Transaction Id</dt>
              <dd className="mt-1 text-gray-500">{order.invoice?.id.slice(-6).toUpperCase()}</dd>
            </div>

            <div>
              <dt className="font-medium text-gray-900">Order number</dt>
              <dd className="mt-1 text-gray-500">{order.id.slice(-6).toUpperCase()}</dd>
            </div>

            <div className="hidden sm:block">
              <dt className="font-medium text-gray-900">Date placed</dt>
              <dd className="mt-1 text-gray-500">
                <time dateTime={order.createdAt}>
                  {dateFormatter.format(new Date(order.createdAt))}
                </time>
              </dd>
            </div>

            <div>
              <dt className="font-medium text-gray-900">Total amount</dt>
              <dd className="mt-1 font-medium text-gray-900">
                {order.status === OrderStatus.CANCELLED ? (
                  <span>
                    <s>${order.invoice?.amount.toFixed(2)}</s> $0
                  </span>
                ) : (
                  `$${order.invoice?.amount.toFixed(2)}`
                )}
              </dd>
            </div>

            <div className="flex justify-between pt-6 text-gray-900 sm:block sm:pt-0">
              <dt className="font-medium text-gray-900">Status</dt>
              <dd className="mt-1 font-medium text-gray-900">
                <Badge
                  className={
                    isOrderPending
                      ? "bg-blue-500 hover:bg-blue-500"
                      : isOrderCancelled
                        ? "bg-red-500 hover:bg-red-500"
                        : isOrderRejected
                          ? "bg-red-500 hover:bg-red-500"
                          : "bg-green-500 hover:bg-green-500"
                  }
                >
                  {titleCase(order.status)}
                </Badge>
              </dd>
            </div>

            <div className="flex justify-between pt-6 text-gray-900 sm:block sm:pt-0">
              <dt className="font-medium text-gray-900">Pickup Date</dt>
              <dd className="mt-1 font-medium text-gray-500">
                {formatDate(order.pickupDateTime as string)}
              </dd>
            </div>

            <div className="flex justify-between pt-6 text-gray-900 sm:block sm:pt-0">
              <dt className="font-medium text-gray-900">Pickup Time</dt>
              <dd className="mt-1 font-medium text-gray-500">
                {formatTime(order.pickupDateTime as string)}
              </dd>
            </div>
          </dl>

          {isOrderPending ? (
            <Button
              className="bg-orange-500 text-white hover:bg-orange-400"
              onClick={() =>
                cancelOrder.submit(
                  {
                    intent: "cancel-order",
                    orderId: order.id,
                  },
                  { method: "post" },
                )
              }
            >
              Cancel Order
            </Button>
          ) : null}
        </div>

        {order.feedback ? (
          <div className="mt-2 flex items-center gap-4 pt-6 text-sm text-gray-900 sm:block sm:pt-0">
            <span className="pl-6 font-semibold">Your feedback: </span>
            <span className="ml-1 font-normal">"{order.feedback}"</span>
          </div>
        ) : null}

        {/* Items */}
        <ul className="divide-y divide-gray-200">
          {order.items.map(({ item, quantity }) => (
            <li key={item.id} className="p-4 sm:p-6">
              <div className="flex items-center sm:items-start">
                <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-gray-200 sm:h-40 sm:w-40">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-full w-full object-cover object-center"
                  />
                </div>
                <div className="ml-6 flex-1 text-sm">
                  <div className="font-medium text-gray-900 sm:flex sm:justify-between">
                    <h5>
                      {item.name} <i>(x{quantity})</i>
                    </h5>
                    <p className="mt-2 sm:mt-0 font-semibold">
                      ${(item.price * quantity).toFixed(2)}
                    </p>
                  </div>
                  <p className="hidden text-gray-500 sm:mt-2 sm:block">{item.description}</p>
                </div>
              </div>

              <div className="mt-6 sm:flex sm:justify-between">
                <div className="flex items-center">
                  {isOrderFulfilled ? (
                    <>
                      <CheckCircleIcon className="h-5 w-5 text-green-500" aria-hidden="true" />

                      <p className="ml-2 text-sm font-medium text-gray-500">
                        Delivered on{" "}
                        <time dateTime={order.createdAt}>
                          {dateFormatter.format(new Date(order.createdAt))}
                        </time>
                      </p>
                    </>
                  ) : isOrderInProgress ? (
                    <>
                      {/* <ClockIcon
												className="h-5 w-5 text-blue-500"
												aria-hidden="true"
											/>

											<p className="ml-2 text-sm font-medium text-gray-500">
												Estimated time{' '}
												<span className="italic">
													{Math.floor(Math.random() * 20 + 30)} min
												</span>
											</p> */}
                    </>
                  ) : null}
                </div>

                {/* <div className="mt-6 flex items-center space-x-4 divide-x divide-gray-200 border-t border-gray-200 pt-4 text-sm font-medium sm:mt-0 sm:ml-4 sm:border-none sm:pt-0">
                  <div className="flex flex-1 items-center justify-center gap-4">
                    {isOrderFulfilled && !order.feedback ? (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button>Feedback</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogFooter>Provide your feedback</DialogFooter>
                          <div className="mt-2 space-y-4">
                            <Textarea
                              rows={4}
                              name="feedback"
                              defaultValue={""}
                              value={feedback}
                              onChange={(e) => setFeedback(e.target.value)}
                              placeholder="Your feedback ..."
                              disabled={isSubmittingFeedback}
                            />

                            <div className="flex items-center justify-end">
                              <Button
                                disabled={!feedback}
                                onClick={() =>
                                  feedbackFetcher.submit(
                                    {
                                      intent: "publish-feedback",
                                      orderId: order.id,
                                      feedback,
                                    },
                                    {
                                      method: "post",
                                    },
                                  )
                                }
                              >
                                Publish
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    ) : null}

                    <Link to={`/items/${item.slug}`} className="text-orange-500 hover:underline">
                      View Cuisine
                    </Link>
                  </div>
                </div> */}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
