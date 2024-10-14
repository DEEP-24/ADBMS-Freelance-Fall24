import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { Plus } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { db } from "~/lib/db.server";
import { badRequest } from "~/utils/misc.server";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";

export async function loader() {
  const services = await db.categories.findMany({});
  return json({ services });
}

type ActionData = {
  success: boolean;
  fieldErrors?: {
    name?: string;
    description?: string;
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();

  const name = formData.get("name")?.toString();
  const description = formData.get("description")?.toString();

  if (!name) {
    return badRequest({
      success: false,
      fieldErrors: {
        name: "Name is required",
      },
    });
  }

  if (!description) {
    return badRequest({
      success: false,
      fieldErrors: {
        description: "Description is required",
      },
    });
  }

  await db.categories.create({
    data: {
      name,
      description,
    },
  });

  return json({ success: true });
};

export default function ServicesPage() {
  const { services } = useLoaderData<typeof loader>();
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  const fetcher = useFetcher<ActionData>();
  const isSubmitting = fetcher.state !== "idle";

  React.useEffect(() => {
    if (isSubmitting) {
      return;
    }
    if (!fetcher.data) {
      return;
    }

    if (fetcher.data.success) {
      toast.success("Service added successfully");
      setIsModalOpen(false);
    } else {
      toast.error("Failed to add service");
    }
  }, [isSubmitting, fetcher.data]);

  return (
    <div className="w-full mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Services</h1>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="mr-2 h-4 w-4" /> Add Service
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Service</DialogTitle>
            </DialogHeader>
            <fetcher.Form method="post" className="space-y-4">
              <div>
                <Input name="name" placeholder="Service Name" required />
                {fetcher.data?.fieldErrors?.name && (
                  <p className="text-sm text-red-500 mt-1">{fetcher.data.fieldErrors.name}</p>
                )}
              </div>
              <div>
                <Textarea name="description" placeholder="Service Description" required />
                {fetcher.data?.fieldErrors?.description && (
                  <p className="text-sm text-red-500 mt-1">
                    {fetcher.data.fieldErrors.description}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isSubmitting ? "Adding..." : "Add Service"}
              </Button>
            </fetcher.Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-6 mt-10">
        {services.map((service) => (
          <Card
            key={service.name}
            className="shadow-sm hover:shadow-md transition-shadow duration-300"
          >
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-lg font-semibold text-gray-800">{service.name}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-sm text-gray-600">{service.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
