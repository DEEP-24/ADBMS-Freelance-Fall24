import { PostStatus } from "@prisma/client";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
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
    <ul className="divide-y divide-gray-100 p-10">
      {posts.length > 0 ? (
        <>
          {posts.map((post) => {
            const isProjectOpen = post.status === PostStatus.open;
            const hasEditorBidded = post.bids.length > 0;
            const isProjectAllotedToEditor = !isProjectOpen && post.bids.length > 0;

            return (
              <li key={post.id} className="flex items-center justify-between gap-x-6 py-5">
                <div className="min-w-0">
                  <div className="flex items-start gap-x-3">
                    <p className="text-lg font-semibold leading-6 text-white">{post.title}</p>
                    <p className="whitespace-nowrap text-sm text-white">(${post.budget})</p>
                    <Badge variant="default" color={postStatusColorLookup[post.status]}>
                      {postStatusLabelLookup[post.status]}
                    </Badge>
                  </div>
                  <div className="mt-1 flex items-center gap-x-2 text-xs leading-5 text-white">
                    <p className="whitespace-nowrap font-semibold">{post.category.name}</p>
                    <svg viewBox="0 0 2 2" className="h-0.5 w-0.5 fill-current">
                      <circle cx={1} cy={1} r={1} />
                    </svg>
                    <p className="whitespace-nowrap">
                      Due on <time dateTime={post.deadline}>{formatDate(post.deadline)}</time>
                    </p>
                    <svg viewBox="0 0 2 2" className="h-0.5 w-0.5 fill-current">
                      <circle cx={1} cy={1} r={1} />
                    </svg>
                    <p className="truncate">Created by {post.customer.firstName}</p>
                  </div>
                </div>
                <div className="flex flex-none items-center gap-x-4">
                  {hasEditorBidded ? (
                    isProjectAllotedToEditor ? (
                      <Link to={`/editor/projects/${post.project?.[0].id}`}>
                        <Button color="red" size="sm" asChild>
                          View Project
                        </Button>
                      </Link>
                    ) : (
                      <Button color="red" disabled>
                        Already Bidded
                      </Button>
                    )
                  ) : (
                    <Button color="green">
                      <Link to={`/editor/posts/${post.id}/bid`} className="text-white">
                        Bid
                      </Link>
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </>
      ) : (
        <div className="flex h-full items-center justify-center">
          <p className="text-white">No posts are present</p>
        </div>
      )}
    </ul>
  );
}
