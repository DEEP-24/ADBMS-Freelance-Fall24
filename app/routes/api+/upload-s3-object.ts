import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { getS3SignedUrl } from "~/lib/s3.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const { searchParams } = url;

  const key = searchParams.get("key");
  if (!key) {
    return json({ error: "No key provided" });
  }

  const encodedKey = encodeURIComponent(key);
  const signedUrl = await getS3SignedUrl(encodedKey);

  return json({ signedUrl });
};
