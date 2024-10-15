import type { LinksFunction, LoaderFunctionArgs, SerializeFrom } from "@remix-run/node";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  json,
  useLoaderData,
} from "@remix-run/react";
import DefaultErrorBoundary from "~/components/ui/error-boundary";
import iconsHref from "~/components/ui/icons/sprite.svg?url";
import "./tailwind.css";
import { Toaster } from "sonner";
import { getAdmin } from "~/lib/admin.server";
import { getCustomer } from "~/lib/customer.server";
import { getEditor } from "~/lib/editor.server";
import { getUserId, getUserRole } from "~/lib/session.server";
import { UserRole } from "~/roles";

export const links: LinksFunction = () => [{ rel: "prefetch", href: iconsHref, as: "image" }];

export type RootLoaderData = SerializeFrom<typeof loader>;
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const userId = await getUserId(request);
  const userRole = await getUserRole(request);

  const response: {
    admin: Awaited<ReturnType<typeof getAdmin>>;
    customer: Awaited<ReturnType<typeof getCustomer>>;
    editor: Awaited<ReturnType<typeof getEditor>>;
    ENV: {
      AWS_REGION?: string;
      AWS_BUCKET?: string;
    };
  } = {
    admin: null,
    customer: null,
    editor: null,
    ENV: {
      AWS_REGION: process.env.AWS_REGION,
      AWS_BUCKET: process.env.AWS_BUCKET,
    },
  };

  if (!userId || !userRole) {
    return response;
  }

  if (userRole === UserRole.ADMIN) {
    response.admin = await getAdmin(request);
  } else if (userRole === UserRole.CUSTOMER) {
    response.customer = await getCustomer(request);
  } else if (userRole === UserRole.EDITOR) {
    response.editor = await getEditor(request);
  }

  return json(response);
};

export function Layout({ children }: { children: React.ReactNode }) {
  const data = useLoaderData<RootLoaderData>();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body suppressHydrationWarning className="h-screen">
        {children}
        <script dangerouslySetInnerHTML={{ __html: `window.ENV = ${JSON.stringify(data.ENV)}` }} />
        <Toaster richColors closeButton />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary() {
  return <DefaultErrorBoundary />;
}

export function HydrateFallback() {
  return <h1>Loading...</h1>;
}
