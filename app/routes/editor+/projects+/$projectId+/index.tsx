import { ProjectStatus } from "@prisma/client";
import type { DataFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Link, useFetcher, useLoaderData } from "@remix-run/react";
import axios from "axios";
import {
  ArrowLeftIcon,
  CalendarIcon,
  CheckCircleIcon,
  FileIcon,
  FolderIcon,
  Star,
  UserIcon,
} from "lucide-react";
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
      payment: true,
      editor: true,
      customer: true,
      customerDocuments: true,
      editorDocuments: true,
      feedback: true, // Add this line to include feedback
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
  const isPaymentReceived = project.payment !== null;

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
                <p className="text-2xl font-bold text-emerald-600">
                  ${project.post.bids.find((bid) => bid.approved)?.price ?? 0}
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700">Customer</h3>
                <p className="text-lg font-bold text-emerald-600 flex items-center">
                  <UserIcon className="w-5 h-5 mr-1" />
                  {project.customer.firstName} {project.customer.lastName}
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            {isProjectCompleted && isPaymentReceived && (
              <div className="w-full flex items-center justify-between">
                <div className="flex items-center bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg">
                  <CheckCircleIcon className="w-5 h-5 mr-2" />
                  <p className="font-semibold">Project completed and payment made successfully!</p>
                </div>
              </div>
            )}

            {project.feedback && project.feedback.length > 0 && (
              <div className="w-full p-4 bg-gray-100 rounded-lg">
                <h3 className="font-semibold text-lg mb-2">Customer Feedback</h3>
                <div className="flex items-center mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-5 h-5 ${
                        star <= project.feedback[0].rating
                          ? "text-yellow-500 fill-current"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                  <span className="ml-2 text-gray-600">({project.feedback[0].rating}/5)</span>
                </div>
                <p className="text-gray-700">{project.feedback[0].comment}</p>
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
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500" />
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
