import { type LoaderFunctionArgs, redirect } from "@remix-run/node";
import { Outlet } from "@remix-run/react";
import NavBar from "~/components/navbar";
import { ScrollArea } from "~/components/ui/scroll-area";
import { getUserId, getUserRole } from "~/lib/session.server";
import { UserRole } from "~/roles";

export const customerActions = [
  {
    title: "Home",
    href: "/",
  },
  {
    title: "Services",
    href: "/customer/services",
  },
  {
    title: "Posts",
    href: "/customer/posts",
  },
  {
    title: "Projects",
    href: "/customer/projects",
  },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const userId = await getUserId(request);
  const userRole = await getUserRole(request);

  if (!userId || !userRole) {
    return redirect("/login");
  }

  if (userRole !== UserRole.CUSTOMER) {
    switch (userRole) {
      case UserRole.ADMIN:
        return redirect("/admin");
      case UserRole.EDITOR:
        return redirect("/editor");
      default:
        return redirect("/login");
    }
  }

  return null;
};

export default function CustomerLayout() {
  return (
    <div className="flex h-full flex-col">
      <NavBar navItems={customerActions} />
      <ScrollArea className="flex-1 bg-black">
        <Outlet />
      </ScrollArea>
    </div>
  );
}
