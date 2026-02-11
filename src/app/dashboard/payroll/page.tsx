"use client";

import Link from "next/link";
import {useEffect, useMemo, useState, CSSProperties} from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Profile = {
  id: string;
  hourly_rate: number;
  tax_rate: number;
  role: "admin" | "manager" | "staff";
};

type WorkLog = {
  id: string;
  work_date: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  status: "draft" | "submitted" | "approved" | "rejected";
};

function parseHM(t: string) {
  const s = (t || "").slice(0, 5);
  const [hh, mm] = s.split(":").map((x) => Number(x));
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  return hh * 60 + mm;
}

function minutesToHHMM(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}시간 ${m}분`;
}

function formatKRW(n: number) {
  try {
    return new Intl.NumberFormat("ko-KR").format(Math.round(n)) + "원";
  } catch {
    return `${Math.round(n)}원`;
  }
}

export default function PayrollPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [logs, setLogs] = useState<WorkLog[]>([]);

  // 최근 30일(간단 버전)
  const [days, setDays] = useState(30);

  async function load() {
    setLoading(true);
    setMsg(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) {
      location.href = "/login?next=/dashboard/payroll";
      return;
    }

    const { data: p, error: pErr } = await supabase
      .from("profiles")
      .select("id,hourly_rate,tax_rate,role")
      .eq("id", user.id)
      .maybeSingle();

    if (pErr) {
      setMsg(pErr.message);
      setLoading(false);
      return;
    }
    setProfile(p as any);

    const from = new Date();
    from.setDate(from.getDate() - days);
    const y = from.getFullYear();
    const m = String(from.getMonth() + 1).padStart(2, "0");
    const d = String(from.getDate()).padStart(2, "0");
    const fromYMD = `${y}-${m}-${d}`;

    const { data: wl, error: wlErr } = await supabase
      .from("work_logs")
      .select("id,work_date,start_time,end_time,break_minutes,status")
      .eq("status", "approved")
      .gte("work_date", fromYMD)
      .order("work_date", { ascending: false });

    if (wlErr) setMsg(wlErr.message);
    setLogs((wl as WorkLog[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const summary = useMemo(() => {
    const hourly = profile?.hourly_rate ?? 0;
    const tax = profile?.tax_rate ?? 0;

    let totalWorkMinutes = 0;

    for (const l of logs) {
      const s = parseHM(l.start_time);
      const e = parseHM(l.end_time);
      if (s == null || e == null) continue;
      const raw = e - s;
      const net = raw - (l.break_minutes ?? 0);
      if (net > 0) totalWorkMinutes += net;
    }

    const totalHours = totalWorkMinutes / 60;
    const gross = totalHours * hourly;
    const net = gross * (1 - tax);

    return { totalWorkMinutes, totalHours, gross, net, hourly, tax };
  }, [logs, profile]);

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "22px 16px 40px" }}>
      <TopBar title="급여(간단)" />

      <Card>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ fontSize: 14, opacity: 0.75 }}>조회 기간</div>
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} style={inputStyle}>
            <option value={7}>최근 7일</option>
            <option value={14}>최근 14일</option>
            <option value={30}>최근 30일</option>
            <option value={60}>최근 60일</option>
          </select>
          <div style={{ marginLeft: "auto", fontSize: 12, opacity: 0.65 }}>
            ※ 현재는 <b>승인(approved)</b>된 근무기록만 집계합니다.
          </div>
        </div>

        {msg ? <div style={{ marginTop: 10, color: "crimson", fontSize: 13 }}>{msg}</div> : null}

        {loading ? (
          <div style={{ marginTop: 12, opacity: 0.75 }}>불러오는 중…</div>
        ) : (
          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 12 }}>
            <MiniStat col={4} label="총 근무시간" value={minutesToHHMM(summary.totalWorkMinutes)} />
            <MiniStat col={4} label="시급" value={summary.hourly ? formatKRW(summary.hourly) : "미설정"} />
            <MiniStat col={4} label="세율" value={`${Math.round(summary.tax * 1000) / 10}%`} />

            <MiniStat col={6} label="예상 총급여(세전)" value={formatKRW(summary.gross)} />
            <MiniStat col={6} label="예상 실수령(단순)" value={formatKRW(summary.net)} />

            <div style={{ gridColumn: "span 12", fontSize: 12, opacity: 0.65 }}>
              * 실제 급여는 수당/공제 등으로 달라질 수 있어요. (여긴 “기본 집계” 화면)
            </div>
          </div>
        )}
      </Card>

      <div style={{ marginTop: 14 }}>
        <SectionTitle title="승인된 근무기록" />
        <Card>
          {loading ? (
            <div style={{ opacity: 0.75 }}>불러오는 중…</div>
          ) : logs.length === 0 ? (
            <div style={{ opacity: 0.75 }}>승인된 기록이 없습니다.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                    <th style={{ padding: "10px 8px" }}>일자</th>
                    <th style={{ padding: "10px 8px" }}>시간</th>
                    <th style={{ padding: "10px 8px" }}>휴게</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                      <td style={{ padding: "10px 8px", whiteSpace: "nowrap" }}>{l.work_date}</td>
                      <td style={{ padding: "10px 8px", whiteSpace: "nowrap" }}>
                        {(l.start_time || "").slice(0, 5)} ~ {(l.end_time || "").slice(0, 5)}
                      </td>
                      <td style={{ padding: "10px 8px" }}>{l.break_minutes ?? 0}분</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <div style={{ marginTop: 18, opacity: 0.7, fontSize: 13 }}>
        <Link href="/dashboard">← 대시보드로</Link>
      </div>
    </div>
  );
}

/* ---------- UI ---------- */

function TopBar({ title }: { title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
      <div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>제이팜약국</div>
        <div style={{ fontSize: 20, fontWeight: 800 }}>{title}</div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <Link href="/dashboard" style={linkBtn}>
          대시보드
        </Link>
        <Link href="/dashboard/work-logs" style={linkBtn}>
          근무기록
        </Link>
        <Link href="/logout" style={linkBtn}>
          로그아웃
        </Link>
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "white",
        border: "1px solid rgba(0,0,0,0.10)",
        borderRadius: 14,
        padding: 16,
        boxShadow: "0 6px 18px rgba(0,0,0,0.04)",
      }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <div style={{ fontSize: 16, fontWeight: 800, margin: "8px 0" }}>{title}</div>;
}

function MiniStat({ col, label, value }: { col: number; label: string; value: string }) {
  return (
    <div
      style={{
        gridColumn: `span ${col}` as any,
        border: "1px solid rgba(0,0,0,0.10)",
        borderRadius: 12,
        padding: 12,
        background: "rgba(0,0,0,0.02)",
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.7 }}>{label}</div>
      <div style={{ marginTop: 6, fontSize: 16, fontWeight: 800 }}>{value}</div>
    </div>
  );
}

const inputStyle: CSSProperties = {
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.14)",
  background: "white",
  fontSize: 14,
};

const linkBtn: CSSProperties = {
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.12)",
  background: "white",
  textDecoration: "none",
  color: "inherit",
  fontSize: 13,
};
