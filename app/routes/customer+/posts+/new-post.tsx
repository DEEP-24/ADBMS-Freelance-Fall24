import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { addDays, format } from "date-fns";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { db } from "~/lib/db.server";
import { getUser, requireUserId } from "~/lib/session.server";
import { CreatePostSchema } from "~/lib/zod.schema";
import { badRequest } from "~/utils/misc.server";
import { type inferErrors, validateAction } from "~/utils/validation";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getUser(request);

  if (!user?.id) {
    return redirect("/login");
  }

  const url = new URL(request.url);
  const categoryId = url.searchParams.get("categoryId");

  const categories = await db.categories.findMany();

  let category = null;
  if (categoryId) {
    category = await db.categories.findUnique({
      where: {
        id: categoryId,
      },
    });
  }

  return json({
    category: category,
    categories: categories,
  });
}

interface ActionData {
  fieldErrors?: inferErrors<typeof CreatePostSchema>;
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const userId = await requireUserId(request);

  if (!userId) {
    return redirect("/login");
  }

  const { fields, fieldErrors } = await validateAction(request, CreatePostSchema);

  if (fieldErrors) {
    return badRequest<ActionData>({ fieldErrors });
  }

  const { categoryId, title, description, budget, duration, deadline } = fields;

  await db.post.create({
    data: {
      title,
      description,
      budget: Number(budget),
      duration: Number(duration),
      deadline: new Date(deadline).toISOString(), // Convert to ISO-8601 format
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

export default function NewCategoryPost() {
  const { category, categories } = useLoaderData<typeof loader>();

  const fetcher = useFetcher<ActionData>();

  const isSubmitting = fetcher.state !== "idle";

  const [duration, setDuration] = React.useState<number | null>(null);
  const [deadline, setDeadline] = React.useState<Date | undefined>(undefined);

  React.useEffect(() => {
    if (duration !== null && !Number.isNaN(duration) && duration > 0) {
      const today = new Date();
      const calculatedDeadline = addDays(today, duration);
      setDeadline(calculatedDeadline);
    } else {
      setDeadline(undefined);
    }
  }, [duration]);

  const handleDurationChange = (value: string) => {
    const numericValue = value ? Number(value) : null;
    setDuration(numericValue);
  };

  return (
    <div className="flex items-center justify-center">
      <div className="bg-white rounded-lg p-8 w-full">
        <h2 className="text-2xl font-bold mb-4">Create Post</h2>
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
            <div>
              <Label htmlFor="categoryId">Category</Label>
              <Select name="categoryId" defaultValue={category?.id || undefined}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fetcher.data?.fieldErrors?.categoryId && (
                <p className="text-sm text-red-500 mt-1">{fetcher.data.fieldErrors.categoryId}</p>
              )}
            </div>
            <div>
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" placeholder="Enter the Title" required />
              {fetcher.data?.fieldErrors?.title && (
                <p className="text-sm text-red-500 mt-1">{fetcher.data.fieldErrors.title}</p>
              )}
            </div>
            <p className="text-sm text-gray-400">
              Example: "Need a thumbnail for my YouTube channel, Need a logo for my company, etc."
            </p>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Enter the Description"
                className="min-h-[150px]"
                required
              />
              {fetcher.data?.fieldErrors?.description && (
                <p className="text-sm text-red-500 mt-1">{fetcher.data.fieldErrors.description}</p>
              )}
            </div>
            <div>
              <Label htmlFor="budget">Budget</Label>
              <Input
                id="budget"
                name="budget"
                type="number"
                min={0}
                placeholder="Enter the Budget"
                required
              />
              {fetcher.data?.fieldErrors?.budget && (
                <p className="text-sm text-red-500 mt-1">{fetcher.data.fieldErrors.budget}</p>
              )}
            </div>
            <div>
              <Label htmlFor="duration">Estimated Duration (days)</Label>
              <Input
                id="duration"
                name="duration"
                type="number"
                placeholder="Enter the Duration"
                value={duration ?? ""}
                onChange={(e) => handleDurationChange(e.target.value)}
                required
              />
              {fetcher.data?.fieldErrors?.duration && (
                <p className="text-sm text-red-500 mt-1">{fetcher.data.fieldErrors.duration}</p>
              )}
              {deadline && (
                <p className="text-sm text-gray-600 mt-2">
                  Deadline: {format(deadline, "MMMM d, yyyy")}
                </p>
              )}
            </div>
            <div>
              <input
                type="hidden"
                id="deadline"
                name="deadline"
                value={deadline ? format(deadline, "yyyy-MM-dd'T'HH:mm:ss'Z'") : ""}
              />
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => window.history.back()}
                className="mr-2"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="form"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Create Post
              </Button>
            </div>
          </fieldset>
        </fetcher.Form>
      </div>
    </div>
  );
}
