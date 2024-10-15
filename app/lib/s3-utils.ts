import invariant from "tiny-invariant";

declare global {
  interface Window {
    ENV: {
      AWS_REGION: string;
      AWS_BUCKET: string;
    };
  }
}

const REGION = "us-west-2";
const BUCKET = "s3freelance";

invariant(REGION, "Missing AWS_REGION");
invariant(BUCKET, "Missing AWS_BUCKET");

/**
 * Returns a unique filename for S3
 */

export function getUniqueS3Key(fileName: string, extension?: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);

  // Use string manipulation instead of path.basename
  const baseFileName = fileName.split(".").slice(0, -1).join(".");
  const fileExtension = extension || fileName.split(".").pop() || "";

  return `${baseFileName}-${timestamp}-${randomString}.${fileExtension}`;
}

interface S3UrlOptions {
  bucket: string;
  region: string;
}

/**
 * Default options for the S3 Url function
 */
const defaultS3UrlOptions: S3UrlOptions = {
  bucket: BUCKET,
  region: REGION,
};

/**
 * Generates a URL for accessing an object in an S3 bucket.
 */
export function getS3Url(
  key: string,
  options: Partial<S3UrlOptions> = defaultS3UrlOptions,
): string {
  const { bucket, region } = { ...defaultS3UrlOptions, ...options };
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}
