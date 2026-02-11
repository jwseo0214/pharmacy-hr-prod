"use client";

import Link from "next/link";
import {useEffect, useMemo, useState, CSSProperties} from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type WorkStatus = "draft" | "submitted" | "approved" | "rejected";

type WorkLog = {
  id: string;
  user_id: string;
  work_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM:SS or HH:MM
  end_time: string;
  break_minutes: number;
  note: string | null;
  status: WorkStatus;
  approved_at?: string | null;
  approved_by?: string | null;
  reject_reason?: string | null;
  created_at?: string;
};

function todayYMD() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function WorkLogsPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [loading, setLoading] = useState(true);
  const [meId, setMeId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [editing, setEditing] = useState<WorkLog | null>(null);

  // form
  const [workDate, setWorkDate] = useState(todayYMD());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [breakMinutes, setBreakMinutes] = useState(60);
  const [note, setNote] = useState("");

  async function load() {
    setLoading(true);
    setMsg(null);

    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr) {
      setMsg(sessionErr.message);
      setLoading(false);
      return;
    }
    const user = sessionData.session?.user;
    if (!user) {
      location.href = "/login?next=/dashboard/work-logs";
      return;
    }
    setMeId(user.id);

    const { data, error } = await supabase
      .from("work_logs")
      .select("id,user_id,work_date,start_time,end_time,break_minutes,note,status,approved_at,approved_by,reject_reason,created_at")
      .eq("user_id", user.id)
      .order("work_date", { ascending: false })
      .order("start_time", { ascending: false });

    if (error) setMsg(error.message);
    setLogs((data as WorkLog[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetForm() {
    setEditing(null);
    setWorkDate(todayYMD());
    setStartTime("09:00");
    setEndTime("18:00");
    setBreakMinutes(60);
    setNote("");
  }

  function canEditStatus(status: WorkStatus) {
    // 직원은 draft/rejected만 수정 가능하게(정책은 RLS에서도 보장)
    return status === "draft" || status === "rejected";
  }

  async function upsertDraft() {
    setMsg(null);
    if (!meId) return;

    if (!workDate || !startTime || !endTime) {
      setMsg("날짜/시간을 입력하세요.");
      return;
    }

    const payload: any = {
      user_id: meId,
      work_date: workDate,
      start_time: startTime,
      end_time: endTime,
      break_minutes: Number.isFinite(breakMinutes) ? breakMinutes : 0,
      note: note.trim() || null,
      status: "draft" as WorkStatus,
    };

    let res;
    if (editing) {
      if (!canEditStatus(editing.status)) {
        setMsg("제출/승인된 기록은 수정할 수 없습니다.");
        return;
      }
      res = await supabase.from("work_logs").update(payload).eq("id", editing.id);
    } else {
      res = await supabase.from("work_logs").insert(payload);
    }

    if (res.error) {
      setMsg(res.error.message);
      return;
    }

    resetForm();
    await load();
  }

  async function submitLog(log: WorkLog) {
    setMsg(null);
    if (!canEditStatus(log.status)) {
      setMsg("이미 제출/승인된 기록입니다.");
      return;
    }
    const { error } = await supabase
      .from("work_logs")
      .update({ status: "submitted" })
      .eq("id", log.id);

    if (error) {
      setMsg(error.message);
      return;
    }
    await load();
  }

  async function deleteLog(log: WorkLog) {
    setMsg(null);
    if (!canEditStatus(log.status)) {
      setMsg("제출/승인된 기록은 삭제할 수 없습니다.");
      return;
    }
    const ok = confirm("이 기록을 삭제할까요?");
    if (!ok) return;

    const { error } = await supabase.from("work_logs").delete().eq("id", log.id);
    if (error) {
      setMsg(error.message);
      return;
    }
    await load();
  }

  function startEdit(log: WorkLog) {
    setMsg(null);
    if (!canEditStatus(log.status)) {
      setMsg("제출/승인된 기록은 수정할 수 없습니다.");
      return;
    }
    setEditing(log);
    setWorkDate(log.work_date);
    setStartTime((log.start_time || "").slice(0, 5));
    setEndTime((log.end_time || "").slice(0, 5));
    setBreakMinutes(log.break_minutes ?? 0);
    setNote(log.note ?? "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "22px 16px 40px" }}>
      <TopBar title="근무기록" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 14 }}>
        <div style={{ gridColumn: "span 12" }}>
          <Card>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{editing ? "근무기록 수정" : "근무기록 작성"}</div>
                <div style={{ marginTop: 6, fontSize: 13, opacity: 0.75 }}>
                  저장하면 <b>draft</b>로 남고, 제출하면 관리자 승인 대상이 됩니다.
                </div>
              </div>
              {editing ? (
                <button onClick={resetForm} style={btnSecondary}>
                  작성 모드로
                </button>
              ) : null}
            </div>

            <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 12 }}>
              <Field label="근무일자" col={3}>
                <input type="date" value={workDate} onChange={(e) => setWorkDate(e.target.value)} style={inputStyle} />
              </Field>

              <Field label="출근" col={3}>
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={inputStyle} />
              </Field>

              <Field label="퇴근" col={3}>
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} style={inputStyle} />
              </Field>

              <Field label="휴게(분)" col={3}>
                <input
                  type="number"
                  min={0}
                  value={breakMinutes}
                  onChange={(e) => setBreakMinutes(Number(e.target.value))}
                  style={inputStyle}
                />
              </Field>

              <Field label="메모" col={12}>
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="예: 야간 근무 / 연장 등" style={inputStyle} />
              </Field>

              <div style={{ gridColumn: "span 12", display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button onClick={upsertDraft} style={btnPrimary}>
                  {editing ? "수정 저장(draft)" : "저장(draft)"}
                </button>
              </div>

              {msg ? (
                <div style={{ gridColumn: "span 12", fontSize: 13, color: "crimson" }}>{msg}</div>
              ) : null}
            </div>
          </Card>
        </div>

        <div style={{ gridColumn: "span 12" }}>
          <SectionTitle title="내 근무기록" />
        </div>

        <div style={{ gridColumn: "span 12" }}>
          <Card>
            {loading ? (
              <div style={{ fontSize: 14, opacity: 0.75 }}>불러오는 중…</div>
            ) : logs.length === 0 ? (
              <div style={{ fontSize: 14, opacity: 0.75 }}>아직 기록이 없습니다.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead>
                    <tr style={{ textAlign: "left", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                      <th style={{ padding: "10px 8px" }}>일자</th>
                      <th style={{ padding: "10px 8px" }}>시간</th>
                      <th style={{ padding: "10px 8px" }}>휴게</th>
                      <th style={{ padding: "10px 8px" }}>상태</th>
                      <th style={{ padding: "10px 8px" }}>메모</th>
                      <th style={{ padding: "10px 8px" }} />
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
                        <td style={{ padding: "10px 8px" }}>
                          <StatusPill status={l.status} />
                          {l.status === "rejected" && l.reject_reason ? (
                            <div style={{ marginTop: 6, fontSize: 12, color: "crimson" }}>반려: {l.reject_reason}</div>
                          ) : null}
                        </td>
                        <td style={{ padding: "10px 8px", maxWidth: 360 }}>
                          <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.note ?? ""}</div>
                        </td>
                        <td style={{ padding: "10px 8px", whiteSpace: "nowrap" }}>
                          <button onClick={() => startEdit(l)} style={btnTiny} disabled={!canEditStatus(l.status)}>
                            수정
                          </button>{" "}
                          <button onClick={() => submitLog(l)} style={btnTiny} disabled={!canEditStatus(l.status)}>
                            제출
                          </button>{" "}
                          <button onClick={() => deleteLog(l)} style={btnTinyDanger} disabled={!canEditStatus(l.status)}>
                            삭제
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
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

function Field({ label, col, children }: { label: string; col: number; children: React.ReactNode }) {
  return (
    <div style={{ gridColumn: `span ${col}` as any }}>
      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

function StatusPill({ status }: { status: WorkStatus }) {
  const meta: Record<WorkStatus, { text: string; bg: string; bd: string; color: string }> = {
    draft: { text: "draft", bg: "rgba(0,0,0,0.03)", bd: "rgba(0,0,0,0.12)", color: "rgba(0,0,0,0.85)" },
    submitted: { text: "제출", bg: "rgba(0,90,255,0.06)", bd: "rgba(0,90,255,0.22)", color: "rgb(0,90,255)" },
    approved: { text: "승인", bg: "rgba(0,160,90,0.08)", bd: "rgba(0,160,90,0.24)", color: "rgb(0,140,80)" },
    rejected: { text: "반려", bg: "rgba(220,20,60,0.07)", bd: "rgba(220,20,60,0.26)", color: "crimson" },
  };
  const m = meta[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 10px",
        borderRadius: 999,
        border: `1px solid ${m.bd}`,
        background: m.bg,
        color: m.color,
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {m.text}
    </span>
  );
}

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.14)",
  outline: "none",
  fontSize: 14,
};

const btnPrimary: CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.14)",
  background: "black",
  color: "white",
  cursor: "pointer",
  fontSize: 14,
};

const btnSecondary: CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.14)",
  background: "white",
  cursor: "pointer",
  fontSize: 14,
};

const btnTiny: CSSProperties = {
  padding: "6px 10px",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.14)",
  background: "white",
  cursor: "pointer",
  fontSize: 12,
};

const btnTinyDanger: CSSProperties = {
  ...btnTiny,
  border: "1px solid rgba(220,20,60,0.35)",
  color: "crimson",
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
