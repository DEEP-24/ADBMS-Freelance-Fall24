import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import * as React from "react";
import { toast } from "sonner";
import { z } from "zod";
import { db } from "~/lib/db.server";
import { requireUserId } from "~/lib/session.server";
import { badRequest } from "~/utils/misc.server";
import { type inferErrors, validateAction } from "~/utils/validation";

import { CalendarIcon } from "@radix-ui/react-icons";
import { format } from "date-fns";
import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/utils/misc";

const CreatePostSchema = z.object({
  categoryId: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  budget: z.string().min(1, "Budget must be a positive number"),
  duration: z.string().min(1, "Duration must be a positive number"),
  deadline: z.string(),
});

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = requireUserId(request);
  if (!userId) {
    return redirect("/login");
  }

  const category = await db.categories.findUnique({
    where: {
      id: params.categoryId,
    },
  });

  if (!category) {
    return redirect("/customer/services");
  }

  return json({
    category: category,
  });
}

interface ActionData {
  success: boolean;
  fieldErrors?: inferErrors<typeof CreatePostSchema>;
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const userId = await requireUserId(request);

  if (!userId) {
    return redirect("/login");
  }

  const { fields, fieldErrors } = await validateAction(request, CreatePostSchema);

  if (fieldErrors) {
    return badRequest<ActionData>({ success: false, fieldErrors });
  }

  const { categoryId, title, description, budget, duration, deadline } = fields;

  await db.post.create({
    data: {
      title,
      description,
      budget: Number(budget),
      duration: Number(duration),
      deadline: deadline,
      status: "open",
      categoryId: categoryId as string,
      customerId: userId,
      bids: {},
      project: {},
    },
  });

  toast.success("Post created successfully");

  return redirect("/customer/posts");
};

export const meta: MetaFunction = () => {
  return [
    {
      title: "Artify | New-Post",
    },
  ];
};

export default function NewCategoryPost() {
  const { category } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<ActionData>();

  const isSubmitting = fetcher.state !== "idle";

  const [duration, setDuration] = React.useState<number | null>(null);
  const [deadline, setDeadline] = React.useState<string>("");

  React.useEffect(() => {
    if (duration !== null && !Number.isNaN(duration) && duration > 0) {
      const today = new Date();
      const calculatedDeadline = new Date(today);
      calculatedDeadline.setDate(today.getDate() + duration);
      const newDeadline = calculatedDeadline.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      });
      setDeadline(newDeadline);
      console.log({
        today,
        calculatedDeadline,
        newDeadline,
      });
    } else {
      setDeadline("");
    }
  }, [duration]);

  const handleDurationChange = (value: string) => {
    const numericValue = value ? Number(value) : null;
    setDuration(numericValue);
  };

  return (
    <div className="flex flex-1 flex-col justify-center p-8">
      <div className="flex items-center justify-center text-2xl text-white">
        <p>Post for {category.name}</p>
      </div>
      <div className="p-10">
        <fetcher.Form
          id="form"
          method="post"
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            fetcher.submit(formData, {
              method: "post",
            });
          }}
        >
          <fieldset disabled={isSubmitting} className="flex flex-col gap-4">
            <input hidden name="categoryId" defaultValue={category?.id} />

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                placeholder="Enter the Title"
                className="text-white"
                required
              />
              {fetcher.data?.fieldErrors?.title && (
                <p className="text-sm text-red-500">{fetcher.data.fieldErrors.title}</p>
              )}
            </div>
            <p className="text-sm text-gray-400">
              Example: "Need a thumbnail for my YouTube channel, Need a logo for my company, etc."
            </p>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Enter the Description"
                className="text-white"
                rows={7}
                required
              />
              {fetcher.data?.fieldErrors?.description && (
                <p className="text-sm text-red-500">{fetcher.data.fieldErrors.description}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="budget">Budget</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2">$</span>
                <Input
                  id="budget"
                  name="budget"
                  type="number"
                  min={0}
                  placeholder="Enter the Budget"
                  className="text-white pl-8"
                  required
                />
              </div>
              {fetcher.data?.fieldErrors?.budget && (
                <p className="text-sm text-red-500">{fetcher.data.fieldErrors.budget}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Estimated Duration (days)</Label>
              <Input
                id="duration"
                name="duration"
                type="number"
                min={0}
                placeholder="Enter the Duration"
                className="text-white"
                value={duration ?? ""}
                onChange={(e) => handleDurationChange(e.target.value)}
                required
              />
              {fetcher.data?.fieldErrors?.duration && (
                <p className="text-sm text-red-500">{fetcher.data.fieldErrors.duration}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadline">Deadline</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !deadline && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {deadline ? format(new Date(deadline), "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={deadline ? new Date(deadline) : undefined}
                    onSelect={(date) => setDeadline(date ? format(date, "yyyy-MM-dd") : "")}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <input type="hidden" name="deadline" value={deadline} />
              {fetcher.data?.fieldErrors?.deadline && (
                <p className="text-sm text-red-500">{fetcher.data.fieldErrors.deadline}</p>
              )}
            </div>

            <Button type="submit" form="form" variant="destructive">
              Submit
            </Button>
          </fieldset>
        </fetcher.Form>
      </div>
    </div>
  );
}
