import { type LoaderFunctionArgs, json, redirect } from "@remix-run/node";
import { Outlet, useLoaderData } from "@remix-run/react";
import NavBar from "~/components/navbar";
import { ScrollArea } from "~/components/ui/scroll-area";
import { getUserId, getUserRole } from "~/lib/session.server";
import { UserRole } from "~/roles";

export const editorActions = [
  {
    title: "Home",
    href: "/",
  },
  {
    title: "Posts",
    href: "/editor/posts",
  },
  {
    title: "Projects",
    href: "/editor/projects",
  },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const userId = await getUserId(request);
  const userRole = await getUserRole(request);

  if (!userId || !userRole) {
    return redirect("/login");
  }

  if (userRole !== UserRole.EDITOR) {
    switch (userRole) {
      case UserRole.ADMIN:
        return redirect("/admin");
      case UserRole.CUSTOMER:
        return redirect("/customer");
      default:
        return redirect("/login");
    }
  }

  return json({ userRole });
};

export default function EditorLayout() {
  return (
    <div className="flex h-full flex-col">
      <NavBar navItems={editorActions} />
      <ScrollArea className="flex-1 bg-black">
        <Outlet />
      </ScrollArea>
    </div>
  );
}
