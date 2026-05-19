import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES — matching dispute-logic.ts
// ─────────────────────────────────────────────────────────────────────────────

type WindowStatus = "GREEN" | "YELLOW" | "RED_ESCALATE" | "RED_OMBUDSMAN";
type FailureType =
  | "debit_failed"
  | "double_charge"
  | "wrong_account"
  | "merchant_failed"
  | "other";
type UrgencyLevel = 1 | 2 | 3;

// ─────────────────────────────────────────────────────────────────────────────
// INPUT SCHEMA
// Added dayCount as optional — enables urgency classification.
// Existing UI calls that don't pass dayCount will default gracefully.
// ─────────────────────────────────────────────────────────────────────────────

const inputSchema = z.object({
  kind: z.enum(["explanation", "template"]),
  bankName: z.string(),
  status: z.string(),       // WindowStatus — kept as string for schema compatibility
  failureType: z.string(),  // FailureType — kept as string for schema compatibility
  disputeDate: z.string(),
  amount: z.number().optional(),
  dayCount: z.number().optional(), // calendar days elapsed — for urgency signal
  language: z.enum(["en", "hi", "mr", "ta"]).optional().default("en"),
});

// ─────────────────────────────────────────────────────────────────────────────
// REGULATORY CONTEXT — injected verbatim into every AI prompt
//
// Source: RBI DPSS Circular No. CO.DPSS.EPPD No.G-3/02.14.003/2019-20
// "Framework for Resolution of Failed Transactions in Authorised Payment Systems"
//
// ARCHITECTURE NOTE: This constant makes NAVDIS's AI a translator, not a generator.
// The model receives the actual regulatory text before any instruction.
// It cannot hallucinate circular numbers, invent timelines, or cite mandates
// that don't exist in this provided text.
//
// This is static context injection — equivalent to RAG for a small, stable
// regulatory dataset, without the vector database infrastructure overhead.
//
// UPDATE THIS CONSTANT if RBI issues a new circular changing any UPI dispute timeline.
// Check: rbi.org.in/Scripts/BS_CircularIndexDisplay.aspx
// ─────────────────────────────────────────────────────────────────────────────

const RBI_REGULATORY_CONTEXT = `
REGULATORY CONTEXT (RBI DPSS Circular No. CO.DPSS.EPPD No.G-3/02.14.003/2019-20):

The Reserve Bank of India's Framework for Resolution of Failed Transactions establishes the following binding mandates for all UPI payment disputes at all scheduled commercial banks in India:

1. AUTO-REVERSAL MANDATE
When a customer's account is debited but the UPI transaction fails to complete, the bank must automatically reverse the amount within 1 working day (T+1) of the transaction date. No customer complaint is required for this step.

2. COMPLAINT RESOLUTION MANDATE
Once a customer formally raises a dispute or complaint with their bank regarding an unresolved failed transaction, the bank must resolve it within 7 working days from the date the complaint was raised. This is a regulatory obligation, not a service target.

3. COMPENSATION ENTITLEMENT
For every working day of delay beyond the 7-working-day mandate, the customer is legally entitled to receive ₹100 per day in compensation. This compensation accrues from the day the mandate is first missed. Banks do not credit this automatically — the customer must request it explicitly in writing, citing this circular by its full reference number.

4. NODAL OFFICER ESCALATION
Every scheduled commercial bank must designate a Nodal Officer for payment-related grievances. If the bank has not resolved the dispute within the mandated 7 working days, the customer's next step is to escalate in writing to the bank's Nodal Officer, citing this circular.

5. BANKING OMBUDSMAN ESCALATION
If the dispute remains unresolved after 30 calendar days from the date the complaint was first raised, the customer has the legal right to file a formal complaint with the RBI Banking Ombudsman at https://cms.rbi.org.in. This service is completely free to the customer. The Ombudsman's decision is binding on the bank — the bank has no option to ignore or appeal it without legal process.
`.trim();

// ─────────────────────────────────────────────────────────────────────────────
// URGENCY CLASSIFIER — deterministic function, NOT AI
//
// PURPOSE: Classifies the emotional context of the user's situation into
// one of three urgency levels, which drives AI tone modulation.
//
// ARCHITECTURE PRINCIPLE: The AI does not decide that Day 9 is urgent.
// The deterministic logic layer already knows it is RED_ESCALATE.
// This function converts that decision into a tone instruction.
// Rules decide the urgency. AI uses it to calibrate emotional register.
//
// WRONG_ACCOUNT MODIFIER: Wrong account transfers are legally more complex
// (fund recovery depends on recipient cooperation — not guaranteed).
// Users in this state need slightly more serious framing even at GREEN.
// ─────────────────────────────────────────────────────────────────────────────

interface UrgencySignal {
  level: UrgencyLevel;
  toneInstruction: string;
  contextNote: string;
}

function classifyUrgency(
  windowStatus: WindowStatus,
  failureType: FailureType
): UrgencySignal {
  // Base urgency level from window status
  let baseLevel: UrgencyLevel;
  switch (windowStatus) {
    case "GREEN":
      baseLevel = 1;
      break;
    case "YELLOW":
      baseLevel = 2;
      break;
    case "RED_ESCALATE":
    case "RED_OMBUDSMAN":
      baseLevel = 3;
      break;
    default:
      baseLevel = 1;
  }

  // Wrong account adds +1 to urgency, capped at 3
  const modifier = failureType === "wrong_account" ? 1 : 0;
  const level = Math.min(3, baseLevel + modifier) as UrgencyLevel;

  const signals: Record<UrgencyLevel, UrgencySignal> = {
    1: {
      level: 1,
      toneInstruction:
        "Use a calm, informational tone. The user does not need to act yet. Reassure them that the bank is still within its window and the situation is being handled. Do not use any urgency language ('act now', 'immediately', 'do not wait'). Be factual and steady.",
      contextNote:
        "Remind the user to keep their complaint reference number and the original bank SMS saved — they will need these if escalation becomes necessary.",
    },
    2: {
      level: 2,
      toneInstruction:
        "Use a preparatory, motivating tone. The user is approaching a regulatory deadline. They do not need to escalate yet, but they should be getting ready. Communicate that time is a factor without creating panic. Use language like 'it is time to prepare' or 'have your documents ready'. Make clear that inaction beyond this point risks missing the escalation window.",
      contextNote:
        "Mention that the user should have their complaint reference number, bank SMS, and transaction details readily available for when escalation becomes necessary.",
    },
    3: {
      level: 3,
      toneInstruction:
        "Use a direct, action-forcing tone. Do not soften the message in any way. The bank has missed its regulatory deadline. The user must act today, not tomorrow. Use language like 'act today', 'do this now', 'do not wait any further'. No hedging. No passive voice. No 'you may want to consider'. Every additional day of delay costs the user money in compensation they are legally owed but not receiving.",
      contextNote:
        "Make clear that compensation of ₹100 per working day is accruing and must be requested explicitly in writing — the bank will not pay it without a formal written claim.",
    },
  };

  return signals[level];
}

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT BUILDERS
// Each prompt: regulatory context first, then user data, then task + constraints.
// Explanation prompt: includes urgency tone modulation.
// Template prompt: always formal — urgency does not apply to legal documents.
// ─────────────────────────────────────────────────────────────────────────────

function buildExplanationPrompt(d: z.infer<typeof inputSchema>): string {
  const windowStatus = d.status as WindowStatus;
  const failureType = d.failureType as FailureType;
  const urgency = classifyUrgency(windowStatus, failureType);

  return `You are a regulatory translation assistant. Your job is to help an Indian UPI user understand where they stand in a payment dispute — in plain, simple English.

${RBI_REGULATORY_CONTEXT}

---

THIS USER'S SPECIFIC SITUATION:
- Bank: ${d.bankName}
- What happened: ${d.failureType}
- Dispute status: ${d.status}
- Days since complaint was raised: ${d.dayCount != null ? d.dayCount : "unknown"} calendar days

TONE INSTRUCTION — follow this precisely, it is as important as the content:
${urgency.toneInstruction}

ADDITIONAL CONTEXT FOR THIS SPECIFIC USER:
${urgency.contextNote}

YOUR TASK:
Using ONLY the regulatory context provided above — not your training data or general knowledge about UPI — write exactly 2 to 3 plain sentences explaining what this user's situation means and what they should keep in mind.

NON-NEGOTIABLE CONSTRAINTS — violating any of these is a failure:
1. Do NOT mention any specific number of days, working days, or calendar days. The day count is shown separately in the interface.
2. Do NOT cite any RBI circular numbers, regulation names, or policy references. These are shown separately.
3. Do NOT use "we", "our", or "us" in any form. You are not the bank. You are not NAVDIS. Address only the user, in second person.
4. Do NOT mention the status colour or code. Do not write "GREEN", "YELLOW", "RED", "ACT SOON", "OVERDUE", or any status label.
5. Do NOT make any prediction or promise about resolution: no "you will get your money back", no "the bank will resolve this", no "you should hear from them soon".
6. Do NOT write more than 3 sentences. Two is better if the message is clear.
7. Write for a 25-year-old smartphone user in India — not a finance professional. No jargon.`.trim();
}

function buildTemplatePrompt(d: z.infer<typeof inputSchema>): string {
  return `You are a regulatory translation assistant generating a formal escalation email for an Indian UPI payment dispute. The email will be sent by the customer to their bank's Nodal Officer or Grievance Redressal team.

${RBI_REGULATORY_CONTEXT}

---

THIS USER'S DETAILS:
- Bank: ${d.bankName}
- Amount in dispute: ₹${d.amount ?? 0}
- What happened: ${d.failureType}
- Date complaint was first raised: ${d.disputeDate}
- RBI circular reference to cite: RBI DPSS Circular CO.DPSS.EPPD No.G-3/02.14.003/2019-20

YOUR TASK:
Using the regulatory context above as your source, write a formal escalation email. Follow this exact structure in this exact order:
1. Subject line — must begin with the word "Subject:"
2. Salutation — "Dear Sir/Madam," (do not personalise further)
3. One sentence identifying the disputed transaction (bank name, amount, date, what happened)
4. One sentence citing the 7-working-day resolution mandate from the regulatory context above (reference the circular by its full number)
5. One sentence stating that the mandate period has been exceeded and demanding immediate resolution and written confirmation of actions being taken
6. Closing — "Sincerely,"
7. Placeholder block (see format below)

PLACEHOLDER FORMAT — use exactly this text, no modifications:
[Your Name]
Account Number: [Account Number]
Transaction Reference Number: [Transaction Reference Number]
Branch: [Your Branch]

NON-NEGOTIABLE CONSTRAINTS — violating any of these is a failure:
1. NO markdown formatting of any kind: no asterisks (*), no double asterisks (**), no underscores (_), no bold, no italics, no hyphens used as decorative bullets.
2. ALL placeholders must appear as plain text in square brackets exactly as listed above. Write [Account Number], never **[Account Number]** or *[Account Number]*.
3. Do NOT use the word "unfortunately" anywhere in the email.
4. Do NOT use the word "kindly" anywhere in the email. Use direct professional language instead.
5. No passive voice in the core demand sentence. "I request" not "it is requested".
6. Total email under 150 words including subject line, salutation, body, closing, and placeholders.
7. Plain text only — this email will be pasted directly into Gmail and must contain no invisible formatting characters.`.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVER FUNCTION — unchanged structure, updated prompt routing
// ─────────────────────────────────────────────────────────────────────────────

export const generateAi = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const prompt =
      data.kind === "explanation"
        ? buildExplanationPrompt(data)
        : buildTemplatePrompt(data);

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 450,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`AI call failed [${res.status}]: ${body}`);
    }

    const json = await res.json();
    const text: string = json?.choices?.[0]?.message?.content ?? "";
    return { text };
  });
