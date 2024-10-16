import { PostStatus, ProjectStatus } from "@prisma/client";
import { useRouteLoaderData } from "@remix-run/react";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { UserRole } from "~/roles";
import type { RootLoaderData } from "~/root";

export function useOptionalUser() {
  const data = useRouteLoaderData("root") as RootLoaderData;

  if (Object.values(data).every((v) => v === null)) {
    return null;
  }

  if (data.admin) {
    return {
      id: data.admin.id,
      name: `${data.admin.firstName} ${data.admin.lastName}`,
      email: data.admin.email,
      role: UserRole.ADMIN,
    };
  }
  if (data.editor) {
    return {
      id: data.editor.id,
      name: `${data.editor.firstName} ${data.editor.lastName}`,
      email: data.editor.email,
      role: UserRole.EDITOR,
    };
  }
  if (data.customer) {
    return {
      id: data.customer.id,
      name: `${data.customer.firstName} ${data.customer.lastName}`,
      email: data.customer.email,
      role: UserRole.CUSTOMER,
    };
  }

  return null;
}

export const userRoleRedirect = {
  [UserRole.ADMIN]: "/admin",
  [UserRole.CUSTOMER]: "/customer",
  [UserRole.EDITOR]: "/editor",
} satisfies Record<UserRole, string>;

// export function formatDate(date: Date) {
//   return new Intl.DateTimeFormat("en-US", {
//     year: "numeric",
//     month: "long",
//     day: "numeric",
//     hour: "numeric",
//     minute: "numeric",
//   }).format(date)
// }

export function titleCase(input: string) {
  const wordsArray = input.toLowerCase().split(" ");

  for (let i = 0; i < wordsArray.length; i++) {
    wordsArray[i] = wordsArray[i].charAt(0).toUpperCase() + wordsArray[i].slice(1);
  }

  return wordsArray.join(" ");
}

export const toFixedDate = (date: Date | string) => {
  let _date: Date;
  if (date instanceof Date) {
    _date = date;
  } else {
    _date = new Date(date);
  }

  const fixedDate = new Date("2000-01-01T00:00:00Z");
  return new Date(
    fixedDate.getFullYear(),
    fixedDate.getMonth(),
    fixedDate.getDate(),
    _date.getHours(),
    _date.getMinutes(),
    _date.getSeconds(),
    _date.getMilliseconds(),
  );
};

export function formatDate(dateString: string) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export const postStatusLabelLookup: Record<PostStatus, string> = {
  [PostStatus.closed]: "Closed",
  [PostStatus.completed]: "Completed",
  [PostStatus.in_progress]: "In Progress",
  [PostStatus.open]: "Open",
};

export const postStatusColorLookup: Record<PostStatus, string> = {
  [PostStatus.closed]: "red",
  [PostStatus.completed]: "green",
  [PostStatus.in_progress]: "yellow",
  [PostStatus.open]: "blue",
};

export const projectStatusLabelLookup: Record<ProjectStatus, string> = {
  [ProjectStatus.in_progress]: "In Progress",
  [ProjectStatus.completed]: "Completed",
  [ProjectStatus.payment_pending]: "PaymentPending",
};

export const projectStatusColorLookup: Record<ProjectStatus, string> = {
  [ProjectStatus.in_progress]: "yellow",
  [ProjectStatus.completed]: "green",
  [ProjectStatus.payment_pending]: "red",
};

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
