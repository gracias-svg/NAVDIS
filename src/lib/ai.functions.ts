import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  kind: z.enum(["explanation", "template"]),
  bankName: z.string(),
  status: z.string(),
  failureType: z.string(),
  disputeDate: z.string(),
  amount: z.number().optional(),
});

const EXPLANATION_PROMPT = (d: z.infer<typeof inputSchema>) => `You are helping an Indian UPI user understand their payment dispute status.

Context:
- Bank: ${d.bankName}
- Status: ${d.status}
- Failure type: ${d.failureType}
- Dispute raised: ${d.disputeDate}

Write exactly 2–3 plain sentences explaining what this status means.
Use simple English. No jargon.
Do NOT mention any specific number of days or working days.
Do NOT cite any RBI circular numbers.
Do NOT use "we", "our", or "us" — you are an independent information tool, not the bank and not NAVDIS. Address the user directly in second person only.
Do NOT mention the status colour or status code (do not say "GREEN", "YELLOW", "RED", or "ACT SOON" — these are shown separately).
Be direct and reassuring for GREEN, urgent for RED.`;

const TEMPLATE_PROMPT = (d: z.infer<typeof inputSchema>) => `Generate a formal dispute escalation email for a UPI payment issue.

Details:
- Bank: ${d.bankName}
- Amount: ₹${d.amount ?? 0}
- Failure type: ${d.failureType}
- Dispute raised: ${d.disputeDate}
- RBI reference: RBI DPSS Circular CO.DPSS.EPPD No.G-3/02.14.003/2019-20

Include: subject line (starting 'Subject:'), salutation, one sentence on the issue,
one sentence citing the RBI 7-working-day mandate, request for resolution and
written confirmation, professional close.

Leave [Your Name], [Account Number], [Transaction Reference Number], [Your Branch]
as placeholders exactly as written. Under 150 words. Professional tone.`;

export const generateAi = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const prompt = data.kind === "explanation" ? EXPLANATION_PROMPT(data) : TEMPLATE_PROMPT(data);

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
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
