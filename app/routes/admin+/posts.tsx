import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
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
    <ul className="divide-y divide-gray-100 p-10">
      {posts.length > 0 ? (
        <>
          <ul className="space-y-4">
            {posts.map((post) => {
              return (
                <li
                  key={post.id}
                  className="flex items-center justify-between gap-x-6 rounded-md border border-white p-4"
                >
                  <div className="flex flex-col gap-1.5">
                    <p className="whitespace-nowrap text-lg text-white">{post.title}</p>
                    <p className="whitespace-nowrap text-sm text-white">
                      <b>Deadline:</b> {formatDate(post.deadline)}
                    </p>
                    <p className="whitespace-nowrap text-sm text-white">
                      <b>Budget:</b>{" "}
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "USD",
                      }).format(post.budget)}
                    </p>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <p className="whitespace-nowrap text-sm text-white">
                      <b>Client Name:</b> {post.customer.firstName} {post.customer.lastName}
                    </p>
                    <p className="whitespace-nowrap text-sm text-white">
                      <b>Client Email:</b> {post.customer.email}
                    </p>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    {post.status === "in_progress" || post.status === "completed" ? (
                      <>
                        <p className="whitespace-nowrap text-sm text-white">
                          <b>Editor Name:</b> {post.project?.[0].editor.firstName}{" "}
                          {post.project?.[0].editor.lastName}
                        </p>
                        <p className="whitespace-nowrap text-sm text-white">
                          <b>Editor Email:</b> {post.project?.[0].editor.email}
                        </p>
                        <p className="whitespace-nowrap text-sm text-white">
                          <b>Editor Charges:</b>{" "}
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: "USD",
                            // eslint-disable-next-line @typescript-eslint/no-extra-non-null-assertion
                          }).format(
                            // eslint-disable-next-line @typescript-eslint/no-extra-non-null-assertion
                            post.bids.find((bid) => bid.approved)?.price ?? 0,
                          )}
                        </p>
                      </>
                    ) : (
                      <div />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <div className="flex items-center justify-center">
          <p className="text-white">No posts found.</p>
        </div>
      )}
    </ul>
  );
}
