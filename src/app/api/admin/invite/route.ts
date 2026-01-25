import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const supabase = createSupabaseServerClient();

  // 1) 로그인 확인
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 2) role 확인 (profiles는 RLS 적용 중)
  const { data: me, error: meErr } = await supabase
    .from("profiles")
    .select("role,is_active")
    .eq("id", userData.user.id)
    .single();

  if (meErr || !me?.is_active) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (me.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  // 3) 요청 바디
  const body = await req.json();
  const email = String(body.email || "").trim();
  const name = String(body.name || "").trim();
  const role = (body.role ?? "staff") as "admin" | "manager" | "staff";

  if (!email || !name) return NextResponse.json({ error: "email/name required" }, { status: 400 });
  if (!["admin", "manager", "staff"].includes(role)) {
    return NextResponse.json({ error: "invalid role" }, { status: 400 });
  }

  // 4) 초대 메일 발송
  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/login`,
  });

  if (error || !data.user) {
    return NextResponse.json({ error: error?.message ?? "invite failed" }, { status: 400 });
  }

  // 5) profiles upsert (NOT NULL 컬럼 때문에 미리 생성)
  const { error: upsertErr } = await supabaseAdmin
    .from("profiles")
    .upsert(
      { id: data.user.id, email, name, role, is_active: true },
      { onConflict: "id" }
    );

  if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, userId: data.user.id });
}
