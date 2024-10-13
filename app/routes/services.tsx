import type { MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";
import { Badge, Brush, Image, MinusSquare, Play, ScissorsSquare } from "lucide-react";
import NavBar from "~/components/navbar";
import { adminActions } from "~/routes/admin+/_layout";
import { customerActions } from "~/routes/customer+/_layout";
import { editorActions } from "~/routes/editor+/_layout";
import { useOptionalUser } from "~/utils/misc";

export const meta: MetaFunction = () => {
  return [
    {
      title: "Artify | Services",
    },
  ];
};

type User = {
  name: string;
  email: string;
  role: string;
};

const Services = [
  {
    name: "Thumbnail Designing",
    description:
      "Enhance your content's visibility with custom thumbnail designs that capture attention and drive engagement.",
    icon: ScissorsSquare,
  },
  {
    name: "Poster Designing",
    description:
      "Grab your audience's attention with striking poster designs that convey your message with impact.",
    icon: MinusSquare,
  },
  {
    name: "Video Editing",
    description:
      "Elevate your videos with expert editing that turns raw footage into captivating stories.",
    icon: Play,
  },
  {
    name: "Logo Designing",
    description:
      "Create a lasting impression with a unique logo that encapsulates your brand identity.",
    icon: Badge,
  },
  {
    name: "Photo Editing",
    description: "Elevate your imagery with our professional photo editing services.",
    icon: Image,
  },
  {
    name: "Digital Art",
    description: "Transform your ideas into digital masterpieces with our Digital Art services.",
    icon: Brush,
  },
];

export default function ServicesPage() {
  const user = useOptionalUser() as User | null;

  const getNavItems = () => {
    if (user?.role === "admin") {
      return adminActions;
    }
    if (user?.role === "editor") {
      return editorActions;
    }
    if (user?.role === "customer") {
      return customerActions;
    }
    return [
      {
        title: "Home",
        href: "/",
      },
      {
        title: "Services",
        href: "/services",
      },
    ];
  };

  const currentNavItems = getNavItems();

  return (
    <div>
      <NavBar navItems={currentNavItems} />
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
              {Services.map((feature) => (
                <div
                  key={feature.name}
                  className="flex flex-col rounded-lg bg-gray-950 ring-1 ring-gray-800 hover:shadow-md hover:shadow-white"
                >
                  <dt className="flex items-center justify-center gap-x-2 p-4 text-xl font-semibold leading-7 text-white">
                    <feature.icon className="h-5 w-5 flex-none text-red-600" aria-hidden="true" />
                    {feature.name}
                  </dt>
                  <dd className="mt-1 flex flex-auto flex-col items-center justify-center p-6 text-lg leading-7 text-gray-400">
                    <p className="flex-auto">{feature.description}</p>
                    <p className="mt-6">
                      <Link to="/login" className="text-base font-semibold leading-6 text-red-600">
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
      <div className="flex items-center justify-center bg-black">
        <p className="p-3 text-lg font-semibold text-white">
          Copyright &copy; 2023-30 | All Rights Reserved{" "}
        </p>
      </div>
    </div>
  );
}
