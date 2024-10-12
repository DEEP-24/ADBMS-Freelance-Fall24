import type { FoodTruck, Item } from "@prisma/client";
import { useMatches } from "@remix-run/react";
import * as React from "react";
import type { RootLoaderData } from "~/root";
import type { AppLoaderData } from "~/routes/_app+/_layout";
/**
 * This base hook is used in other hooks to quickly search for specific data
 * across all loader data using useMatches.
 * @param {string} routeId The route id
 * @returns {JSON|undefined} The router data or undefined if not found
 */
export function useMatchesData(routeId: string): Record<string, unknown> | undefined {
  const matchingRoutes = useMatches();

  const route = React.useMemo(
    () => matchingRoutes.find((route) => route.id === routeId),
    [matchingRoutes, routeId],
  );
  return route?.data;
}

export function useOptionalUser() {
  return useMatchesData("root") as RootLoaderData;
}

export function useUser() {
  const { user } = useOptionalUser();
  if (!user) {
    throw new Error("No user found");
  }

  return { user };
}

export type useUserType = ReturnType<typeof useUser>;

export function useAppData() {
  return useMatchesData("routes/_app+/_layout") as AppLoaderData;
}

export function useFoodTruck(slug: FoodTruck["slug"]) {
  const { foodTrucks } = useAppData();
  const foodTruck = foodTrucks.find((foodTruck) => foodTruck.slug === slug);

  return foodTruck;
}

export type useFoodTruckType = ReturnType<typeof useFoodTruck>;

export function useItem(slug: Item["slug"]) {
  const { items } = useAppData();
  const item = items.find((item) => item.slug === slug);

  return item;
}

type ReturnType<T> = [T, React.Dispatch<React.SetStateAction<T>>];

export function useLocalStorageState<T>({
  key,
  defaultValue,
}: {
  key: string;
  defaultValue: T;
}): ReturnType<T> {
  const [state, setState] = React.useState<T>(() => {
    try {
      const localStorageValue = window.localStorage.getItem(key);
      if (localStorageValue) {
        return JSON.parse(localStorageValue);
      }
      window.localStorage.setItem(key, JSON.stringify(defaultValue));
      return defaultValue;
    } catch (error) {
      console.error("Error reading from localStorage:", error);
      return defaultValue;
    }
  });

  React.useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.error("Error writing to localStorage:", error);
    }
  }, [key, state]);

  return [state, setState];
}
