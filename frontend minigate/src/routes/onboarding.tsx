import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Check, ArrowRight, ArrowLeft, Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import api, { setTokens } from "@/lib/api";

export const Route = createFileRoute("/onboarding")({ component: Onboarding });

// ── Types ────────────────────────────────────────────────────────────────────

interface LookupItem { id: number | string; name: string; }

// ── Step components ───────────────────────────────────────────────────────────

function SelectField({
  label, value, onChange, options, placeholder, loading,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: LookupItem[];
  placeholder?: string;
  loading?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
        >
          <option value="">{loading ? "Loading..." : (placeholder ?? `Select ${label.toLowerCase()}...`)}</option>
          {options.map((o) => (
            <option key={o.id} value={String(o.id)}>{o.name}</option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">▾</span>
        {loading && <Loader2 className="absolute right-7 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-teal-500" />}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const STEPS = ["Verify OTP", "Your details", "Find your society", "Choose flat"];

function Onboarding() {
  const [step, setStep]   = useState(0);
  const navigate          = useNavigate();

  // Step 0 — OTP
  const [mobile, setMobile]   = useState("");
  const [otp, setOtp]         = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [fullName, setFullName] = useState("");

  // Step 2 — Society lookup (loaded from API)
  const [countries, setCountries] = useState<LookupItem[]>([]);
  const [cities,    setCities]    = useState<LookupItem[]>([]);
  const [societies, setSocieties] = useState<LookupItem[]>([]);
  const [buildings, setBuildings] = useState<LookupItem[]>([]);
  const [flats,     setFlats]     = useState<LookupItem[]>([]);

  // Selections
  const [countryId,  setCountryId]  = useState("");
  const [cityId,     setCityId]     = useState("");
  const [societyId,  setSocietyId]  = useState("");
  const [buildingId, setBuildingId] = useState("");
  const [flatId,     setFlatId]     = useState("");

  // Loading states
  const [loading,          setLoading]          = useState(false);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingCities,    setLoadingCities]    = useState(false);
  const [loadingSocieties, setLoadingSocieties] = useState(false);
  const [loadingBuildings, setLoadingBuildings] = useState(false);
  const [loadingFlats,     setLoadingFlats]     = useState(false);

  // ── Load countries once on mount ──────────────────────────────────────────
  useEffect(() => {
    setLoadingCountries(true);
    api.get("/accounts/onboarding/countries/")
      .then((r) => setCountries(r.data.results ?? []))
      .catch(() => toast.error("Failed to load countries"))
      .finally(() => setLoadingCountries(false));
  }, []);

  // ── Load cities when country changes ──────────────────────────────────────
  useEffect(() => {
    if (!countryId) { setCities([]); setCityId(""); return; }
    setLoadingCities(true);
    api.get(`/accounts/onboarding/cities/?country=${countryId}`)
      .then((r) => setCities(r.data.results ?? []))
      .catch(() => toast.error("Failed to load cities"))
      .finally(() => setLoadingCities(false));
  }, [countryId]);

  // ── Load societies when city changes ─────────────────────────────────────
  useEffect(() => {
    if (!cityId) { setSocieties([]); setSocietyId(""); return; }
    setLoadingSocieties(true);
    api.get(`/accounts/onboarding/societies/?city=${cityId}`)
      .then((r) => setSocieties(r.data.results ?? []))
      .catch(() => toast.error("Failed to load societies"))
      .finally(() => setLoadingSocieties(false));
  }, [cityId]);

  // ── Load buildings when society changes ──────────────────────────────────
  useEffect(() => {
    if (!societyId) { setBuildings([]); setBuildingId(""); return; }
    setLoadingBuildings(true);
    api.get(`/accounts/onboarding/buildings/?society=${societyId}`)
      .then((r) => setBuildings(r.data.results ?? []))
      .catch(() => toast.error("Failed to load buildings"))
      .finally(() => setLoadingBuildings(false));
  }, [societyId]);

  // ── Load flats when building changes ─────────────────────────────────────
  useEffect(() => {
    if (!buildingId && !societyId) { setFlats([]); setFlatId(""); return; }
    setLoadingFlats(true);
    const qs = buildingId
      ? `building=${buildingId}`
      : `society=${societyId}`;
    api.get(`/accounts/onboarding/flats/?${qs}`)
      .then((r) => setFlats(r.data.results ?? []))
      .catch(() => toast.error("Failed to load flats"))
      .finally(() => setLoadingFlats(false));
  }, [buildingId, societyId]);

  // ── Step handlers ─────────────────────────────────────────────────────────

  const sendOtp = async () => {
    if (mobile.length < 10) { toast.error("Enter a valid 10-digit mobile number"); return; }
    setLoading(true);
    try {
      await api.post("/accounts/otp/send/", { mobile });
      setOtpSent(true);
      toast.success("OTP sent!", { description: "Enter 123456 to continue (dev mode)" });
    } catch {
      toast.error("Failed to send OTP. Check the mobile number.");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (otp.length < 6) { toast.error("Enter the 6-digit OTP"); return; }
    setLoading(true);
    try {
      await api.post("/accounts/otp/verify/", { mobile, otp_code: otp });
      setStep(1);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    if (!fullName.trim()) { toast.error("Enter your full name"); return; }
    if (!countryId || !cityId || !societyId) {
      toast.error("Please complete all society details"); return;
    }
    setLoading(true);
    try {
      const flatObj  = flats.find((f) => String(f.id) === flatId);
      const flatNumber = flatObj?.name ?? "";

      const { data } = await api.post("/accounts/onboarding/complete/", {
        mobile,
        full_name:   fullName,
        country_id:  Number(countryId),
        city_id:     Number(cityId),
        society_id:  Number(societyId),
        ...(flatNumber ? { flat_number: flatNumber } : {}),
      });

      // Save tokens — resident can poll approval status
      if (data.tokens) setTokens(data.tokens);

      toast.success("Registration submitted!", {
        description: "Waiting for Society Admin approval.",
      });
      navigate({ to: "/access/status", search: { mobile } as any });
    } catch (err: any) {
      const msg = err?.response?.data?.message
        ?? Object.values(err?.response?.data ?? {})?.[0]?.[0]
        ?? "Registration failed";
      toast.error(String(msg));
    } finally {
      setLoading(false);
    }
  };

  // ── Render steps ──────────────────────────────────────────────────────────

  const progress = step + 1;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="flex items-center gap-2 mb-8">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-teal-600 text-white">
            <Building2 className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold text-gray-900">MiniGate</span>
        </div>

        {/* Step indicator */}
        <div className="flex items-center mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center flex-1">
              <div
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold border-2 transition-all ${
                  i < step
                    ? "bg-teal-600 border-teal-600 text-white"
                    : i === step
                    ? "bg-teal-600 border-teal-600 text-white"
                    : "bg-white border-gray-300 text-gray-400"
                }`}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 transition-all ${
                    i < step ? "bg-teal-600" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-1">{STEPS[step]}</h2>
          <p className="text-sm text-gray-500 mb-6">Step {progress} of {STEPS.length}</p>

          {/* ── Step 0: OTP ── */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Mobile number</Label>
                <div className="flex rounded-lg border border-gray-200 overflow-hidden focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-500">
                  <span className="flex items-center border-r border-gray-200 bg-gray-50 px-3 text-sm text-gray-500 font-medium">+91</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="9876543210"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                    disabled={otpSent}
                    className="flex-1 bg-white px-3 py-2.5 text-sm outline-none disabled:text-gray-400"
                  />
                </div>
              </div>

              {!otpSent ? (
                <Button
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white"
                  onClick={sendOtp}
                  disabled={loading || mobile.length < 10}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send OTP"}
                </Button>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Enter OTP</Label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="123456"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm tracking-[0.5em] text-center outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <p className="text-xs text-gray-400 text-center">Dev mode: use 1 2 3 4 5 6</p>
                  </div>
                  <Button
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white"
                    onClick={verifyOtp}
                    disabled={loading || otp.length < 6}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify OTP"}
                  </Button>
                  <button
                    type="button"
                    className="w-full text-xs text-gray-400 hover:text-gray-600 mt-1"
                    onClick={() => { setOtpSent(false); setOtp(""); }}
                  >
                    Use a different number
                  </button>
                </>
              )}
            </div>
          )}

          {/* ── Step 1: Name ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Full name</Label>
                <input
                  type="text"
                  placeholder="Aarav Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          )}

          {/* ── Step 2: Society (dropdowns from API) ── */}
          {step === 2 && (
            <div className="space-y-4">
              <SelectField
                label="Country"
                value={countryId}
                onChange={setCountryId}
                options={countries}
                loading={loadingCountries}
              />
              <SelectField
                label="City"
                value={cityId}
                onChange={setCityId}
                options={cities}
                loading={loadingCities}
                placeholder={countryId ? "Select city..." : "Select country first"}
              />
              <SelectField
                label="Society"
                value={societyId}
                onChange={setSocietyId}
                options={societies}
                loading={loadingSocieties}
                placeholder={cityId ? "Select society..." : "Select city first"}
              />
            </div>
          )}

          {/* ── Step 3: Flat ── */}
          {step === 3 && (
            <div className="space-y-4">
              <SelectField
                label="Building"
                value={buildingId}
                onChange={setBuildingId}
                options={buildings}
                loading={loadingBuildings}
              />
              <SelectField
                label="Flat number"
                value={flatId}
                onChange={setFlatId}
                options={flats}
                loading={loadingFlats}
                placeholder={buildingId || societyId ? "Select flat..." : "Select building first"}
              />
              <p className="text-xs text-gray-400">
                Don't see your flat? It may not be registered yet — contact your society admin.
              </p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
            <Button
              variant="outline"
              disabled={step === 0}
              onClick={() => setStep((s) => s - 1)}
              className="gap-1"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>

            {step < STEPS.length - 1 ? (
              <Button
                className="bg-teal-600 hover:bg-teal-700 text-white gap-1"
                onClick={() => {
                  if (step === 1 && !fullName.trim()) {
                    toast.error("Enter your full name");
                    return;
                  }
                  if (step === 2 && (!countryId || !cityId || !societyId)) {
                    toast.error("Please select country, city and society");
                    return;
                  }
                  setStep((s) => s + 1);
                }}
              >
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                className="bg-teal-600 hover:bg-teal-700 text-white gap-1"
                onClick={submit}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Submit <ArrowRight className="h-4 w-4" /></>}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
