import { type ActionFunction, type LoaderFunctionArgs, redirect } from "@remix-run/node";
import { Link, useFetcher, useSearchParams } from "@remix-run/react";
import React from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { verifyAdminLogin } from "~/lib/admin.server";
import { verifyCustomerLogin } from "~/lib/customer.server";
import { verifyEditorLogin } from "~/lib/editor.server";
import { createUserSession, getUserId } from "~/lib/session.server";
import { LoginSchema } from "~/lib/zod.schema";
import { UserRole } from "~/roles";
import { badRequest, safeRedirect } from "~/utils/misc.server";
import { type inferErrors, validateAction } from "~/utils/validation";

const userRoleRedirect = {
  [UserRole.ADMIN]: "/admin",
  [UserRole.CUSTOMER]: "/customer",
  [UserRole.EDITOR]: "/editor",
} satisfies Record<UserRole, string>;

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await getUserId(request);
  if (userId) {
    return redirect("/");
  }
  return null;
}

interface ActionData {
  fieldErrors?: inferErrors<typeof LoginSchema>;
}

export const action: ActionFunction = async ({ request }) => {
  const searchParams = new URL(request.url).searchParams;
  const redirectTo = searchParams.get("redirectTo");

  const { fieldErrors, fields } = await validateAction(request, LoginSchema);

  if (fieldErrors) {
    return badRequest<ActionData>({ fieldErrors });
  }

  const { email, password, remember, role } = fields;

  // biome-ignore lint/suspicious/noImplicitAnyLet: <explanation>
  let user;

  if (role === UserRole.ADMIN) {
    user = await verifyAdminLogin({ email, password });
  } else if (role === UserRole.CUSTOMER) {
    user = await verifyCustomerLogin({ email, password });
  } else if (role === UserRole.EDITOR) {
    user = await verifyEditorLogin({ email, password });
  }

  if (!user) {
    return badRequest<ActionData>({
      fieldErrors: {
        password: "Invalid Email or Password",
      },
    });
  }

  return createUserSession({
    request,
    userId: user.id,
    role: role, // This line is now correct
    remember: remember === "on",
    redirectTo: safeRedirect(redirectTo || userRoleRedirect[role]),
  });
};

export default function Login() {
  const [searchParams] = useSearchParams();
  const [selectedRole, setSelectedRole] = React.useState<UserRole>(UserRole.ADMIN);
  const fetcher = useFetcher<ActionData>();
  const actionData = fetcher.data;

  const redirectTo = searchParams.get("redirectTo");
  console.log("searchParams redirectTo", redirectTo);

  const isSubmitting = fetcher.state !== "idle";

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-r from-blue-100 to-purple-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Welcome to Online Freelance!
          </CardTitle>
          <CardDescription className="text-center">Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <fetcher.Form method="post" className="space-y-4">
            <input type="hidden" name="redirectTo" defaultValue={redirectTo ?? ""} />
            <fieldset disabled={isSubmitting} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="role">User Role</Label>
                <Select
                  name="role"
                  value={selectedRole}
                  onValueChange={(value) => setSelectedRole(value as UserRole)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(UserRole).map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input id="email" name="email" type="email" autoComplete="email" required />
                {actionData?.fieldErrors?.email && (
                  <p className="text-sm text-red-500">{actionData.fieldErrors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
                {actionData?.fieldErrors?.password && (
                  <p className="text-sm text-red-500">{actionData.fieldErrors.password}</p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch id="remember-me" name="rememberMe" />
                  <Label htmlFor="remember-me">Remember me</Label>
                </div>
                <Link
                  className="text-sm text-primary underline hover:text-primary/80"
                  to={{
                    pathname: "/register",
                    search: searchParams.toString(),
                  }}
                >
                  Don't have an account?
                </Link>
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "Signing in..." : "Sign in"}
              </Button>
            </fieldset>
          </fetcher.Form>
        </CardContent>
      </Card>
    </div>
  );
}
