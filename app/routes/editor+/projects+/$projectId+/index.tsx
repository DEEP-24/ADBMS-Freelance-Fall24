import { ProjectStatus } from "@prisma/client";
import type { DataFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Link, useFetcher, useLoaderData } from "@remix-run/react";
import axios from "axios";
import { ArrowLeftIcon, CalendarIcon, FileIcon, FolderIcon, UserIcon } from "lucide-react";
import * as mime from "mime-types";
import * as React from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import { db } from "~/lib/db.server";
import { getS3Url, getUniqueS3Key } from "~/lib/s3-utils";
import { requireUserId } from "~/lib/session.server";
import type { CompleteProjectActionData } from "~/routes/api+/completeProject";
import { formatDate, titleCase } from "~/utils/misc";
import { badRequest } from "~/utils/misc.server";
import { type inferErrors, validateAction } from "~/utils/validation";

const createFileEntrySchema = z.object({
  name: z.string().min(3, "File name must be at least 3 characters long"),
  description: z.string().optional(),
  key: z.string().min(1, "File must be selected"),
  bucket: z.string().min(1, "File must be selected"),
  extension: z.string().min(1, "File must be selected"),
  region: z.string().min(1, "File must be selected"),
  postId: z.string().min(1, "postId is required"),
  type: z.string().optional(),
});

export async function loader({ params }: DataFunctionArgs) {
  const project = await db.project.findUnique({
    where: {
      id: params.projectId,
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
      customerDocuments: true,
      editorDocuments: true,
    },
  });

  if (!project) {
    return redirect("/customer/projects");
  }

  return json({
    project: project,
  });
}

interface ActionData {
  success: boolean;
  fieldErrors?: inferErrors<typeof createFileEntrySchema>;
}

export const action = async ({ request, params }: DataFunctionArgs) => {
  const editorId = await requireUserId(request);
  const { projectId } = params;

  if (!projectId) {
    return redirect("/editor/projects");
  }

  const { fields, fieldErrors } = await validateAction(request, createFileEntrySchema);

  if (fieldErrors) {
    return badRequest<ActionData>({ success: false, fieldErrors });
  }

  await db.document.create({
    data: {
      name: fields.name,
      description: fields.description,
      key: fields.key,
      bucket: fields.bucket,
      extension: fields.extension,
      region: fields.region,
      imageUrl: getS3Url(fields.key, {
        bucket: fields.bucket,
        region: fields.region,
      }),
      projectId,
      postId: fields.postId,
      editorId,
      editorProjectId: projectId,
      type: "EDITED",
    },
  });

  return json<ActionData>({
    success: true,
  });
};

export const meta: MetaFunction = () => {
  return [
    {
      title: "Artify | View Project",
    },
  ];
};

export default function ProjectPage() {
  const { project } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<ActionData>();
  const completeProjectFetcher = useFetcher<CompleteProjectActionData>();
  const [isFileUploading, setIsFileUploading] = React.useState(false);
  const [fileName, setFileName] = React.useState("");
  const [fileDescription, setFileDescription] = React.useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const isProjectCompleted = project.status === ProjectStatus.completed;

  const handleFileUpload = React.useCallback(
    async (file: File) => {
      if (!file) {
        return;
      }

      setIsFileUploading(true);
      const extension = mime.extension(file.type) || "";
      const key = getUniqueS3Key(file.name, extension ? `.${extension}` : undefined);

      try {
        const { data } = await axios.get<{ signedUrl: string }>(`/api/upload-s3-object?key=${key}`);
        await axios.put(data.signedUrl, file);

        const formData = new FormData();
        formData.append("name", fileName || file.name);
        formData.append("description", fileDescription || "Uploaded file");
        formData.append("bucket", window.ENV.AWS_BUCKET || "");
        formData.append("key", key);
        formData.append("extension", extension);
        formData.append("region", window.ENV.AWS_REGION || "");
        formData.append("postId", project.postId);

        await fetcher.submit(formData, { method: "POST" });

        toast.success("File uploaded successfully");
        // Clear form fields
        setFileName("");
        setFileDescription("");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } catch (error) {
        console.error("Error uploading file:", error);
        toast.error("Error uploading file");
      } finally {
        setIsFileUploading(false);
      }
    },
    [fetcher, project.postId, fileName, fileDescription],
  );

  React.useEffect(() => {
    if (fetcher.state !== "idle") {
      return;
    }

    if (!fetcher.data) {
      return;
    }

    if (fetcher.data.success) {
      toast.success("File upload completed successfully");
    } else {
      toast.error("File upload failed");
    }
  }, [fetcher.data, fetcher.state]);

  const isCompletingProject = completeProjectFetcher.state !== "idle";
  React.useEffect(() => {
    if (isCompletingProject) {
      return;
    }
    if (!completeProjectFetcher.data) {
      return;
    }

    if (completeProjectFetcher.data.success) {
      toast.success("Project marked as completed!");
    } else {
      toast.error("Failed to complete project. Please try again.");
    }
  }, [completeProjectFetcher.data, isCompletingProject]);

  return (
    <div className="container mx-auto p-6 bg-gray-50">
      <header className="mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">Project: {project.post.title}</h1>
          <Link to="/editor/projects">
            <Button variant="outline" className="flex items-center gap-2">
              <ArrowLeftIcon className="w-4 h-4" />
              Back to Projects
            </Button>
          </Link>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <Badge variant={project.status === ProjectStatus.completed ? "default" : "outline"}>
            {titleCase(project.status)}
          </Badge>
          <span className="text-gray-600 flex items-center gap-2">
            <CalendarIcon className="w-4 h-4" />
            Due on {formatDate(project.post.deadline)}
          </span>
          <span className="text-gray-600 flex items-center gap-2">
            <FolderIcon className="w-4 h-4" />
            {project.post.category.name}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 mb-4">{project.post.description}</p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <h3 className="font-semibold text-gray-700">Budget</h3>
                <p className="text-2xl font-bold text-green-600">${project.post.budget}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700">Your Bid</h3>
                <p className="text-2xl font-bold text-blue-600">
                  ${project.post.bids.find((bid) => bid.approved)?.price ?? 0}
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700">Customer</h3>
                <p className="text-lg font-bold text-blue-600 flex items-center">
                  <UserIcon className="w-5 h-5 mr-1" />
                  {project.customer.firstName} {project.customer.lastName}
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            {(project.status === ProjectStatus.completed ||
              project.status === ProjectStatus.payment_pending) && (
              <div className="w-full mt-4 flex items-center justify-between bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-8 w-8 text-green-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Project Completed</h3>
                    <p className="text-sm text-gray-500">
                      Great job! This project has been successfully completed.
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <svg
                      className={`h-8 w-8 ${project.status === ProjectStatus.completed ? "text-green-500" : "text-yellow-500"}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {project.status === ProjectStatus.completed
                        ? "Payment Received"
                        : "Payment Pending"}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {project.status === ProjectStatus.completed
                        ? "The payment for this project has been processed."
                        : "Waiting for the customer to complete the payment."}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardFooter>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Files</CardTitle>
            </CardHeader>
            <CardContent className="max-h-96 overflow-y-auto">
              {project.editorDocuments && project.editorDocuments.length > 0 ? (
                <ul className="space-y-4">
                  {project.editorDocuments.map((document) => (
                    <li
                      key={document.id}
                      className="shadow border border-gray-200 bg-emerald-50 rounded-md py-2 px-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <FileIcon className="mr-3 h-5 w-5 text-emerald-600 flex-shrink-0" />
                          <div>
                            <a
                              href={document.imageUrl}
                              download
                              className="text-emerald-600 hover:text-emerald-800 hover:underline font-medium"
                            >
                              {document.name}
                            </a>
                            <p className="text-sm text-gray-500">{document.description}</p>
                          </div>
                        </div>
                        <span className="text-xs text-gray-400">{document.extension}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 italic">No documents available</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Customer Files</CardTitle>
            </CardHeader>
            <CardContent className="max-h-60 overflow-y-auto">
              {project.customerDocuments && project.customerDocuments.length > 0 ? (
                <ul className="space-y-2">
                  {project.customerDocuments.map((document) => (
                    <li
                      key={document.id}
                      className="shadow border border-gray-200 bg-emerald-50 rounded-md py-2 px-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <FileIcon className="mr-3 h-5 w-5 text-emerald-600 flex-shrink-0" />
                          <div>
                            <a
                              href={document.imageUrl}
                              download
                              className="text-emerald-600 hover:text-emerald-800 hover:underline font-medium"
                            >
                              {document.name}
                            </a>
                            <p className="text-sm text-gray-500">{document.description}</p>
                          </div>
                        </div>
                        <span className="text-xs text-gray-400">{document.extension}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-emerald-600 italic">No documents available</p>
              )}
            </CardContent>
          </Card>

          {!isProjectCompleted && (
            <Card>
              <CardHeader>
                <CardTitle>Upload a File</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
                  <Input
                    placeholder="File name (optional)"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                  />
                  <Input
                    placeholder="File description (optional)"
                    value={fileDescription}
                    onChange={(e) => setFileDescription(e.target.value)}
                  />
                  <Input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleFileUpload(file);
                      }
                    }}
                    disabled={isFileUploading}
                  />
                  {isFileUploading && (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
                    </div>
                  )}
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
