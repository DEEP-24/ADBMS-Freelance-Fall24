import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
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
import { EditorSchema } from "~/lib/zod.schema";
import { useFetcherCallback } from "~/utils/use-fetcher-callback";
import { type inferErrors, validateAction } from "~/utils/validation";

export const loader = async () => {
  const editors = await db.editor.findMany({});
  return json({ editors });
};

interface ActionData {
  fieldErrors?: inferErrors<typeof EditorSchema>;
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const { fieldErrors, fields } = await validateAction(request, EditorSchema);

  if (fieldErrors) {
    return badRequest<ActionData>({ fieldErrors });
  }

  const {
    firstName,
    lastName,
    email,
    password,
    dob,
    phoneNo,
    address,
    skills,
    experience,
    portfolio,
    awards,
  } = fields;

  await db.editor.create({
    data: {
      firstName,
      lastName,
      email,
      password,
      dob: new Date(dob),
      phoneNo,
      address,
      skills,
      experience,
      portfolio,
      awards,
    },
  });

  return json({ success: true });
};

export default function EditorsPage() {
  const { editors } = useLoaderData<typeof loader>();
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  const fetcher = useFetcherCallback<ActionData>({
    onSuccess: () => {
      toast.success("Editor added successfully");
      setIsModalOpen(false);
    },
    onError: () => {
      toast.error("Failed to add editor");
    },
  });

  const isSubmitting = fetcher.isPending;

  return (
    <div className="w-full mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Editors</h1>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="mr-2 h-4 w-4" /> Add Editor
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Add New Editor</DialogTitle>
            </DialogHeader>
            <fetcher.Form method="post" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="firstName" className="text-sm font-medium">
                    First Name
                  </label>
                  <Input id="firstName" name="firstName" required />
                </div>
                <div className="space-y-2">
                  <label htmlFor="lastName" className="text-sm font-medium">
                    Last Name
                  </label>
                  <Input id="lastName" name="lastName" required />
                </div>
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    Email
                  </label>
                  <Input id="email" name="email" type="email" required />
                </div>
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium">
                    Password
                  </label>
                  <Input id="password" name="password" type="password" required />
                </div>
                <div className="space-y-2">
                  <label htmlFor="dob" className="text-sm font-medium">
                    Date of Birth
                  </label>
                  <Input id="dob" name="dob" type="date" required />
                </div>
                <div className="space-y-2">
                  <label htmlFor="phoneNo" className="text-sm font-medium">
                    Phone Number
                  </label>
                  <Input id="phoneNo" name="phoneNo" required />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="address" className="text-sm font-medium">
                  Address
                </label>
                <Input id="address" name="address" required />
              </div>
              <div className="space-y-2">
                <label htmlFor="skills" className="text-sm font-medium">
                  Skills
                </label>
                <Input id="skills" name="skills" required />
              </div>
              <div className="space-y-2">
                <label htmlFor="experience" className="text-sm font-medium">
                  Experience
                </label>
                <Textarea id="experience" name="experience" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="portfolio" className="text-sm font-medium">
                    Portfolio URL
                  </label>
                  <Input id="portfolio" name="portfolio" required />
                </div>
                <div className="space-y-2">
                  <label htmlFor="awards" className="text-sm font-medium">
                    Awards
                  </label>
                  <Input id="awards" name="awards" required />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isSubmitting ? "Adding..." : "Add Editor"}
              </Button>
            </fetcher.Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {editors.map((editor) => (
          <Card
            key={editor.id}
            className="shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden"
          >
            <CardHeader className="bg-emerald-600 text-white">
              <CardTitle className="text-xl font-bold">
                {editor.firstName} {editor.lastName}
              </CardTitle>
              <p className="text-sm opacity-90">{editor.email}</p>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-semibold text-gray-700">Phone:</p>
                  <p>{editor.phoneNo}</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-700">Date of Birth:</p>
                  <p>{new Date(editor.dob).toLocaleDateString()}</p>
                </div>
                <div className="col-span-2">
                  <p className="font-semibold text-gray-700">Address:</p>
                  <p>{editor.address}</p>
                </div>
                <div className="col-span-2">
                  <p className="font-semibold text-gray-700">Skills:</p>
                  <p>{editor.skills}</p>
                </div>
                <div className="col-span-2">
                  <p className="font-semibold text-gray-700">Experience:</p>
                  <p className="line-clamp-3">{editor.experience}</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-700">Portfolio:</p>
                  <a
                    href={editor.portfolio}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    View Portfolio
                  </a>
                </div>
                <div>
                  <p className="font-semibold text-gray-700">Awards:</p>
                  <p>{editor.awards}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
