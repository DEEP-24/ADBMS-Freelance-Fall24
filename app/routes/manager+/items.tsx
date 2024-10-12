import type { ActionFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import ObjectID from "bson-objectid";
import clsx from "clsx";
import * as React from "react";
import slugify from "slugify";
import invariant from "tiny-invariant";
import { z } from "zod";
import { TailwindContainer } from "~/components/TailwindContainer";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import MultipleSelector from "~/components/ui/multi-select";
import { Textarea } from "~/components/ui/textarea";
import { db } from "~/lib/db.server";
import { requireUser } from "~/lib/session.server";
import { badRequest } from "~/utils/misc.server";
import type { inferErrors } from "~/utils/validation";
import { validateAction } from "~/utils/validation";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await requireUser(request);

  invariant(user?.foodTruckId, "User must be associated with a food truck");
  const items = await db.item.findMany({
    where: {
      restaurantId: user?.foodTruckId,
    },
    include: {
      categories: {
        select: {
          category: true,
        },
      },
    },
  });

  const categories = await db.category.findMany({});

  return json({ items, categories });
};

enum MODE {
  edit = 0,
  add = 1,
}

const ManageFoodItemSchema = z.object({
  itemId: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  image: z.string().min(1, "Image is required"),
  price: z.preprocess(Number, z.number().min(1, "Price is required")),
  categories: z
    .string()
    .min(1, "Category is required")
    .transform((v) => v.split(",")),
});

interface ActionData {
  success: boolean;
  fieldErrors?: inferErrors<typeof ManageFoodItemSchema>;
}

export const action: ActionFunction = async ({ request }) => {
  const staff = await requireUser(request);

  const { fields, fieldErrors } = await validateAction(request, ManageFoodItemSchema);

  if (fieldErrors) {
    return badRequest<ActionData>({ success: false, fieldErrors });
  }

  const { itemId, ...rest } = fields;
  const id = new ObjectID();

  await db.item.upsert({
    where: {
      id: itemId || id.toString(),
    },
    update: {
      ...rest,
      categories: {
        deleteMany: {},
        createMany: {
          data: rest.categories.map((categoryId) => ({
            categoryId,
          })),
        },
      },
    },
    create: {
      ...rest,
      quantity: 1,
      restaurantId: staff.foodTruckId!,
      slug: `${slugify(rest.name)}-${Math.random().toString(36).slice(2)}`,
      categories: {
        createMany: {
          data: rest.categories.map((categoryId) => ({
            categoryId,
          })),
        },
      },
    },
  });
  return json({ success: true });
};

export default function ManageFoodItems() {
  const fetcher = useFetcher<ActionData>();
  const { items, categories } = useLoaderData<typeof loader>();

  type _Item = (typeof items)[number];

  const [selectedItemId, setSelectedItemId] = React.useState<_Item["id"] | null>(null);
  const [selectedItem, setSelectedItem] = React.useState<_Item | null>(null);
  const [mode, setMode] = React.useState<MODE>(MODE.edit);
  const [modalOpen, setModalOpen] = React.useState(false);

  const [selectedCategories, setSelectedCategories] = React.useState<
    Array<{ value: string; label: string }>
  >([]);

  const handleCategoryChange = (options: Array<{ value: string; label: string }>) => {
    setSelectedCategories(options);
  };

  const isSubmitting = fetcher.state !== "idle";

  React.useEffect(() => {
    if (!selectedItemId) {
      setSelectedItem(null);
      setSelectedCategories([]);
      return;
    }

    const item = items.find((item) => item.id === selectedItemId);
    if (!item) {
      return;
    }

    setSelectedItem(item);
    setSelectedCategories(
      item.categories.map((c) => ({
        label: c.category.name,
        value: c.category.id,
      })),
    );
    setModalOpen(true);
  }, [items, selectedItemId]);

  React.useEffect(() => {
    if (fetcher.state !== "idle" && fetcher.state === undefined) {
      return;
    }

    if (fetcher.data?.success) {
      setSelectedItemId(null);
      setModalOpen(false);
    }
    // handleModal is not meemoized, so we don't need to add it to the dependency array
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher.data?.success, fetcher.state, fetcher.state]);

  React.useEffect(() => {
    if (!selectedItemId) {
      setSelectedItem(null);
      return;
    }

    const item = items.find((item) => item.id === selectedItemId);
    if (!item) {
      return;
    }

    setSelectedItem(item);
    setModalOpen(true);
    // handleModal is not meemoized, so we don't need to add it to the dependency array
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, selectedItemId]);

  return (
    <>
      <TailwindContainer className="lg:max-w-full">
        <div className="mt-2 px-4 py-10 sm:px-6 lg:px-8">
          <div>
            <div className="flex items-center justify-center">
              <h1 className="text-4xl font-semibold text-gray-900">Manage Items</h1>
            </div>
            <div className="mt-4 flex items-center justify-center">
              <Button onClick={() => setModalOpen(true)} color="blue">
                <span className="ml-2">Add</span>
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
                      <th
                        scope="col"
                        className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 md:pl-0"
                      >
                        Category
                      </th>

                      <th
                        scope="col"
                        className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 md:pl-0"
                      >
                        Price
                      </th>

                      <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6 md:pr-0" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 md:pl-0">
                          <div className="flex items-center gap-3">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="aspect-square h-8 w-8 rounded-full object-cover"
                            />
                            <p>{item.name}</p>
                          </div>
                        </td>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 md:pl-0">
                          {item.categories.map((c) => c.category.name).join(", ")}
                        </td>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 md:pl-0">
                          ${item.price.toFixed(2)}
                        </td>
                        <td className="relative space-x-4 whitespace-nowrap py-4 pl-3 pr-4 text-left text-sm font-medium sm:pr-6 md:pr-0">
                          <div className="flex items-center gap-6">
                            <Button
                              onClick={() => {
                                setSelectedItemId(item.id);
                                setMode(MODE.edit);
                              }}
                              color="blue"
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
          setSelectedItemId(null);
          setModalOpen(false);
          setSelectedCategories([]);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {clsx({
                "Edit item": mode === MODE.edit,
                "Add item": mode === MODE.add,
              })}
            </DialogTitle>
          </DialogHeader>
          <fetcher.Form method="post">
            <fieldset disabled={isSubmitting} className="flex flex-col gap-4">
              <input type="hidden" name="restaurantId" value={selectedItem?.restaurantId} />
              <input type="hidden" name="itemId" value={selectedItem?.id} />

              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="name">Name</Label>
                <Input type="text" name="name" defaultValue={selectedItem?.name} required />
                {fetcher.data?.fieldErrors?.name && (
                  <p className="text-red-500 text-sm">{fetcher.data.fieldErrors.name}</p>
                )}
              </div>

              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  name="description"
                  defaultValue={selectedItem?.description ?? ""}
                  required
                />
                {fetcher.data?.fieldErrors?.description && (
                  <p className="text-red-500 text-sm">{fetcher.data.fieldErrors.description}</p>
                )}
              </div>

              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="categories">Category</Label>
                <MultipleSelector
                  defaultOptions={categories.map((category) => ({
                    label: category.name,
                    value: category.id,
                  }))}
                  value={selectedCategories}
                  placeholder="Select categories"
                  onChange={handleCategoryChange}
                  hideClearAllButton
                />

                <input
                  type="hidden"
                  name="categories"
                  value={selectedCategories.map((cat) => cat.value).join(",")}
                />
                {fetcher.data?.fieldErrors?.categories && (
                  <p className="text-red-500 text-sm">{fetcher.data.fieldErrors.categories}</p>
                )}
              </div>

              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="price">Price</Label>
                <Input
                  type="number"
                  name="price"
                  defaultValue={selectedItem?.price}
                  step={0.01}
                  required
                />
                {fetcher.data?.fieldErrors?.price && (
                  <p className="text-red-500 text-sm">{fetcher.data.fieldErrors.price}</p>
                )}
              </div>

              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="image">Image</Label>
                <Input type="url" name="image" defaultValue={selectedItem?.image} required />
                {fetcher.data?.fieldErrors?.image && (
                  <p className="text-red-500 text-sm">{fetcher.data.fieldErrors.image}</p>
                )}
              </div>

              <DialogFooter>
                <div className="mt-1 flex items-center justify-end gap-4">
                  <DialogClose>
                    <Button disabled={isSubmitting} variant="destructive">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button type="submit">{mode === MODE.edit ? "Save changes" : "Add item"}</Button>
                </div>
              </DialogFooter>
            </fieldset>
          </fetcher.Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
