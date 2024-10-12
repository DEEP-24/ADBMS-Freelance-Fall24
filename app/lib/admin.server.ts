import type { Admin } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { db } from "~/lib/db.server";
import { getUserId, logout } from "~/lib/session.server";
export async function verifyAdminLogin({
  email,
  password,
}: {
  email: Admin["email"];
  password: string;
}) {
  const adminWithPassword = await db.admin.findUnique({
    where: { email },
  });

  if (!adminWithPassword || !adminWithPassword.password) {
    return null;
  }

  const isValid = await bcrypt.compare(password, adminWithPassword.password);

  if (!isValid) {
    return null;
  }

  const { password: _password, ...adminWithoutPassword } = adminWithPassword;

  return adminWithoutPassword;
}

export async function getAdminById(id: Admin["id"]) {
  return db.admin.findUnique({
    where: { id },
  });
}

export async function getAdmin(request: Request) {
  const adminId = await getUserId(request);
  if (adminId === undefined) {
    return null;
  }

  const admin = await getAdminById(adminId);
  if (admin) {
    return admin;
  }

  throw await logout(request);
}
