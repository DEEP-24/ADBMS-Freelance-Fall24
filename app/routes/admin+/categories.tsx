import type { ActionFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import ObjectID from "bson-objectid";
import clsx from "clsx";
import * as React from "react";
import { z } from "zod";
import { TailwindContainer } from "~/components/TailwindContainer";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { db } from "~/lib/db.server";
import { badRequest } from "~/utils/misc.server";
import { useFetcherCallback } from "~/utils/use-fetcher-callback";
import type { inferErrors } from "~/utils/validation";
import { validateAction } from "~/utils/validation";

export const loader = async () => {
  const categories = await db.category.findMany({});

  return json({ categories });
};

enum MODE {
  edit = 0,
  add = 1,
}

const ManageCategorySchema = z.object({
  categoryId: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  imageUrl: z.string().min(1, "Image URL is required"),
});

interface ActionData {
  success: boolean;
  fieldErrors?: inferErrors<typeof ManageCategorySchema>;
}

export const action: ActionFunction = async ({ request }) => {
  const { fields, fieldErrors } = await validateAction(request, ManageCategorySchema);

  if (fieldErrors) {
    return badRequest<ActionData>({ success: false, fieldErrors });
  }

  const { categoryId, ...rest } = fields;
  const id = new ObjectID();

  await db.category.upsert({
    where: {
      id: categoryId || id.toString(),
    },
    update: { ...rest },
    create: {
      name: rest.name,
      imageUrl: rest.imageUrl,
    },
  });

  return json({ success: true });
};

export default function ManageFoodItems() {
  const fetcher = useFetcherCallback<ActionData>({
    onSuccess: () => {
      setSelectedCategoryId(null);
      setModalOpen(false);
    },
  });

  const { categories } = useLoaderData<typeof loader>();

  type _Category = (typeof categories)[number];

  const [selectedCategoryId, setSelectedCategoryId] = React.useState<_Category["id"] | null>(null);
  const [selectedCategory, setSelectedCategory] = React.useState<_Category | null>(null);
  const [mode, setMode] = React.useState<MODE>(MODE.edit);
  const [modalOpen, setModalOpen] = React.useState(false);
  // const [isModalOpen, handleModal] = useDisclosure(false);

  const isSubmitting = fetcher.state !== "idle";

  React.useEffect(() => {
    if (!selectedCategoryId) {
      setSelectedCategory(null);
      return;
    }

    const category = categories.find((category) => category.id === selectedCategoryId);
    if (!category) {
      return;
    }

    setSelectedCategory(category);
    setModalOpen(true);
    // handleModal is not meemoized, so we don't need to add it to the dependency array
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, selectedCategoryId]);

  return (
    <>
      <TailwindContainer className="lg:max-w-full">
        <div className="mt-2 px-4 py-10 sm:px-6 lg:px-8">
          <div>
            <div className="flex items-center justify-center">
              <h1 className="text-4xl font-semibold text-gray-900">Manage Categories</h1>
            </div>
            <div className="mt-4 flex items-center justify-center">
              <Button
                onClick={() => {
                  setModalOpen(true);
                  setMode(MODE.add);
                }}
                className="bg-orange-500 text-white hover:bg-orange-400"
              >
                Add
              </Button>
            </div>
          </div>
          <div className="mt-8 flex flex-col">
            <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead>
                    <tr>
                      <th
                        scope="col"
                        className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 md:pl-0"
                      >
                        Name
                      </th>
                      <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6 md:pr-0" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {categories.map((category) => (
                      <tr key={category.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 md:pl-0">
                          <div className="flex items-center gap-3">
                            <img
                              src={category.imageUrl}
                              alt={category.name}
                              className="h-14 w-14 object-cover object-center rounded-full"
                            />
                            <p>{category.name}</p>
                          </div>
                        </td>
                        <td className="relative space-x-4 whitespace-nowrap py-4 pl-3 pr-4 text-left text-sm font-medium sm:pr-6 md:pr-0">
                          <div className="flex items-center gap-6">
                            <Button
                              onClick={() => {
                                setSelectedCategoryId(category.id);
                                setMode(MODE.edit);
                              }}
                              className="bg-orange-500 text-white hover:bg-orange-400"
                            >
                              Edit
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </TailwindContainer>

      <Dialog
        open={modalOpen}
        onOpenChange={() => {
          setSelectedCategoryId(null);
          setModalOpen(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            {clsx({
              "Edit Category": mode === MODE.edit,
              "Add Category": mode === MODE.add,
            })}
          </DialogHeader>
          <fetcher.Form method="post">
            <fieldset disabled={isSubmitting} className="flex flex-col gap-4">
              <input hidden name="categoryId" defaultValue={selectedCategory?.id} />
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="name">Name</Label>
                <Input type="text" name="name" defaultValue={selectedCategory?.name} required />
                {fetcher.data?.fieldErrors?.name && (
                  <p className="text-sm text-red-500">{fetcher.data.fieldErrors.name}</p>
                )}
              </div>

              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="image">Image</Label>
                <Input
                  type="url"
                  name="imageUrl"
                  defaultValue={selectedCategory?.imageUrl}
                  required
                />
                {fetcher.data?.fieldErrors?.imageUrl && (
                  <p className="text-sm text-red-500">{fetcher.data.fieldErrors.imageUrl}</p>
                )}
              </div>

              <DialogFooter>
                <div className="mt-1 flex items-center justify-end gap-4">
                  <DialogClose>
                    <Button disabled={isSubmitting} variant="destructive">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button type="submit">
                    {mode === MODE.edit ? "Save changes" : "Add Category"}
                  </Button>
                </div>
              </DialogFooter>
            </fieldset>
          </fetcher.Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
