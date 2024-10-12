import type { LoaderFunctionArgs, SerializeFrom } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, NavLink, Outlet } from "@remix-run/react";
import { Avatar } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { ScrollArea } from "~/components/ui/scroll-area";
import { isCustomer, isManager, isStaff } from "~/lib/session.server";
import { cn } from "~/utils/helpers";
import { useOptionalUser } from "~/utils/hooks";

export type AppLoaderData = SerializeFrom<typeof loader>;
export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (await isCustomer(request)) {
    return redirect("/");
  }
  if (await isManager(request)) {
    return redirect("/manager");
  }
  if (await isStaff(request)) {
    return redirect("/staff");
  }

  return json({});
};

export default function AppLayout() {
  return (
    <>
      <div className="flex h-full flex-col">
        <HeaderComponent />
        <ScrollArea>
          <main>
            <Outlet />
          </main>
        </ScrollArea>
      </div>
    </>
  );
}

function HeaderComponent() {
  const { user } = useOptionalUser();

  const navItems = [
    { label: "FoodTrucks", href: "/admin" },
    { label: "Categories", href: "/admin/categories" },
  ];

  return (
    <>
      <Form replace action="/api/auth/logout" method="post" id="logout-form" />
      <div className="flex items-center justify-between p-10 px-28">
        <Link to="/" className="flex-shrink-0">
          <span className="text-4xl font-bold tracking-wide text-orange-500">EatStreet</span>
        </Link>

        <div className="flex-grow mx-8">
          <ul className="flex justify-center space-x-6">
            {navItems.map((item) => (
              <div key={item.href}>
                <li key={item.href}>
                  <NavLink
                    to={item.href}
                    className={({ isActive }) =>
                      cn(
                        "p-1 hover:underline",
                        isActive &&
                          "rounded-lg border-b bg-orange-500 p-2 text-white hover:no-underline",
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              </div>
            ))}
          </ul>
        </div>

        <div className="flex items-center space-x-5">
          {!user ? (
            <div className="flex items-center space-x-3">
              <Link
                to="/login"
                className="px-3 py-2 text-sm rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-3 py-2 text-sm rounded-lg border border-orange-500 text-orange-500 hover:bg-orange-50 transition-colors"
              >
                Sign Up
              </Link>
            </div>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild className="flex items-center justify-center">
                <Avatar className="cursor-pointer bg-orange-500 text-white">
                  {user.firstName.charAt(0)}
                  {user.lastName.charAt(0)}
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <Form replace action="/api/auth/logout" method="post">
                  <Button
                    type="submit"
                    className="w-full bg-orange-500 text-white hover:bg-orange-400"
                  >
                    Logout
                  </Button>
                </Form>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </>
  );
}
