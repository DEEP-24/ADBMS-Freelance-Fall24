import { PlusCircleIcon } from "@heroicons/react/24/solid";
import { Link } from "@remix-run/react";
import { useCart } from "~/context/CartContext";
import { useAppData } from "~/utils/hooks";

export default function Restaurants() {
  const { items } = useAppData();
  const { addItemToCart } = useCart();

  return (
    <div className="flex flex-col gap-4 px-40 py-10">
      <h1 className="flex items-center justify-center text-3xl font-bold">Cuisines</h1>

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
                  className="text-xl font-bold text-gray-900 hover:underline"
                  to={`/items/${item.slug}`}
                  prefetch="intent"
                >
                  {item.name}
                </Link>
                {item.description && (
                  <p className="mt-1 text-sm text-gray-500">{item.description.slice(0, 100)}...</p>
                )}
                <p className="mt-2 text-lg font-medium text-orange-500">${item.price.toFixed(2)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
