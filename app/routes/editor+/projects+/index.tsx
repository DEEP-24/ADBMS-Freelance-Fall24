import { type LoaderFunctionArgs, json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { db } from "~/lib/db.server";
import { requireUserId } from "~/lib/session.server";
import { formatDate, projectStatusColorLookup, projectStatusLabelLookup } from "~/utils/misc";

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const projects = await db.project.findMany({
    where: {
      editorId: userId,
    },
    include: {
      post: {
        include: {
          bids: true,
          category: true,
        },
      },
      editor: true,
      customer: true,
    },
  });

  return json({
    projects: projects,
  });
}

export default function Projects() {
  const { projects } = useLoaderData<typeof loader>();

  return (
    <div className="divide-y divide-gray-100 bg-black p-10">
      {projects.map((project) => (
        <li key={project.id} className="flex items-center justify-between gap-x-6 py-5">
          <div className="min-w-0">
            <div className="flex items-start gap-x-3">
              <p className="text-xl font-semibold leading-6 text-white">{project.post.title}</p>
              <p className="whitespace-nowrap text-lg text-white">(${project.post.budget})</p>
              <Badge variant="default" color={projectStatusColorLookup[project.status]}>
                {projectStatusLabelLookup[project.status]}
              </Badge>
            </div>
            <div className="mt-1 flex items-center gap-x-2 text-base leading-5 text-gray-400">
              <p className="whitespace-nowrap font-semibold">{project.post.category.name}</p>
              <svg viewBox="0 0 2 2" className="h-0.5 w-0.5 fill-current">
                <circle cx={1} cy={1} r={1} />
              </svg>
              <p className="whitespace-nowrap">
                Due on{" "}
                <time dateTime={project.post.deadline}>{formatDate(project.post.deadline)}</time>
              </p>
            </div>
          </div>
          <div className="flex flex-none items-center gap-x-4">
            <Link to={`/editor/projects/${project.id}`}>
              <Button variant="outline">View Project</Button>
            </Link>
          </div>
        </li>
      ))}
    </div>
  );
}
