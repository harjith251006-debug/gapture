import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Handles both the Google OAuth redirect and the email-confirmation link
 * from sign-up — both send the user here with a `code` param to exchange
 * for a session (Supabase Auth's PKCE flow).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error(
      JSON.stringify({ level: "error", component: "auth/callback", error: error.message }),
    );
  }

  return NextResponse.redirect(`${origin}/sign-in?error=auth_callback_failed`);
}
