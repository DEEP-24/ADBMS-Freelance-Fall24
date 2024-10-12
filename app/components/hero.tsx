import { ChevronRightIcon, MapPinIcon, PhoneIcon, PlusCircleIcon } from "@heroicons/react/24/solid";
import type { Category, FoodTruck, Item } from "@prisma/client";
import { Link } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { useCart } from "~/context/CartContext";

interface HeroProps {
  foodtrucks: FoodTruck[];
  categories: Category[];
  items: Item[];
}

export default function Hero({ foodtrucks, categories, items }: HeroProps) {
  const { addItemToCart } = useCart();

  return (
    <>
      <div className="mt-10 px-40">
        <div className="relative h-[72vh] rounded-3xl shadow-lg">
          <img
            src="https://cdn.pixabay.com/photo/2023/10/08/13/03/ai-generated-8302143_1280.jpg"
            className="absolute h-full w-full rounded-3xl object-cover"
            alt="food truck"
          />
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-black via-black/50 to-transparent" />
          <div className="absolute ml-28 mt-32 flex flex-col gap-8 text-left">
            <h1 className=" max-w-4xl text-6xl font-bold text-white">
              Order your favorite food from your favorite food truck
            </h1>
            <span className="max-w-4xl text-xl tracking-wide text-white">
              Discover a wide variety of food trucks offering diverse cuisines, including Indian,
              Mexican, Italian, and more. Browse by location, explore different menus, and place
              your order effortlessly online. Track your food in real-time and enjoy delicious meals
              from your favorite local food trucks, delivered straight to you or ready for pick-up.
              Experience global flavors from the comfort of your home or on the go!
            </span>
            <Link
              className="flex max-w-[13rem] items-center justify-center rounded-full bg-orange-500 p-5 text-lg text-white hover:bg-orange-400"
              to="/restaurants"
            >
              View Food trucks
            </Link>
          </div>
        </div>
      </div>

      {/* explore menu section */}
      <div className="mt-20 p-5 px-40">
        <div className="flex flex-col gap-5">
          <h1 className="text-left text-4xl font-bold text-[#454545]">Explore by FoodTrucks</h1>
          <span className="max-w-4xl text-left text-xl text-[#888888]">
            Discover a wide variety of food trucks offering diverse cuisines, including Indian,
            Mexican, Italian, and more. Browse by location, explore different menus, and place your
            order effortlessly online.
          </span>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-8 px-5">
          {foodtrucks.map((truck) => (
            <div
              key={truck.id}
              className="border-1 flex h-[32rem] flex-col gap-3 rounded-xl border-black bg-[#f6f6f6]/20 shadow-md transition-transform duration-300 ease-in-out hover:scale-105"
            >
              <div className="relative h-[55%]">
                <img
                  src={truck.image}
                  alt={truck.name}
                  className="aspect-square h-full w-full rounded-t-3xl object-cover"
                />
                <div className="absolute inset-0 rounded-t-3xl bg-black/10" />
              </div>
              <div className="ml-8 flex flex-col gap-2 p-2">
                <span className="text-left text-3xl font-bold">{truck.name}</span>
                <div className="mt-2 flex items-center text-lg font-semibold text-[#888888]">
                  <MapPinIcon className="mr-2 inline h-5 w-5" />
                  <span>{truck.location}</span>
                </div>
                <div className="flex items-center text-lg font-semibold text-[#888888]">
                  <PhoneIcon className="mr-2 inline h-5 w-5" />
                  <span>{truck.phoneNo}</span>
                </div>
              </div>
              <div className="px-4">
                <Button className="flex w-full items-center justify-center rounded-full bg-orange-500 p-3 font-semibold text-white hover:bg-orange-400">
                  <Link to={`/restaurants/${truck.slug}`}>
                    Visit
                    <ChevronRightIcon className="inline h-4 w-5" />
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 px-32">
        <div className="h-1 bg-black/40" />
      </div>

      <div className="mt-12 mb-12 p-5 px-40">
        <div className="flex flex-col gap-5">
          <h1 className="text-left text-4xl font-bold text-[#454545]">Explore by Categories</h1>
          <span className="max-w-4xl text-left text-xl text-[#888888]">
            Explore an extensive range of food categories, from mouth-watering appetizers and
            gourmet burgers to authentic street tacos and decadent desserts. Browse by menu type,
            discover diverse flavors, and easily order your favorites online.
          </span>
        </div>
        <div className="mt-10 grid grid-cols-3 gap-4 px-5">
          {categories.map((category) => (
            <div className="relative h-[20vh] rounded-3xl shadow-lg" key={category.id}>
              <img
                src={category.imageUrl}
                className="absolute h-full w-full rounded-3xl object-cover"
                alt="food truck"
              />
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-black/40 via-black/50 to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center">
                <h1 className="text-5xl font-bold text-white">{category.name}</h1>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 px-32">
        <div className="h-1 bg-black/40" />
      </div>

      <div>
        <div className="mt-12 mb-12 p-5 px-40">
          <div className="flex flex-col gap-5">
            <h1 className="text-left text-4xl font-bold text-[#454545]">Explore by Menu</h1>
            <span className="max-w-4xl text-left text-xl text-[#888888]">
              Explore an extensive range of food categories, from mouth-watering appetizers and
              gourmet burgers to authentic street tacos and decadent desserts. Browse by menu type,
              discover diverse flavors, and easily order your favorites online.
            </span>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-x-4 gap-y-12 sm:grid-cols-2 sm:gap-6 md:grid-cols-3 md:gap-x-10">
            {items.map((item) => {
              return (
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
                      className="absolute bottom-2 right-2 rounded-full bg-white shadow-md"
                      type="button"
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
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
