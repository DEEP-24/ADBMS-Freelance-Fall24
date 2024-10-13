import {
  type ActionFunction,
  type LoaderFunctionArgs,
  type MetaFunction,
  redirect,
} from "@remix-run/node";
import { Link, useFetcher, useSearchParams } from "@remix-run/react";
import { Form } from "@remix-run/react";
import { ArrowLeftIcon } from "lucide-react";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Switch } from "~/components/ui/switch";
import { verifyAdminLogin } from "~/lib/admin.server";
import { verifyCustomerLogin } from "~/lib/customer.server";
import { verifyEditorLogin } from "~/lib/editor.server";
import {
  createUserSession,
  getUserId,
  getUserRole,
  isAdmin,
  isCustomer,
  isEditor,
} from "~/lib/session.server";
import { UserRole } from "~/roles";
import { badRequest, safeRedirect } from "~/utils/misc.server";
import { type inferErrors, validateAction } from "~/utils/validation";

const userRoleRedirect = {
  [UserRole.ADMIN]: "/admin",
  [UserRole.CUSTOMER]: "/customer",
  [UserRole.EDITOR]: "/editor",
} satisfies Record<UserRole, string>;

const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  remember: z.enum(["on"]).optional(),
  role: z.nativeEnum(UserRole),
});
export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await getUserId(request);
  const userRole = await getUserRole(request);

  if (!userId || !userRole) {
    return null;
  }

  if (await isAdmin(request)) {
    return redirect("/admin");
  }

  if (await isCustomer(request)) {
    return redirect("/customer");
  }

  if (await isEditor(request)) {
    return redirect("/editor");
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
    role: fields.role,
    remember: remember === "on",
    redirectTo: safeRedirect(redirectTo || userRoleRedirect[role]),
  });
};

export const meta: MetaFunction = () => {
  return [
    {
      title: "Artify | Login",
    },
  ];
};
export default function Login() {
  const [searchParams] = useSearchParams();

  const fetcher = useFetcher<ActionData>();
  const actionData = fetcher.data;

  const redirectTo = searchParams.get("redirectTo");
  console.log("searchParams redirectTo", redirectTo);

  const isSubmitting = fetcher.state !== "idle";

  return (
    <>
      <div className="relative isolate flex min-h-full flex-col justify-center">
        <div className="absolute inset-0 bg-black">
          <img src="/img/login-bg.png" alt="Login-bg" className="h-full w-full object-cover" />
        </div>
        <div className="relative mb-4 flex items-center justify-center gap-3">
          <Link to="/" className="flex items-center gap-2 text-white hover:text-gray-300">
            <ArrowLeftIcon className="h-5 w-5" />
            <span className="text-base underline">Back to home</span>
          </Link>
        </div>
        <div className="relative mx-auto w-full max-w-md rounded-lg border-2 border-white p-6 px-8">
          <div className="flex items-center justify-center pb-4 text-3xl">
            <h3 className="text-gray-300">Welcome to Artify!</h3>
          </div>
          <Form method="post" className="mt-8">
            <input type="hidden" name="redirectTo" defaultValue={redirectTo ?? ""} />
            <fieldset disabled={isSubmitting} className="flex flex-col gap-4">
              <RadioGroup name="role" defaultValue={UserRole.CUSTOMER}>
                <div className="flex justify-between">
                  {Object.values(UserRole).map((role) => (
                    <div key={role} className="flex items-center space-x-2">
                      <RadioGroupItem value={role} id={role} />
                      <Label htmlFor={role} className="text-gray-300">
                        {role}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">
                  Email address
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  className="text-gray-300"
                  required
                />
                {actionData?.fieldErrors?.email && (
                  <p className="text-sm text-red-500">{actionData.fieldErrors.email}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300">
                  Password
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  className="text-gray-300"
                  required
                />
                {actionData?.fieldErrors?.password && (
                  <p className="text-sm text-red-500">{actionData.fieldErrors.password}</p>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch id="remember-me" name="rememberMe" />
                  <Label htmlFor="remember-me" className="text-gray-300">
                    Remember me
                  </Label>
                </div>
                <div className="text-sm text-gray-300">
                  Don't have an account?{" "}
                  <Link
                    className="text-gray-300 underline hover:text-gray-500"
                    to={{
                      pathname: "/register",
                      search: searchParams.toString(),
                    }}
                  >
                    Sign up
                  </Link>
                </div>
              </div>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-4 bg-white text-black hover:bg-gray-200"
              >
                {isSubmitting ? "Signing in..." : "Sign in"}
              </Button>
            </fieldset>
          </Form>
        </div>
      </div>
    </>
  );
}
