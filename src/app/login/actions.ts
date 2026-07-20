"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAllowedUserEmail } from "@/lib/supabase/env";

export interface LoginState {
  error: string | null;
}

// §11 — Supabase Auth email+password, with a server-side allow-list check.
// Any successful auth for a different email is immediately signed back out.
export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  const allowed = getAllowedUserEmail().toLowerCase();
  if (!data.user || data.user.email?.toLowerCase() !== allowed) {
    await supabase.auth.signOut();
    return { error: "This account is not allowed to use Scoutbase." };
  }

  redirect("/today");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
