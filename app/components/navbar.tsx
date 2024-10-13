import { Form, Link, NavLink } from "@remix-run/react";
import { ChevronDown } from "lucide-react";
import { useOptionalUser } from "~/utils/misc";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

type NavItem = {
  title: string;
  href: string;
};

type NavBarProps = {
  navItems: NavItem[];
};

export default function NavBar({ navItems }: NavBarProps) {
  const user = useOptionalUser();

  return (
    <nav className="flex h-16 items-center justify-between bg-primary px-4 py-2">
      <div className="flex items-center">
        <Link to="/" className="flex items-center justify-center">
          <img src="/img/logo.png" alt="logo" className="h-12 w-20" />
        </Link>
      </div>

      <div className="flex justify-between gap-6">
        {navItems.map((navItem, idx) => (
          <NavLink
            // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
            key={idx}
            to={navItem.href}
            end
            className={({ isActive }) =>
              `text-lg ${
                isActive ? "text-primary-foreground" : "text-primary-foreground/60"
              } hover:text-primary-foreground`
            }
          >
            {navItem.title}
          </NavLink>
        ))}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarFallback>
                {user?.name
                  ? user.name
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .toUpperCase()
                  : "G"}
              </AvatarFallback>
            </Avatar>
            <ChevronDown className="ml-2 h-4 w-4 text-primary-foreground/60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          {user ? (
            <>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                  <Form action="/logout" method="post">
                    <button type="submit" className="w-full text-left">
                      Log out
                    </button>
                  </Form>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </>
          ) : (
            <>
              <DropdownMenuItem asChild>
                <Link to="/login">Log in</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/register">Create account</Link>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}
