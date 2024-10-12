import { Role } from "@prisma/client";
import type { ActionFunction } from "@remix-run/node";
import { Form, Link, useActionData, useNavigation } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { createUserSession } from "~/lib/session.server";
import { createCustomer, getUserByEmail } from "~/lib/user.server";
import { badRequest, validateEmail, validateName } from "~/utils/misc.server";

interface ActionData {
  fieldErrors?: {
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    phoneNo?: string;
    address?: string;
  };
}

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();

  const email = formData.get("email");
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");
  const firstName = formData.get("firstName");
  const lastName = formData.get("lastName");
  const phoneNo = formData.get("phoneNo")?.toString();
  const address = formData.get("address")?.toString();

  if (!validateName(firstName)) {
    return badRequest<ActionData>({
      fieldErrors: {
        firstName: "First name is required",
      },
    });
  }

  if (!validateName(lastName)) {
    return badRequest<ActionData>({
      fieldErrors: {
        lastName: "Last name is required",
      },
    });
  }

  if (!validateEmail(email)) {
    return badRequest<ActionData>({
      fieldErrors: { email: "Email is invalid" },
    });
  }

  if (typeof password !== "string" || typeof confirmPassword !== "string") {
    return badRequest<ActionData>({
      fieldErrors: { password: "Password is required" },
    });
  }

  if (password.length < 8 || confirmPassword.length < 8) {
    return badRequest<ActionData>({
      fieldErrors: { password: "Password is too short" },
    });
  }

  if (password !== confirmPassword) {
    return badRequest<ActionData>({
      fieldErrors: { password: "Passwords do not match" },
    });
  }

  if (!phoneNo) {
    return badRequest<ActionData>({
      fieldErrors: { phoneNo: "Phone number is required" },
    });
  }

  if (!address) {
    return badRequest<ActionData>({
      fieldErrors: { address: "Address is required" },
    });
  }

  const existingUser = await getUserByEmail(email);
  if (existingUser) {
    return badRequest<ActionData>({
      fieldErrors: { email: "A user already exists with this email" },
    });
  }

  const user = await createCustomer({
    email,
    password,
    firstName,
    lastName,
    address,
    phoneNo,
  });

  return createUserSession({
    request,
    userId: user.id,
    role: Role.CUSTOMER,
    redirectTo: "/",
  });
};
export default function Register() {
  const transition = useNavigation();
  const actionData = useActionData<ActionData>();
  const isSubmitting = transition.state !== "idle";

  return (
    <div className="flex flex-col">
      <div>
        <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Register</h2>
        <p className="mt-2 text-sm text-gray-600">
          Have an account already?{" "}
          <Link to="/login" prefetch="intent" color="orange" className="underline">
            Sign in
          </Link>
        </p>
      </div>

      <Form replace method="post" className="mt-8">
        <fieldset disabled={isSubmitting} className="flex flex-col gap-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="firstName">First Name</Label>
            <Input type="text" name="firstName" autoComplete="given-name" required />

            {actionData?.fieldErrors?.firstName && (
              <p className="text-sm text-red-500">{actionData.fieldErrors.firstName}</p>
            )}
          </div>

          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="lastName">Last Name</Label>
            <Input type="text" name="lastName" autoComplete="family-name" required />

            {actionData?.fieldErrors?.lastName && (
              <p className="text-sm text-red-500">{actionData.fieldErrors.lastName}</p>
            )}
          </div>

          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="email">Email Address</Label>
            <Input name="email" type="email" autoComplete="email" required />

            {actionData?.fieldErrors?.email && (
              <p className="text-sm text-red-500">{actionData.fieldErrors.email}</p>
            )}
          </div>

          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="phoneNo">Phone Number</Label>
            <Input type="number" name="phoneNo" required />

            {actionData?.fieldErrors?.phoneNo && (
              <p className="text-sm text-red-500">{actionData.fieldErrors.phoneNo}</p>
            )}
          </div>

          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="address">Address</Label>
            <Textarea name="address" required />

            {actionData?.fieldErrors?.address && (
              <p className="text-sm text-red-500">{actionData.fieldErrors.address}</p>
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
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              type="password"
              name="confirmPassword"
              autoComplete="current-password"
              required
            />

            {actionData?.fieldErrors?.password && (
              <p className="text-sm text-red-500">{actionData.fieldErrors.password}</p>
            )}
          </div>

          <Button type="submit" color="orange">
            Register
          </Button>
        </fieldset>
      </Form>
    </div>
  );
}
