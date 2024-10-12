import { PlusCircleIcon } from "@heroicons/react/24/solid";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useCart } from "~/context/CartContext";
import { useItem } from "~/utils/hooks";

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const { slug } = params;

  if (!slug) {
    throw new Response("No slug provided", { status: 404 });
  }

  return json({ slug });
};

export default function Item() {
  const { slug } = useLoaderData<typeof loader>();
  const item = useItem(slug);

  if (!item) {
    return null;
  }

  return (
    <>
      <div className="flex flex-col gap-4 p-4">
        <ItemOverview />
      </div>
    </>
  );
}

function ItemOverview() {
  const { slug } = useLoaderData<typeof loader>();
  const item = useItem(slug);
  const { addItemToCart } = useCart();

  if (!item) {
    return null;
  }

  return (
    <>
      <div className="px-40 py-10 h-full">
        <div
          key={item.id}
          className="mx-auto overflow-hidden rounded-2xl bg-white shadow-lg sm:mx-[unset]"
        >
          <div className="relative aspect-square h-[50vh] w-full overflow-hidden">
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
            <span className="text-3xl font-bold text-gray-900">{item.name}</span>
            {item.description && <p className="mt-1 text-lg text-gray-500">{item.description}</p>}
            <p className="mt-2 text-lg font-medium text-orange-500">${item.price.toFixed(2)}</p>
          </div>
        </div>
      </div>
    </>
  );
}
