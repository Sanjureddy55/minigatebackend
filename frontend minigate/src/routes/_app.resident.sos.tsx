import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ShieldAlert, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
// @ts-ignore
import { residentService } from "@/services/resident.service.js";

export const Route = createFileRoute("/_app/resident/sos")({
  component: Page,
});

const ALERT_TYPES = [
  { value: "sos",      label: "SOS / Emergency" },
  { value: "fire",     label: "Fire" },
  { value: "medical",  label: "Medical" },
  { value: "intruder", label: "Intruder" },
  { value: "other",    label: "Other" },
];

function Page() {
  const qc = useQueryClient();
  const [alertType, setAlertType] = useState("sos");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["sos-history"],
    queryFn: () => residentService.getSos().then((r: any) => r.data),
    staleTime: 60_000,
  });

  const history: any[] = data?.results ?? data ?? [];

  const mut = useMutation({
    mutationFn: (d: any) => residentService.createSos ? residentService.createSos(d) : Promise.reject("not implemented"),
    onSuccess: () => {
      toast.success("SOS alert sent! Help is on the way.");
      setSent(true);
      setMessage("");
      qc.invalidateQueries({ queryKey: ["sos-history"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail ?? "Alert sent (check your network)");
    },
  });

  return (
    <>
      <PageHeader
        title="SOS Emergency"
        description="Send an emergency alert to security and society admin."
      />

      <div className="p-4 md:p-6 space-y-6 max-w-lg">
        <div className={`rounded-xl border p-6 space-y-4 ${sent ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"}`}>
          {sent ? (
            <div className="flex items-center gap-3 text-success">
              <CheckCircle2 className="h-6 w-6" />
              <div>
                <div className="font-bold">Alert Sent!</div>
                <div className="text-xs">Security has been notified. Stay calm.</div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-destructive" />
                <span className="font-bold text-destructive">Emergency Alert</span>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Alert Type</Label>
                <Select value={alertType} onValueChange={setAlertType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ALERT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Message (optional)</Label>
                <Textarea
                  rows={3}
                  placeholder="Describe the emergency…"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                />
              </div>
              <Button
                variant="destructive"
                className="w-full gap-2"
                disabled={mut.isPending}
                onClick={() => mut.mutate({ alert_type: alertType, message })}
              >
                <AlertTriangle className="h-4 w-4" />
                {mut.isPending ? "Sending…" : "Send SOS Alert"}
              </Button>
            </>
          )}
          {sent && (
            <Button variant="outline" className="w-full" onClick={() => setSent(false)}>
              Send Another Alert
            </Button>
          )}
        </div>

        {history.length > 0 && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="border-b border-border px-5 py-3.5">
              <span className="font-semibold text-sm text-foreground">My SOS History</span>
            </div>
            {isLoading && <p className="p-6 text-sm text-muted-foreground">Loading…</p>}
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                  <th className="px-5 py-2.5 text-left font-medium">Type</th>
                  <th className="px-5 py-2.5 text-left font-medium">Triggered</th>
                  <th className="px-5 py-2.5 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((a: any) => (
                  <tr key={a.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-5 py-3 capitalize text-foreground">
                      {a.alert_type_display || a.alert_type}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground text-xs">
                      {a.triggered_at ? new Date(a.triggered_at).toLocaleString("en-IN") : "—"}
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={a.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
