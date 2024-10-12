import { XMarkIcon } from "@heroicons/react/24/solid";
import { Role } from "@prisma/client";
import { DialogTrigger } from "@radix-ui/react-dialog";
import type { ActionFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import * as React from "react";
import { TailwindContainer } from "~/components/TailwindContainer";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { db } from "~/lib/db.server";
import { createCustomer, getUserByEmail } from "~/lib/user.server";
import { badRequest, validateEmail, validateName } from "~/utils/misc.server";

export const loader = async () => {
  const users = await db.user.findMany({
    where: {
      role: Role.CUSTOMER,
    },
  });

  return json({ users });
};

interface ActionData {
  success?: boolean;
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

  await createCustomer({
    email,
    password,
    firstName,
    lastName,
    address,
    phoneNo,
  });

  return json({
    message: "User created successfully",
    success: true,
  });
};

export default function ManageEmployees() {
  const { users } = useLoaderData<typeof loader>();

  const [search, setSearch] = React.useState("");

  const filteredUsers = React.useMemo(() => {
    if (!search) {
      return users;
    }

    return users.filter((user) => {
      const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
      return fullName.includes(search.toLowerCase());
    });
  }, [search, users]);

  const [isModalOpen, setIsModalOpen] = React.useState(false);

  const transition = useNavigation();
  const actionData = useActionData<ActionData>();
  const isSubmitting = transition.state !== "idle";

  React.useEffect(() => {
    if (isSubmitting) {
      return;
    }

    if (!actionData) {
      return;
    }

    if (actionData.success) {
      setIsModalOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionData, isSubmitting]);

  return (
    <>
      <TailwindContainer className="rounded-md">
        <div className="mt-8 px-4 py-10 sm:px-6 lg:px-8">
          <div className="sm:flex sm:flex-auto sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Customer</h1>
            </div>

            <div className="flex items-center gap-2">
              <Input
                type="text"
                placeholder="Search"
                className="w-full sm:w-64"
                value={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
              />
              {search && (
                <Button color="blue" className="ml-2" onClick={() => setSearch("")}>
                  <XMarkIcon className="h-4 w-4" />
                </Button>
              )}

              <Button
                onClick={() => setIsModalOpen(true)}
                className="bg-orange-500 text-white hover:bg-orange-400"
              >
                New Customer
              </Button>
            </div>
          </div>

          <div className="mt-8 flex flex-col">
            <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead>
                    <tr>
                      <th
                        scope="col"
                        className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 md:pl-0"
                      >
                        Name
                      </th>

                      <th
                        scope="col"
                        className="hidden py-3.5 px-3 text-left text-sm font-semibold text-gray-900 sm:table-cell"
                      >
                        Email
                      </th>

                      <th
                        scope="col"
                        className="hidden py-3.5 px-3 text-left text-sm font-semibold text-gray-900 sm:table-cell"
                      >
                        Phone
                      </th>
                      <th
                        scope="col"
                        className="hidden py-3.5 px-3 text-left text-sm font-semibold text-gray-900 sm:table-cell"
                      >
                        Address
                      </th>
                      <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6 md:pr-0" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredUsers.map((user) => (
                      <tr key={user.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 md:pl-0">
                          {user.firstName} {user.lastName}
                        </td>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 md:pl-0">
                          {user.email}
                        </td>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 md:pl-0">
                          {user.phoneNo}
                        </td>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 md:pl-0">
                          {user.address}
                        </td>
                        <td className="relative space-x-4 whitespace-nowrap py-4 pl-3 pr-4 text-left text-sm font-medium sm:pr-6 md:pr-0">
                          <Button size="sm" color="blue" asChild>
                            <Link to={user.id}>Start order</Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </TailwindContainer>

      <Dialog open={isModalOpen} onOpenChange={() => setIsModalOpen(false)}>
        <DialogContent>
          <DialogHeader>New Customer</DialogHeader>
          <Form replace method="post" className="mt-8">
            <fieldset
              disabled={isSubmitting}
              className="flex flex-col gap-4 items-center justify-center"
            >
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="firstName">First Name</Label>
                <Input type="text" name="firstName" autoComplete="given-name" required />

                {actionData?.fieldErrors?.firstName && (
                  <p className="text-red-500 text-sm">{actionData.fieldErrors.firstName}</p>
                )}
              </div>

              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="lastName">Last Name</Label>
                <Input type="text" name="lastName" autoComplete="family-name" required />

                {actionData?.fieldErrors?.lastName && (
                  <p className="text-red-500 text-sm">{actionData.fieldErrors.lastName}</p>
                )}
              </div>

              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input name="email" type="email" autoComplete="email" required />

                {actionData?.fieldErrors?.email && (
                  <p className="text-red-500 text-sm">{actionData.fieldErrors.email}</p>
                )}
              </div>

              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="phoneNo">Phone number</Label>
                <Input type="tel" name="phoneNo" required />

                {actionData?.fieldErrors?.phoneNo && (
                  <p className="text-red-500 text-sm">{actionData.fieldErrors.phoneNo}</p>
                )}
              </div>

              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="address">Address</Label>
                <Textarea name="address" required />

                {actionData?.fieldErrors?.address && (
                  <p className="text-red-500 text-sm">{actionData.fieldErrors.address}</p>
                )}
              </div>

              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="password">Password</Label>
                <Input type="password" name="password" autoComplete="current-password" required />

                {actionData?.fieldErrors?.password && (
                  <p className="text-red-500 text-sm">{actionData.fieldErrors.password}</p>
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
                  <p className="text-red-500 text-sm">{actionData.fieldErrors.password}</p>
                )}
              </div>

              <DialogFooter>
                <div className="mt-1 flex items-center justify-end gap-4">
                  <DialogClose asChild>
                    <Button disabled={isSubmitting} variant="destructive">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button type="submit">Register</Button>
                </div>
              </DialogFooter>
            </fieldset>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
