import type { LoaderFunction } from "@remix-run/node";
import { Outlet, redirect } from "@remix-run/react";
import { getUser } from "~/lib/session.server";

export const loader: LoaderFunction = async ({ request }) => {
  const user = await getUser(request);
  if (user) {
    return redirect("/");
  }

  return null;
};

export default function AuthLayout() {
  return (
    <div className="h-svh lg:grid lg:grid-cols-8">
      <div className="relative col-span-5 hidden lg:block">
        <img
          alt="Recipe Sharing"
          className="absolute inset-0 size-full object-cover"
          src="https://media01.stockfood.com/largepreviews/MzU2NTA4NTU2/11500276-A-food-truck-with-various-snacks-in-a-courtyard.jpg"
        />
      </div>

      <div className="col-span-3 flex items-center justify-center py-12">
        <Outlet />
      </div>
    </div>
  );
}
