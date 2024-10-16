import { PostStatus } from "@prisma/client";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { CalendarIcon, DollarSignIcon, FolderIcon } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { db } from "~/lib/db.server";
import { requireUserId } from "~/lib/session.server";
import { formatDate, postStatusColorLookup, postStatusLabelLookup } from "~/utils/misc";

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
      },
    },
  });

  return json({
    posts: posts,
  });
}

export default function EditorPosts() {
  const { posts } = useLoaderData<typeof loader>();

  return (
    <div className="w-full mx-auto p-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Available Posts</h1>

      {posts.length > 0 ? (
        <div className="space-y-6">
          {posts.map((post) => {
            const hasEditorBidded = post.bids.length > 0;
            const isProjectAllotedToEditor = post.project.length > 0;

            return (
              <Card
                key={post.id}
                className="overflow-hidden hover:shadow-lg transition-shadow duration-300"
              >
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
                    <Badge variant="default" color={postStatusColorLookup[post.status]}>
                      {postStatusLabelLookup[post.status]}
                    </Badge>
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
                    <div className="mt-4">
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
                        <Button variant="default" disabled>
                          Already Bidded
                        </Button>
                      ) : (
                        <Button
                          variant="default"
                          asChild
                          className="bg-emerald-500 hover:bg-emerald-600"
                        >
                          <Link to={`/editor/posts/${post.id}/bid`}>Bid</Link>
                        </Button>
                      )}
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
