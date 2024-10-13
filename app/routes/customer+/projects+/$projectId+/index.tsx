import { PaymentMethod, ProjectStatus } from "@prisma/client";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import axios from "axios";
import { FileIcon } from "lucide-react";
import * as mime from "mime-types";
import * as React from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Form } from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
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

export async function loader({ params }: LoaderFunctionArgs) {
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
}

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
  const [file, setFile] = React.useState<File | null>(null);
  const [isFileUploading, setIsFileUploading] = React.useState(false);

  const isProjectCompleted = project.status === ProjectStatus.completed;

  const completeProjectFetcher = useFetcher<CompleteProjectActionData>();
  const paymentFetcher = useFetcher<PaymentActionData>();

  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>(
    PaymentMethod.CREDIT_CARD,
  );
  const [isPaymentModalOpen, setIsPaymentModalOpen] = React.useState(false);
  const closePaymentModal = () => setIsPaymentModalOpen(false);

  const [cardHolderName, setCardHolderName] = React.useState<string>("");
  const [cardNumber, setCardNumber] = React.useState<string>("1234567891234567");
  const [cardExpiry, setCardExpiry] = React.useState<Date | null>(new Date("2026-12-31"));
  const [cardCvv, setCardCvv] = React.useState<string>("123");
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

    setIsFileUploading(true);
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

    setIsFileUploading(false);
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

    setFile(null);
  }, [fetcher.data, fetcher.state, handleFileUpload]);

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
    <div>
      <div className="bg-black p-10">
        <div className="px-4">
          <h3 className="text-xl font-semibold leading-7 text-white">Project Information</h3>
        </div>
        <div className="mt-6 border-t border-white/10">
          <dl className="divide-y divide-white/10">
            <div className="px-2 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm font-medium leading-6 text-white">Title</dt>
              <dd className="mt-1 text-sm leading-6 text-gray-400 sm:col-span-2 sm:mt-0">
                {project.post.title}
              </dd>
            </div>
            <div className="px-2 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm font-medium leading-6 text-white">Category</dt>
              <dd className="mt-1 text-sm leading-6 text-gray-400 sm:col-span-2 sm:mt-0">
                {project.post.category.name}
              </dd>
            </div>
            <div className="px-2 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm font-medium leading-6 text-white">Description</dt>
              <dd className="mt-1 text-sm leading-6 text-gray-400 sm:col-span-2 sm:mt-0">
                {project.post.description}
              </dd>
            </div>
            <div className="px-2 py-3  sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm font-medium leading-6 text-white">Posted By</dt>
              <dd className="mt-1 text-sm leading-6 text-gray-400 sm:col-span-2 sm:mt-0">
                {project.customer.firstName} {project.customer.lastName}
              </dd>
            </div>
            <div className="px-2 py-3  sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm font-medium leading-6 text-white">Budget</dt>
              <dd className="mt-1 text-sm leading-6 text-gray-400 sm:col-span-2 sm:mt-0">
                ${project.post.bids[0].price}
              </dd>
            </div>
            <div className="px-2 py-3  sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm font-medium leading-6 text-white">Deadline</dt>
              <dd className="mt-1 text-sm leading-6 text-gray-400 sm:col-span-2 sm:mt-0">
                {formatDate(project.post.deadline)}
              </dd>
            </div>
            <div className="px-2 py-3  sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm font-medium leading-6 text-white">Editor</dt>
              <dd className="mt-1 text-sm leading-6 text-gray-400 sm:col-span-2 sm:mt-0">
                {project.editor.firstName} {project.editor.lastName}
              </dd>
            </div>
          </dl>
        </div>
      </div>
      <div className="ml-4 flex flex-col gap-2">
        <div>
          {project.status === ProjectStatus.in_progress ? (
            <div>
              <Button
                type="submit"
                variant="default"
                size="sm"
                onClick={() => {
                  completeProject();
                }}
              >
                Done
              </Button>
            </div>
          ) : project.status === ProjectStatus.payment_pending && !project.payment ? (
            <div>
              <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    Make Payment
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Payment</DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                      <h2 className="text-sm text-gray-600">
                        <span className="font-semibold">Amount: </span>
                        <span>${project.post.bids[0].price}</span>
                      </h2>
                    </div>

                    <Form onSubmit={makePayment}>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="cardHolderName">Card holder name</Label>
                          <Input
                            id="cardHolderName"
                            value={cardHolderName}
                            onChange={(e) => setCardHolderName(e.target.value)}
                            required
                          />
                        </div>

                        <div>
                          <Label htmlFor="paymentMethod">Payment method</Label>
                          <Select
                            value={paymentMethod}
                            onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select payment method" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.values(PaymentMethod).map((method) => (
                                <SelectItem key={method} value={method}>
                                  {titleCase(method)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="cardNumber">Card number</Label>
                          <Input
                            id="cardNumber"
                            placeholder="XXXX XXXX XXXX XXXX"
                            value={cardNumber}
                            onChange={(e) => setCardNumber(e.target.value)}
                            required
                          />
                        </div>

                        <div className="flex items-center gap-4">
                          <div>
                            <Label htmlFor="cvv">CVV</Label>
                            <Input
                              id="cvv"
                              placeholder="XXX"
                              value={cardCvv}
                              onChange={(e) => setCardCvv(e.target.value)}
                              required
                            />
                          </div>

                          <div>
                            <Label htmlFor="expiry">Expiry</Label>
                            <Calendar
                              mode="single"
                              selected={cardExpiry}
                              onSelect={(date) => setCardExpiry(date)}
                              disabled={(date) => date < new Date()}
                              initialFocus
                            />
                          </div>
                        </div>

                        {Object.values(errors).some((error) => error !== "") ? (
                          <div className="flex flex-col gap-2">
                            {Object.entries(errors).map(([key, value]) => (
                              <p key={key} className="text-red-500">
                                {value}
                              </p>
                            ))}
                          </div>
                        ) : null}

                        <div className="mt-6 flex items-center gap-4 sm:justify-end">
                          <Button variant="outline" onClick={closePaymentModal}>
                            Cancel
                          </Button>
                          <Button type="submit">Make Payment</Button>
                        </div>
                      </div>
                    </Form>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          ) : (
            <div className="flex gap-2">
              <div className="flex w-52 items-center justify-center rounded-md border border-black bg-green-500 p-2">
                <span className="text-semibold text-white">Payment Done</span>
              </div>
              <div className="flex w-52 items-center justify-center rounded-md border border-black bg-green-500 p-2">
                <span className="text-semibold text-white">Project Completed</span>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 p-6">
        <div className="p-2">
          <p className="text-xl text-white">Your Files</p>
          <Separator className="my-4" />
          <div className="space-y-3">
            {project.customerDocuments && project.customerDocuments.length > 0 ? (
              project.customerDocuments.map((document) => (
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
        </div>
        <div className="p-2">
          <p className="text-xl text-white">Editor Files</p>
          <Separator className="my-4" />
          <div className="space-y-3">
            {project.editorDocuments && project.editorDocuments.length > 0 ? (
              project.editorDocuments.map((document) => (
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
        </div>
        {!isProjectCompleted && (
          <div className="rounded-md border border-white bg-gray-950 p-4 relative">
            {isFileUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white" />
                  <p className="mt-2 text-white">Uploading file...</p>
                </div>
              </div>
            )}
            <h1 className="text-xl text-white">Upload a file</h1>
            <Separator className="my-4" />
            <div className="flex flex-col">
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
                className="flex flex-col gap-4"
              >
                <input type="hidden" name="postId" value={project.postId} />
                <div>
                  <Label htmlFor="name">File Name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Enter the name of the file"
                    required
                    className="text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    name="description"
                    placeholder="Enter the description of the file"
                    required
                    className="text-white"
                  />
                </div>
                <div className="flex w-80 flex-col rounded-md border p-4 text-white">
                  <div>
                    <input
                      type="file"
                      onChange={(e) => setFile(e.currentTarget.files?.[0] ?? null)}
                    />
                  </div>
                </div>
                <div>
                  <Button
                    disabled={!file || !uploadedDocumentKey}
                    type="submit"
                    variant="destructive"
                  >
                    Submit
                  </Button>
                </div>
              </fetcher.Form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
