import { PaymentMethod, ProjectStatus } from "@prisma/client";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Link, useActionData, useFetcher, useLoaderData } from "@remix-run/react";
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
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { db } from "~/lib/db.server";
import { getS3Url, getUniqueS3Key } from "~/lib/s3-utils";
import { requireUserId } from "~/lib/session.server";
import { createFileEntrySchema } from "~/lib/zod.schema";
import type { CompleteProjectActionData } from "~/routes/api+/completeProject";
import type { FeedbackActionData } from "~/routes/api+/feedback";
import type { PaymentActionData } from "~/routes/api+/payment";
import { formatDate, titleCase, useOptionalUser } from "~/utils/misc";
import { badRequest } from "~/utils/misc.server";
import { useFetcherCallback } from "~/utils/use-fetcher-callback";
import { validateAction } from "~/utils/validation";

export async function loader({ params, request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
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
      feedback: {
        select: {
          rating: true,
          comment: true,
          customerId: true,
        },
      },
      payment: true,
    },
  });

  if (!project || project.customerId !== userId) {
    return redirect("/customer/projects");
  }

  return json({
    project: project,
  });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const customerId = await requireUserId(request);
  const { projectId } = params;

  if (!projectId) {
    return redirect("/customer/projects");
  }

  const { fields, fieldErrors } = await validateAction(request, createFileEntrySchema);

  if (fieldErrors) {
    return badRequest({ success: false, fieldErrors });
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

  return json({ success: true });
}

export default function ProjectPage() {
  const currentUser = useOptionalUser();

  const { project } = useLoaderData<typeof loader>();
  // const feedbackActionData = useActionData<FeedbackActionData>();

  const feedbackFetcher = useFetcher<FeedbackActionData>();

  const fileFetcher = useFetcherCallback<{ success: boolean }>({
    onSuccess: () => {
      toast.success("File uploaded successfully");
      setFileName("");
      setFileDescription("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    onError: () => {
      toast.error("File upload failed");
    },
  });
  const completeProjectFetcher = useFetcherCallback<CompleteProjectActionData>({
    onSuccess: () => {
      toast.success("Project marked as completed!");
    },
    onError: () => {
      toast.error("Failed to complete project. Please try again.");
    },
  });
  const paymentFetcher = useFetcherCallback<PaymentActionData>({
    onSuccess: () => {
      toast.success("Payment completed successfully!");
      setIsPaymentModalOpen(false);
    },
    onError: () => {
      toast.error("Payment failed. Please try again.");
    },
  });

  const [rating, setRating] = React.useState(0);
  const [comment, setComment] = React.useState("");
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = React.useState(false);
  const [isFileUploading, setIsFileUploading] = React.useState(false);
  const [fileName, setFileName] = React.useState("");
  const [fileDescription, setFileDescription] = React.useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = React.useState(false);
  const [cardHolderName, setCardHolderName] = React.useState("");
  const [cardNumber, setCardNumber] = React.useState("");
  const [cardExpiry, setCardExpiry] = React.useState("");
  const [cardCvv, setCardCvv] = React.useState("");

  const isProjectCompleted = project.status === ProjectStatus.completed;
  const isPaymentReceived = project.payment !== null;
  const hasUserLeftFeedback = project.feedback?.some(
    (feedback) => feedback.customerId === currentUser?.id,
  );

  const handleFeedbackSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    feedbackFetcher.submit(formData, {
      method: "POST",
      action: "/api/feedback",
    });
  };

  React.useEffect(() => {
    if (feedbackFetcher.state === "idle" && feedbackFetcher.data) {
      if (feedbackFetcher.data.success) {
        toast.success("Feedback submitted successfully!");
        setIsFeedbackModalOpen(false);
        setRating(0);
        setComment("");
      } else {
        toast.error(feedbackFetcher.data.message || "Failed to submit feedback. Please try again.");
      }
    }
  }, [feedbackFetcher]);

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

        fileFetcher.submit(formData, { method: "POST" });
      } catch (error) {
        console.error("Error uploading file:", error);
        toast.error("Error uploading file");
      } finally {
        setIsFileUploading(false);
      }
    },
    [fileFetcher, project.postId, fileName, fileDescription],
  );

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
    formData.append("paymentMethod", PaymentMethod.CREDIT_CARD);
    formData.append("amount", project.post.bids[0].price.toString());
    formData.append("projectId", project.id);
    formData.append("customerId", project.customerId);
    formData.append("editorId", project.editorId);
    formData.append("cardHolderName", cardHolderName);
    formData.append("cardNumber", cardNumber);
    formData.append("cardExpiry", cardExpiry);
    formData.append("cardCvv", cardCvv);

    paymentFetcher.submit(formData, {
      method: "POST",
      action: "/api/payment",
    });
  };

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
          <Badge variant={isProjectCompleted ? "default" : "default"}>
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
                <p className="text-2xl font-bold text-blue-600">
                  ${project.post.bids.find((bid) => bid.approved)?.price ?? 0}
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700">Editor</h3>
                <p className="text-lg font-bold text-blue-600 flex items-center">
                  <UserIcon className="w-5 h-5 mr-1" />
                  {project.editor.firstName} {project.editor.lastName}
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            {isProjectCompleted && isPaymentReceived && (
              <div className="w-full flex items-center justify-between">
                <div className="flex items-center bg-green-100 text-green-700 px-4 py-2 rounded-lg">
                  <CheckCircleIcon className="w-5 h-5 mr-2" />
                  <p className="font-semibold">
                    Project completed and payment received successfully!
                  </p>
                </div>
                {!hasUserLeftFeedback && (
                  <Button
                    onClick={() => setIsFeedbackModalOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Leave Feedback
                  </Button>
                )}
              </div>
            )}
            {project.status === ProjectStatus.in_progress && (
              <div className="flex gap-4">
                <Button
                  onClick={() => completeProject()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={completeProjectFetcher.isPending}
                >
                  {completeProjectFetcher.isPending ? (
                    <>
                      <span className="animate-spin mr-2">&#9696;</span>
                      Completing...
                    </>
                  ) : (
                    "Complete Project"
                  )}
                </Button>
              </div>
            )}
            {project.status === ProjectStatus.payment_pending && (
              <div className="flex gap-4">
                <Button
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={paymentFetcher.isPending}
                >
                  Make Payment
                </Button>
              </div>
            )}
            {project.feedback && project.feedback.length > 0 && (
              <div className="w-full p-4 bg-gray-100 rounded-lg">
                <h3 className="font-semibold text-lg mb-2">Your Feedback</h3>
                <div className="flex items-center mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-5 h-5 ${
                        star <= (project.feedback[0]?.rating ?? 0)
                          ? "text-yellow-500 fill-current"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-gray-700">{project.feedback[0]?.comment}</p>
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

      {/* Payment Modal */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
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
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cardExpiry">Expiry Date</Label>
                <Input
                  id="cardExpiry"
                  value={cardExpiry}
                  onChange={(e) => setCardExpiry(e.target.value)}
                  required
                  placeholder="MM/YY"
                />
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
              </div>
            </div>
            <div className="flex justify-end gap-4 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsPaymentModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={paymentFetcher.isPending}
              >
                {paymentFetcher.isPending ? "Processing..." : `Pay $${project.post.bids[0].price}`}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Feedback Modal */}
      <Dialog open={isFeedbackModalOpen} onOpenChange={setIsFeedbackModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave Feedback</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFeedbackSubmit} className="space-y-4">
            {feedbackFetcher.data?.success === false && (
              <div className="text-red-500">
                <p>
                  {feedbackFetcher.data.message || "Failed to submit feedback. Please try again."}
                </p>
              </div>
            )}
            <div>
              <Label htmlFor="rating">Rating</Label>
              <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-6 h-6 cursor-pointer ${
                      star <= rating ? "text-yellow-500 fill-current" : "text-gray-300"
                    }`}
                    onClick={() => setRating(star)}
                  />
                ))}
              </div>
              <input type="hidden" name="rating" value={rating} />
            </div>
            <div>
              <Label htmlFor="comment">Comment</Label>
              <Textarea
                id="comment"
                name="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Leave your feedback here..."
                required
              />
            </div>
            <input type="hidden" name="projectId" value={project.id} />
            <Button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={feedbackFetcher.state !== "idle"}
            >
              {feedbackFetcher.state !== "idle" ? "Submitting..." : "Submit Feedback"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
