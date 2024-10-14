import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { CalendarIcon, DollarSignIcon, UserIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { db } from "~/lib/db.server";
import { formatDate } from "~/utils/misc";

export const loader = async () => {
  const posts = await db.post.findMany({
    include: {
      _count: true,
      customer: true,
      bids: true,
      project: {
        select: {
          editor: true,
        },
      },
    },
  });

  return json({
    posts,
  });
};

export default function Posts() {
  const { posts } = useLoaderData<typeof loader>();

  return (
    <div className="w-full mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Posts</h1>
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
                    <CardDescription className="flex items-center text-sm text-gray-500">
                      <CalendarIcon className="w-4 h-4 mr-1" />
                      Deadline: {formatDate(post.deadline)}
                    </CardDescription>
                  </div>
                  <Badge
                    variant={
                      post.status === "completed"
                        ? "default"
                        : post.status === "in_progress"
                          ? "outline"
                          : "outline"
                    }
                  >
                    {post.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-4">
                  <p className="text-sm text-gray-700">{post.description}</p>
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
                  <div className="flex">
                    <div className="flex items-center space-x-3 bg-emerald-50 p-3 rounded-md inline-flex">
                      <Avatar>
                        <AvatarFallback>
                          {post.customer.firstName[0]}
                          {post.customer.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {post.customer.firstName} {post.customer.lastName}
                        </p>
                        <p className="text-xs text-gray-500">{post.customer.email}</p>
                      </div>
                    </div>
                  </div>
                  {(post.status === "in_progress" || post.status === "completed") &&
                    post.project?.[0] && (
                      <>
                        <Separator />
                        <div className="pt-2">
                          <p className="text-sm font-medium mb-2 flex items-center">
                            <UserIcon className="w-4 h-4 mr-1" />
                            Editor Details
                          </p>
                          <div className="flex items-center space-x-3 bg-green-50 p-3 rounded-md">
                            <Avatar>
                              <AvatarFallback>
                                {post.project[0].editor.firstName[0]}
                                {post.project[0].editor.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">
                                {post.project[0].editor.firstName} {post.project[0].editor.lastName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {post.project[0].editor.email}
                              </p>
                            </div>
                          </div>
                          <div className="mt-2 flex items-center justify-between bg-gray-50 p-3 rounded-md">
                            <span className="text-sm font-medium text-gray-600">
                              Editor Charges
                            </span>
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
