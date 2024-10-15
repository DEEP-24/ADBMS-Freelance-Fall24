import { PaymentMethod, ProjectStatus } from "@prisma/client";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Link, useFetcher, useLoaderData } from "@remix-run/react";
import axios from "axios";
import { ArrowLeftIcon, CalendarIcon, DollarSignIcon, FileIcon, FolderIcon } from "lucide-react";
import * as mime from "mime-types";
import * as React from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
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
  const [displayExpiryDate, setDisplayExpiryDate] = React.useState<string>("");

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
      toast.error("Error uploading document");
    }

    setIsFileUploading(false);
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
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-emerald-800">Project Details</h1>
        <Link to="/customer/projects">
          <Button variant="outline" className="flex items-center gap-2">
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Projects
          </Button>
        </Link>
      </div>

      <Card className="mb-8 border-emerald-200">
        <CardHeader className="bg-emerald-50">
          <CardTitle className="text-2xl text-emerald-800">{project.post.title}</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex items-center">
              <CalendarIcon className="mr-2 h-4 w-4 text-emerald-600" />
              <span className="text-emerald-800">Due on {formatDate(project.post.deadline)}</span>
            </div>
            <div className="flex items-center">
              <FolderIcon className="mr-2 h-4 w-4 text-emerald-600" />
              <span className="text-emerald-800">{project.post.category.name}</span>
            </div>
            <div className="flex items-center">
              <DollarSignIcon className="mr-2 h-4 w-4 text-emerald-600" />
              <span className="text-emerald-800">Budget: ${project.post.bids[0].price}</span>
            </div>
            <div className="flex items-center">
              <span className="font-semibold mr-2 text-emerald-800">Status:</span>
              <Badge variant={project.status === ProjectStatus.completed ? "default" : "default"}>
                {titleCase(project.status)}
              </Badge>
            </div>
          </div>
          <Separator className="my-4" />
          <p className="text-emerald-800">{project.post.description}</p>
        </CardContent>
        <CardFooter className="bg-emerald-50">
          {project.status === ProjectStatus.in_progress ? (
            <Button
              onClick={() => completeProject()}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Mark as Done
            </Button>
          ) : project.status === ProjectStatus.payment_pending && !project.payment ? (
            <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
              <DialogTrigger asChild>
                <Button variant="default" className="bg-emerald-600 hover:bg-emerald-700">
                  Make Payment
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Payment</DialogTitle>
                </DialogHeader>
                <fetcher.Form onSubmit={makePayment} className="space-y-4">
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
                      <Input
                        type="text"
                        value={displayExpiryDate}
                        onChange={handleExpiryDateChange}
                        placeholder="MM/YY"
                        maxLength={5}
                      />
                      {errors.cardExpiry && (
                        <p className="text-sm text-red-500">{errors.cardExpiry}</p>
                      )}
                    </div>
                  </div>
                  {Object.values(errors).some((error) => error !== "") && (
                    <div className="text-red-500">
                      {Object.values(errors).map((error, index) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                        <p key={index}>{error}</p>
                      ))}
                    </div>
                  )}
                  <div className="flex justify-end gap-4">
                    <Button variant="outline" onClick={closePaymentModal}>
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                      Make Payment
                    </Button>
                  </div>
                </fetcher.Form>
              </DialogContent>
            </Dialog>
          ) : (
            <div className="flex gap-2">
              <Badge variant="default">Payment Done</Badge>
              <Badge variant="default">Project Completed</Badge>
            </div>
          )}
        </CardFooter>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-emerald-200">
          <CardHeader className="bg-emerald-50">
            <CardTitle className="text-emerald-800">Your Files</CardTitle>
          </CardHeader>
          <CardContent>
            {project.customerDocuments && project.customerDocuments.length > 0 ? (
              project.customerDocuments.map((document) => (
                <div key={document.id} className="flex items-center mb-2">
                  <FileIcon className="mr-2 h-4 w-4 text-emerald-600" />
                  <a
                    href={document.imageUrl}
                    download
                    className="text-emerald-600 hover:text-emerald-800 hover:underline"
                  >
                    {document.name}.{document.extension}
                  </a>
                </div>
              ))
            ) : (
              <p className="text-emerald-800">No documents available</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-emerald-200">
          <CardHeader className="bg-emerald-50">
            <CardTitle className="text-emerald-800">Editor Files</CardTitle>
          </CardHeader>
          <CardContent>
            {project.editorDocuments && project.editorDocuments.length > 0 ? (
              project.editorDocuments.map((document) => (
                <div key={document.id} className="flex items-center mb-2">
                  <FileIcon className="mr-2 h-4 w-4 text-emerald-600" />
                  <a
                    href={getS3Url(document.key)}
                    download
                    className="text-emerald-600 hover:text-emerald-800 hover:underline"
                  >
                    {document.name}.{document.extension}
                  </a>
                </div>
              ))
            ) : (
              <p className="text-emerald-800">No documents available</p>
            )}
          </CardContent>
        </Card>

        {!isProjectCompleted && (
          <Card className="border-emerald-200">
            <CardHeader className="bg-emerald-50">
              <CardTitle className="text-emerald-800">Upload a File</CardTitle>
            </CardHeader>
            <CardContent>
              {isFileUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-emerald-800 bg-opacity-50 z-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white" />
                </div>
              )}
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
                  fetcher.submit(formData, {
                    method: "POST",
                  });
                }}
                className="space-y-4"
              >
                <input type="hidden" name="postId" value={project.postId} />
                <div>
                  <Label htmlFor="name">File Name</Label>
                  <Input id="name" name="name" required />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input id="description" name="description" required />
                </div>
                <div>
                  <input
                    type="file"
                    onChange={(e) => setFile(e.currentTarget.files?.[0] ?? null)}
                    className="w-full"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={!file || !uploadedDocumentKey}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  Upload File
                </Button>
              </fetcher.Form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
