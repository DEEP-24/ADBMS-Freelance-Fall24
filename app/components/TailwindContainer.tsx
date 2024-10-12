import clsx from "clsx";

export function TailwindContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={clsx("mx-auto max-w-2xl lg:max-w-7xl", className)}>{children}</div>;
}
