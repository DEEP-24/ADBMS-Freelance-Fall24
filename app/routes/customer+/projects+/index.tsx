import { type LoaderFunctionArgs, json, redirect } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { CalendarIcon, DollarSignIcon, FolderIcon, UserIcon } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { db } from "~/lib/db.server";
import { getUser } from "~/lib/session.server";
import { formatDate, projectStatusColorLookup, projectStatusLabelLookup } from "~/utils/misc";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getUser(request);

  if (!user) {
    return redirect("/login");
  }

  const projects = await db.project.findMany({
    where: {
      customerId: user.id,
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
    projects,
  });
}

export default function Projects() {
  const { projects } = useLoaderData<typeof loader>();

  return (
    <div className="w-full mx-auto p-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">My Projects</h1>
      </div>

      {projects.length > 0 ? (
        <div className="space-y-6">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="overflow-hidden hover:shadow-lg transition-shadow duration-300"
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl font-bold mb-1">{project.post.title}</CardTitle>
                    <div className="flex items-center text-sm text-gray-500 gap-4">
                      <div className="flex items-center gap-1 mt-2">
                        <CalendarIcon className="w-4 h-4" />
                        <span>Due on</span>{" "}
                        <time dateTime={project.post.deadline}>
                          {formatDate(project.post.deadline)}
                        </time>
                      </div>
                      <div className="flex items-center gap-1 mt-2">
                        <FolderIcon className="w-4 h-4" />
                        <span>{project.post.category.name}</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant="default" color={projectStatusColorLookup[project.status]}>
                    {projectStatusLabelLookup[project.status]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                    <span className="text-sm font-medium text-gray-600 flex items-center">
                      <DollarSignIcon className="w-4 h-4 mr-1" />
                      Budget
                    </span>
                    <span className="font-semibold text-green-600">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "USD",
                      }).format(project.post.budget)}
                    </span>
                  </div>
                  <Separator />
                  <div className="pt-2">
                    <p className="text-sm font-medium mb-2">Project Details</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-gray-50 p-3 rounded-md">
                        <span className="text-sm text-gray-600 block">Editor</span>
                        <span className="font-semibold flex items-center">
                          <UserIcon className="w-4 h-4 mr-1" />
                          {project.editor.firstName} {project.editor.lastName}
                        </span>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-md">
                        <span className="text-sm text-gray-600 block">Editor Price</span>
                        <span className="font-semibold text-green-600">
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: "USD",
                          }).format(project.post.bids.find((bid) => bid.approved)?.price || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button
                      variant="default"
                      asChild
                      className="bg-emerald-500 hover:bg-emerald-600"
                    >
                      <Link to={`/customer/projects/${project.id}`}>View Project</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center bg-gray-100 rounded-md p-8">
          <p className="text-gray-600 text-lg">No projects found. Create a post to get started!</p>
        </div>
      )}
    </div>
  );
}
