import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { db } from "~/lib/db.server";

export async function loader() {
  const services = await db.categories.findMany({});

  return json({
    services: services,
  });
}

export default function CustomerServicesPage() {
  const { services } = useLoaderData<typeof loader>();
  return (
    <div className="bg-black py-24 sm:p-16">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-4xl font-semibold leading-7 text-red-600">Services</h2>
          <p className="mt-5 text-2xl font-bold tracking-tight text-gray-500 sm:text-4xl">
            Everything you need is here 👇🏿
          </p>
          <p className="mt-6 text-lg leading-8 text-white">
            Explore our full suite of professional services tailored to elevate your brand's
            presence. Experience precision and creativity with our dedicated experts. We're
            committed to delivering excellence in every project we undertake.
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
            {services.map((service) => (
              <div
                key={service.name}
                className="flex flex-col rounded-lg bg-gray-950 ring-1 ring-gray-800 hover:scale-105 hover:shadow-md hover:shadow-white"
              >
                <dt className="flex items-center justify-center gap-x-2 p-4 text-xl font-semibold leading-7 text-white">
                  <div className="h-5 w-5 flex-none">
                    <img src={service.image} alt="" />
                  </div>
                  {service.name}
                </dt>
                <dd className="mt-1 flex flex-auto flex-col items-center justify-center p-6 text-lg leading-7 text-gray-400">
                  <p className="flex-auto">{service.description}</p>
                  <p className="mt-6">
                    <Link
                      to={`/customer/posts/${encodeURIComponent(service.id)}/new-post`}
                      className="text-base font-semibold leading-6 text-red-600"
                    >
                      Post <span aria-hidden="true">→</span>
                    </Link>
                  </p>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
