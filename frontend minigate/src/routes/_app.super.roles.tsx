import { createFileRoute } from "@tanstack/react-router";
import { RbacManager } from "@/components/RbacManager";

export const Route = createFileRoute("/_app/super/roles")({
  component: Page,
});

function Page() {
  return <RbacManager title="Role & Permission Management" description="Configure system-wide RBAC presets." />;
}
