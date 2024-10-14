import type { LoaderFunction, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { requireUserId } from "~/lib/session.server";

export const meta: MetaFunction = () => {
  return [
    {
      title: "Artify | Home",
    },
  ];
};

export const loader: LoaderFunction = async ({ request }: LoaderFunctionArgs) => {
  await requireUserId(request);

  // Since we don't have user roles in the simplified session, we'll redirect to a default page
  // You may want to implement proper role-based redirection in the future
  return redirect("/dashboard");
};

export default function MainPage() {
  return null;
}
