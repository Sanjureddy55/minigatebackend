import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({ component: Forgot });

function Forgot() {
  const [phone, setPhone] = useState("");
  return (
    <div className="grid min-h-screen place-items-center bg-muted/30 p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Reset your password</h1>
        <p className="mt-1 text-xs text-muted-foreground">We'll send a one-time code to your phone.</p>
        <form
          className="mt-5 space-y-3"
          onSubmit={(e) => { e.preventDefault(); if (phone.length < 10) return toast.error("Enter a valid number"); toast.success("OTP sent to " + phone); }}
        >
          <Input placeholder="Mobile number" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Button className="w-full">Send OTP</Button>
        </form>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Remembered? <Link to="/login" className="font-medium text-primary hover:underline">Back to login</Link>
        </p>
      </div>
    </div>
  );
}
