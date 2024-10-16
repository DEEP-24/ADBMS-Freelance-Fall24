import { PostStatus } from "@prisma/client";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { CalendarIcon, DollarSignIcon, FolderIcon, UserIcon } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { db } from "~/lib/db.server";
import { requireUserId } from "~/lib/session.server";
import { formatDate, postStatusColorLookup, postStatusLabelLookup } from "~/utils/misc";
import { badRequest } from "~/utils/misc.server";
import { useFetcherCallback } from "~/utils/use-fetcher-callback";
import { type inferErrors, validateAction } from "~/utils/validation";

const CreateBidSchema = z.object({
  postId: z.string(),
  price: z.string().min(1, "Price must be a positive number"),
  comment: z.string().min(1, "Comment is required"),
});

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const posts = await db.post.findMany({
    orderBy: {
      createdAt: "desc",
    },
    where: {
      OR: [
        {
          status: PostStatus.open,
        },
        {
          status: PostStatus.in_progress,
          bids: {
            some: {
              editorId: userId,
              approved: true,
            },
          },
        },
      ],
    },
    include: {
      project: {
        where: {
          editorId: userId,
        },
      },
      customer: true,
      category: true,
      bids: {
        where: {
          editorId: userId,
        },
        select: {
          id: true,
          approved: true,
          declined: true,
        },
      },
    },
  });

  return json({
    posts: posts,
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

  return json({ success: true });
};

export default function EditorPosts() {
  const { posts } = useLoaderData<typeof loader>();
  const fetcher = useFetcherCallback<ActionData>({
    onSuccess: () => {
      toast.success("Bid submitted successfully");
    },
    onError: () => {
      toast.error("Failed to submit bid");
    },
  });

  return (
    <div className="w-full mx-auto p-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Available Posts</h1>

      {posts.length > 0 ? (
        <div className="space-y-6">
          {posts.map((post) => {
            const hasEditorBidded = post.bids.length > 0;
            const isProjectAllotedToEditor = post.project.length > 0;
            const editorBid = post.bids[0];

            return (
              <Card
                key={post.id}
                className="overflow-hidden hover:shadow-lg transition-all duration-300"
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl font-bold mb-1">{post.title}</CardTitle>
                    <Badge variant="default" color={postStatusColorLookup[post.status]}>
                      {postStatusLabelLookup[post.status]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">{post.description}</p>
                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center text-sm text-gray-500">
                        <CalendarIcon className="w-4 h-4 mr-2 text-gray-400" />
                        <span>{formatDate(post.deadline)}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <FolderIcon className="w-4 h-4 mr-2 text-gray-400" />
                        <span>{post.category.name}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <DollarSignIcon className="w-4 h-4 mr-2 text-gray-400" />
                        <span>
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: "USD",
                          }).format(post.budget)}
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <UserIcon className="w-4 h-4 mr-2 text-gray-400" />
                        <span>
                          Customer: {post.customer.firstName} {post.customer.lastName}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t">
                      <div>
                        {isProjectAllotedToEditor ? (
                          <Button
                            variant="default"
                            size="sm"
                            asChild
                            className="bg-emerald-500 hover:bg-emerald-600"
                          >
                            <Link to={`/editor/projects/${post.project[0].id}`}>View Project</Link>
                          </Button>
                        ) : hasEditorBidded ? (
                          <div className="flex items-center space-x-2">
                            <Button variant="default" disabled size="sm">
                              Already Bidded
                            </Button>
                            {editorBid.declined && <Badge variant="destructive">Declined</Badge>}
                          </div>
                        ) : (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="default"
                                size="sm"
                                className="bg-emerald-500 hover:bg-emerald-600"
                              >
                                Bid
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                              <h2 className="text-lg font-semibold mb-4">Submit Your Bid</h2>
                              <fetcher.Form method="post" className="space-y-4">
                                <input type="hidden" name="postId" value={post.id} />
                                <div>
                                  <Input
                                    name="price"
                                    type="number"
                                    placeholder="Enter your bid price"
                                    min="1"
                                    step="0.01"
                                    required
                                  />
                                  {fetcher.data?.fieldErrors?.price && (
                                    <p className="text-sm text-red-500 mt-1">
                                      {fetcher.data.fieldErrors.price}
                                    </p>
                                  )}
                                </div>
                                <div>
                                  <Textarea
                                    name="comment"
                                    placeholder="Enter your comment"
                                    required
                                    className="min-h-[100px]"
                                  />
                                  {fetcher.data?.fieldErrors?.comment && (
                                    <p className="text-sm text-red-500 mt-1">
                                      {fetcher.data.fieldErrors.comment}
                                    </p>
                                  )}
                                </div>
                                <Button type="submit" className="w-full">
                                  Submit Bid
                                </Button>
                              </fetcher.Form>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-emerald-500 text-white hover:bg-emerald-600 hover:text-white"
                          >
                            View Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogTitle>{post.title}</DialogTitle>
                          <DialogDescription>
                            <div className="space-y-4 mt-4">
                              <p>
                                <strong>Description:</strong> {post.description}
                              </p>
                              <p>
                                <strong>Category:</strong> {post.category.name}
                              </p>
                              <p>
                                <strong>Budget:</strong>{" "}
                                {new Intl.NumberFormat("en-US", {
                                  style: "currency",
                                  currency: "USD",
                                }).format(post.budget)}
                              </p>
                              <p>
                                <strong>Deadline:</strong> {formatDate(post.deadline)}
                              </p>
                              <p>
                                <strong>Status:</strong> {postStatusLabelLookup[post.status]}
                              </p>
                              <p>
                                <strong>Customer:</strong> {post.customer.firstName}{" "}
                                {post.customer.lastName}
                              </p>
                            </div>
                          </DialogDescription>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center justify-center bg-gray-100 rounded-md p-8">
          <p className="text-gray-600 text-lg">No posts are available at the moment.</p>
        </div>
      )}
    </div>
  );
}
