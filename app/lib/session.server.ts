import { createCookieSessionStorage, redirect } from "@remix-run/node";
import invariant from "tiny-invariant";
import { getAdminById } from "~/lib/admin.server";
import { getCustomerById } from "~/lib/customer.server";
import { getEditorById } from "~/lib/editor.server";
import { UserRole } from "~/roles";

const SESSION_SECRET = process.env.SESSION_SECRET;

invariant(SESSION_SECRET, "SESSION_SECRET must be set");

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__session",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: [SESSION_SECRET],
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  },
});

const USER_SESSION_KEY = "userId";
const USER_ROLE_KEY = "userRole";

export async function getSession(request: Request) {
  const cookie = request.headers.get("Cookie");
  return sessionStorage.getSession(cookie);
}

export async function getUserId(request: Request): Promise<string | undefined> {
  const session = await getSession(request);
  const userId = session.get(USER_SESSION_KEY);

  return userId;
}

export async function getUserRole(request: Request): Promise<string | undefined> {
  const session = await getSession(request);
  const role = session.get(USER_ROLE_KEY);
  return role;
}

// get the user from the database with the userId
export async function getUser(request: Request) {
  const userId = await getUserId(request);
  if (userId === undefined) {
    return null;
  }

  const userRole = await getUserRole(request);

  if (userRole === UserRole.CUSTOMER) {
    return await getCustomerById(userId);
  }
  if (userRole === UserRole.ADMIN) {
    return await getAdminById(userId);
  }
  if (userRole === UserRole.EDITOR) {
    return await getEditorById(userId);
  }

  return null;
}

export async function requireUserId(
  request: Request,
  redirectTo: string = new URL(request.url).pathname,
) {
  const userId = await getUserId(request);
  if (!userId) {
    const searchParams = new URLSearchParams([["redirectTo", redirectTo]]);
    throw redirect(`/login?${searchParams}`);
  }
  return userId;
}

export async function createUserSession({
  request,
  userId,
  role,
  remember,
  redirectTo,
}: {
  request: Request;
  userId: string;
  role: string;
  remember: boolean;
  redirectTo: string;
}) {
  const session = await getSession(request);
  session.set(USER_SESSION_KEY, userId);
  session.set(USER_ROLE_KEY, role);
  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await sessionStorage.commitSession(session, {
        maxAge: remember
          ? 60 * 60 * 24 * 30 // 30 days
          : 60 * 60 * 24 * 7, // 7 days (default)
      }),
    },
  });
}

export async function logout(request: Request) {
  const session = await getSession(request);

  session.unset(USER_SESSION_KEY);
  session.unset(USER_ROLE_KEY);

  return redirect("/", {
    headers: {
      "Set-Cookie": await sessionStorage.destroySession(session),
    },
  });
}
