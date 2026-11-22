import { notFound } from "next/navigation";
import { NAV } from "@/lib/nav";

export default async function ComingSoon({ params }: PageProps<"/[section]">) {
  const { section } = await params;
  const item = NAV.find((n) => n.href === `/${section}`);
  if (!item) notFound();
  return (
    <div className="mx-auto mt-24 max-w-md text-center">
      <h1 className="text-xl font-semibold">{item.label}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {item.phase === 6 ? "Recruitment is not scoped yet." : `This module is planned for Phase ${item.phase}.`} The Phase 1 prototype covers the dashboard home.
      </p>
    </div>
  );
}
