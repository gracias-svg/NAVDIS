// Deterministic NAVDIS dispute logic.
// Working days: Mon-Fri (excludes Sat/Sun). Public holidays not modelled in MVP.

export type FailureType =
  | "debit_failed"
  | "double_charge"
  | "wrong_account"
  | "merchant_failed"
  | "other";

export type WindowStatus = "GREEN" | "YELLOW" | "RED_ESCALATE" | "RED_OMBUDSMAN";

export interface DisputeInput {
  bank: string;
  failureType: FailureType;
  amount: number;
  transactionDate: string; // ISO yyyy-mm-dd
  disputeDate: string; // ISO yyyy-mm-dd
  today?: string; // override for testing
}

export interface DisputeResult {
  windowStatus: WindowStatus;
  dayCount: number; // calendar days since dispute
  workingDaysSinceDispute: number;
  workingDaysOverdue: number; // beyond 7 working days
  compensationOwed: number; // ₹100/day past mandate
  ombudsmanEligibility: boolean;
  statusLabel: string;
  statusHeadline: string;
  recommendedAction: {
    label: string;
    description: string;
    steps: string[];
  };
  rights: string[];
}

const RIGHTS: string[] = [
  "Auto-reversal within 1 working day of the failed transaction (RBI DPSS Circular 2019-20).",
  "Bank must resolve your complaint within 7 working days of the complaint date.",
  "You are entitled to ₹100 per day of delay beyond the mandated timeline.",
  "If unresolved for 30 calendar days, you have the right to file with the RBI Banking Ombudsman.",
  "The Ombudsman's decision is binding on the bank at no cost to you.",
];

function parseISO(d: string): Date {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day);
}

function diffCalendarDays(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.floor(ms / 86400000);
}

function workingDaysBetween(from: Date, to: Date): number {
  if (to <= from) return 0;
  let count = 0;
  const cur = new Date(from);
  cur.setDate(cur.getDate() + 1); // exclusive of start
  while (cur <= to) {
    const d = cur.getDay();
    if (d !== 0 && d !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export function analyzeDispute(input: DisputeInput): DisputeResult {
  const today = input.today ? parseISO(input.today) : new Date();
  today.setHours(0, 0, 0, 0);
  const disputeDate = parseISO(input.disputeDate);
  const dayCount = Math.max(0, diffCalendarDays(disputeDate, today));
  const workingDaysSinceDispute = workingDaysBetween(disputeDate, today);
  const workingDaysOverdue = Math.max(0, workingDaysSinceDispute - 7);
  const compensationOwed = workingDaysOverdue * 100;

  let windowStatus: WindowStatus;
  if (dayCount >= 30) windowStatus = "RED_OMBUDSMAN";
  else if (workingDaysSinceDispute > 7) windowStatus = "RED_ESCALATE";
  else if (workingDaysSinceDispute >= 5) windowStatus = "YELLOW";
  else windowStatus = "GREEN";

  const ombudsmanEligibility = windowStatus === "RED_OMBUDSMAN";

  let statusLabel = "";
  let statusHeadline = "";
  let recommendedAction = { label: "", description: "", steps: [] as string[] };

  switch (windowStatus) {
    case "GREEN":
      statusLabel = "WITHIN WINDOW";
      statusHeadline = `Day ${dayCount} — Within your RBI resolution window`;
      recommendedAction = {
        label: "Wait — your bank is still within its 7-working-day window",
        description:
          "Keep your transaction reference, complaint number, and bank SMS handy. You don't need to escalate yet.",
        steps: [
          "Save your complaint ticket number in a safe place.",
          "Screenshot the failed transaction SMS from your bank.",
          "Check back on day 7 (working days) if not resolved by then.",
        ],
      };
      break;
    case "YELLOW":
      statusLabel = "ACT SOON";
      statusHeadline = `Day ${dayCount} — Act soon`;
      recommendedAction = {
        label: "Send a written follow-up to your bank today",
        description:
          "You're approaching the 7-working-day RBI deadline. A written follow-up creates a paper trail you'll need if escalation becomes necessary.",
        steps: [
          "Email your bank's grievance address citing the RBI 7-working-day mandate.",
          "Attach screenshots of the failed transaction SMS and your original complaint reference.",
          "Request a written acknowledgement within 24 hours.",
          "If no response by day 7 (working days), escalate to the Nodal Officer.",
        ],
      };
      break;
    case "RED_ESCALATE":
      statusLabel = "OVERDUE";
      statusHeadline = `Day ${dayCount} — RBI resolution window has passed`;
      recommendedAction = {
        label: "Escalate to your bank's Nodal Officer — now",
        description:
          "Your bank has missed the 7-working-day RBI mandate. Compensation of ₹100/day is owed and must be requested explicitly.",
        steps: [
          "Find your bank's Nodal Officer email (usually on the bank's grievance redressal page).",
          "Send a formal escalation citing RBI DPSS Circular 2019-20 and the working days elapsed.",
          "Demand resolution and ₹100/day compensation for each day past the mandate.",
          "Keep your original complaint reference number in the email.",
          "If unresolved by day 30 (calendar), file with the RBI Ombudsman.",
        ],
      };
      break;
    case "RED_OMBUDSMAN":
      statusLabel = "OMBUDSMAN REQUIRED";
      statusHeadline = `Day ${dayCount} — File Ombudsman complaint now`;
      recommendedAction = {
        label: "File an RBI Banking Ombudsman complaint today",
        description:
          "30+ calendar days have passed. You now have the right to file with the RBI Banking Ombudsman at no cost. The Ombudsman's ruling is binding on your bank.",
        steps: [
          "Visit https://cms.rbi.org.in to file online (no fee).",
          "Upload your complaint reference, bank SMS, and any email correspondence.",
          "Quote RBI DPSS Circular CO.DPSS.EPPD No.G-3/02.14.003/2019-20.",
          "Claim ₹100/day compensation for each working day past the mandate.",
          "You'll receive an Ombudsman reference number — save it.",
        ],
      };
      break;
  }

  return {
    windowStatus,
    dayCount,
    workingDaysSinceDispute,
    workingDaysOverdue,
    compensationOwed,
    ombudsmanEligibility,
    statusLabel,
    statusHeadline,
    recommendedAction,
    rights: RIGHTS,
  };
}

export const BANKS = [
  "Axis Bank",
  "Bank of Baroda",
  "Bank of India",
  "Canara Bank",
  "Federal Bank",
  "HDFC Bank",
  "ICICI Bank",
  "IDBI Bank",
  "IndusInd Bank",
  "Kotak Mahindra Bank",
  "Punjab National Bank",
  "RBL Bank",
  "State Bank of India",
  "Union Bank of India",
  "Yes Bank",
  "My bank isn't listed",
];

export const FAILURE_TYPES: { id: FailureType; icon: string; label: string; desc: string }[] = [
  { id: "debit_failed", icon: "💸", label: "Money debited, transaction failed", desc: "Amount left my account but didn't reach the recipient" },
  { id: "double_charge", icon: "🔄", label: "Charged twice for one transaction", desc: "The same payment went through twice" },
  { id: "wrong_account", icon: "❌", label: "Payment sent to wrong account", desc: "Money went to the wrong person or UPI ID" },
  { id: "merchant_failed", icon: "🏪", label: "Merchant payment failed, money deducted", desc: "Paid a shop or app — they got nothing, but money left my account" },
  { id: "other", icon: "❓", label: "Something else", desc: "My issue doesn't fit any of the above" },
];

export function failureTypeLabel(id: FailureType): string {
  return FAILURE_TYPES.find((f) => f.id === id)?.label ?? id;
}
