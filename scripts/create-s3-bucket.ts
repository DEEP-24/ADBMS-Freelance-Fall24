import invariant from "tiny-invariant";
import { createS3Bucket } from "~/lib/s3.server";

const BUCKET_NAME = "s3freelance";

async function main() {
  const AWS_REGION = process.env.AWS_REGION;

  invariant(AWS_REGION, "AWS_REGION is not defined");
  invariant(BUCKET_NAME, "BUCKET_NAME is not defined");

  await createS3Bucket({
    name: BUCKET_NAME,
    region: "us-west-2",
  });
}

main()
  .then(() => console.log(`S3 bucket - "${BUCKET_NAME}" created 🚀`))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
