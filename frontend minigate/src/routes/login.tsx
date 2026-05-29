import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Phone, ShieldCheck, ArrowRight, Loader2,
  Building2, Users, Activity, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { auth } from "@/lib/auth-store";
import { toast } from "sonner";
import api from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

const STATS = [
  { icon: Building2, value: "1.2k+",  label: "Societies" },
  { icon: Users,     value: "850k+",  label: "Residents" },
  { icon: Activity,  value: "99.99%", label: "Uptime" },
];

function LoginPage() {
  const [step, setStep]     = useState<"phone" | "otp">("phone");
  const [phone, setPhone]   = useState("");
  const [otp, setOtp]       = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 10) { toast.error("Enter a valid 10-digit number"); return; }
    setLoading(true);
    try {
      await api.post("/accounts/otp/send/", { mobile: phone });
      setStep("otp");
      toast.success("OTP sent!", { description: "Dev mode: use 1 2 3 4 5 6" });
    } catch {
      toast.error("Failed to send OTP. Check the mobile number.");
    } finally {
      setLoading(false);
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) { toast.error("Enter the 6-digit OTP"); return; }
    setLoading(true);
    try {
      const destination = await auth.loginWithMobile(phone, otp);
      toast.success("Welcome to MiniGate!");
      navigate({ to: destination as any });
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Invalid OTP or account not found";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1fr]">

      {/* ── Left panel — dark navy ────────────────────────────── */}
      <div
        className="relative hidden lg:flex flex-col justify-between overflow-hidden p-12 text-white"
        style={{
          background: "linear-gradient(145deg, #0F172A 0%, #1E3A5F 50%, #0F2D55 100%)",
        }}
      >
        {/* Background grid lines */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />

        {/* Glowing orbs */}
        <div className="pointer-events-none absolute -top-32 -left-32 h-80 w-80 rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, #3B82F6, transparent 70%)" }} />
        <div className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full opacity-15 blur-3xl"
          style={{ background: "radial-gradient(circle, #0D9488, transparent 70%)" }} />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div
            className="grid h-10 w-10 place-items-center rounded-xl"
            style={{ background: "linear-gradient(135deg, #3B82F6, #0D9488)" }}
          >
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="text-lg font-bold tracking-tight">GateHub</div>
            <div className="text-xs text-white/50 -mt-0.5">Smart Society & Gate Management</div>
          </div>
        </div>

        {/* Headline */}
        <div className="relative z-10 flex-1 flex flex-col justify-center py-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <h1 className="text-4xl font-bold leading-tight tracking-tight lg:text-5xl">
              Smarter communities.{" "}
              <span style={{ color: "#38BDF8" }}>Seamless living.</span>
            </h1>
            <p className="mt-4 max-w-md text-base text-white/60 leading-relaxed">
              The all-in-one platform trusted by thousands of societies across India.
            </p>

            {/* Stat chips */}
            <div className="mt-10 grid grid-cols-3 gap-3">
              {STATS.map(({ icon: Icon, value, label }) => (
                <div
                  key={label}
                  className="rounded-2xl border border-white/10 p-4 backdrop-blur-sm"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                >
                  <Icon className="h-5 w-5 mb-2 text-white/50" />
                  <div className="text-2xl font-bold">{value}</div>
                  <div className="text-xs text-white/50 mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* 3D City illustration (CSS) */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="mt-12 flex justify-center"
          >
            <div className="relative w-72 h-48">
              {/* Buildings */}
              <div className="absolute bottom-0 left-8 w-16 rounded-t-lg"
                style={{ height: 120, background: "linear-gradient(180deg, #1D4ED8 0%, #1E40AF 100%)", opacity: 0.9 }} />
              <div className="absolute bottom-0 left-28 w-20 rounded-t-lg"
                style={{ height: 160, background: "linear-gradient(180deg, #2563EB 0%, #1D4ED8 100%)" }} />
              <div className="absolute bottom-0 right-16 w-14 rounded-t-lg"
                style={{ height: 100, background: "linear-gradient(180deg, #1E3A8A 0%, #172554 100%)", opacity: 0.85 }} />
              <div className="absolute bottom-0 right-4 w-12 rounded-t-lg"
                style={{ height: 80, background: "linear-gradient(180deg, #1D4ED8 0%, #1E40AF 100%)", opacity: 0.7 }} />
              {/* Ground */}
              <div className="absolute bottom-0 inset-x-0 h-4 rounded-full"
                style={{ background: "linear-gradient(90deg, transparent, rgba(59,130,246,0.3), transparent)" }} />
              {/* Windows */}
              {[...Array(8)].map((_, i) => (
                <div key={i}
                  className="absolute w-2 h-2 rounded-sm"
                  style={{
                    background: Math.random() > 0.4 ? "#FCD34D" : "#93C5FD",
                    left: 32 + (i % 3) * 8 + Math.floor(i / 3) * 24,
                    bottom: 20 + Math.floor(i / 3) * 18,
                    opacity: 0.7,
                  }}
                />
              ))}
              {/* Antenna light */}
              <div className="absolute w-2 h-2 rounded-full animate-pulse"
                style={{ bottom: 162, left: 112, background: "#38BDF8", boxShadow: "0 0 8px #38BDF8" }} />
            </div>
          </motion.div>
        </div>

        {/* Footer */}
        <div className="relative text-xs text-white/35">
          © 2026 GateHub Technologies Pvt. Ltd.
        </div>
      </div>

      {/* ── Right panel — white ───────────────────────────────── */}
      <div className="flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="lg:hidden mb-8 flex items-center gap-2 font-bold">
            <div className="grid h-9 w-9 place-items-center rounded-xl"
              style={{ background: "linear-gradient(135deg, #3B82F6, #0D9488)" }}>
              <Building2 className="h-5 w-5 text-white" />
            </div>
            GateHub
          </div>

          {/* Trust badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
            <span className="text-xs font-medium text-blue-700">Trusted by 1.2k+ societies</span>
          </div>

          <AnimatePresence mode="wait">
            {step === "phone" ? (
              <motion.div
                key="phone"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.22 }}
              >
                <h2 className="text-2xl font-bold tracking-tight text-gray-900">
                  Sign in to your workspace
                </h2>
                <p className="mt-1.5 text-sm text-gray-500">
                  Enter your registered mobile number and we'll send you a one-time password.
                </p>

                <form onSubmit={sendOtp} className="mt-7 space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                      Mobile number
                    </Label>
                    <div className="flex rounded-xl border border-gray-200 overflow-hidden focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                      <span className="inline-flex items-center gap-1.5 border-r border-gray-200 bg-gray-50 px-3 text-sm text-gray-500 font-medium min-w-[56px]">
                        +91
                      </span>
                      <input
                        id="phone"
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        placeholder="Enter your mobile number"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                        className="flex-1 bg-white px-3 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all disabled:opacity-60"
                    style={{
                      background: "linear-gradient(135deg, #2563EB, #3B82F6)",
                      boxShadow: "0 4px 16px rgba(37,99,235,0.35)",
                    }}
                  >
                    {loading
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <><span>Send OTP</span><ArrowRight className="h-4 w-4" /></>}
                  </button>
                </form>

                <div className="mt-6 flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-gray-700">Protected by JWT + RBAC</div>
                    <div className="text-xs text-gray-400 mt-0.5">Your data is encrypted and access is role-based.</div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="otp"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.22 }}
              >
                <h2 className="text-2xl font-bold tracking-tight text-gray-900">
                  Verify your number
                </h2>
                <p className="mt-1.5 text-sm text-gray-500">
                  We sent a 6-digit OTP to{" "}
                  <span className="font-semibold text-gray-800">+91 {phone}</span>
                </p>

                <form onSubmit={verify} className="mt-7 space-y-5">
                  <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                    <InputOTPGroup className="gap-2 w-full">
                      {[0,1,2,3,4,5].map(i => (
                        <InputOTPSlot
                          key={i}
                          index={i}
                          className="flex-1 h-12 rounded-xl border-gray-200 text-lg font-bold"
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>

                  <p className="text-xs text-gray-400 text-center">
                    Demo: use <span className="font-bold text-gray-600">1 2 3 4 5 6</span>
                  </p>

                  <button
                    type="submit"
                    disabled={loading || otp.length < 6}
                    className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all disabled:opacity-50"
                    style={{
                      background: "linear-gradient(135deg, #2563EB, #3B82F6)",
                      boxShadow: "0 4px 16px rgba(37,99,235,0.35)",
                    }}
                  >
                    {loading
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : "Verify & Sign in"}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setStep("phone"); setOtp(""); }}
                    className="flex w-full items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    Use a different number
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer links */}
          <div className="mt-8 flex items-center justify-center gap-4 text-[11px] text-gray-400">
            <span>© 2026 GateHub Technologies Pvt. Ltd.</span>
            <span>·</span>
            <button className="hover:text-gray-600 transition-colors">Privacy Policy</button>
            <span>·</span>
            <button className="hover:text-gray-600 transition-colors">Terms of Service</button>
          </div>
        </div>
      </div>
    </div>
  );
}
