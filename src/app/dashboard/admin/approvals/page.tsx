"use client";

import Link from "next/link";
import {useEffect, useMemo, useState, CSSProperties} from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type UserRole = "admin" | "manager" | "staff";
type WorkStatus = "draft" | "submitted" | "approved" | "rejected";

type Profile = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
};

type WorkLog = {
  id: string;
  user_id: string;
  work_date: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  note: string | null;
  status: WorkStatus;
  created_at?: string;
};

export default function ApprovalsPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<{ id: string; role: UserRole } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [users, setUsers] = useState<Record<string, Profile>>({});

  async function load() {
    setLoading(true);
    setMsg(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) {
      location.href = "/login?next=/dashboard/admin/approvals";
      return;
    }

    // 내 role 확인
    const { data: meProfile, error: meErr } = await supabase
      .from("profiles")
      .select("id,role")
      .eq("id", user.id)
      .maybeSingle();

    if (meErr) {
      setMsg(meErr.message);
      setLoading(false);
      return;
    }

    const role = (meProfile as any)?.role as UserRole | undefined;
    if (!role || (role !== "admin" && role !== "manager")) {
      setMe({ id: user.id, role: (role ?? "staff") as UserRole });
      setLoading(false);
      return;
    }
    setMe({ id: user.id, role });

    // 제출된 work_logs
    const { data: submitted, error: logsErr } = await supabase
      .from("work_logs")
      .select("id,user_id,work_date,start_time,end_time,break_minutes,note,status,created_at")
      .eq("status", "submitted")
      .order("work_date", { ascending: false })
      .order("start_time", { ascending: false });

    if (logsErr) {
      setMsg(logsErr.message);
      setLogs([]);
      setLoading(false);
      return;
    }

    const list = (submitted as WorkLog[]) ?? [];
    setLogs(list);

    // 관련 유저 프로필(이름/이메일)
    const userIds = Array.from(new Set(list.map((l) => l.user_id)));
    if (userIds.length) {
      const { data: profs, error: profErr } = await supabase
        .from("profiles")
        .select("id,email,name,role")
        .in("id", userIds);

      if (profErr) {
        setMsg(profErr.message);
      } else {
        const map: Record<string, Profile> = {};
        (profs as Profile[]).forEach((p) => (map[p.id] = p));
        setUsers(map);
      }
    } else {
      setUsers({});
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function approve(id: string) {
    setMsg(null);
    if (!me) return;

    const { error } = await supabase
      .from("work_logs")
      .update({ status: "approved", approved_at: new Date().toISOString(), approved_by: me.id, reject_reason: null })
      .eq("id", id);

    if (error) {
      setMsg(error.message);
      return;
    }
    await load();
  }

  async function reject(id: string) {
    setMsg(null);
    if (!me) return;

    const reason = prompt("반려 사유를 입력하세요(선택)");
    const { error } = await supabase
      .from("work_logs")
      .update({ status: "rejected", approved_at: null, approved_by: me.id, reject_reason: reason?.trim() || null })
      .eq("id", id);

    if (error) {
      setMsg(error.message);
      return;
    }
    await load();
  }

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "22px 16px 40px" }}>
      <TopBar title="근무 승인" />

      {loading ? (
        <Card>
          <div style={{ fontSize: 14, opacity: 0.75 }}>불러오는 중…</div>
        </Card>
      ) : !me || (me.role !== "admin" && me.role !== "manager") ? (
        <Card>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>접근 권한이 없습니다.</div>
          <div style={{ fontSize: 14, opacity: 0.75 }}>
            이 메뉴는 <b>관리자/매니저</b>만 사용할 수 있습니다.
          </div>
        </Card>
      ) : (
        <>
          {msg ? (
            <Card>
              <div style={{ fontSize: 13, color: "crimson" }}>{msg}</div>
            </Card>
          ) : null}

          <div style={{ marginTop: 14 }}>
            <SectionTitle title={`제출 대기 (${logs.length})`} />
            <Card>
              {logs.length === 0 ? (
                <div style={{ fontSize: 14, opacity: 0.75 }}>제출된 기록이 없습니다.</div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                    <thead>
                      <tr style={{ textAlign: "left", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                        <th style={{ padding: "10px 8px" }}>직원</th>
                        <th style={{ padding: "10px 8px" }}>일자</th>
                        <th style={{ padding: "10px 8px" }}>시간</th>
                        <th style={{ padding: "10px 8px" }}>휴게</th>
                        <th style={{ padding: "10px 8px" }}>메모</th>
                        <th style={{ padding: "10px 8px" }} />
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((l) => {
                        const p = users[l.user_id];
                        const who = p?.name || p?.email || l.user_id;
                        return (
                          <tr key={l.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                            <td style={{ padding: "10px 8px", whiteSpace: "nowrap" }}>{who}</td>
                            <td style={{ padding: "10px 8px", whiteSpace: "nowrap" }}>{l.work_date}</td>
                            <td style={{ padding: "10px 8px", whiteSpace: "nowrap" }}>
                              {(l.start_time || "").slice(0, 5)} ~ {(l.end_time || "").slice(0, 5)}
                            </td>
                            <td style={{ padding: "10px 8px" }}>{l.break_minutes ?? 0}분</td>
                            <td style={{ padding: "10px 8px", maxWidth: 360 }}>
                              <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {l.note ?? ""}
                              </div>
                            </td>
                            <td style={{ padding: "10px 8px", whiteSpace: "nowrap" }}>
                              <button style={btnTinyPrimary} onClick={() => approve(l.id)}>
                                승인
                              </button>{" "}
                              <button style={btnTinyDanger} onClick={() => reject(l.id)}>
                                반려
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </>
      )}

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

const linkBtn: CSSProperties = {
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.12)",
  background: "white",
  textDecoration: "none",
  color: "inherit",
  fontSize: 13,
};

const btnTinyPrimary: CSSProperties = {
  padding: "6px 10px",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.14)",
  background: "black",
  color: "white",
  cursor: "pointer",
  fontSize: 12,
};

const btnTinyDanger: CSSProperties = {
  padding: "6px 10px",
  borderRadius: 10,
  border: "1px solid rgba(220,20,60,0.35)",
  background: "white",
  color: "crimson",
  cursor: "pointer",
  fontSize: 12,
};
