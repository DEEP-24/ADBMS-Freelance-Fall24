import { ProjectStatus } from "@prisma/client";
import type { DataFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import axios from "axios";
import { FileIcon } from "lucide-react";
import * as mime from "mime-types";
import * as React from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import { Table, TableBody, TableCell, TableRow } from "~/components/ui/table";
import { db } from "~/lib/db.server";
import { getS3Url, getUniqueS3Key } from "~/lib/s3-utils";
import { requireUserId } from "~/lib/session.server";
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
  const [file, setFile] = React.useState<File | null>(null);

  const isProjectCompleted = project.status === ProjectStatus.completed;

  const uploadedDocumentKey = React.useMemo(() => {
    if (!file) {
      return null;
    }

    const extension = mime.extension(file.type);
    const key = getUniqueS3Key(file.name, extension ? `.${extension}` : undefined);

    return key;
  }, [file]);

  const handleFileUpload = React.useCallback(async () => {
    if (!file || !uploadedDocumentKey) {
      return;
    }

    const data = await axios.get<{
      signedUrl: string;
    }>(`/api/upload-s3-object?key=${uploadedDocumentKey}`);

    const uploadUrl = data.data.signedUrl;

    const response = await axios.put(uploadUrl, file);
    if (response.status === 200) {
      const url = getS3Url(uploadedDocumentKey);
      console.log(url);
      toast.success("Document uploaded successfully");
    } else {
      // TODO: Delete the created document from the database
      // Use `useSubmit()` to do this
      toast.error("Error uploading document");
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, uploadedDocumentKey]);

  React.useEffect(() => {
    if (fetcher.state !== "idle") {
      return;
    }

    if (!fetcher.data) {
      return;
    }

    if (fetcher.data.success) {
      handleFileUpload();
    }
  }, [fetcher.data, fetcher.state, handleFileUpload]);

  return (
    <div className="space-y-6">
      <Card className="bg-black text-white">
        <CardHeader>
          <CardTitle>Project Information</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableBody>
              {/* Replace the existing dl with this Table */}
              <TableRow>
                <TableCell className="font-medium">Title</TableCell>
                <TableCell>{project.post.title}</TableCell>
              </TableRow>
              {/* Add more TableRow components for each project detail */}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="ml-4 flex flex-col gap-2">
        <div>
          {project.status === ProjectStatus.completed ? (
            <div className="flex gap-2">
              <div className="flex w-52 items-center justify-center rounded-md border border-black bg-green-500 p-2">
                <span className="text-semibold text-white">Payment Done</span>
              </div>
              <div className="flex w-52 items-center justify-center rounded-md border border-black bg-green-500 p-2">
                <span className="text-semibold text-white">Project Completed</span>
              </div>
            </div>
          ) : (
            ""
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Your Files</CardTitle>
          </CardHeader>
          <CardContent>
            <Separator className="my-4" />
            <div className="space-y-3">
              {project.editorDocuments && project.editorDocuments.length > 0 ? (
                project.editorDocuments.map((document) => (
                  <div
                    key={document.id}
                    className="flex w-56 flex-col rounded-md border p-2 text-white"
                  >
                    <a href={document.imageUrl} className="flex items-center gap-3" download>
                      <FileIcon className="h-9 w-9" />
                      {document.name}.{document.extension}
                    </a>
                  </div>
                ))
              ) : (
                <div className="p-2">
                  <p className="text-white">No documents available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer Files</CardTitle>
          </CardHeader>
          <CardContent>
            <Separator className="my-4" />
            <div className="space-y-3">
              {project.customerDocuments && project.customerDocuments.length > 0 ? (
                project.customerDocuments.map((document) => (
                  <div
                    key={document.id}
                    className="flex w-56 flex-col rounded-md border p-2 text-white"
                  >
                    <a href={getS3Url(document.key)} className="flex items-center gap-3" download>
                      <FileIcon className="h-9 w-9" />
                      {document.name}.{document.extension}
                    </a>
                  </div>
                ))
              ) : (
                <div className="p-2">
                  <p className="text-white">No documents available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {!isProjectCompleted && (
          <Card>
            <CardHeader>
              <CardTitle>Upload a file</CardTitle>
            </CardHeader>
            <CardContent>
              <Separator className="my-4" />
              <fetcher.Form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!file || !uploadedDocumentKey) {
                    return;
                  }
                  const extension = mime.extension(file.type);
                  const formData = new FormData(e.currentTarget);
                  formData.append("bucket", window.ENV.AWS_BUCKET);
                  formData.append("key", uploadedDocumentKey);
                  formData.append("extension", extension || "");
                  formData.append("region", window.ENV.AWS_REGION);
                  console.log(JSON.stringify(Object.fromEntries(formData.entries())));
                  fetcher.submit(formData, {
                    method: "POST",
                  });
                }}
                className="space-y-4"
              >
                <input type="hidden" name="postId" value={project.postId} />
                <div className="space-y-2">
                  <Label htmlFor="name">File Name</Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Enter the name of the file"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    name="description"
                    type="text"
                    placeholder="Enter the description of the file"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="file">Upload File</Label>
                  <Input
                    id="file"
                    type="file"
                    onChange={(e) => setFile(e.currentTarget.files?.[0] ?? null)}
                  />
                </div>
                <Button disabled={!file || !uploadedDocumentKey} type="submit">
                  Submit
                </Button>
              </fetcher.Form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
