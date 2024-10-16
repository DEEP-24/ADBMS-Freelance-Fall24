import { type LoaderFunctionArgs, json, redirect } from "@remix-run/node";
import { Form, Link, NavLink, Outlet, useLoaderData } from "@remix-run/react";
import { FileText, LogOut, Settings, ShoppingBag, Users } from "lucide-react";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { ScrollArea } from "~/components/ui/scroll-area";
import { getAdminById } from "~/lib/admin.server";
import { getUser, getUserRole } from "~/lib/session.server";
import { UserRole } from "~/roles";

export const adminActions = [
  { title: "Editors", href: "/admin/editors", icon: Users },
  { title: "Posts", href: "/admin/posts", icon: FileText },
  { title: "Customers", href: "/admin/customers", icon: Users },
  { title: "Services", href: "/admin/services", icon: ShoppingBag },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const currentUser = await getUser(request);
  const currentUserRole = await getUserRole(request);

  if (!currentUser || !currentUserRole) {
    return redirect("/login");
  }

  if (currentUserRole !== UserRole.ADMIN) {
    switch (currentUserRole) {
      case UserRole.CUSTOMER:
        return redirect("/customer");
      case UserRole.EDITOR:
        return redirect("/editor");
      default:
        return redirect("/login");
    }
  }

  if (!currentUser) {
    return redirect("/login");
  }

  return json({ user: currentUser });
};

export default function AdminLayout() {
  const { user } = useLoaderData<typeof loader>();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0">
        <div className="flex h-16 items-center justify-center border-b">
          <span className="text-xl font-bold text-emerald-600">Freelance Marketplace</span>
        </div>
        <nav className="mt-8 px-4">
          {adminActions.map((action) => (
            <NavLink
              key={action.title}
              to={action.href}
              className={({ isActive }) =>
                `flex items-center px-4 py-3 mb-2 text-gray-700 rounded-lg transition-all duration-200 ${
                  isActive
                    ? "bg-emerald-100 text-emerald-700 font-medium shadow-md"
                    : "hover:bg-gray-100 hover:text-emerald-600"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <action.icon className={`w-5 h-5 mr-3 ${isActive ? "text-emerald-600" : ""}`} />
                  {action.title}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b z-10">
          <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <div className="flex items-center">
              <h2 className="text-2xl font-semibold text-gray-800">Welcome, {user.firstName}</h2>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-emerald-500 text-white">
                      {user.firstName[0]}
                      {user.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Form action="/logout" method="post">
                    <button type="submit" className="flex w-full items-center">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </button>
                  </Form>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <ScrollArea className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white shadow-sm rounded-lg p-6">
              <Outlet />
            </div>
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}
