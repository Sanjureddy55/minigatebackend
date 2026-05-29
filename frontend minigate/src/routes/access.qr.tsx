import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/access/qr")({ component: QR });

function QR() {
  return (
    <div className="grid min-h-screen place-items-center bg-foreground p-4">
      <div className="w-full max-w-sm rounded-2xl bg-background p-6 text-center shadow-2xl">
        <div className="text-xs text-muted-foreground">Scan at gate</div>
        <div className="mx-auto mt-3 grid aspect-square w-full max-w-[260px] grid-cols-12 grid-rows-12 gap-0.5 rounded-lg bg-foreground p-3">
          {Array.from({ length: 144 }).map((_, i) => (
            <div key={i} className={(i * 73) % 7 < 3 ? "bg-background" : "bg-foreground"} />
          ))}
        </div>
        <div className="mt-4 font-mono text-lg tracking-[0.3em]">GW-2046-7821</div>
        <Link to="/access" className="mt-4 inline-block text-xs font-medium text-primary hover:underline">← Back to pass</Link>
      </div>
    </div>
  );
}
