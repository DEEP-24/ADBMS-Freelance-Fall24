import { PaymentMethod, ProjectStatus } from "@prisma/client";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Link, useFetcher, useLoaderData } from "@remix-run/react";
import axios from "axios";
import { ArrowLeftIcon, CalendarIcon, FileIcon, FolderIcon, UserIcon } from "lucide-react";
import * as mime from "mime-types";
import * as React from "react";
import { toast } from "sonner";
import type { z } from "zod";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

import { db } from "~/lib/db.server";
import { getS3Url, getUniqueS3Key } from "~/lib/s3-utils";
import { requireUserId } from "~/lib/session.server";
import { createFileEntrySchema, paymentSchema } from "~/lib/zod.schema";
import type { CompleteProjectActionData } from "~/routes/api+/completeProject";
import type { PaymentActionData } from "~/routes/api+/payment";
import { formatDate, titleCase } from "~/utils/misc";
import { badRequest } from "~/utils/misc.server";
import { type inferErrors, validateAction } from "~/utils/validation";

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

  const [isPaymentModalOpen, setIsPaymentModalOpen] = React.useState(false);
  const closePaymentModal = () => setIsPaymentModalOpen(false);

  const [cardHolderName, setCardHolderName] = React.useState("");
  const [cardNumber, setCardNumber] = React.useState("");
  const [, setCardExpiry] = React.useState<Date | null>();
  const [displayExpiryDate, setDisplayExpiryDate] = React.useState<string>("");
  const [cardCvv, setCardCvv] = React.useState("");

  const [fileName, setFileName] = React.useState("");
  const [fileDescription, setFileDescription] = React.useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [errors, setErrors] = React.useState<z.ZodFormattedError<
    z.infer<typeof paymentSchema>
  > | null>(null);

  const validatePaymentForm = () => {
    const result = paymentSchema.safeParse({
      cardHolderName,
      cardNumber,
      cardExpiry: displayExpiryDate,
      cardCvv,
    });

    if (!result.success) {
      setErrors(result.error.format());
      return false;
    }

    setErrors(null);
    return true;
  };

  const completeProject = () => {
    const formData = new FormData();
    formData.append("projectId", project.id);
    completeProjectFetcher.submit(formData, {
      method: "POST",
      action: "/api/completeProject",
    });
  };

  const handleExpiryDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value.replace(/\D/g, "");
    if (input.length > 4) {
      input = input.slice(0, 4);
    }

    let formattedValue = "";
    if (input.length > 0) {
      let month = input.slice(0, 2);
      if (month.length === 1 && Number.parseInt(month) > 1) {
        month = `0${month}`;
      }
      formattedValue = month;
      if (input.length > 2) {
        formattedValue += `/${input.slice(2)}`;
      }
    }

    setDisplayExpiryDate(formattedValue);

    let newDateValue: Date | null = null;

    // Parse the input into a Date object
    if (input.length === 4) {
      const month = Number.parseInt(input.slice(0, 2)) - 1; // JS months are 0-indexed
      const year = Number.parseInt(`20${input.slice(2)}`);
      const date = new Date(year, month);

      // Validate the date
      if (date.getMonth() === month && date.getFullYear() === year) {
        newDateValue = date;
      }
    }

    setCardExpiry(newDateValue);
  };

  const makePayment = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validatePaymentForm()) {
      return;
    }

    const formData = new FormData();
    formData.append("paymentMethod", PaymentMethod.CREDIT_CARD);
    formData.append("amount", project.post.bids[0].price.toString());
    formData.append("projectId", project.id);
    formData.append("customerId", project.customerId);
    formData.append("editorId", project.editorId);
    formData.append("cardHolderName", cardHolderName);
    formData.append("cardNumber", cardNumber);
    formData.append("cardExpiry", displayExpiryDate);
    formData.append("cardCvv", cardCvv);

    paymentFetcher.submit(formData, {
      method: "POST",
      action: "/api/payment",
    });
  };

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
      toast.error("Payment failed. Please try again.");
    }
  }, [isPaymentSubmitting, paymentFetcher.data]);

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
            <div className="grid grid-cols-3 gap-4">
              <div>
                <h3 className="font-semibold text-gray-700">Budget</h3>
                <p className="text-2xl font-bold text-green-600">${project.post.budget}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700">Editor Price</h3>
                <p className="text-2xl font-bold text-blue-600">${project.post.bids[0].price}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700">Editor Name</h3>
                <p className="text-lg font-bold text-blue-600 flex items-center">
                  <UserIcon className="w-5 h-5 mr-1" />
                  {project.editor.firstName} {project.editor.lastName}
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            {project.status === ProjectStatus.in_progress && (
              <div className="flex gap-4">
                <Button
                  onClick={() => completeProject()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={isCompletingProject}
                >
                  {isCompletingProject ? (
                    <>
                      <span className="animate-spin mr-2">&#9696;</span>
                      Completing...
                    </>
                  ) : (
                    "Complete Project"
                  )}
                </Button>
                <Button
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={true} // Always disabled when project is in progress
                >
                  Make Payment
                </Button>
              </div>
            )}
            {project.status === ProjectStatus.payment_pending && (
              <div className="flex gap-4">
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled>
                  Complete Project
                </Button>
                <Button
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={isCompletingProject}
                >
                  Make Payment
                </Button>
              </div>
            )}
            {project.status === ProjectStatus.completed && (
              <div className="mt-4 flex items-center justify-between bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
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
                      className="h-8 w-8 text-blue-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Payment Processed</h3>
                    <p className="text-sm text-gray-500">
                      The payment for this project has been successfully processed.
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
              {project.customerDocuments && project.customerDocuments.length > 0 ? (
                <ul className="space-y-4">
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
                              href={getS3Url(document.key)}
                              download
                              className="text-emerald-600 hover:text-emerald-800 hover:underline truncate"
                            >
                              {document.name}.{document.extension}
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

      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="text-emerald-800">Payment Details</DialogTitle>
          </DialogHeader>
          <form onSubmit={makePayment} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cardHolderName">Card Holder Name</Label>
              <Input
                id="cardHolderName"
                value={cardHolderName}
                onChange={(e) => setCardHolderName(e.target.value)}
                required
              />
              {errors?.cardHolderName && (
                <p className="text-sm text-red-500">{errors.cardHolderName._errors.join(", ")}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cardNumber">Card Number</Label>
              <Input
                id="cardNumber"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                required
                maxLength={16}
                placeholder="1234 5678 9012 3456"
              />
              {errors?.cardNumber && (
                <p className="text-sm text-red-500">{errors.cardNumber._errors.join(", ")}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="expiryDate">Expiry Date</Label>
                <Input
                  type="text"
                  value={displayExpiryDate}
                  onChange={handleExpiryDateChange}
                  placeholder="MM/YY"
                  maxLength={5}
                />
                {errors?.cardExpiry && (
                  <p className="text-sm text-red-500">{errors.cardExpiry._errors.join(", ")}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="cardCvv">CVV</Label>
                <Input
                  id="cardCvv"
                  value={cardCvv}
                  onChange={(e) => setCardCvv(e.target.value)}
                  required
                  maxLength={3}
                  placeholder="123"
                />
                {errors?.cardCvv && (
                  <p className="text-sm text-red-500">{errors.cardCvv._errors.join(", ")}</p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                disabled={isPaymentSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={isPaymentSubmitting}
              >
                {isPaymentSubmitting ? (
                  <>
                    <span className="animate-spin mr-2">&#9696;</span>
                    Processing...
                  </>
                ) : (
                  `Pay $${project.post.bids[0].price}`
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
