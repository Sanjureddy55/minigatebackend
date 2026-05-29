import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { AddSocietyDialog } from "./_app.super.societies.index";

export const Route = createFileRoute("/_app/super/societies/new")({
  component: Page,
});

function Page() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!open) navigate({ to: "/super/societies" });
  }, [open, navigate]);

  return (
    <>
      <PageHeader
        title="Create Society"
        description="Provision a new tenant with admin owner."
      />
      <div className="p-6 text-sm text-muted-foreground">
        Use the dialog to create a new society. Closing it returns you to the society list.
      </div>
      <AddSocietyDialog open={open} onOpenChange={setOpen} onCreated={() => navigate({ to: "/super/societies" })} />
    </>
  );
}
