import type { ActionFunction } from "@remix-run/node";
import { Link, useFetcher, useSearchParams } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { createUserSession } from "~/lib/session.server";
import { verifyLogin } from "~/lib/user.server";
import { LoginSchema } from "~/lib/zod.schema";
import { badRequest, safeRedirect } from "~/utils/misc.server";
import type { inferErrors } from "~/utils/validation";
import { validateAction } from "~/utils/validation";

interface ActionData {
  fieldErrors?: inferErrors<typeof LoginSchema>;
}

export const action: ActionFunction = async ({ request }) => {
  const { fieldErrors, fields } = await validateAction(request, LoginSchema);

  if (fieldErrors) {
    return badRequest<ActionData>({ fieldErrors });
  }

  const { email, password, redirectTo, remember } = fields;

  const user = await verifyLogin(email, password);
  if (!user) {
    return badRequest<ActionData>({
      fieldErrors: {
        password: "Invalid username or password",
      },
    });
  }

  return createUserSession({
    request,
    userId: user.id,
    role: user.role,
    remember: remember === "on",
    redirectTo: safeRedirect(redirectTo),
  });
};

export default function Login() {
  const [searchParams] = useSearchParams();

  const fetcher = useFetcher<ActionData>();
  const actionData = fetcher.data;

  const redirectTo = searchParams.get("redirectTo") || "/";
  const isSubmitting = fetcher.state !== "idle";

  return (
    <div className="flex flex-col">
      <div>
        <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Sign in</h2>
        <p className="mt-2 text-sm text-gray-600">
          Do not have an account yet?{" "}
          <Link to="/register" prefetch="intent" color="orange" className="underline">
            Create account
          </Link>
        </p>
      </div>

      <fetcher.Form method="post" className="mt-8">
        <input type="hidden" name="redirectTo" value={redirectTo} />

        <fieldset disabled={isSubmitting} className="flex flex-col gap-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="email">Email address</Label>
            <Input name="email" type="email" autoComplete="email" required />

            {actionData?.fieldErrors?.email && (
              <p className="text-sm text-red-500">{actionData.fieldErrors.email}</p>
            )}
          </div>

          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input type="password" name="password" autoComplete="current-password" required />

            {actionData?.fieldErrors?.password && (
              <p className="text-sm text-red-500">{actionData.fieldErrors.password}</p>
            )}
          </div>

          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="rememberMe">Remember me</Label>
            <Switch id="remember-me" name="rememberMe" />
          </div>

          <Button type="submit" color="orange">
            Sign in
          </Button>
        </fieldset>
      </fetcher.Form>
    </div>
  );
}
