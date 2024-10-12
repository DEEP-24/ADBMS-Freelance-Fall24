import bcrypt from "bcryptjs";

export function round(number: number, precision: number) {
  const d = 10 ** precision;
  return Math.round((number + Number.EPSILON) * d) / d;
}

export function titleCase(string: string) {
  string = string.toLowerCase();
  const wordsArray = string.split(" ");

  for (let i = 0; i < wordsArray.length; i++) {
    wordsArray[i] = wordsArray[i].charAt(0).toUpperCase() + wordsArray[i].slice(1);
  }

  return wordsArray.join(" ");
}

export function createPasswordHash(password: string) {
  return bcrypt.hash(password, 10);
}

export function formatDate(date: string | Date) {
  const _date = new Date(date);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(_date);
}

// format time using intl.DateTimeFormat
export function formatTime(date: string | Date) {
  const _time = new Date(date);
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  }).format(_time);
}

export const daysOfWeek = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
