import type { LoaderFunctionArgs, SerializeFrom } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, Outlet } from "@remix-run/react";
import * as React from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { ScrollArea } from "~/components/ui/scroll-area";
import { isAdmin, isCustomer, isManager } from "~/lib/session.server";
import { useUser } from "~/utils/hooks";
import { useFetcherCallback } from "~/utils/use-fetcher-callback";

export type AppLoaderData = SerializeFrom<typeof loader>;
export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (await isCustomer(request)) {
    return redirect("/");
  }
  if (await isAdmin(request)) {
    return redirect("/admin");
  }
  if (await isManager(request)) {
    return redirect("/manager");
  }

  return json({});
};

export default function AppLayout() {
  const { user } = useUser();
  const fetcher = useFetcherCallback({
    onSuccess: () => {
      setModalOpen(false);
    },
  });

  const [modalOpen, setModalOpen] = React.useState(!user?.hasResetPassword);

  const isSubmitting = fetcher.state !== "idle";

  return (
    <>
      <div className="flex h-full">
        <SidebarComponent />
        <div className="flex flex-1 flex-col">
          <HeaderComponent />
          <ScrollArea>
            <main>
              <Outlet />
            </main>
          </ScrollArea>
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={() => setModalOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          <fetcher.Form method="post" className="flex flex-col gap-4" action="/api/reset-password">
            <input hidden name="userId" defaultValue={user?.id} />
            <div className="grid w-full max-w-sm items-center gap-1.5 p-4">
              <Label htmlFor="password">Password</Label>
              <Input type="password" required name="password" placeholder="Password" />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                Update
              </Button>
            </DialogFooter>
          </fetcher.Form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function HeaderComponent() {
  const { user } = useUser();
  const fetcher = useFetcherCallback({
    onSuccess: () => {
      setModalOpen(false);
    },
  });

  const [modalOpen, setModalOpen] = React.useState(false);

  const isSubmitting = fetcher.state !== "idle";

  return (
    <>
      <Form replace action="/api/auth/logout" method="post" id="logout-form" />
      <header className="m-4 max-h-16 ">
        <div className="flex h-full w-full items-center justify-end">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => setModalOpen(true)}
              className="bg-orange-500 text-white hover:bg-orange-400"
            >
              Reset Password
            </Button>

            {user ? (
              <>
                <div className="flex items-center gap-4">
                  <span>
                    Welcome, {user.firstName} {user.lastName}
                  </span>
                </div>
              </>
            ) : (
              <>
                <Button asChild>
                  <Link to={`/login?redirectTo=${encodeURIComponent(location.pathname)}`}>
                    Login
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <Dialog open={modalOpen} onOpenChange={() => setModalOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          <fetcher.Form method="post" className="flex flex-col gap-4" action="/api/reset-password">
            <input hidden name="userId" defaultValue={user?.id} />
            <div className="grid w-full max-w-sm items-center gap-1.5 p-4">
              <Label htmlFor="password">Password</Label>
              <Input type="password" required name="password" placeholder="Password" />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                Update
              </Button>
            </DialogFooter>
          </fetcher.Form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SidebarComponent() {
  return (
    <div className="sidebar flex min-h-screen w-64 flex-col border-r border-slate-400 bg-white p-4">
      <div className="mb-8 flex justify-center">
        <Link to="/" className="flex-shrink-0">
          <span className="text-4xl font-bold tracking-wide text-orange-500">EatStreet</span>
        </Link>
      </div>

      <nav className="flex-grow mt-5">
        <ul className="flex flex-col gap-4 items-center justify-center">
          <li className="w-full">
            <Link to="/staff/customers">
              <Button className="w-full">Customers</Button>
            </Link>
          </li>
          <li className="w-full">
            <Link to="/staff/orders">
              <Button className="w-full">Orders</Button>
            </Link>
          </li>

          <li className="w-full">
            <Link to="/staff/items">
              <Button className="w-full">Items</Button>
            </Link>
          </li>
        </ul>
      </nav>

      <div className="mt-auto flex items-center justify-center">
        <Form action="/api/auth/logout" method="post">
          <Button type="submit">Logout</Button>
        </Form>
      </div>
    </div>
  );
}
