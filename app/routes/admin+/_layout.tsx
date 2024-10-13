import { type LoaderFunctionArgs, redirect } from "@remix-run/node";
import { Outlet } from "@remix-run/react";
import NavBar from "~/components/navbar";
import { ScrollArea } from "~/components/ui/scroll-area";
import { getUserId, getUserRole, isCustomer, isEditor } from "~/lib/session.server";

export const adminActions = [
  {
    title: "Home",
    href: "/",
  },
  {
    title: "Editors",
    href: "/admin/editors",
  },
  {
    title: "Posts",
    href: "/admin/posts",
  },
  {
    title: "Customers",
    href: "/admin/customers",
  },
  {
    title: "Services",
    href: "/admin/services",
  },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const userId = await getUserId(request);
  const userRole = await getUserRole(request);

  if (!userId || !userRole) {
    return null;
  }

  if (await isCustomer(request)) {
    return redirect("/customer");
  }
  if (await isEditor(request)) {
    return redirect("/editor");
  }

  return null;
};

export default function CustomerLayout() {
  return (
    <div className="flex h-full flex-col">
      <NavBar navItems={adminActions} />
      <ScrollArea className="flex-1 bg-black">
        <Outlet />
      </ScrollArea>
      <div />
    </div>
  );
}
