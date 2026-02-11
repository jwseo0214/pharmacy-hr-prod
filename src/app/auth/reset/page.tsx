"use client";

import { useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ResetPasswordPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function updatePassword() {
    setMsg(null);

    if (pw.length < 8) {
      setMsg("비밀번호는 8자 이상으로 설정하세요.");
      return;
    }
    if (pw !== pw2) {
      setMsg("비밀번호가 서로 다릅니다.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setSaving(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    setMsg("비밀번호가 설정되었습니다. 이제 로그인할 수 있어요.");
    setTimeout(() => {
      location.href = "/login";
    }, 800);
  }

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="text-xl font-bold">비밀번호 설정</h1>
      <p className="mt-2 text-sm opacity-80">
        비밀번호 재설정 메일의 링크로 들어오셨다면, 여기서 새 비밀번호를 설정할 수 있습니다.
      </p>

      <div className="mt-6 space-y-3">
        <Input
          type="password"
          placeholder="새 비밀번호 (8자 이상)"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />
        <Input
          type="password"
          placeholder="새 비밀번호 확인"
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
        />

        {msg ? <p className="text-sm text-red-600">{msg}</p> : null}

        <Button className="w-full" disabled={saving} onClick={updatePassword}>
          {saving ? "저장 중..." : "비밀번호 저장"}
        </Button>
      </div>
    </div>
  );
}
