"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginForm({ nextPath }: { nextPath?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    setLoading(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    router.replace(nextPath || "/dashboard");
  }

  async function sendReset() {
    setMsg(null);
    const clean = email.trim().toLowerCase();
    if (!clean) {
      setMsg("비밀번호 재설정 메일을 받으려면 이메일을 먼저 입력하세요.");
      return;
    }

    const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset`;

    const { error } = await supabase.auth.resetPasswordForEmail(clean, { redirectTo });

    if (error) {
      setMsg(error.message);
      return;
    }

    setMsg("비밀번호 재설정 메일을 보냈습니다. 메일함을 확인하세요.");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Input
        placeholder="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
      />
      <Input
        placeholder="password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
      />
      {msg && <p className="text-sm text-red-600">{msg}</p>}

      <Button className="w-full" disabled={loading}>
        {loading ? "로그인 중..." : "로그인"}
      </Button>

      <button
        type="button"
        onClick={sendReset}
        className="w-full text-sm underline opacity-80 hover:opacity-100"
      >
        비밀번호 재설정 메일 보내기
      </button>
    </form>
  );
}
