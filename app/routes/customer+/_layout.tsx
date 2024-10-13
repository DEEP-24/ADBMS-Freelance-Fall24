import { type LoaderFunctionArgs, redirect } from "@remix-run/node";
import { Outlet } from "@remix-run/react";
import NavBar from "~/components/navbar";
import { ScrollArea } from "~/components/ui/scroll-area";
import { getUserId, getUserRole, isAdmin, isEditor } from "~/lib/session.server";

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
    return null;
  }

  if (await isAdmin(request)) {
    return redirect("/admin");
  }
  if (await isEditor(request)) {
    return redirect("/editor");
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
      <div className="flex items-center justify-center bg-black">
        <p className="p-3 text-lg font-semibold text-white">
          Copyright &copy; 2023-30 | All Rights Reserved{" "}
        </p>
      </div>
    </div>
  );
}
