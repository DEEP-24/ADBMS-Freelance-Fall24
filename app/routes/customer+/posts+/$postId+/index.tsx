import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { EyeIcon } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { db } from "~/lib/db.server";
import { requireUserId } from "~/lib/session.server";
import { formatDate } from "~/utils/misc";
import { badRequest } from "~/utils/misc.server";
import type { inferErrors } from "~/utils/validation";
import { validateAction } from "~/utils/validation";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Separator } from "~/components/ui/separator";

const createProjectSchema = z.object({
  postId: z.string().optional(),
  customerId: z.string().optional(),
  editorId: z.string().optional(),
  bidId: z.string().optional(),
  payment: z.string().optional(),
  intent: z.string().optional(),
});

export async function loader({ params }: LoaderFunctionArgs) {
  const post = await db.post.findUnique({
    where: {
      id: params.postId,
    },
    include: {
      customer: true,
      category: true,
      bids: {
        include: {
          editor: true,
        },
      },
    },
  });

  if (!post) {
    return redirect("/customer/posts");
  }

  const bids = await db.bid.findMany({
    where: {
      postId: post.id,
    },
    include: {
      editor: true,
    },
  });

  return json({
    post: post,
    bids: bids,
  });
}

interface ActionData {
  success: boolean;
  fieldErrors?: inferErrors<typeof createProjectSchema>;
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const userId = await requireUserId(request);

  if (!userId) {
    return redirect("/login");
  }

  const { fields, fieldErrors } = await validateAction(request, createProjectSchema);

  if (fieldErrors) {
    return badRequest<ActionData>({ success: false, fieldErrors });
  }

  const { postId, editorId, bidId, intent } = fields;

  if (intent === "approve") {
    await db.project.create({
      data: {
        postId: postId as string,
        editorId: editorId as string,
        customerId: userId as string,
        status: "in_progress",
      },
    });

    await db.post.update({
      where: {
        id: postId as string,
      },
      data: {
        status: "in_progress",
      },
    });

    await db.bid
      .update({
        where: {
          id: bidId as string,
        },
        data: {
          approved: true,
          declined: false,
        },
      })
      .then(() => {
        toast.success("Project created successfully");
      });

    return redirect("/customer/projects");
  }

  if (intent === "decline") {
    await db.bid
      .update({
        where: {
          id: bidId as string,
        },
        data: {
          approved: false,
          declined: true,
        },
      })
      .then(() => {
        toast.success("Bid declined successfully");
      });

    return json({
      success: true,
    });
  }

  return json({});
};

export default function ViewBids() {
  const { post, bids } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<ActionData>();
  const isSubmitting = fetcher.state !== "idle";
  const approvedBid = bids.find((bid) => bid.approved);
  const declinedBid = bids.find((bid) => bid.declined);

  return (
    <div className="bg-black">
      <div className="bg-black p-10">
        <div className="px-4 sm:px-0">
          <h3 className="text-xl font-semibold leading-7 text-white">Post Information</h3>
        </div>
        <div className="mt-6 border-t border-white/10">
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
        </div>
      </div>
      <div className="bg-black p-10">
        <p className="text-xl text-white">View All Bids</p>
        <Separator className="my-4" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {bids.map((bid) => {
            const isApprovedBid = approvedBid && bid.id === approvedBid.id;
            const isDeclinedBid = declinedBid && bid.id === declinedBid.id;
            return (
              <Card key={bid.id} className="bg-gray-900 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>
                      {bid.editor.firstName} {bid.editor.lastName} (${bid.price})
                    </span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <EyeIcon className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                        <div className="grid gap-4">
                          <div className="space-y-2">
                            <h4 className="font-medium leading-none">Editor Details</h4>
                            <p className="text-sm text-muted-foreground">
                              <b>Skills:</b> {bid.editor.skills}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              <b>Experience:</b> {bid.editor.experience}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              <b>Portfolio:</b> {bid.editor.portfolio}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              <b>Awards:</b> {bid.editor.awards}
                            </p>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {bid.approved && (
                    <div className="text-center font-bold text-green-500">Approved</div>
                  )}
                  {bid.declined && (
                    <div className="text-center font-bold text-red-500">Declined</div>
                  )}
                  <p className="mt-1 overflow-auto text-sm text-gray-200">{bid.comment}</p>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button
                    variant="default"
                    className="w-[48%]"
                    disabled={!!isApprovedBid || isApprovedBid || isDeclinedBid || isSubmitting}
                    onClick={() =>
                      fetcher.submit(
                        {
                          intent: "approve",
                          bidId: bid.id,
                          postId: post.id,
                          editorId: bid.editorId,
                        },
                        { method: "post" },
                      )
                    }
                  >
                    Accept
                  </Button>
                  <Button
                    variant="destructive"
                    className="w-[48%]"
                    disabled={!!isApprovedBid || isApprovedBid || isDeclinedBid || isSubmitting}
                    onClick={() =>
                      fetcher.submit(
                        {
                          intent: "decline",
                          bidId: bid.id,
                          postId: post.id,
                          editorId: bid.editorId,
                        },
                        { method: "post" },
                      )
                    }
                  >
                    Decline
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
