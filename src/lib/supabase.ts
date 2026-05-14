// src/lib/supabase.ts
// Supabase client for NAVDIS session analytics
// Uses anon key with INSERT-only RLS policy — no PII stored

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase env vars not set — session logging disabled");
}

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;
// ─────────────────────────────────────────────────────────────────────────────
// SESSION LOGGER — called when the exit survey is answered
// Writes one anonymised row per completed session
// ─────────────────────────────────────────────────────────────────────────────

export interface SessionPayload {
  bank: string;
  failure_type: string;
  window_status: string;
  day_count: number;
  pre_question_answer: "yes" | "no" | "not_sure" | "skipped";
  post_question_answer: "yes" | "not_yet";
}

export async function logSession(payload: SessionPayload): Promise<void> {
  if (!supabase) return; // graceful no-op if env vars not set

  try {
    const { error } = await supabase
      .from("comprehension_sessions")
      .insert([payload]);

    if (error) {
      // Silent failure — never break the UI for analytics errors
      console.warn("Session log failed:", error.message);
    }
  } catch (e) {
    console.warn("Session log error:", e);
  }
}
