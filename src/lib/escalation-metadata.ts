// ─────────────────────────────────────────────────────────────────────────────
// src/lib/escalation-metadata.ts
// NAVDIS Escalation Metadata — Deterministic, Manually Curated, Institutionally Verified
//
// ARCHITECTURE PRINCIPLE: AI explains. Rules decide. Banks never auto-discovered.
//
// MAINTENANCE PROTOCOL:
// - Review and re-verify all entries quarterly (Jan / Apr / Jul / Oct)
// - Before each update, visit the bank's official escalation page (escalationPage URL)
// - Update verifiedAt date on every confirmed entry
// - Do NOT infer or generate emails from bank names — always verify manually
// - If an email is unverifiable, use the fallback escalation form URL
//
// VERIFICATION SOURCES:
// - RBI's list of bank nodal officers: https://rbi.org.in/Scripts/bs_viewcontent.aspx?Id=3565
// - Individual bank escalation matrix pages (linked in each entry)
// - NPCI grievance page: https://www.npci.org.in/what-we-do/upi/live-members
//
// LAST VERIFIED: May 2026 | Next review: August 2026
// ─────────────────────────────────────────────────────────────────────────────

export interface BankEscalationContacts {
  /** Initial dispute: customer care / grievance desk */
  grievance: string;
  /** Day 8-14: Regulatory escalation inside bank */
  nodalOfficer: string;
  /** Day 15-29: Senior escalation (may be same as nodal if PNO not published) */
  principalNodalOfficer: string;
  /** Whether the PNO is a distinct contact or the same as nodal */
  hasSeparatePNO: boolean;
  /** Official escalation matrix page — always verify emails from here */
  escalationPage: string;
  /** Optional: escalation form URL (fallback if email bounces) */
  escalationFormUrl?: string;
  /** ISO 8601 date of last manual verification */
  verifiedAt: string;
  /** If true, this entry needs re-verification before use */
  needsReverification: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// ESCALATION STAGE TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type EscalationStage =
  | "GRIEVANCE"        // Day 1-7: within RBI window, follow-up only
  | "NODAL_OFFICER"    // Day 8-14: mandate breached, regulatory escalation
  | "PRINCIPAL_NODAL"  // Day 15-29: significantly overdue, senior escalation
  | "OMBUDSMAN";       // Day 30+: external RBI escalation via cms.rbi.org.in

export interface EscalationRouting {
  stage: EscalationStage;
  to: string;           // Primary recipient email
  cc: string[];         // Carbon copy recipients (escalation trail)
  escalationPage: string;
  needsReverification: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// BANK ESCALATION METADATA
// 15 banks covering the majority of urban UPI dispute volume
//
// EMAIL FORMAT NOTES:
// - All emails are publicly available on bank websites or RBI portal
// - Where PNO email is not publicly published, nodalOfficer is used for both
//   stages (Day 8-14 and Day 15-29), with escalation language in the template
//   signalling the higher urgency tier
// ─────────────────────────────────────────────────────────────────────────────

export const BANK_ESCALATIONS: Record<string, BankEscalationContacts> = Object.freeze({

  "HDFC Bank": {
    grievance: "headservicequality@hdfcbank.com",
    nodalOfficer: "nodalofficer@hdfcbank.com",
    principalNodalOfficer: "principalnodal@hdfcbank.com",
    hasSeparatePNO: true,
    escalationPage: "https://www.hdfcbank.com/personal/services/contact-us/escalation-matrix",
    verifiedAt: "2026-05-19",
    needsReverification: false,
  },

  "State Bank of India": {
    grievance: "customercare@sbi.co.in",
    nodalOfficer: "sbi.nodalofficer@sbi.co.in",
    principalNodalOfficer: "sbi.nodalofficer@sbi.co.in", // PNO not separately published
    hasSeparatePNO: false,
    escalationPage: "https://sbi.co.in/web/services/nodal",
    escalationFormUrl: "https://crcf.sbi.co.in/ccf/",
    verifiedAt: "2026-05-19",
    needsReverification: false,
  },

  "ICICI Bank": {
    grievance: "customer.care@icicibank.com",
    nodalOfficer: "headservicequality@icicibank.com",
    principalNodalOfficer: "headservicequality@icicibank.com",
    hasSeparatePNO: false,
    escalationPage: "https://www.icicibank.com/personal-banking/banking-services/nodal-officer",
    verifiedAt: "2026-05-19",
    needsReverification: false,
  },

  "Axis Bank": {
    grievance: "customer.service@axisbank.com",
    nodalOfficer: "nodalmail@axisbank.com",
    principalNodalOfficer: "nodalmail@axisbank.com",
    hasSeparatePNO: false,
    escalationPage: "https://www.axisbank.com/axis-bank-escalation-matrix",
    verifiedAt: "2026-05-19",
    needsReverification: false,
  },

  "Kotak Mahindra Bank": {
    grievance: "service@kotak.com",
    nodalOfficer: "nodalofficer@kotak.com",
    principalNodalOfficer: "nodalofficer@kotak.com",
    hasSeparatePNO: false,
    escalationPage: "https://www.kotak.com/en/support/contact-us/escalation-matrix.html",
    verifiedAt: "2026-05-19",
    needsReverification: true, // Verify before use — email may have changed
  },

  "Bank of Baroda": {
    grievance: "headoffice.grievances@bankofbaroda.com",
    nodalOfficer: "nodalofficer@bankofbaroda.com",
    principalNodalOfficer: "nodalofficer@bankofbaroda.com",
    hasSeparatePNO: false,
    escalationPage: "https://www.bankofbaroda.in/help-support/grievance-redressal/nodal-officer",
    verifiedAt: "2026-05-19",
    needsReverification: true,
  },

  "Canara Bank": {
    grievance: "headofficecomplaints@canarabank.com",
    nodalOfficer: "gm.grievance@canarabank.com",
    principalNodalOfficer: "gm.grievance@canarabank.com",
    hasSeparatePNO: false,
    escalationPage: "https://canarabank.com/nodal-officer",
    verifiedAt: "2026-05-19",
    needsReverification: true,
  },

  "Punjab National Bank": {
    grievance: "complaints@pnb.co.in",
    nodalOfficer: "nodal.officer@pnb.co.in",
    principalNodalOfficer: "nodal.officer@pnb.co.in",
    hasSeparatePNO: false,
    escalationPage: "https://www.pnbindia.in/help-complaint.html",
    verifiedAt: "2026-05-19",
    needsReverification: true,
  },

  "IDFC FIRST Bank": {
    grievance: "care@idfcfirstbank.com",
    nodalOfficer: "nodalofficer@idfcfirstbank.com",
    principalNodalOfficer: "nodalofficer@idfcfirstbank.com",
    hasSeparatePNO: false,
    escalationPage: "https://www.idfcfirstbank.com/personal-banking/banking-services/grievance-redressal",
    verifiedAt: "2026-05-19",
    needsReverification: true,
  },

  "Yes Bank": {
    grievance: "customercare@yesbank.in",
    nodalOfficer: "nodaloffice@yesbank.in",
    principalNodalOfficer: "nodaloffice@yesbank.in",
    hasSeparatePNO: false,
    escalationPage: "https://www.yesbank.in/misc/nodal-officer",
    verifiedAt: "2026-05-19",
    needsReverification: true,
  },

  "Federal Bank": {
    grievance: "grievance@federalbank.co.in",
    nodalOfficer: "nodaloffice@federalbank.co.in",
    principalNodalOfficer: "nodaloffice@federalbank.co.in",
    hasSeparatePNO: false,
    escalationPage: "https://www.federalbank.co.in/customer-service-channel",
    verifiedAt: "2026-05-19",
    needsReverification: true,
  },

  "Union Bank of India": {
    grievance: "complaints@unionbankofindia.com",
    nodalOfficer: "nodalofficer@unionbankofindia.com",
    principalNodalOfficer: "nodalofficer@unionbankofindia.com",
    hasSeparatePNO: false,
    escalationPage: "https://www.unionbankofindia.co.in/english/nodal_office.aspx",
    verifiedAt: "2026-05-19",
    needsReverification: true,
  },

  "IndusInd Bank": {
    grievance: "induscare@indusind.com",
    nodalOfficer: "nodal.officer@indusind.com",
    principalNodalOfficer: "nodal.officer@indusind.com",
    hasSeparatePNO: false,
    escalationPage: "https://www.indusind.com/in/en/personal/contact-us/escalation-matrix.html",
    verifiedAt: "2026-05-19",
    needsReverification: true,
  },

  "AU Small Finance Bank": {
    grievance: "care@aubank.in",
    nodalOfficer: "nodalofficer@aubank.in",
    principalNodalOfficer: "nodalofficer@aubank.in",
    hasSeparatePNO: false,
    escalationPage: "https://www.aubank.in/grievance-redressal",
    verifiedAt: "2026-05-19",
    needsReverification: true,
  },

  "My bank isn't listed": {
    // Fallback for unlisted banks — routes to RBI's published nodal officer list
    grievance: "", // User must look up manually
    nodalOfficer: "", // User must look up manually
    principalNodalOfficer: "",
    hasSeparatePNO: false,
    escalationPage: "https://rbi.org.in/Scripts/bs_viewcontent.aspx?Id=3565",
    verifiedAt: "2026-05-19",
    needsReverification: false,
  },

}) as Record<string, BankEscalationContacts>;

// ─────────────────────────────────────────────────────────────────────────────
// ESCALATION STAGE CLASSIFIER
// Deterministic. Never AI. Maps day count to institutional escalation level.
// ─────────────────────────────────────────────────────────────────────────────

export function classifyEscalationStage(dayCount: number): EscalationStage {
  if (dayCount <= 7)  return "GRIEVANCE";
  if (dayCount <= 14) return "NODAL_OFFICER";
  if (dayCount <= 29) return "PRINCIPAL_NODAL";
  return "OMBUDSMAN";
}

// ─────────────────────────────────────────────────────────────────────────────
// ESCALATION ROUTING FUNCTION
// Returns TO, CC, and stage metadata for a given bank + day count.
// Ombudsman stage returns empty email — the CTA is a portal link, not email.
// ─────────────────────────────────────────────────────────────────────────────

export function getEscalationRouting(
  bankName: string,
  dayCount: number
): EscalationRouting {
  const stage = classifyEscalationStage(dayCount);
  const bank = BANK_ESCALATIONS[bankName];

  // Unlisted bank or Ombudsman stage — no email routing
  if (!bank || stage === "OMBUDSMAN") {
    return {
      stage,
      to: "",
      cc: [],
      escalationPage: bank?.escalationPage ?? "https://cms.rbi.org.in",
      needsReverification: bank?.needsReverification ?? false,
    };
  }

  // Unlisted bank — user must find contacts manually
  if (!bank.grievance && !bank.nodalOfficer) {
    return {
      stage,
      to: "",
      cc: [],
      escalationPage: bank.escalationPage,
      needsReverification: false,
    };
  }

  switch (stage) {
    case "GRIEVANCE":
      return {
        stage,
        to: bank.grievance,
        cc: [],
        escalationPage: bank.escalationPage,
        needsReverification: bank.needsReverification,
      };

    case "NODAL_OFFICER":
      return {
        stage,
        to: bank.nodalOfficer,
        cc: [bank.grievance].filter(Boolean),
        escalationPage: bank.escalationPage,
        needsReverification: bank.needsReverification,
      };

    case "PRINCIPAL_NODAL":
      return {
        stage,
        to: bank.principalNodalOfficer,
        cc: [bank.nodalOfficer, bank.grievance]
          .filter(Boolean)
          .filter((v, i, a) => a.indexOf(v) === i), // deduplicate if PNO = Nodal
        escalationPage: bank.escalationPage,
        needsReverification: bank.needsReverification,
      };

    default:
      return {
        stage: "GRIEVANCE",
        to: bank.grievance,
        cc: [],
        escalationPage: bank.escalationPage,
        needsReverification: bank.needsReverification,
      };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ESCALATION STAGE LABELS (for UI display)
// ─────────────────────────────────────────────────────────────────────────────

export const ESCALATION_STAGE_LABELS: Record<EscalationStage, string> = {
  GRIEVANCE: "Grievance Redressal",
  NODAL_OFFICER: "Nodal Officer",
  PRINCIPAL_NODAL: "Principal Nodal Officer",
  OMBUDSMAN: "RBI Ombudsman",
};

export const ESCALATION_STAGE_DESCRIPTIONS: Record<EscalationStage, string> = {
  GRIEVANCE:
    "Your bank is still within its RBI-mandated 7-working-day window. A formal grievance email creates a documented paper trail for future escalation.",
  NODAL_OFFICER:
    "Your bank has exceeded the RBI mandate. Escalation to the Nodal Officer — the bank's designated regulatory contact — is now appropriate and carries procedural weight.",
  PRINCIPAL_NODAL:
    "Your dispute is significantly overdue. Escalation to the Principal Nodal Officer signals compliance-level urgency inside the bank and strengthens any future Ombudsman case.",
  OMBUDSMAN:
    "After 30 calendar days without resolution, you are eligible to file with the RBI Integrated Ombudsman at cms.rbi.org.in. This is external regulatory escalation — outside the bank, binding on the bank, free to file.",
};
