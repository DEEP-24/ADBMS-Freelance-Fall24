import { PaymentMethod, ProjectStatus } from "@prisma/client";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Link, useFetcher, useLoaderData } from "@remix-run/react";
import axios from "axios";
import { ArrowLeftIcon, CalendarIcon, FileIcon, FolderIcon } from "lucide-react";
import * as mime from "mime-types";
import * as React from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";

import { db } from "~/lib/db.server";
import { getS3Url, getUniqueS3Key } from "~/lib/s3-utils";
import { requireUserId } from "~/lib/session.server";
import type { CompleteProjectActionData } from "~/routes/api+/completeProject";
import type { PaymentActionData } from "~/routes/api+/payment";
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

export const loader = async ({ params }: LoaderFunctionArgs) => {
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
      payment: true,
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
};

export const meta: MetaFunction = () => {
  return [
    {
      title: "Artify | View Project",
    },
  ];
};

interface ActionData {
  success: boolean;
  fieldErrors?: inferErrors<typeof createFileEntrySchema>;
}

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const customerId = await requireUserId(request);
  const { projectId } = params;

  if (!projectId) {
    return redirect("/customer/projects");
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
      customerId,
      customerProjectId: projectId,
      type: "SOURCE",
    },
  });

  return json<ActionData>({
    success: true,
  });
};

export default function ProjectPage() {
  const { project } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<ActionData>();
  const [isFileUploading, setIsFileUploading] = React.useState(false);

  const isProjectCompleted = project.status === ProjectStatus.completed;

  const completeProjectFetcher = useFetcher<CompleteProjectActionData>();
  const paymentFetcher = useFetcher<PaymentActionData>();

  // biome-ignore lint/correctness/noUnusedVariables: <explanation>
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>(
    PaymentMethod.CREDIT_CARD,
  );
  const [isPaymentModalOpen, setIsPaymentModalOpen] = React.useState(false);
  const closePaymentModal = () => setIsPaymentModalOpen(false);

  // biome-ignore lint/correctness/noUnusedVariables: <explanation>
  const [cardHolderName, setCardHolderName] = React.useState<string>("");
  // biome-ignore lint/correctness/noUnusedVariables: <explanation>
  const [cardNumber, setCardNumber] = React.useState<string>("1234567891234567");
  // biome-ignore lint/correctness/noUnusedVariables: <explanation>
  const [cardExpiry, setCardExpiry] = React.useState<Date | null>(new Date("2026-12-31"));
  // biome-ignore lint/correctness/noUnusedVariables: <explanation>
  const [displayExpiryDate, setDisplayExpiryDate] = React.useState<string>("");
  // biome-ignore lint/correctness/noUnusedVariables: <explanation>
  const [cardCvv, setCardCvv] = React.useState<string>("123");
  // biome-ignore lint/correctness/noUnusedVariables: <explanation>
  const [errors, setErrors] = React.useState<{
    cardHolderName?: string;
    cardNumber?: string;
    cardExpiry?: string;
    cardCvv?: string;
  }>({
    cardHolderName: "",
    cardNumber: "",
    cardExpiry: "",
    cardCvv: "",
  });

  const [fileName, setFileName] = React.useState("");
  const [fileDescription, setFileDescription] = React.useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const completeProject = () => {
    const formData = new FormData();
    formData.append("projectId", project.id);
    completeProjectFetcher.submit(formData, {
      method: "POST",
      action: "/api/completeProject",
    });
  };

  const makePayment = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData();

    const errors = {
      cardHolderName: "",
      cardNumber: "",
      cardExpiry: "",
      cardCvv: "",
    };
    setErrors(errors);
    if (!cardHolderName) {
      errors.cardHolderName = "Card holder name is required";
    }

    if (cardNumber.replace(/[_ ]/g, "").length !== 16) {
      errors.cardNumber = "Card number must be 16 digits";
    }

    if (!cardExpiry) {
      errors.cardExpiry = "Card expiry date is required";
    }

    if (cardCvv.replace(/[_ ]/g, "").length !== 3) {
      errors.cardCvv = "Card CVV must be 3 digits";
    }

    if (Object.values(errors).some((error) => error !== "")) {
      setErrors(errors);
      return;
    }

    formData.append("paymentMethod", paymentMethod);
    formData.append("amount", project.post.bids[0].price.toString());
    formData.append("projectId", project.id);
    formData.append("customerId", project.customerId);
    formData.append("editorId", project.editorId);

    paymentFetcher.submit(formData, {
      method: "POST",
      action: "/api/payment",
    });
  };

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
      toast.success("Project completed, Payment is pending!");
    } else {
      toast.error("Something went wrong");
    }
  }, [completeProjectFetcher.data, completeProjectFetcher, isCompletingProject]);

  const isPaymentSubmitting = paymentFetcher.state !== "idle";
  React.useEffect(() => {
    if (isPaymentSubmitting) {
      return;
    }
    if (!paymentFetcher.data) {
      return;
    }

    if (paymentFetcher.data.success) {
      closePaymentModal();
      toast.success("Payment completed!");
    } else {
      toast.error("Something went wrong");
    }
  }, [isPaymentSubmitting, paymentFetcher, paymentFetcher.data]);

  return (
    <div className="container mx-auto p-6 bg-gray-50">
      <header className="mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">Project: {project.post.title}</h1>
          <Link to="/customer/projects">
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-gray-700">Budget</h3>
                <p className="text-2xl font-bold text-green-600">${project.post.budget}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700">Your Price</h3>
                <p className="text-2xl font-bold text-blue-600">${project.post.bids[0].price}</p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            {project.status === ProjectStatus.in_progress ? (
              <Button
                onClick={() => completeProject()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Mark as Done
              </Button>
            ) : project.status === ProjectStatus.payment_pending && !project.payment ? (
              <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="default"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Make Payment
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white">
                  <DialogHeader>
                    <DialogTitle className="text-emerald-800">Payment</DialogTitle>
                  </DialogHeader>
                  <fetcher.Form onSubmit={makePayment} className="space-y-4">
                    {/* Keep the existing form fields */}
                    <div className="flex justify-end gap-4">
                      <Button
                        variant="outline"
                        onClick={closePaymentModal}
                        className="text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        Make Payment
                      </Button>
                    </div>
                  </fetcher.Form>
                </DialogContent>
              </Dialog>
            ) : (
              <div className="flex gap-2">
                <Badge variant="default" className="bg-emerald-100 text-emerald-800">
                  Payment Done
                </Badge>
                <Badge variant="default" className="bg-emerald-100 text-emerald-800">
                  Project Completed
                </Badge>
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
              {project.customerDocuments && project.customerDocuments.length > 0 ? (
                <ul className="space-y-4">
                  {project.customerDocuments.map((document) => (
                    <li key={document.id} className="bg-white p-4 rounded-lg shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <FileIcon className="mr-3 h-5 w-5 text-blue-600 flex-shrink-0" />
                          <div>
                            <a
                              href={document.imageUrl}
                              download
                              className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
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
              <CardTitle>Editor Files</CardTitle>
            </CardHeader>
            <CardContent className="max-h-60 overflow-y-auto">
              {project.editorDocuments && project.editorDocuments.length > 0 ? (
                <ul className="space-y-2">
                  {project.editorDocuments.map((document) => (
                    <li
                      key={document.id}
                      className="flex items-center py-2 px-3 bg-emerald-50 rounded-md"
                    >
                      <FileIcon className="mr-3 h-5 w-5 text-emerald-600 flex-shrink-0" />
                      <a
                        href={getS3Url(document.key)}
                        download
                        className="text-emerald-600 hover:text-emerald-800 hover:underline truncate"
                      >
                        {document.name}.{document.extension}
                      </a>
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
