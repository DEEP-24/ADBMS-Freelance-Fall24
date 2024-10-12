import {
  ClockIcon,
  GlobeAltIcon,
  MapPinIcon,
  PhoneIcon,
  PlusCircleIcon,
} from "@heroicons/react/24/solid";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { useCart } from "~/context/CartContext";
import { getRestaurantBySlug } from "~/lib/restaurant.server";
import { formatTime } from "~/utils/misc";

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const { slug } = params;

  if (!slug) {
    throw new Response("No slug provided", { status: 404 });
  }

  const restaurant = await getRestaurantBySlug(slug);

  if (!restaurant) {
    throw new Response("No restaurant found", { status: 404 });
  }

  return json({
    slug,
    restaurant,
  });
};

export default function Restaurant() {
  const { restaurant } = useLoaderData<typeof loader>();
  const { addItemToCart } = useCart();

  return (
    <>
      <div className="flex flex-col gap-4 p-4">
        <div className="grid grid-cols-7 gap-9 px-40 py-10">
          <div className="col-span-2">
            <div className="bg- flex flex-col rounded-2xl bg-[#f6f6f6]/90 p-4">
              <img
                src={restaurant.image}
                alt={restaurant.name}
                className="aspect-square h-full w-full rounded-full object-cover object-center"
              />
              <div className="mt-3 flex flex-col gap-4">
                <span className="text-center text-3xl font-bold">{restaurant.name}</span>
                <div className="flex flex-col gap-6 p-4">
                  <div className="flex flex-col gap-2">
                    <div>
                      <MapPinIcon className="mr-2 inline h-5 w-5" />
                      <span className="text-lg font-semibold">Location</span>
                    </div>
                    <span className="text-sm text-[#5d5d5d]">{restaurant.location}</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div>
                      <PhoneIcon className="mr-2 inline h-5 w-5" />
                      <span className="text-lg font-semibold">Contact</span>
                    </div>
                    <span className="text-sm text-[#5d5d5d]">{restaurant.phoneNo}</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div>
                      <ClockIcon className="mr-2 inline h-5 w-5" />
                      <span className="text-lg font-semibold">Hours</span>
                    </div>
                    {restaurant.schedule.map((day) => (
                      <div
                        key={day.id}
                        className="flex items-center text-sm font-semibold text-[#5d5d5d]"
                      >
                        <span>{day.day}:</span>
                        <span className="ml-2">
                          {formatTime(day.startTime)} - {formatTime(day.endTime)}
                        </span>
                      </div>
                    ))}
                  </div>
                  {restaurant.description && (
                    <div className="flex flex-col gap-2">
                      <div>
                        <GlobeAltIcon className="mr-2 inline h-5 w-5" />
                        <span className="text-lg font-semibold">Description</span>
                      </div>
                      <span className="">{restaurant.description}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="col-span-5">
            <div className="mt-6 grid grid-cols-1 gap-x-4 gap-y-12 sm:grid-cols-2 sm:gap-x-6 md:grid-cols-3 md:gap-y-10">
              {restaurant?.items.map((item) => (
                <div
                  key={item.id}
                  className="mx-auto overflow-hidden rounded-2xl bg-white shadow-lg transition-transform duration-300 ease-in-out hover:scale-105 sm:mx-[unset]"
                >
                  <div className="relative aspect-square h-44 w-full overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-full w-full object-cover object-center"
                    />
                    <button
                      type="button"
                      className="absolute bottom-2 right-2 rounded-full bg-white shadow-md"
                      onClick={() =>
                        addItemToCart({
                          ...item,
                          quantity: 1,
                        })
                      }
                    >
                      <PlusCircleIcon className="h-10 w-10 text-black" />
                    </button>
                  </div>
                  <div className="p-4">
                    <Link
                      className="text-2xl font-bold text-gray-900"
                      to={`/items/${item.slug}`}
                      prefetch="intent"
                    >
                      {item.name}
                    </Link>
                    {item.description && (
                      <p className="mt-1 text-sm text-gray-500">
                        {item.description.slice(0, 100)}...
                      </p>
                    )}
                    <p className="mt-2 text-lg font-medium text-orange-500">
                      ${item.price.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
