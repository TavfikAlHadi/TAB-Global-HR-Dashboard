import { connection } from "next/server";
import { getDirectory, parseFilter } from "@/lib/data";
import { currentRole, canViewAll } from "@/lib/role";
import { DirectoryTable } from "@/components/directory-table";

export default async function EmployeesPage({ searchParams }: PageProps<"/employees">) {
  await connection(); // status depends on "today"
  const [rows, role] = await Promise.all([getDirectory(parseFilter(await searchParams)), currentRole()]);
  // Probation / notice status is HR-only, so it never reaches a staff member's browser.
  const hr = canViewAll(role);
  const visible = rows.map(({ id, full_name, email, title, office_id, department_id, hire_date, status }) => ({
    id, full_name, email, title, office_id, department_id, hire_date, status: hr ? status : undefined,
  }));
  return <DirectoryTable rows={visible} showStatus={hr} />;
}
