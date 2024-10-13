import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Separator } from "~/components/ui/separator";
import { Textarea } from "~/components/ui/textarea";
import { db } from "~/lib/db.server";
import { requireUserId } from "~/lib/session.server";
import { formatDate } from "~/utils/misc";
import { badRequest } from "~/utils/misc.server";
import { type inferErrors, validateAction } from "~/utils/validation";

const CreateBidSchema = z.object({
  postId: z.string(),
  price: z.string().min(1, "Price must be a positive number"),
  comment: z.string().min(1, "Comment is required"),
});

export async function loader({ params }: LoaderFunctionArgs) {
  const post = await db.post.findUnique({
    where: {
      id: params.postId,
    },
    include: {
      customer: true,
      category: true,
    },
  });

  if (!post) {
    return redirect("/editor/posts");
  }

  return json({
    post: post,
  });
}

interface ActionData {
  success: boolean;
  fieldErrors?: inferErrors<typeof CreateBidSchema>;
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const userId = await requireUserId(request);

  if (!userId) {
    return redirect("/login");
  }

  const { fields, fieldErrors } = await validateAction(request, CreateBidSchema);

  if (fieldErrors) {
    return badRequest<ActionData>({ success: false, fieldErrors });
  }

  const { price, comment, postId } = fields;

  await db.bid.create({
    data: {
      price: Number(price),
      comment: comment,
      postId: postId,
      editorId: userId,
    },
  });

  return redirect("/editor/posts");
};

export const meta: MetaFunction = () => {
  return [
    {
      title: "Artify | Bid",
    },
  ];
};

export default function BidPage() {
  const { post } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<ActionData>();

  const isSubmitting = fetcher.state !== "idle";

  return (
    <div className="grid grid-cols-2 gap-4 bg-black p-4">
      <Card className="bg-black text-white">
        <CardHeader>
          <CardTitle>Post Information</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="divide-y divide-white/10">
            <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm font-medium leading-6 text-white">Title</dt>
              <dd className="mt-1 text-sm leading-6 text-gray-400 sm:col-span-2 sm:mt-0">
                {post.title}
              </dd>
            </div>
            <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm font-medium leading-6 text-white">Category</dt>
              <dd className="mt-1 text-sm leading-6 text-gray-400 sm:col-span-2 sm:mt-0">
                {post.category.name}
              </dd>
            </div>
            <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm font-medium leading-6 text-white">Description</dt>
              <dd className="mt-1 text-sm leading-6 text-gray-400 sm:col-span-2 sm:mt-0">
                {post.description}
              </dd>
            </div>
            <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm font-medium leading-6 text-white">Posted By</dt>
              <dd className="mt-1 text-sm leading-6 text-gray-400 sm:col-span-2 sm:mt-0">
                {post.customer.firstName} {post.customer.lastName}
              </dd>
            </div>
            <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm font-medium leading-6 text-white">Budget</dt>
              <dd className="mt-1 text-sm leading-6 text-gray-400 sm:col-span-2 sm:mt-0">
                ${post.budget}
              </dd>
            </div>
            <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm font-medium leading-6 text-white">Deadline</dt>
              <dd className="mt-1 text-sm leading-6 text-gray-400 sm:col-span-2 sm:mt-0">
                {formatDate(post.deadline)}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card className="bg-black text-white">
        <CardHeader>
          <CardTitle>Enter your Bid Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Separator className="my-4" />
          <fetcher.Form
            id="form"
            method="post"
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              fetcher.submit(formData, { method: "post" });
            }}
          >
            <fieldset disabled={isSubmitting} className="flex flex-col gap-4">
              <input type="hidden" name="postId" defaultValue={post?.id} />
              <div>
                <Input name="price" type="text" placeholder="Enter your bid price" />
                {fetcher.data?.fieldErrors?.price && (
                  <p className="text-sm text-red-500 mt-1">{fetcher.data.fieldErrors.price}</p>
                )}
              </div>
              <div>
                <Textarea
                  name="comment"
                  placeholder="Enter your comment"
                  className="min-h-[150px]"
                />
                {fetcher.data?.fieldErrors?.comment && (
                  <p className="text-sm text-red-500 mt-1">{fetcher.data.fieldErrors.comment}</p>
                )}
              </div>
              <Button type="submit" variant="destructive">
                Submit
              </Button>
            </fieldset>
          </fetcher.Form>
        </CardContent>
      </Card>
    </div>
  );
}
