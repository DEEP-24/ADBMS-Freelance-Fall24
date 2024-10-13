import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { db } from "~/lib/db.server";

export const loader = async () => {
  const customers = await db.customer.findMany({});

  return json({
    customers,
  });
};

export default function Customers() {
  const { customers } = useLoaderData<typeof loader>();

  return (
    <ul className="divide-y divide-gray-100 p-10">
      {customers.length > 0 ? (
        <>
          {customers.map((customer) => {
            return (
              <li
                key={customer.id}
                className="flex items-center justify-between gap-x-6 rounded-md border border-white p-4"
              >
                <p className="text-lg font-semibold leading-6 text-white">
                  {customer.firstName} {customer.lastName}
                </p>

                <p className="whitespace-nowrap text-sm text-white">{customer.email}</p>

                <div className="flex flex-none items-center gap-x-4" />
              </li>
            );
          })}
        </>
      ) : (
        <div className="flex items-center justify-center">
          <p className="text-white">No customers found.</p>
        </div>
      )}
    </ul>
  );
}
