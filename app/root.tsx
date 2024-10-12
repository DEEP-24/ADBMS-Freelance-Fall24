import type { LinksFunction, LoaderFunctionArgs, SerializeFrom } from "@remix-run/node";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, json } from "@remix-run/react";
import DefaultErrorBoundary from "~/components/ui/error-boundary";
import iconsHref from "~/components/ui/icons/sprite.svg?url";
import { getUser } from "~/lib/session.server";
import "./tailwind.css";
import { Toaster } from "sonner";
import { CartProvider } from "~/context/CartContext";
import { StaffCartProvider } from "~/context/StaffCartContext";

export const links: LinksFunction = () => [{ rel: "prefetch", href: iconsHref, as: "image" }];

export type RootLoaderData = SerializeFrom<typeof loader>;
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await getUser(request);
  return json({ user });
};

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body suppressHydrationWarning>
        {children}
        <Toaster richColors closeButton />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <StaffCartProvider>
      <CartProvider>
        <Outlet />
      </CartProvider>
    </StaffCartProvider>
  );
}

export function ErrorBoundary() {
  return <DefaultErrorBoundary />;
}

export function HydrateFallback() {
  return <h1>Loading...</h1>;
}
