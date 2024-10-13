import { PostStatus } from "@prisma/client";
import type { DataFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { db } from "~/lib/db.server";
import { requireUserId } from "~/lib/session.server";
import { formatDate, postStatusColorLookup, postStatusLabelLookup } from "~/utils/misc";

export async function loader({ request }: DataFunctionArgs) {
  const userId = await requireUserId(request);

  const posts = await db.post.findMany({
    where: {
      customerId: userId,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      project: true,
      customer: true,
      category: true,
      bids: true,
    },
  });

  return json({
    posts: posts,
  });
}

export default function CustomerPosts() {
  const { posts } = useLoaderData<typeof loader>();

  return (
    <div className="flex-1 bg-background p-10">
      {posts.length > 0 ? (
        <div className="space-y-4">
          {posts.map((post) => {
            const isProjectOpen = post.status === PostStatus.open;
            const isProjectAllotedToEditor = !isProjectOpen && post.bids.length > 0;
            return (
              <Card key={post.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-2xl font-bold">{post.title}</CardTitle>
                  <div className="flex items-center space-x-2">
                    <p className="text-lg font-semibold">${post.budget}</p>
                    <Badge variant="outline" className={postStatusColorLookup[post.status]}>
                      {postStatusLabelLookup[post.status]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <p className="font-semibold">{post.category.name}</p>
                    <span>•</span>
                    <p>
                      Due on <time dateTime={post.deadline}>{formatDate(post.deadline)}</time>
                    </p>
                  </div>
                  <div className="mt-4">
                    {isProjectAllotedToEditor ? (
                      <Button variant="destructive" size="sm" asChild>
                        <Link to={`/customer/projects/${post.project?.[0].id}`}>View Project</Link>
                      </Button>
                    ) : (
                      <Button variant="destructive" asChild>
                        <Link to={`/customer/posts/${post.id}`}>View bids</Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="flex h-full items-center justify-center">
          <p className="text-muted-foreground">No posts are present</p>
        </div>
      )}
    </div>
  );
}
