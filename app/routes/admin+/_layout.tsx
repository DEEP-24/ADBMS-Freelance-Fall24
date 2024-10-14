import { type LoaderFunctionArgs, json, redirect } from "@remix-run/node";
import { Outlet, useLoaderData } from "@remix-run/react";
import NavBar from "~/components/navbar";
import { ScrollArea } from "~/components/ui/scroll-area";
import { getUserId, getUserRole } from "~/lib/session.server";
import { UserRole } from "~/roles";

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

  console.log("Admin layout loader - userId:", userId);
  console.log("Admin layout loader - userRole:", userRole);

  if (!userId || !userRole) {
    console.log("Redirecting to login - no userId or userRole");
    return redirect("/login");
  }

  if (userRole !== UserRole.ADMIN) {
    console.log(`Redirecting non-admin user (${userRole}) to appropriate dashboard`);
    // Redirect non-admin users to their respective dashboards
    switch (userRole) {
      case UserRole.CUSTOMER:
        return redirect("/customer");
      case UserRole.EDITOR:
        return redirect("/editor");
      default:
        return redirect("/login");
    }
  }

  console.log("Admin layout loader - allowing access for admin");
  return json({ userRole });
};

export default function AdminLayout() {
  const { userRole } = useLoaderData<typeof loader>();

  return (
    <div className="flex h-full flex-col">
      <NavBar navItems={adminActions} />
      <ScrollArea className="flex-1 bg-black">
        <div className="p-4 text-white">Current user role: {userRole}</div>
        <Outlet />
      </ScrollArea>
      <div />
    </div>
  );
}
