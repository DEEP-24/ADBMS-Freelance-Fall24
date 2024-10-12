import { ShoppingCartIcon, WalletIcon } from "@heroicons/react/24/solid";
import { Form, Link, NavLink } from "@remix-run/react";
import { Avatar } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { cn } from "~/utils/helpers";

type NavItem = {
  label: string;
  href: string;
};

type currentUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  hasResetPassword: boolean;
  foodTruckId: string | null;
};

interface NavbarProps {
  navItems: NavItem[];
  currentUser?: currentUser | null;
}

export default function Navbar({ navItems, currentUser }: NavbarProps) {
  return (
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
        <Link to="/wallet">
          <WalletIcon className="h-8 w-8 text-orange-500" />
        </Link>
        <Link to="/cart">
          <ShoppingCartIcon className="h-8 w-8 text-orange-500" />
        </Link>

        {!currentUser ? (
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
                {currentUser.firstName.charAt(0)}
                {currentUser.lastName.charAt(0)}
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
  );
}
