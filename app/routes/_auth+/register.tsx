import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useSearchParams } from "@remix-run/react";
import * as React from "react";
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
import { Textarea } from "~/components/ui/textarea";
import { createCustomer, getCustomerByEmail } from "~/lib/customer.server";
import { createEditor, getEditorByEmail } from "~/lib/editor.server";
import { createUserSession, getUserId } from "~/lib/session.server";
import { RegisterSchema } from "~/lib/zod.schema";
import { UserRole } from "~/roles";
import { badRequest } from "~/utils/misc.server";
import { type inferErrors, validateAction } from "~/utils/validation";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const userId = await getUserId(request);
  if (userId) {
    return redirect("/");
  }
  return null;
};

export const meta: MetaFunction = () => {
  return [
    {
      title: "Artify | Register",
    },
  ];
};

interface ActionData {
  fieldErrors?: inferErrors<typeof RegisterSchema>;
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const { fieldErrors, fields } = await validateAction(request, RegisterSchema);

  if (fieldErrors) {
    return badRequest<ActionData>({ fieldErrors });
  }

  const {
    email,
    password,
    confirmPassword,
    role,
    firstName,
    lastName,
    dob,
    phoneNo,
    address,
    experience,
    portfolio,
    skills,
    awards,
  } = fields;

  if (password !== confirmPassword) {
    return badRequest<ActionData>({
      fieldErrors: { confirmPassword: "Passwords do not match" },
    });
  }

  if (role === UserRole.CUSTOMER) {
    const existingCustomer = await getCustomerByEmail(email);
    if (existingCustomer) {
      return badRequest<ActionData>({
        fieldErrors: { email: "A user already exists with this email" },
      });
    }

    const user = await createCustomer({
      email,
      password,
      firstName,
      lastName,
      dob: new Date(dob),
      phoneNo,
      address,
    });

    if (!user) {
      return badRequest<ActionData>({
        fieldErrors: { email: "An unknown error occurred" },
      });
    }

    return createUserSession({
      request,
      userId: user.id,
      role: UserRole.CUSTOMER,
      remember: false,
      redirectTo: "/customer",
    });
  }
  if (role === UserRole.EDITOR) {
    const existingEditor = await getEditorByEmail(email);
    if (existingEditor) {
      return badRequest<ActionData>({
        fieldErrors: { email: "A user already exists with this email" },
      });
    }

    const user = await createEditor({
      email,
      password,
      firstName,
      lastName,
      experience: experience || "",
      portfolio: portfolio || "",
      skills: skills || "",
      awards: awards || "",
      dob: new Date(dob),
      phoneNo,
      address,
    });

    if (!user) {
      return badRequest<ActionData>({
        fieldErrors: { email: "An unknown error occurred" },
      });
    }

    return createUserSession({
      request,
      userId: user.id,
      role: UserRole.EDITOR,
      remember: false,
      redirectTo: "/editor",
    });
  }

  return badRequest<ActionData>({ fieldErrors: { role: "Invalid role selected" } });
};

export default function Register() {
  const [searchParams] = useSearchParams();
  const actionData = useActionData<ActionData>();
  const [role, setRole] = React.useState<UserRole>(UserRole.CUSTOMER);

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-r from-blue-100 to-purple-100 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Create an account</CardTitle>
          <CardDescription className="text-center">Enter your details to register</CardDescription>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="role">Role</Label>
                <Select name="role" value={role} onValueChange={(val) => setRole(val as UserRole)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(UserRole)
                      .filter((r) => r !== UserRole.ADMIN)
                      .map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {actionData?.fieldErrors?.role && (
                  <p className="text-sm text-red-500">{actionData.fieldErrors.role}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" name="firstName" type="text" required />
                {actionData?.fieldErrors?.firstName && (
                  <p className="text-sm text-red-500">{actionData.fieldErrors.firstName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" name="lastName" type="text" required />
                {actionData?.fieldErrors?.lastName && (
                  <p className="text-sm text-red-500">{actionData.fieldErrors.lastName}</p>
                )}
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required />
                {actionData?.fieldErrors?.email && (
                  <p className="text-sm text-red-500">{actionData.fieldErrors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" required />
                {actionData?.fieldErrors?.password && (
                  <p className="text-sm text-red-500">{actionData.fieldErrors.password}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input id="confirmPassword" name="confirmPassword" type="password" required />
                {actionData?.fieldErrors?.confirmPassword && (
                  <p className="text-sm text-red-500">{actionData.fieldErrors.confirmPassword}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth</Label>
                <Input id="dob" name="dob" type="date" required />
                {actionData?.fieldErrors?.dob && (
                  <p className="text-sm text-red-500">{actionData.fieldErrors.dob}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNo">Phone Number</Label>
                <Input id="phoneNo" name="phoneNo" type="tel" required />
                {actionData?.fieldErrors?.phoneNo && (
                  <p className="text-sm text-red-500">{actionData.fieldErrors.phoneNo}</p>
                )}
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" name="address" type="text" required />
                {actionData?.fieldErrors?.address && (
                  <p className="text-sm text-red-500">{actionData.fieldErrors.address}</p>
                )}
              </div>

              {role === UserRole.EDITOR && (
                <>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="experience">Experience</Label>
                    <Input id="experience" name="experience" type="text" />
                    {actionData?.fieldErrors?.experience && (
                      <p className="text-sm text-red-500">{actionData.fieldErrors.experience}</p>
                    )}
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="portfolio">Portfolio</Label>
                    <Input id="portfolio" name="portfolio" type="text" />
                    {actionData?.fieldErrors?.portfolio && (
                      <p className="text-sm text-red-500">{actionData.fieldErrors.portfolio}</p>
                    )}
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="skills">Skills</Label>
                    <Textarea id="skills" name="skills" />
                    {actionData?.fieldErrors?.skills && (
                      <p className="text-sm text-red-500">{actionData.fieldErrors.skills}</p>
                    )}
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="awards">Awards</Label>
                    <Textarea id="awards" name="awards" />
                    {actionData?.fieldErrors?.awards && (
                      <p className="text-sm text-red-500">{actionData.fieldErrors.awards}</p>
                    )}
                  </div>
                </>
              )}
            </div>

            <Button type="submit" className="w-full">
              Register
            </Button>
          </Form>
          <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link
              className="text-primary underline hover:text-primary/80"
              to={{
                pathname: "/login",
                search: searchParams.toString(),
              }}
            >
              Log in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
