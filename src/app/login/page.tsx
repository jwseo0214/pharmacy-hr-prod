"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const supabase = createSupabaseBrowserClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    setLoading(true);
    setMsg(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (error) setMsg(error.message);
    else window.location.href = "/dashboard";
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>약국 근태/급여 시스템 로그인</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="이메일" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input
            placeholder="비밀번호"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {msg && <p className="text-sm text-red-600">{msg}</p>}
          <Button className="w-full" onClick={onLogin} disabled={loading}>
            {loading ? "로그인 중..." : "로그인"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
