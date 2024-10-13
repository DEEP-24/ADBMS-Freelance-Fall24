import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useSearchParams } from "@remix-run/react";
import * as React from "react";
import { useEffect, useRef } from "react";
import { createCustomer, getCustomerByEmail } from "~/lib/customer.server";
import { createEditor, getEditorByEmail } from "~/lib/editor.server";
import { UserRole } from "~/roles";

import { ArrowLeft } from "lucide-react";
import { Button } from "~/components/ui/button";
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
import {
  createUserSession,
  getUserId,
  getUserRole,
  isAdmin,
  isCustomer,
  isEditor,
} from "~/lib/session.server";
import { safeRedirect, validateEmail } from "~/utils/misc.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
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
};

export const meta: MetaFunction = () => {
  return [
    {
      title: "Artify | Register",
    },
  ];
};

type ActionData = {
  errors?: {
    firstName?: string;
    lastName?: string;
    dob?: string;
    phoneNo?: string;
    address?: string;
    email?: string;
    password?: string;
    experience?: string;
    portfolio?: string;
    skills?: string;
    awards?: string;
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const searchParams = new URL(request.url).searchParams;
  const redirectTo = searchParams.get("redirectTo");
  const formData = await request.formData();
  const role = formData.get("role")?.toString();
  const firstName = formData.get("firstName")?.toString();
  const lastName = formData.get("lastName")?.toString();
  const dob = formData.get("dob")?.toString();
  const phoneNo = formData.get("phoneNo")?.toString();
  const address = formData.get("address")?.toString();
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const experience = formData.get("experience")?.toString();
  const portfolio = formData.get("portfolio")?.toString();
  const skills = formData.get("skills")?.toString();
  const awards = formData.get("awards")?.toString();

  if (!role) {
    return json(
      {
        errors: {
          role: "Role is required",
          email: null,
          password: null,
        },
      },
      400,
    );
  }
  if (!firstName) {
    return json(
      {
        errors: {
          firstName: "First Name is required",
          email: null,
          password: null,
        },
      },
      400,
    );
  }
  if (!lastName) {
    return json(
      {
        errors: {
          lastName: "Last Name is required",
          email: null,
          password: null,
        },
      },
      400,
    );
  }

  if (!dob) {
    return json(
      {
        errors: {
          dob: "Date of Birth is required",
          email: null,
          password: null,
        },
      },
      400,
    );
  }

  if (!phoneNo) {
    return json(
      {
        errors: {
          phoneNo: "Phone Number is required",
          email: null,
          password: null,
        },
      },
      400,
    );
  }

  if (!address) {
    return json(
      {
        errors: {
          address: "Address is required",
          email: null,
          password: null,
        },
      },
      400,
    );
  }

  if (!validateEmail(email)) {
    return json(
      {
        errors: {
          email: "Email is invalid",
          password: null,
          firstName: null,
          lastName: null,
          dob: null,
          phoneNo: null,
          address: null,
        },
      },
      400,
    );
  }

  if (typeof password !== "string" || password.length === 0) {
    return json(
      {
        errors: {
          email: null,
          password: "Password is required",
          firstName: null,
          lastName: null,
          dob: null,
          phoneNo: null,
          address: null,
        },
      },
      400,
    );
  }

  if (password.length < 8) {
    return json(
      {
        errors: {
          email: null,
          password: "Password is too short",
          firstName: null,
          lastName: null,
          dob: null,
          phoneNo: null,
          address: null,
        },
      },
      400,
    );
  }

  if (role === UserRole.CUSTOMER) {
    const existingCustomer = await getCustomerByEmail(email);
    if (existingCustomer) {
      return json(
        {
          errors: {
            email: "An user alreadys exists with this email",
            password: null,
            firstName: null,
            lastName: null,
            dob: null,
            phoneNo: null,
            address: null,
          },
        },
        400,
      );
    }

    const user = await createCustomer({
      email,
      password,
      firstName: firstName ?? "",
      lastName: lastName ?? "",
      dob: new Date(dob ?? ""),
      phoneNo: phoneNo ?? "",
      address: address ?? "",
    });

    if (!user) {
      return json(
        {
          errors: {
            email: "An unknown error occurred",
            password: "An unknown error occurred",
            firstName: null,
          },
        },
        { status: 500 },
      );
    }

    return createUserSession({
      request,
      userId: user.id,
      role: role as UserRole,
      redirectTo: safeRedirect(redirectTo),
    });
  }

  if (!experience) {
    return json<ActionData>(
      {
        errors: {
          experience: "Experience is required",
        },
      },
      400,
    );
  }

  if (!portfolio) {
    return json<ActionData>(
      {
        errors: {
          portfolio: "Portfolio is required",
        },
      },
      400,
    );
  }

  if (!skills) {
    return json<ActionData>(
      {
        errors: {
          skills: "Skills is required",
        },
      },
      400,
    );
  }

  if (!awards) {
    return json<ActionData>(
      {
        errors: {
          awards: "Awards is required",
        },
      },
      400,
    );
  }

  const existingEditor = await getEditorByEmail(email);
  if (existingEditor) {
    return json(
      {
        errors: {
          email: "An user already exists with this email",
          password: null,
          name: null,
        },
      },
      400,
    );
  }

  const user = await createEditor({
    email,
    password,
    firstName: firstName ?? "",
    lastName: lastName ?? "",
    experience,
    portfolio,
    skills,
    awards,
    dob: new Date(dob ?? ""),
    phoneNo: phoneNo ?? "",
    address: address ?? "",
  });

  if (!user) {
    return json(
      {
        errors: {
          email: "An unknown error occurred",
          password: "An unknown error occurred",
          name: null,
        },
      },
      { status: 500 },
    );
  }

  return createUserSession({
    request,
    userId: user.id,
    role: role as UserRole,
    redirectTo: safeRedirect(redirectTo),
  });
};

export default function Register() {
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo");
  const actionData = useActionData<ActionData>();
  const firstNameRef = useRef<HTMLInputElement>(null);
  const lastNameRef = useRef<HTMLInputElement>(null);
  const dobRef = useRef<HTMLInputElement>(null);
  const phoneNoRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const [role, setRole] = React.useState(UserRole.CUSTOMER);

  useEffect(() => {
    if (actionData?.errors?.firstName) {
      firstNameRef.current?.focus();
    } else if (actionData?.errors?.lastName) {
      lastNameRef.current?.focus();
    } else if (actionData?.errors?.dob) {
      dobRef.current?.focus();
    } else if (actionData?.errors?.phoneNo) {
      phoneNoRef.current?.focus();
    } else if (actionData?.errors?.address) {
      addressRef.current?.focus();
    } else if (actionData?.errors?.email) {
      emailRef.current?.focus();
    } else if (actionData?.errors?.password) {
      passwordRef.current?.focus();
    }
  }, [actionData]);

  return (
    <div className="relative isolate flex min-h-full flex-col justify-center">
      <div className="absolute inset-0 bg-black">
        <img src="/img/login-bg.png" alt="Login-bg" className="h-full w-full object-cover" />
      </div>
      <div className="relative mb-4 flex items-center justify-center gap-3">
        <Button variant="ghost" asChild>
          <Link to="/">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <span className="text-base text-white underline">Back to home</span>
      </div>
      <div className="relative mx-auto w-full max-w-md rounded-lg border-2 border-white p-6 px-8">
        <h3 className="text-center text-3xl text-gray-300 pb-4">Register!</h3>
        <Form method="post" className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select name="role" value={role} onValueChange={(val) => setRole(val as UserRole)}>
              <SelectTrigger>
                <SelectValue placeholder="Select your role" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(UserRole)
                  .filter((role) => role !== UserRole.ADMIN)
                  .map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              ref={firstNameRef}
              id="firstName"
              name="firstName"
              type="text"
              autoComplete="firstName"
              aria-invalid={actionData?.errors?.firstName ? true : undefined}
              aria-describedby="firstName-error"
            />
            {actionData?.errors?.firstName && (
              <p className="text-sm text-red-500" id="firstName-error">
                {actionData.errors.firstName}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              ref={lastNameRef}
              id="lastName"
              name="lastName"
              type="text"
              autoComplete="lastName"
              aria-invalid={actionData?.errors?.lastName ? true : undefined}
              aria-describedby="lastName-error"
            />
            {actionData?.errors?.lastName && (
              <p className="text-sm text-red-500" id="lastName-error">
                {actionData.errors.lastName}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              ref={emailRef}
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              aria-invalid={actionData?.errors?.email ? true : undefined}
              aria-describedby="email-error"
            />
            {actionData?.errors?.email && (
              <p className="text-sm text-red-500" id="email-error">
                {actionData.errors.email}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              ref={passwordRef}
              name="password"
              type="password"
              autoComplete="new-password"
              aria-invalid={actionData?.errors?.password ? true : undefined}
              aria-describedby="password-error"
            />
            {actionData?.errors?.password && (
              <p className="text-sm text-red-500" id="password-error">
                {actionData.errors.password}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="dob">Date of Birth</Label>
            <Input
              ref={dobRef}
              id="dob"
              name="dob"
              type="date"
              autoComplete="dob"
              aria-invalid={actionData?.errors?.dob ? true : undefined}
              aria-describedby="dob-error"
            />
            {actionData?.errors?.dob && (
              <p className="text-sm text-red-500" id="dob-error">
                {actionData.errors.dob}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNo">Phone Number</Label>
            <Input
              ref={phoneNoRef}
              id="phoneNo"
              name="phoneNo"
              type="text"
              autoComplete="phoneNo"
              aria-invalid={actionData?.errors?.phoneNo ? true : undefined}
              aria-describedby="phoneNo-error"
            />
            {actionData?.errors?.phoneNo && (
              <p className="text-sm text-red-500" id="phoneNo-error">
                {actionData.errors.phoneNo}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              ref={addressRef}
              id="address"
              name="address"
              type="text"
              autoComplete="address"
              aria-invalid={actionData?.errors?.address ? true : undefined}
              aria-describedby="address-error"
            />
            {actionData?.errors?.address && (
              <p className="text-sm text-red-500" id="address-error">
                {actionData.errors.address}
              </p>
            )}
          </div>

          {role === UserRole.EDITOR && (
            <>
              <div className="space-y-2">
                <Label htmlFor="experience">Experience</Label>
                <Input
                  id="experience"
                  name="experience"
                  aria-invalid={actionData?.errors?.experience ? true : undefined}
                  aria-describedby="experience-error"
                />
                {actionData?.errors?.experience && (
                  <p className="text-sm text-red-500" id="experience-error">
                    {actionData.errors.experience}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="portfolio">Portfolio</Label>
                <Input
                  id="portfolio"
                  name="portfolio"
                  aria-invalid={actionData?.errors?.portfolio ? true : undefined}
                  aria-describedby="portfolio-error"
                />
                {actionData?.errors?.portfolio && (
                  <p className="text-sm text-red-500" id="portfolio-error">
                    {actionData.errors.portfolio}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="skills">Skills</Label>
                <Textarea
                  id="skills"
                  name="skills"
                  aria-invalid={actionData?.errors?.skills ? true : undefined}
                  aria-describedby="skills-error"
                />
                {actionData?.errors?.skills && (
                  <p className="text-sm text-red-500" id="skills-error">
                    {actionData.errors.skills}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="awards">Awards</Label>
                <Textarea
                  id="awards"
                  name="awards"
                  aria-invalid={actionData?.errors?.awards ? true : undefined}
                  aria-describedby="awards-error"
                />
                {actionData?.errors?.awards && (
                  <p className="text-sm text-red-500" id="awards-error">
                    {actionData.errors.awards}
                  </p>
                )}
              </div>
            </>
          )}

          <input type="hidden" name="redirectTo" defaultValue={redirectTo ?? ""} />

          <Button type="submit" className="w-full">
            Sign up
          </Button>
          <div className="text-center text-sm text-gray-300">
            Already have an account?{" "}
            <Link
              className="text-gray-300 underline hover:text-gray-500"
              to={{
                pathname: "/login",
                search: searchParams.toString(),
              }}
            >
              Log in
            </Link>
          </div>
        </Form>
      </div>
    </div>
  );
}
