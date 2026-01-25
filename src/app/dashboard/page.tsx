"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const supabase = createSupabaseBrowserClient();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setErr(null);

      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) {
        setErr(userErr?.message ?? "No user session");
        setLoading(false);
        return;
      }

      setEmail(userData.user.email ?? null);

      const { data: p, error: pErr } = await supabase
        .from("profiles")
        .select("id,email,name,role,is_active,hourly_rate,tax_rate")
        .eq("id", userData.user.id)
        .single();

      if (pErr) setErr(pErr.message);
      else setProfile(p);

      setLoading(false);
    };

    run();
  }, []);

  return (
    <div className="p-6 space-y-4">
      {/* 로그아웃 버튼 */}
      <Button
        onClick={async () => {
          await supabase.auth.signOut();
          window.location.href = "/login";
        }}
      >
        로그아웃
      </Button>

      <h1 className="text-xl font-semibold">대시보드</h1>

      {loading ? (
        <p>로딩 중...</p>
      ) : err ? (
        <p className="text-sm text-red-600">오류: {err}</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">로그인: {email}</p>
          <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto">
            {JSON.stringify(profile, null, 2)}
          </pre>
        </>
      )}
    </div>
  );
}
