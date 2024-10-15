import type { LoaderFunction, LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { getUser, getUserRole } from "~/lib/session.server";
import { UserRole } from "~/roles";

export const loader: LoaderFunction = async ({ request }: LoaderFunctionArgs) => {
  const user = await getUser(request);

  if (!user) {
    return redirect("/login");
  }

  const userRole = await getUserRole(request);
  if (userRole === UserRole.ADMIN) {
    return redirect("/admin");
  }
  if (userRole === UserRole.CUSTOMER) {
    return redirect("/customer");
  }
  if (userRole === UserRole.EDITOR) {
    return redirect("/editor");
  }

  return redirect("/login");
};

export default function MainPage() {
  return null;
}
