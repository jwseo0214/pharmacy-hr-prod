import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  const url = new URL(req.url);
  url.pathname = "/login";
  url.search = "";

  return NextResponse.redirect(url);
}
