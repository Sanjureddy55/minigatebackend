import { createFileRoute } from "@tanstack/react-router";
import { ModulePage } from "@/components/ModulePage";

export const Route = createFileRoute("/_app/super/society-admins")({
  component: Page,
});

const stats: import("@/components/ModulePage").ModuleStat[] = [{"label":"Total Admins","value":54},{"label":"Active","value":51},{"label":"Invited","value":3}];
const columns: import("@/components/ModulePage").ModuleColumn[] = [{"key":"name","label":"Name"},{"key":"email","label":"Email"},{"key":"society","label":"Society"},{"key":"status","label":"Status","badge":true}];
const rows: Array<Record<string, string | number>> = [{"name":"Priya Sharma","email":"priya@greenwood.io","society":"Greenwood Heights","status":"active"},{"name":"Rahul Mehta","email":"rahul@lakeview.io","society":"Lakeview Towers","status":"active"},{"name":"Asha Iyer","email":"asha@skyline.io","society":"Skyline Residency","status":"pending"}];

function Page() {
  return (
    <ModulePage
      title="Society Admin Management"
      description="Assign and manage society administrators."
      primaryAction="Invite Admin"
      stats={stats}
      columns={columns}
      rows={rows}
    />
  );
}
