import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Link, useFetcher, useLoaderData } from "@remix-run/react";
import {
  ArrowLeftIcon,
  CalendarIcon,
  CheckIcon,
  DollarSignIcon,
  EyeIcon,
  FileTextIcon,
  FolderIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { db } from "~/lib/db.server";
import { requireUserId } from "~/lib/session.server";
import { formatDate } from "~/utils/misc";
import { badRequest } from "~/utils/misc.server";
import type { inferErrors } from "~/utils/validation";
import { validateAction } from "~/utils/validation";

import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { ScrollArea } from "~/components/ui/scroll-area";
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

export default function ViewPost() {
  const { post, bids } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<ActionData>();
  const isSubmitting = fetcher.state !== "idle";
  const approvedBid = bids.find((bid) => bid.approved);
  const declinedBid = bids.find((bid) => bid.declined);
  return (
    <div className="container mx-auto py-8 px-4">
      <Link
        to="/customer/posts"
        className="inline-flex items-center text-emerald-600 hover:text-emerald-700 mb-6 transition-colors"
      >
        <ArrowLeftIcon className="w-5 h-5 mr-2" />
        <span className="text-lg font-medium">Back to Posts</span>
      </Link>
      <div className="space-y-6">
        <Card key={post.id} className="overflow-hidden transition-shadow duration-300">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl font-bold mb-1">{post.title}</CardTitle>
                <div className="flex items-center text-sm text-gray-500 gap-4">
                  <div className="flex items-center gap-1 mt-2">
                    <CalendarIcon className="w-4 h-4" />
                    <span>Due on</span>{" "}
                    <time dateTime={post.deadline}>{formatDate(post.deadline)}</time>
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    <FolderIcon className="w-4 h-4" />
                    <span>{post.category.name}</span>
                  </div>
                </div>
              </div>
              <Badge variant="default">{post.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">{post.description}</p>
              <div className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                <span className="text-sm font-medium text-gray-600 flex items-center">
                  <DollarSignIcon className="w-4 h-4 mr-1" />
                  Budget
                </span>
                <span className="font-semibold text-green-600">
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                  }).format(post.budget)}
                </span>
              </div>
              {post.status !== "open" && post.bids.length > 0 && (
                <>
                  <Separator />
                  <div className="pt-2">
                    <p className="text-sm font-medium mb-2">Project Details</p>
                    <div className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                      <span className="text-sm font-medium text-gray-600">Editor Charges</span>
                      <span className="font-semibold text-green-600">
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: "USD",
                        }).format(post.bids.find((bid) => bid.approved)?.price ?? 0)}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <div>
          <h2 className="text-2xl font-bold mb-4 text-black">Bids</h2>
          <ScrollArea className="h-[calc(100vh-200px)] pr-4">
            {bids.length === 0 ? (
              <Card className="text-center py-12 border-emerald-200 shadow-md">
                <CardContent>
                  <div className="flex flex-col items-center">
                    <svg
                      className="w-16 h-16 text-emerald-400 mb-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="text-xl text-black mb-2">No bids have been placed yet.</p>
                    <p className="text-emerald-600">Check back later for updates!</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {bids.map((bid) => {
                  const isApprovedBid = approvedBid && bid.id === approvedBid.id;
                  const isDeclinedBid = declinedBid && bid.id === declinedBid.id;
                  return (
                    <Card
                      key={bid.id}
                      className={`
                        ${isApprovedBid ? "border-emerald-500" : ""}
                        ${isDeclinedBid ? "border-red-500" : ""}
                        transition-all duration-300 hover:shadow-lg border-emerald-200
                      `}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center justify-between">
                          <span className="flex items-center">
                            <Avatar className="mr-3 h-12 w-12 bg-emerald-100 text-emerald-800">
                              <AvatarFallback>{bid.editor.firstName[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold text-black text-lg">
                                {bid.editor.firstName} {bid.editor.lastName}
                              </p>
                              <p className="text-sm text-emerald-600">Editor</p>
                            </div>
                          </span>
                          <Badge
                            variant="secondary"
                            className="text-lg px-3 py-1 bg-emerald-100 text-emerald-800"
                          >
                            ${bid.price.toFixed(2)}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="mb-4 text-black">{bid.comment}</p>
                        {isApprovedBid && (
                          <Badge
                            variant="default"
                            className="w-full justify-center py-1 bg-emerald-500 text-white"
                          >
                            <CheckIcon className="mr-1 h-4 w-4" /> Approved
                          </Badge>
                        )}
                        {isDeclinedBid && (
                          <Badge variant="destructive" className="w-full justify-center py-1">
                            <XIcon className="mr-1 h-4 w-4" /> Declined
                          </Badge>
                        )}
                      </CardContent>
                      <CardFooter className="flex flex-col space-y-3">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full border-emerald-500 text-emerald-700 hover:bg-emerald-50"
                            >
                              <EyeIcon className="mr-2 h-4 w-4" /> View Details
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 border-emerald-200">
                            <div className="space-y-2">
                              <h4 className="font-medium mb-2 text-black">Editor Details</h4>
                              <p className="text-sm text-black">
                                <b>Skills:</b> {bid.editor.skills}
                              </p>
                              <p className="text-sm text-black">
                                <b>Experience:</b> {bid.editor.experience}
                              </p>
                              <p className="text-sm text-black">
                                <b>Portfolio:</b> {bid.editor.portfolio}
                              </p>
                              <p className="text-sm text-black">
                                <b>Awards:</b> {bid.editor.awards}
                              </p>
                            </div>
                          </PopoverContent>
                        </Popover>
                        <div className="flex w-full space-x-2">
                          <Button
                            variant="default"
                            size="sm"
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                            disabled={
                              !!isApprovedBid || isApprovedBid || isDeclinedBid || isSubmitting
                            }
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
                            size="sm"
                            className="flex-1 transition-colors"
                            disabled={
                              !!isApprovedBid || isApprovedBid || isDeclinedBid || isSubmitting
                            }
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
                        </div>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
