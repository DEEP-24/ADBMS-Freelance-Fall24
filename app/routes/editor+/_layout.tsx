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
import { getEditorById } from "~/lib/editor.server";
import { getUserId, getUserRole } from "~/lib/session.server";
import { UserRole } from "~/roles";

export const editorActions = [
  { title: "Posts", href: "/editor/posts", icon: FileText },
  { title: "Projects", href: "/editor/projects", icon: ShoppingBag },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const userId = await getUserId(request);
  const userRole = await getUserRole(request);

  if (!userId || !userRole) {
    return redirect("/login");
  }

  if (userRole !== UserRole.EDITOR) {
    switch (userRole) {
      case UserRole.CUSTOMER:
        return redirect("/customer");
      case UserRole.ADMIN:
        return redirect("/admin");
      default:
        return redirect("/login");
    }
  }

  const user = await getEditorById(userId);
  if (!user) {
    return redirect("/login");
  }

  return json({ user, userRole });
};

export default function EditorLayout() {
  const { user } = useLoaderData<typeof loader>();

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800">
        <div className="flex flex-col justify-center items-center bg-gray-900 p-[1px]">
          <span className="text-white text-2xl font-semibold text-black">Freelance</span>
          <span className="text-white text-2xl font-semibold text-emerald-500">Marketplace</span>
        </div>
        <nav className="mt-8">
          {editorActions.map((action) => (
            <NavLink
              key={action.title}
              to={action.href}
              className={({ isActive }) =>
                `flex items-center px-6 py-3 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors duration-200 ${
                  isActive ? "bg-gray-700 text-white border-r-4 border-emerald-500" : ""
                }`
              }
            >
              <action.icon className="w-5 h-5 mr-3" />
              {action.title}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="shadow-sm z-10 h-16 bg-gray-800">
          <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <h2 className="text-2xl font-semibold text-white">Welcome, {user.firstName}</h2>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-gray-200 text-gray-600">
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
                  <Link to="/admin/settings" className="flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
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
            <div className="bg-white shadow-md rounded-lg p-6">
              <Outlet />
            </div>
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}
