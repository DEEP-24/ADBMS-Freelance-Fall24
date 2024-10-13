import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { db } from "~/lib/db.server";

export const loader = async () => {
  const editors = await db.editor.findMany({});

  return json({
    editors,
  });
};

export default function Editors() {
  const { editors } = useLoaderData<typeof loader>();

  return (
    <ul className="divide-y divide-gray-100 p-10">
      {editors.length > 0 ? (
        <>
          <ul className="space-y-4">
            {editors.map((editor) => {
              return (
                <li
                  key={editor.id}
                  className="flex items-center justify-between gap-x-6 rounded-md border border-white p-4"
                >
                  <p className="text-lg font-semibold leading-6 text-white">
                    {editor.firstName} {editor.lastName}
                  </p>
                  <p className="whitespace-nowrap text-sm text-white">{editor.email}</p>

                  <div className="flex flex-none items-center gap-x-4" />
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <div className="flex items-center justify-center">
          <p className="text-white">No editors found.</p>
        </div>
      )}
    </ul>
  );
}
