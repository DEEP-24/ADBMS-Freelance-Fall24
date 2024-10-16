import { PostStatus } from "@prisma/client";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { CalendarIcon, DollarSignIcon, FolderIcon, PlusIcon } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { db } from "~/lib/db.server";
import { getUser } from "~/lib/session.server";
import { formatDate } from "~/utils/misc";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const user = await getUser(request);

    if (!user) {
      return redirect("/login");
    }

    const posts = await db.post.findMany({
      where: {
        customerId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        project: {
          select: {
            id: true,
          },
        },
        customer: true,
        category: true,
        bids: true,
      },
    });

    return json({
      posts: posts,
    });
  } catch (error) {
    console.error("Error in loader:", error);
    return json({ posts: [], error: "An error occurred while loading posts" }, { status: 500 });
  }
}

export default function CustomerPosts() {
  const { posts } = useLoaderData<typeof loader>();

  return (
    <div className="w-full mx-auto p-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">My Posts</h1>
        <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Link to="/customer/posts/new-post" className="flex items-center">
            <PlusIcon className="w-4 h-4 mr-2" />
            Create New Post
          </Link>
        </Button>
      </div>

      {posts.length > 0 ? (
        <div className="space-y-6">
          {posts.map((post) => (
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
                  {post.status !== PostStatus.open && post.bids.length > 0 && (
                    <>
                      <Separator />
                      <div className="pt-2">
                        <p className="text-sm font-medium mb-2">Project Details</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-gray-50 p-3 rounded-md">
                            <span className="text-sm text-gray-600 block">Status</span>
                            <Badge variant="default">{post.status}</Badge>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-md">
                            <span className="text-sm text-gray-600 block">Editor Charges</span>
                            <span className="font-semibold text-green-600">
                              {new Intl.NumberFormat("en-US", {
                                style: "currency",
                                currency: "USD",
                              }).format(post.bids.find((bid) => bid.approved)?.price ?? 0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                  <div className="mt-4">
                    {post.project && post.project.length > 0 ? (
                      <Button
                        variant="default"
                        size="sm"
                        asChild
                        className="bg-emerald-500 hover:bg-emerald-600"
                      >
                        <Link to={`/customer/projects/${post.project[0].id}`}>View Project</Link>
                      </Button>
                    ) : post.status === PostStatus.open ? (
                      <Button
                        variant="default"
                        asChild
                        className="bg-emerald-500 hover:bg-emerald-600"
                      >
                        <Link to={`/customer/posts/${post.id}`}>View bids</Link>
                      </Button>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center bg-gray-100 rounded-md p-8">
          <p className="text-gray-600 text-lg">
            No posts found. Create your first post to get started!
          </p>
        </div>
      )}
    </div>
  );
}
