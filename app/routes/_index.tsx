// import { json } from "@remix-run/node";
// import { useLoaderData } from "@remix-run/react";
// import Hero from "~/components/hero";
// import Navbar from "~/components/navbar";
// import { getAllCategories, getAllRestaurants } from "~/lib/restaurant.server";
// import { useOptionalUser } from "~/utils/hooks";

// export const loader = async () => {
//   const foodTrucks = await getAllRestaurants();
//   const categories = await getAllCategories();
//   const items = foodTrucks.reduce(
//     (acc, restaurant) => {
//       restaurant.items.forEach((item) => acc.push(item));
//       return acc;
//     },
//     [] as (typeof foodTrucks)[number]["items"],
//   );

//   return json({ foodTrucks, items, categories });
// };

// export default function Dashboard() {
//   const { foodTrucks, categories, items } = useLoaderData<typeof loader>();
//   const { user } = useOptionalUser();

//   const navItems = [
//     { label: "Home", href: "/" },
//     { label: "FoodTrucks", href: "/app/restaurants" },
//     { label: "Items", href: "/app/items" },
//   ];

//   return (
//     <div className="flex flex-col gap-4 p-4">
//       <Navbar navItems={navItems} currentUser={user} />
//       <Hero foodtrucks={foodTrucks} categories={categories} items={items} />
//     </div>
//   );
// }
