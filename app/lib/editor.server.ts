import type { Editor } from "@prisma/client";
import bcrypt from "bcryptjs";
import { db } from "~/lib/db.server";

import { getUserId, logout } from "~/lib/session.server";

export async function verifyEditorLogin({
  email,
  password,
}: {
  email: Editor["email"];
  password: string;
}) {
  const editorWithPassword = await db.editor.findUnique({
    where: { email },
  });

  if (!editorWithPassword || !editorWithPassword.password) {
    return null;
  }

  const isValid = await bcrypt.compare(password, editorWithPassword.password);

  if (!isValid) {
    return null;
  }

  const { password: _password, ...editorWithoutPassword } = editorWithPassword;

  return editorWithoutPassword;
}

export async function getEditorById(id: Editor["id"]) {
  return db.editor.findUnique({
    where: { id },
  });
}

export async function getEditor(request: Request) {
  const editorId = await getUserId(request);
  if (editorId === undefined) {
    return null;
  }

  const editor = await getEditorById(editorId);
  if (editor) {
    return editor;
  }

  throw await logout(request);
}

export async function getEditorByEmail(email: Editor["email"]) {
  return db.editor.findUnique({
    where: { email },
    select: {
      firstName: true,
      lastName: true,
      email: true,
    },
  });
}

export async function createEditor({
  firstName,
  lastName,
  email,
  password,
  experience,
  portfolio,
  skills,
  awards,
  dob,
  phoneNo,
  address,
}: {
  firstName: Editor["firstName"];
  lastName: Editor["lastName"];
  email: Editor["email"];
  password: string;
  experience: Editor["experience"];
  portfolio: Editor["portfolio"];
  skills: Editor["skills"];
  awards: Editor["awards"];
  dob: Editor["dob"];
  phoneNo: Editor["phoneNo"];
  address: Editor["address"];
}) {
  const hashedPassword = await bcrypt.hash(password, 10);

  const editor = await db.editor.create({
    data: {
      firstName,
      lastName,
      email,
      password: hashedPassword,
      experience,
      portfolio,
      skills,
      awards,
      dob,
      phoneNo,
      address,
    },
  });

  return editor;
}
