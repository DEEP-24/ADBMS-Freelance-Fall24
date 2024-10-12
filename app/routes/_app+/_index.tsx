import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import Hero from "~/components/hero";
import { getAllCategories, getAllRestaurants } from "~/lib/restaurant.server";

export const loader = async () => {
  const foodTrucks = await getAllRestaurants();
  const categories = await getAllCategories();
  const items = foodTrucks.reduce(
    (acc, restaurant) => {
      restaurant.items.forEach((item) => acc.push(item));
      return acc;
    },
    [] as (typeof foodTrucks)[number]["items"],
  );

  return json({ foodTrucks, items, categories });
};

export default function Dashboard() {
  const { foodTrucks, categories, items } = useLoaderData<typeof loader>();

  return (
    <div className="flex flex-col gap-4 p-4">
      <Hero foodtrucks={foodTrucks} categories={categories} items={items} />
    </div>
  );
}
