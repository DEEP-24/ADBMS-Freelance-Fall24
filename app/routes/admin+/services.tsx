import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
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

  return json({
    services: services,
  });
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
      name: name,
      description: description,
      image:
        "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNkYzI2MWMiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBjbGFzcz0ibHVjaWRlIGx1Y2lkZS1icnVzaCI+PHBhdGggZD0ibTkuMDYgMTEuOSA4LjA3LTguMDZhMi44NSAyLjg1IDAgMSAxIDQuMDMgNC4wM2wtOC4wNiA4LjA4Ii8+PHBhdGggZD0iTTcuMDcgMTQuOTRjLTEuNjYgMC0zIDEuMzUtMyAzLjAyIDAgMS4zMy0yLjUgMS41Mi0yIDIuMDIgMS4wOCAxLjEgMi40OSAyLjAyIDQgMi4wMiAyLjIgMCA0LTEuOCA0LTQuMDRhMy4wMSAzLjAxIDAgMCAwLTMtMy4wMnoiLz48L3N2Zz4=",
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
    <>
      <div className="flex-1 bg-background py-24 sm:p-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <div className="flex flex-col items-center justify-center gap-6">
              <h2 className="text-4xl font-semibold leading-7 text-primary">Services</h2>

              <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="default">Add Service</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Service</DialogTitle>
                  </DialogHeader>
                  <fetcher.Form method="post" className="flex flex-col gap-4">
                    <div>
                      <Input name="name" placeholder="Name" required />
                      {fetcher.data?.fieldErrors?.name && (
                        <p className="text-sm text-destructive mt-1">
                          {fetcher.data.fieldErrors.name}
                        </p>
                      )}
                    </div>
                    <div>
                      <Textarea name="description" placeholder="Description" required />
                      {fetcher.data?.fieldErrors?.description && (
                        <p className="text-sm text-destructive mt-1">
                          {fetcher.data.fieldErrors.description}
                        </p>
                      )}
                    </div>
                    <Button type="submit" variant="default">
                      Create
                    </Button>
                  </fetcher.Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <div className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
              {services.map((service) => (
                <Card key={service.name} className="hover:scale-105 transition-transform">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-x-2">
                      <img src={service.image} alt="" className="h-5 w-5" />
                      {service.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{service.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
