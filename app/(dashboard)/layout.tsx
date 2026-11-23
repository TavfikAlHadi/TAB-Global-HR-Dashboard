import { Suspense } from "react";
import { Sidebar } from "@/components/sidebar";
import { Filters, QuickActions } from "@/components/topbar-controls";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/actions";
import { currentRole, canViewAll, canEditSops } from "@/lib/role";

async function RoleControls() {
  const role = await currentRole();
  return (
    <div className="flex flex-wrap items-center gap-3">
      {canViewAll(role) && <QuickActions canEditSops={canEditSops(role)} />}
      <form action={signOut}>
        <Button type="submit" variant="ghost" size="lg" className="px-3.5"><LogOut aria-hidden /> Sign out</Button>
      </form>
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
