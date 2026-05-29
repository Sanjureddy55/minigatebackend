import { createFileRoute } from "@tanstack/react-router";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { PageHeader } from "@/components/PageHeader";
import { visitorTrend } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/admin/analytics")({
  component: AnalyticsPage,
});

const revenue = Array.from({ length: 12 }, (_, i) => ({ m: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][i], rev: 200 + Math.floor(Math.random() * 300) }));
const split = [
  { name: "Owners", value: 624, color: "oklch(0.55 0.21 260)" },
  { name: "Tenants", value: 200, color: "oklch(0.65 0.14 230)" },
];

function AnalyticsPage() {
  return (
    <>
      <PageHeader title="Analytics" description="Operational insights across the platform" />
      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold">Maintenance revenue (₹k)</h3>
          <div className="mt-4 h-72">
            <ResponsiveContainer><AreaChart data={revenue}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(0 0% 90%)" />
              <XAxis dataKey="m" fontSize={12} stroke="hsl(220 10% 60%)" />
              <YAxis fontSize={12} stroke="hsl(220 10% 60%)" />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Area dataKey="rev" stroke="oklch(0.55 0.21 260)" fill="oklch(0.55 0.21 260 / 0.15)" />
            </AreaChart></ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold">Resident split</h3>
          <div className="mt-4 h-72">
            <ResponsiveContainer><PieChart>
              <Pie data={split} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90}>
                {split.map(s => <Cell key={s.name} fill={s.color} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            </PieChart></ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 text-xs">
            {split.map(s => <div key={s.name} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{background: s.color}} />{s.name}: {s.value}</div>)}
          </div>
        </div>
        <div className="lg:col-span-3 rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold">Visitor trend</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer><LineChart data={visitorTrend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(0 0% 90%)" />
              <XAxis dataKey="day" fontSize={12} stroke="hsl(220 10% 60%)" />
              <YAxis fontSize={12} stroke="hsl(220 10% 60%)" />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Line dataKey="guests" stroke="oklch(0.55 0.21 260)" strokeWidth={2} dot={false} />
              <Line dataKey="deliveries" stroke="oklch(0.65 0.14 230)" strokeWidth={2} dot={false} />
              <Line dataKey="services" stroke="oklch(0.65 0.16 150)" strokeWidth={2} dot={false} />
            </LineChart></ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );
}
