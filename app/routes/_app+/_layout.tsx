import type { LoaderFunctionArgs, SerializeFrom } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Outlet } from "@remix-run/react";
import Navbar from "~/components/navbar";
import { getAllCategories, getAllRestaurants } from "~/lib/restaurant.server";
import { isAdmin, isManager, isStaff } from "~/lib/session.server";
import { useOptionalUser } from "~/utils/hooks";

export type AppLoaderData = SerializeFrom<typeof loader>;
export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (await isAdmin(request)) {
    return redirect("/admin");
  }
  if (await isStaff(request)) {
    return redirect("/staff");
  }
  if (await isManager(request)) {
    return redirect("/manager");
  }

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

export default function AppLayout() {
  const { user } = useOptionalUser();

  const navItems = [
    { label: "Home", href: "/" },
    ...(user?.role === "CUSTOMER" ? [{ label: "Order History", href: "/order-history" }] : []),
    { label: "FoodTrucks", href: "/restaurants" },
    { label: "Items", href: "/items" },
  ];

  return (
    <>
      <div className="flex h-full flex-col">
        <Navbar navItems={navItems} currentUser={user} />
        <Outlet />
        <FooterComponent />
      </div>
    </>
  );
}

export function FooterComponent() {
  return (
    <footer className="flex items-center justify-center bg-white/40 p-2">
      <span className="text-gray-400">
        &copy; {new Date().getFullYear()} EatStreet. All rights reserved.
      </span>
    </footer>
  );
}
