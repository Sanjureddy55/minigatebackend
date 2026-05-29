import { createFileRoute } from "@tanstack/react-router";
import { RbacManager } from "@/components/RbacManager";

export const Route = createFileRoute("/_app/admin/rbac")({
  component: Page,
});

function Page() {
  return <RbacManager title="Roles & Permissions" description="Multi-tenant RBAC across societies and modules" />;
}
