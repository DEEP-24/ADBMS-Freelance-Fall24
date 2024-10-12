import * as React from "react";

import type { SerializeFrom } from "@remix-run/node";
import { type FetcherWithComponents, useFetcher } from "@remix-run/react";
import type { AppData } from "@remix-run/react/dist/data";

/**
 * A higher-order function that creates a new FetcherWithComponentsCallback instance, which extends the FetcherWithComponents interface.
 * The new instance includes an additional method `reset` that can be used to reset the state of the fetcher.
 * It also includes a boolean `isPending` property that indicates whether the fetcher is currently submitting.
 *
 * @template T - The type of data returned by the fetcher.
 * @param fetcherWithComponents - The FetcherWithComponents instance to be extended.
 * @returns A new FetcherWithComponentsCallback instance.
 */
export type FetcherWithComponentsCallback<T> = {
  isPending: boolean;
  reset: () => void;
} & FetcherWithComponents<T>;

export type FetcherResult<T = any> = {
  [extraProps: string]: any;
  data?: T;
  success: boolean;
};

type FetcherOptions<T> = {
  onError?: (data: SerializeFrom<T>) => void;
  onSuccess?: (data: SerializeFrom<T>) => void;
} & Parameters<typeof useFetcher>[0];

/**
 * Custom hook that wraps the useFetcher hook with the ability to provide callback and reset data.
 *
 * @param {Object} props - Optional options to pass to the useFetcher hook.
 * @returns {Object} - An object containing fetcher properties with added reset functionality and isPending boolean.
 */
export function useFetcherCallback<T = AppData>(
  props: FetcherOptions<T> = {},
): FetcherWithComponentsCallback<SerializeFrom<T>> {
  const fetcher = useFetcher<T>({
    key: props.key,
  });

  const [data, setData] = React.useState<SerializeFrom<T> | undefined>(fetcher.data);

  const successCallbackRef = React.useRef(props.onSuccess);
  const errorCallbackRef = React.useRef(props.onError);

  React.useEffect(() => {
    successCallbackRef.current = props.onSuccess;
    errorCallbackRef.current = props.onError;
  }, [props.onSuccess, props.onError]);

  React.useEffect(() => {
    if (fetcher.state === "idle") {
      setData(fetcher.data);
    }
  }, [fetcher.state, fetcher.data]);

  React.useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) {
      return;
    }
    setData(fetcher.data);

    // @ts-expect-error
    if (fetcher.data.success) {
      successCallbackRef.current?.(fetcher.data);
    } else {
      errorCallbackRef.current?.(fetcher.data);
    }
  }, [fetcher.data, fetcher.state]);

  return {
    ...fetcher,
    data,
    isPending: fetcher.state !== "idle",
    reset: () => setData(undefined),
  };
}
