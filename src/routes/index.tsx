import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  BANKS,
  FAILURE_TYPES,
  analyzeDispute,
  failureTypeLabel,
  type DisputeResult,
  type FailureType,
} from "@/lib/dispute-logic";
import { generateAi } from "@/lib/ai.functions";

export const Route = createFileRoute("/")({
  component: NavdisApp,
});

type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6;

interface FormState {
  bank: string;
  failureType: FailureType | "";
  amount: string;
  transactionDate: string;
  disputeDate: string;
}

const empty: FormState = {
  bank: "",
  failureType: "",
  amount: "",
  transactionDate: "",
  disputeDate: "",
};

function todayISO() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function NavdisApp() {
  const [step, setStep] = useState<Step>(0);
  const [form, setForm] = useState<FormState>(empty);

  const reset = () => {
    setForm(empty);
    setStep(0);
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <main className="flex-1 w-full max-w-[480px] mx-auto px-4 py-5 sm:py-8">
        <BrandHeader />
        {step === 0 && <Screen0 onStart={() => setStep(1)} />}
        {step === 1 && (
          <Screen1
            bank={form.bank}
            onChange={(bank) => setForm({ ...form, bank })}
            onNext={() => setStep(2)}
            onBack={() => setStep(0)}
          />
        )}
        {step === 2 && (
          <Screen2
            selected={form.failureType}
            onSelect={(failureType) => {
              setForm({ ...form, failureType });
              setTimeout(() => setStep(3), 200);
            }}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <Screen3
            form={form}
            onChange={(patch) => setForm({ ...form, ...patch })}
            onNext={() => setStep(4)}
            onBack={() => setStep(2)}
          />
        )}
        {step === 4 && (
          <Screen4
            form={form}
            onNext={() => setStep(5)}
            onEdit={() => setStep(1)}
          />
        )}
        {step === 5 && <Screen5 onDone={() => setStep(6)} />}
        {step === 6 && <Screen6 form={form} onReset={reset} />}
      </main>
      <Footer />
    </div>
  );
}

function BrandHeader() {
  return (
    <div className="flex items-center gap-2 mb-5">
      <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center text-white text-sm font-bold">
        ✓
      </div>
      <span className="text-[12px] font-semibold tracking-[0.08em] uppercase text-primary">
        UPI Dispute Navigator
      </span>
    </div>
  );
}

function Footer() {
  return (
    <footer className="w-full max-w-[480px] mx-auto px-4 pb-6 pt-4 text-center text-[11px] text-text-muted leading-relaxed">
      Based on RBI DPSS Circular CO.DPSS.EPPD No.G-3/02.14.003/2019-20. For complex disputes, contact your bank's nodal officer. Not legal advice. Built by Recarsul Gracias.
    </footer>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`bg-surface rounded-[12px] p-[18px] sm:p-6 shadow-[0_2px_8px_rgba(0,0,0,0.08)] ${className}`}
    >
      {children}
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="w-full h-14 rounded-lg bg-primary hover:bg-primary-hover disabled:bg-text-muted disabled:cursor-not-allowed text-white text-[15px] font-semibold transition-colors active:scale-[0.99]"
    >
      {children}
    </button>
  );
}

function ProgressLabel({ step }: { step: 1 | 2 | 3 }) {
  return <div className="text-[12px] text-text-muted mb-2">Step {step} of 3</div>;
}

/* ────────────── SCREEN 0 ────────────── */
function Screen0({ onStart }: { onStart: () => void }) {
  return (
    <Card>
      <h1 className="text-[22px] font-bold text-text leading-tight">
        UPI dispute not resolved? Find out if your bank missed the RBI deadline.
      </h1>
      <p className="mt-3 text-[14px] text-text-secondary leading-relaxed">
        Money deducted. Dispute raised. Still waiting. Find out if your bank has missed its RBI deadline — and what you can do about it right now.
      </p>
      <div className="inline-block mt-4 px-3 py-1.5 rounded-full bg-primary-tint text-primary text-[12px] font-medium">
        📋 Based on RBI DPSS Circular 2019-20 · No login required
      </div>
      <div className="mt-6">
        <PrimaryButton onClick={onStart}>Check My Dispute Status →</PrimaryButton>
      </div>
    </Card>
  );
}

/* ────────────── SCREEN 1 ────────────── */
function Screen1({
  bank,
  onChange,
  onNext,
  onBack,
}: {
  bank: string;
  onChange: (b: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [query, setQuery] = useState(bank);
  const [open, setOpen] = useState(false);
  const filtered = useMemo(
    () => BANKS.filter((b) => b.toLowerCase().includes(query.toLowerCase())),
    [query],
  );
  return (
    <Card>
      <ProgressLabel step={1} />
      <h2 className="text-[16px] font-bold text-text">Which bank holds your account?</h2>
      <p className="text-[12px] text-text-secondary mt-1">The bank that debited your money</p>
      <div className="mt-4 relative">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (e.target.value !== bank) onChange("");
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search banks…"
          className="w-full h-12 px-3 rounded-md border border-border bg-surface text-[14px] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-tint"
        />
        {open && (
          <ul className="mt-2 max-h-[260px] overflow-y-auto border border-border rounded-md bg-surface divide-y divide-border">
            {filtered.length === 0 && (
              <li className="px-3 py-3 text-[13px] text-text-muted">No matches</li>
            )}
            {filtered.map((b) => (
              <li
                key={b}
                onClick={() => {
                  onChange(b);
                  setQuery(b);
                  setOpen(false);
                }}
                className={`px-3 py-3 text-[14px] cursor-pointer hover:bg-primary-tint min-h-11 flex items-center ${
                  bank === b ? "bg-primary-tint text-primary font-semibold" : "text-text"
                }`}
              >
                {b}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-6 flex flex-col gap-3">
        <PrimaryButton onClick={onNext} disabled={!bank}>
          Next →
        </PrimaryButton>
        <button onClick={onBack} className="text-[13px] text-text-secondary self-center">
          ← Back
        </button>
      </div>
    </Card>
  );
}

/* ────────────── SCREEN 2 ────────────── */
function Screen2({
  selected,
  onSelect,
  onBack,
}: {
  selected: FailureType | "";
  onSelect: (f: FailureType) => void;
  onBack: () => void;
}) {
  return (
    <Card>
      <ProgressLabel step={2} />
      <h2 className="text-[16px] font-bold text-text">What happened to your payment?</h2>
      <div className="mt-4 flex flex-col gap-3">
        {FAILURE_TYPES.map((f) => {
          const active = selected === f.id;
          return (
            <button
              key={f.id}
              onClick={() => onSelect(f.id)}
              className={`text-left p-4 rounded-lg border-[1.5px] min-h-16 transition-colors ${
                active
                  ? "border-primary bg-primary-tint"
                  : "border-border bg-surface hover:border-primary/50"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl leading-none mt-0.5">{f.icon}</span>
                <div className="flex-1">
                  <div className="text-[14px] font-semibold text-text">{f.label}</div>
                  <div className="text-[12px] text-text-secondary mt-0.5">{f.desc}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <button onClick={onBack} className="mt-5 text-[13px] text-text-secondary block mx-auto">
        ← Back
      </button>
    </Card>
  );
}

/* ────────────── SCREEN 3 ────────────── */
function Screen3({
  form,
  onChange,
  onNext,
  onBack,
}: {
  form: FormState;
  onChange: (p: Partial<FormState>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const today = todayISO();
  const [touched, setTouched] = useState<{ [k: string]: boolean }>({});

  const errAmount = form.amount !== "" && Number(form.amount) < 1 ? "Please enter the amount in rupees." : "";
  const errTxDate = form.transactionDate && form.transactionDate > today ? "Date can't be in the future." : "";
  const errDisputeOrder =
    form.disputeDate && form.transactionDate && form.disputeDate < form.transactionDate
      ? "Complaint date can't be before the transaction date. Please check."
      : "";
  const errDisputeFuture = form.disputeDate && form.disputeDate > today ? "Date can't be in the future." : "";

  const valid =
    form.amount !== "" &&
    Number(form.amount) >= 1 &&
    form.transactionDate &&
    form.disputeDate &&
    !errAmount &&
    !errTxDate &&
    !errDisputeOrder &&
    !errDisputeFuture;

  // GPay warning: today - tx > 18 days
  const showGpay = useMemo(() => {
    if (!form.transactionDate) return false;
    const tx = new Date(form.transactionDate);
    const t = new Date(today);
    const diff = Math.floor((t.getTime() - tx.getTime()) / 86400000);
    return diff > 18;
  }, [form.transactionDate, today]);

  return (
    <Card>
      <ProgressLabel step={3} />
      <h2 className="text-[16px] font-bold text-text">Dates and amount</h2>
      <p className="text-[12px] italic text-text-secondary mt-1">
        Check your bank SMS for these details
      </p>

      <div className="mt-5 space-y-5">
        {/* Amount */}
        <div>
          <label className="text-[13px] font-semibold text-text">Transaction amount</label>
          <div className="mt-1.5 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-[14px]">₹</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={form.amount}
              onChange={(e) => onChange({ amount: e.target.value })}
              onBlur={() => setTouched({ ...touched, amount: true })}
              placeholder="e.g. 2500"
              className={`w-full h-12 pl-7 pr-3 rounded-md border bg-surface text-[14px] focus:outline-none focus:ring-2 focus:ring-primary-tint ${
                touched.amount && errAmount ? "border-red" : "border-border focus:border-primary"
              }`}
            />
          </div>
          {touched.amount && errAmount && (
            <p className="mt-1 text-[12px] text-red">{errAmount}</p>
          )}
        </div>

        {/* Transaction date */}
        <div>
          <label className="text-[13px] font-semibold text-text">Date of failed transaction</label>
          <input
            type="date"
            max={today}
            value={form.transactionDate}
            onChange={(e) => onChange({ transactionDate: e.target.value })}
            onBlur={() => setTouched({ ...touched, transactionDate: true })}
            className={`mt-1.5 w-full h-12 px-3 rounded-md border bg-surface text-[14px] focus:outline-none focus:ring-2 focus:ring-primary-tint ${
              touched.transactionDate && errTxDate ? "border-red" : "border-border focus:border-primary"
            }`}
          />
          {touched.transactionDate && errTxDate && (
            <p className="mt-1 text-[12px] text-red">{errTxDate}</p>
          )}
        </div>

        {showGpay && (
          <div className="rounded-lg border-l-4 border-yellow bg-yellow-bg p-3 text-[13px] text-yellow-text leading-relaxed">
            <strong>⚠️ Using GPay?</strong> It stops accepting new complaints after 21 days from the transaction date. If you haven't filed through the app yet, do it today.
          </div>
        )}

        {/* Dispute date */}
        <div>
          <label className="text-[13px] font-semibold text-text">Date you raised the complaint</label>
          <p className="text-[12px] text-text-secondary mt-0.5">
            When did you first report this to your bank or UPI app?
          </p>
          <input
            type="date"
            max={today}
            value={form.disputeDate}
            onChange={(e) => onChange({ disputeDate: e.target.value })}
            onBlur={() => setTouched({ ...touched, disputeDate: true })}
            className={`mt-1.5 w-full h-12 px-3 rounded-md border bg-surface text-[14px] focus:outline-none focus:ring-2 focus:ring-primary-tint ${
              touched.disputeDate && (errDisputeOrder || errDisputeFuture)
                ? "border-red"
                : "border-border focus:border-primary"
            }`}
          />
          {touched.disputeDate && (errDisputeOrder || errDisputeFuture) && (
            <p className="mt-1 text-[12px] text-red">{errDisputeOrder || errDisputeFuture}</p>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <PrimaryButton onClick={onNext} disabled={!valid}>
          Next →
        </PrimaryButton>
        <button onClick={onBack} className="text-[13px] text-text-secondary self-center">
          ← Back
        </button>
      </div>
    </Card>
  );
}

/* ────────────── SCREEN 4 ────────────── */
function Screen4({
  form,
  onNext,
  onEdit,
}: {
  form: FormState;
  onNext: () => void;
  onEdit: () => void;
}) {
  const today = todayISO();
  const disputeDate = new Date(form.disputeDate);
  const daysAgo = Math.max(
    0,
    Math.floor((new Date(today).getTime() - disputeDate.getTime()) / 86400000),
  );
  const dayName = disputeDate.toLocaleDateString("en-IN", { weekday: "long" });
  const longDate = disputeDate.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  return (
    <Card>
      <h2 className="text-[18px] font-bold text-text">Your dispute with {form.bank}</h2>
      <p className="text-[14px] text-text-secondary mt-1">
        ₹{Number(form.amount).toLocaleString("en-IN")} · reported {daysAgo} day{daysAgo === 1 ? "" : "s"} ago
      </p>
      <p className="text-[14px] text-text-secondary mt-3 leading-relaxed">
        You raised a complaint on <strong className="text-text">{dayName}, {longDate}</strong>. That was {daysAgo} calendar day{daysAgo === 1 ? "" : "s"} ago.
      </p>
      <div className="mt-6 flex flex-col gap-3">
        <PrimaryButton onClick={onNext}>Check my rights →</PrimaryButton>
        <button onClick={onEdit} className="text-[13px] text-text-secondary self-center">
          ← Edit details
        </button>
      </div>
    </Card>
  );
}

/* ────────────── SCREEN 5 ────────────── */
function Screen5({ onDone }: { onDone: () => void }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setShown(1), 300);
    const t2 = setTimeout(() => setShown(2), 700);
    const t3 = setTimeout(() => setShown(3), 1100);
    const t4 = setTimeout(onDone, 1500);
    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, [onDone]);

  const items = [
    "Calculating your RBI timeline",
    "Checking Ombudsman eligibility",
    "Generating your rights summary",
  ];

  return (
    <Card>
      <p className="text-[12px] text-text-muted text-center">UPI Dispute Navigator</p>
      <div className="mt-4 w-full h-1 bg-code-bg rounded-[2px] overflow-hidden">
        <div
          className="h-full bg-primary rounded-[2px]"
          style={{ width: "100%", transition: "width 1.5s linear", animation: "navdis-progress 1.5s linear forwards" }}
        />
      </div>
      <div className="mt-5 space-y-3 min-h-[140px]">
        {items.map((it, i) => (
          <div
            key={it}
            className={`flex items-center gap-3 text-[14px] text-text-secondary transition-opacity ${
              shown > i ? "opacity-100" : "opacity-0"
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full bg-green-bg text-green flex items-center justify-center text-xs font-bold ${
                shown > i ? "navdis-pop" : ""
              }`}
            >
              ✓
            </span>
            {it}
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ────────────── SCREEN 6 ────────────── */
function Screen6({ form, onReset }: { form: FormState; onReset: () => void }) {
  const result = useMemo<DisputeResult>(
    () =>
      analyzeDispute({
        bank: form.bank,
        failureType: form.failureType as FailureType,
        amount: Number(form.amount),
        transactionDate: form.transactionDate,
        disputeDate: form.disputeDate,
      }),
    [form],
  );

  const callAi = useServerFn(generateAi);

  const [explanation, setExplanation] = useState<string | null>(null);
  const [explFailed, setExplFailed] = useState(false);
  const [template, setTemplate] = useState<string | null>(null);
  const [templateFailed, setTemplateFailed] = useState(false);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [surveyResponse, setSurveyResponse] = useState<"yes" | "no" | null>(null);
  const [surveyHidden, setSurveyHidden] = useState(false);

  const needsTemplate = result.windowStatus !== "GREEN";
  const isBankUnlisted = form.bank === "My bank isn't listed";

  const fetchTemplate = async () => {
    setTemplateLoading(true);
    setTemplateFailed(false);
    try {
      const r = await callAi({
        data: {
          kind: "template",
          bankName: form.bank,
          status: result.windowStatus,
          failureType: failureTypeLabel(form.failureType as FailureType),
          disputeDate: form.disputeDate,
          amount: Number(form.amount),
        },
      });
      setTemplate(r.text);
    } catch {
      setTemplateFailed(true);
    } finally {
      setTemplateLoading(false);
    }
  };

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const r = await callAi({
          data: {
            kind: "explanation",
            bankName: form.bank,
            status: result.windowStatus,
            failureType: failureTypeLabel(form.failureType as FailureType),
            disputeDate: form.disputeDate,
          },
        });
        if (!cancel) setExplanation(r.text);
      } catch {
        if (!cancel) setExplFailed(true);
      }
    })();
    if (needsTemplate) fetchTemplate();
    return () => {
      cancel = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusStyles = (() => {
    switch (result.windowStatus) {
      case "GREEN":
        return { bg: "bg-green-bg", text: "text-green", dot: "bg-green" };
      case "YELLOW":
        return { bg: "bg-yellow-bg", text: "text-yellow-text", dot: "bg-yellow" };
      default:
        return { bg: "bg-red-bg", text: "text-red", dot: "bg-red" };
    }
  })();

  const sharePayload = `UPI Dispute Status — ${form.bank}
Status: Day ${result.dayCount} — ${result.statusHeadline}
Amount: ₹${Number(form.amount).toLocaleString("en-IN")} | Raised: ${form.disputeDate}
What to do: ${result.recommendedAction.label}
RBI reference: DPSS Circular CO.DPSS.EPPD No.G-3/02.14.003/2019-20
(Generated by UPI Dispute Navigator — ${typeof window !== "undefined" ? window.location.href : ""})`;

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ text: sharePayload });
      } catch {
        /* user cancelled */
      }
    } else {
      try {
        await navigator.clipboard.writeText(sharePayload);
        alert("Status copied to clipboard");
      } catch {
        /* ignore */
      }
    }
  };

  const copyTemplate = async () => {
    if (!template) return;
    await navigator.clipboard.writeText(template);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openInGmail = () => {
    if (!template) return;
    const lines = template.split("\n");
    const subjectIdx = lines.findIndex((l) => /^subject:/i.test(l.trim()));
    let subject = "";
    let body = template;
    if (subjectIdx !== -1) {
      subject = lines[subjectIdx].replace(/^subject:\s*/i, "").trim();
      body = lines.slice(subjectIdx + 1).join("\n").replace(/^\n+/, "");
    }
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(url, "_blank");
  };

  const recordSurvey = (v: "yes" | "no") => {
    setSurveyResponse(v);
    setTimeout(() => setSurveyHidden(true), 200);
  };

  return (
    <div className="space-y-3 pb-24">
      {/* ZONE A — STATUS */}
      <Card>
        <span
          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase ${statusStyles.bg} ${statusStyles.text}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${statusStyles.dot}`} />
          {result.statusLabel}
        </span>
        <h2 className="mt-3 text-[20px] font-bold text-text leading-snug">
          {result.statusHeadline}
        </h2>
        {result.windowStatus === "YELLOW" && (
          <p className="mt-1 text-[13px] text-text-secondary">
            You have {Math.max(0, 30 - result.dayCount)} days until Ombudsman eligibility.
          </p>
        )}
        <hr className="my-4 border-border" />
        <p className="text-[14px] italic text-text-secondary leading-relaxed">
          {explanation
            ? explanation
            : explFailed
              ? "Personalised guidance unavailable — your rights and action below are accurate."
              : "Personalised guidance loading…"}
        </p>
        {isBankUnlisted && (
          <p className="mt-3 text-[12px] text-text-muted">
            We don't have bank-specific data, but RBI timelines apply to all UPI-enabled banks.
          </p>
        )}
      </Card>

      {/* ZONE B — RIGHTS */}
      <Card>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">
          Your RBI Rights
        </p>
        <ul className="mt-3 space-y-2.5">
          {result.rights.map((r, i) => (
            <li key={i} className="flex items-start gap-2.5 text-[13px] text-text leading-relaxed">
              <span className="w-4 h-4 mt-0.5 rounded-full bg-green-bg text-green flex items-center justify-center text-[10px] font-bold shrink-0">
                ✓
              </span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </Card>

      {/* ZONE C — ACTION */}
      <Card>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">
          What to do now
        </p>
        <h3 className="mt-3 text-[14px] font-bold text-text">{result.recommendedAction.label}</h3>
        <p className="mt-1.5 text-[13px] text-text-secondary leading-relaxed">
          {result.recommendedAction.description}
        </p>
        <ol className="mt-4 space-y-2.5">
          {result.recommendedAction.steps.map((s, i) => (
            <li key={i} className="flex items-start gap-3 text-[13px] text-text leading-relaxed">
              <span className="shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-[11px] font-bold">
                {i + 1}
              </span>
              <span>{s}</span>
            </li>
          ))}
        </ol>

        {result.compensationOwed > 0 && (result.windowStatus === "YELLOW" || result.windowStatus === "RED_ESCALATE") && (
          <div className="mt-5 rounded-lg border-l-4 border-yellow bg-yellow-bg p-3.5 text-[13px] text-yellow-text leading-relaxed">
            <strong>💰 You may be owed ₹{result.compensationOwed.toLocaleString("en-IN")} in compensation.</strong>
            <br />
            Request this explicitly from your bank — it is not paid automatically.
          </div>
        )}

        {needsTemplate && (
          <>
            <hr className="my-5 border-border" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">
              Escalation Email Template
            </p>
            {templateLoading && (
              <p className="mt-3 text-[13px] italic text-text-muted">Generating your template…</p>
            )}
            {templateFailed && !templateLoading && (
              <div className="mt-3">
                <p className="text-[13px] text-text-secondary">Template generation failed.</p>
                <button
                  onClick={fetchTemplate}
                  className="mt-2 px-3 py-1.5 text-[12px] font-semibold rounded-md border border-border text-text hover:bg-code-bg"
                >
                  Retry
                </button>
              </div>
            )}
            {template && (
              <>
                <pre
                  className="mt-3 bg-code-bg rounded-md p-[14px] text-[12px] leading-relaxed whitespace-pre-wrap text-text overflow-x-auto"
                  style={{ fontFamily: "'SF Mono', Consolas, monospace" }}
                >
                  {template}
                </pre>
                <button
                  onClick={copyTemplate}
                  className={`mt-3 inline-flex items-center gap-2 h-11 px-4 rounded-md border text-[13px] font-semibold transition-colors ${
                    copied
                      ? "bg-green-bg text-green border-green-bg"
                      : "bg-surface text-text border-border hover:bg-code-bg"
                  }`}
                >
                  {copied ? "✓ Copied!" : "📋 Copy to clipboard"}
                </button>
              </>
            )}
          </>
        )}

        {result.windowStatus === "RED_OMBUDSMAN" && (
          <a
            href="https://cms.rbi.org.in"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 w-full h-12 rounded-md bg-red text-white text-[14px] font-semibold flex items-center justify-center hover:opacity-90"
          >
            File RBI Ombudsman Complaint →
          </a>
        )}
      </Card>

      {/* SHARE + RESET */}
      <div className="pt-2 space-y-3">
        <button
          onClick={handleShare}
          className="w-full h-12 rounded-md border border-border bg-surface text-text text-[14px] font-semibold hover:bg-code-bg"
        >
          Share this status →
        </button>
        <button
          onClick={onReset}
          className="block mx-auto text-[13px] text-text-secondary"
        >
          ← Check another dispute
        </button>
      </div>

      {/* STICKY EXIT SURVEY */}
      {!surveyHidden && (
        <div
          className={`fixed bottom-0 left-0 right-0 z-30 bg-surface border-t border-border px-4 py-3 shadow-[0_-2px_8px_rgba(0,0,0,0.06)] ${
            surveyResponse ? "navdis-fade-out" : "navdis-fade-in"
          }`}
        >
          <div className="max-w-[480px] mx-auto">
            <p className="text-[13px] font-semibold text-text text-center">
              Do you now know what to do about your dispute?
            </p>
            <div className="mt-2.5 flex gap-2">
              <button
                onClick={() => recordSurvey("yes")}
                className="flex-1 h-11 rounded-md bg-green-bg text-green text-[13px] font-semibold"
              >
                Yes, I know what to do
              </button>
              <button
                onClick={() => recordSurvey("no")}
                className="flex-1 h-11 rounded-md bg-code-bg text-text-secondary text-[13px] font-semibold"
              >
                Not yet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
