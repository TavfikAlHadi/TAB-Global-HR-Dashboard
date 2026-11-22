import { Suspense } from "react";
import { Sidebar } from "@/components/sidebar";
import { Filters, QuickActions, RoleSwitcher } from "@/components/topbar-controls";
import { currentRole, canViewAll, canEditSops } from "@/lib/role";

async function RoleControls() {
  const role = await currentRole();
  return (
    <div className="flex flex-wrap items-center gap-3">
      {canViewAll(role) && <QuickActions canEditSops={canEditSops(role)} />}
      <RoleSwitcher role={role} />
    </div>
  );
}

export default function DashboardLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen">
      <Suspense><Sidebar /></Suspense>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 px-4 pt-5 md:px-8 md:pt-7">
          <Suspense><Filters /></Suspense>
          <Suspense><RoleControls /></Suspense>
        </header>
        <main className="flex-1 px-4 pt-5 pb-28 md:px-8 md:pt-6 md:pb-12">
          {children}
        </main>
      </div>
    </div>
  );
}
