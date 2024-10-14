import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { db } from "~/lib/db.server";

export async function loader() {
  const services = await db.categories.findMany({
    select: {
      id: true,
      name: true,
      description: true,
    },
  });

  return json({
    services: services,
  });
}

export default function CustomerServicesPage() {
  const { services } = useLoaderData<typeof loader>();
  return (
    <div className="w-full mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Services</h1>
      </div>
      <p className="text-lg text-gray-600 mb-8">
        Explore our full suite of professional services tailored to elevate your brand's presence.
        Experience precision and creativity with our dedicated experts. We're committed to
        delivering excellence in every project we undertake.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-10">
        {services.map((service) => (
          <Card
            key={service.id}
            className="bg-white shadow-md hover:shadow-lg transition-all duration-300 rounded-lg overflow-hidden flex flex-col"
          >
            <CardHeader className="bg-emerald-50 p-6">
              <CardTitle className="text-2xl font-semibold text-emerald-800">
                {service.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 flex-grow">
              <p className="text-gray-600 mb-6">{service.description}</p>
            </CardContent>
            <div className="px-6 pb-6">
              <Link
                to={`/customer/posts/new-post?categoryId=${service.id}`}
                className="inline-flex items-center text-sm font-medium text-emerald-600 hover:text-emerald-800 transition-colors duration-300"
              >
                Create Post
                <svg
                  className="w-3.5 h-3.5 ml-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
