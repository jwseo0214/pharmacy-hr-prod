import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type InviteBody = {
  email: string;
  name?: string;
  role?: "admin" | "manager" | "staff";
};

export async function POST(req: Request) {
  try {
    // 1) 입력 파싱
    const body = (await req.json()) as InviteBody;
    const email = (body.email || "").trim().toLowerCase();
    const name = (body.name || "").trim();
    const role = body.role ?? "staff";

    if (!email) {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }
    if (!["admin", "manager", "staff"].includes(role)) {
      return NextResponse.json({ error: "invalid role" }, { status: 400 });
    }

    // 2) Supabase Auth 초대(서비스 롤)
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/login`,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // 3) profiles 업데이트 (트리거로 기본 staff는 생성되지만, name/role은 여기서 덮어씀)
    if (data?.user?.id) {
      const updates: Record<string, any> = { email };
      if (name) updates.name = name;
      if (role) updates.role = role;

      const { error: upErr } = await supabaseAdmin
        .from("profiles")
        .update(updates)
        .eq("id", data.user.id);

      if (upErr) {
        // 초대는 성공했는데 프로필 업데이트가 실패한 경우 (운영자에게 원인만 알려줌)
        return NextResponse.json(
          { ok: true, warning: "invited, but profile update failed", detail: upErr.message },
          { status: 200 }
        );
      }
    }

    return NextResponse.json({ ok: true, user: data.user }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
