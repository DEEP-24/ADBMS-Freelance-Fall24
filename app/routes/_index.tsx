import type { MetaFunction } from "@remix-run/node";
import NavBar from "~/components/navbar";
import { adminActions } from "~/routes/admin+/_layout";
import { customerActions } from "~/routes/customer+/_layout";
import { editorActions } from "~/routes/editor+/_layout";
import { useOptionalUser } from "~/utils/misc";

export const meta: MetaFunction = () => {
  return [
    {
      title: "Artify | Home",
    },
  ];
};

type User = {
  name: string;
  email: string;
  role: string;
};

export default function MainPage() {
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
      <div className="bg-black">
        <img src="/img/Frame-1.png" alt="Frame-1" className="w-full" />
      </div>
      <div className="bg-black">
        <img src="/img/Frame-2.3.png" alt="Frame-2" className="w-full" />
      </div>
      <div className="bg-black">
        <img src="/img/Frame-3.png" alt="Frame-3" className="w-full" />
      </div>
      <div className="bg-black">
        <img src="/img/Frame-4.png" alt="Frame-4" className="w-full" />
      </div>
      <div className="flex items-center justify-center bg-black">
        <p className="p-3 text-lg font-semibold text-white">
          Copyright &copy; 2023-30 | All Rights Reserved{" "}
        </p>
      </div>
    </div>
  );
}
