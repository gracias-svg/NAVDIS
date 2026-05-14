// src/lib/supabase.ts
// Supabase client for NAVDIS Comprehension Lift session analytics
//
// NOTE: The anon key and URL are intentionally hardcoded here.
// The anon key is a public-facing read/insert key with RLS (INSERT-only policy).
// This is the standard Supabase pattern for frontend apps.
// No PII is stored. No user data. DPDP compliant.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://zfjdchafflmzlulvfxjo.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmamRjaGFmZmxtemx1bHZmeGpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MzcyNDksImV4cCI6MjA5NDMxMzI0OX0.xNuIxe8HEOL2DCOUBW6oCTJjCBlYXHmxfb_Ezt2TBy0";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─────────────────────────────────────────────────────────────────────────────
// SESSION LOGGER — one anonymised row per completed session
// Called when user answers the exit survey in Screen6
// ─────────────────────────────────────────────────────────────────────────────

export type PreQuestionAnswer = "yes" | "no" | "not_sure" | "skipped";
export type PostQuestionAnswer = "yes" | "not_yet";

export interface SessionPayload {
  bank: string;
  failure_type: string;
  window_status: string;
  day_count: number;
  pre_question_answer: PreQuestionAnswer;
  post_question_answer: PostQuestionAnswer;
}

export async function logSession(payload: SessionPayload): Promise<void> {
  try {
    const { error } = await supabase
      .from("comprehension_sessions")
      .insert([payload]);

    if (error) {
      // Silent failure — analytics must never break the UI
      console.warn("NAVDIS session log failed:", error.message);
    }
  } catch (e) {
    // Network or other error — still silent
    console.warn("NAVDIS session log error:", e);
  }
}
