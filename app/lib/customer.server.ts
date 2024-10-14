import type { Customer } from "@prisma/client";
import bcrypt from "bcryptjs";
import { db } from "~/lib/db.server";
import { getUserId, logout } from "~/lib/session.server";
export async function verifyCustomerLogin({
  email,
  password,
}: {
  email: Customer["email"];
  password: string;
}) {
  const customerWithPassword = await db.customer.findUnique({
    where: { email },
  });

  if (!customerWithPassword || !customerWithPassword.password) {
    return null;
  }

  const isValid = await bcrypt.compare(password, customerWithPassword.password);

  if (!isValid) {
    return null;
  }

  const { password: _password, ...customerWithoutPassword } = customerWithPassword;

  return customerWithoutPassword;
}

export async function getCustomerById(id: Customer["id"]) {
  return db.customer.findUnique({
    where: { id },
  });
}

export async function getCustomer(request: Request) {
  const customerId = await getUserId(request);
  if (customerId === undefined) {
    return null;
  }

  const customer = await getCustomerById(customerId);
  if (customer) {
    return customer;
  }

  throw await logout(request);
}

export async function getCustomerByEmail(email: Customer["email"]) {
  return db.customer.findUnique({
    where: { email },
    select: {
      firstName: true,
      lastName: true,
      email: true,
    },
  });
}

export async function createCustomer({
  firstName,
  lastName,
  email,
  password,
  dob,
  phoneNo,
  address,
}: {
  firstName: Customer["firstName"];
  lastName: Customer["lastName"];
  email: Customer["email"];
  password: string;
  dob: Customer["dob"];
  phoneNo: Customer["phoneNo"];
  address: Customer["address"];
}) {
  const hashedPassword = await bcrypt.hash(password, 10);
  const customer = await db.customer.create({
    data: {
      firstName,
      lastName,
      email,
      password: hashedPassword,
      dob,
      phoneNo,
      address,
    },
  });

  return customer;
}
