"use client";

import Link from "next/link";
import {useEffect, useMemo, useState, CSSProperties} from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type UserRole = "admin" | "manager" | "staff";

type ProfileRow = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  is_active: boolean;
  hourly_rate: number;
  tax_rate: number;
};

function formatKRW(n: number) {
  try {
    return new Intl.NumberFormat("ko-KR").format(n) + "원";
  } catch {
    return `${n}원`;
  }
}

export default function UsersAdminPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [loading, setLoading] = useState(true);
  const [meRole, setMeRole] = useState<UserRole | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [rows, setRows] = useState<ProfileRow[]>([]);

  async function load() {
    setLoading(true);
    setMsg(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) {
      location.href = "/login?next=/dashboard/admin/users";
      return;
    }

    const { data: myProfile, error: myErr } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (myErr) {
      setMsg(myErr.message);
      setLoading(false);
      return;
    }

    const role = (myProfile as any)?.role as UserRole | undefined;
    setMeRole(role ?? "staff");

    if (!role || (role !== "admin" && role !== "manager")) {
      setRows([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id,email,name,role,is_active,hourly_rate,tax_rate")
      .order("role", { ascending: true })
      .order("email", { ascending: true });

    if (error) setMsg(error.message);
    setRows((data as ProfileRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function updateRow(id: string, patch: Partial<ProfileRow>) {
    setMsg(null);
    const { error } = await supabase.from("profiles").update(patch).eq("id", id);
    if (error) {
      setMsg(error.message);
      return;
    }
    await load();
  }

  function editComp(row: ProfileRow) {
    const name = prompt("이름(빈칸이면 유지)", row.name ?? "");
    if (name === null) return;

    const hourly = prompt("시급(숫자)", String(row.hourly_rate ?? 0));
    if (hourly === null) return;

    const tax = prompt("세율(예: 0.033)", String(row.tax_rate ?? 0.033));
    if (tax === null) return;

    const role = prompt("권한(admin/manager/staff)", row.role);
    if (role === null) return;

    const roleClean = role.trim() as UserRole;
    if (!["admin", "manager", "staff"].includes(roleClean)) {
      alert("권한은 admin/manager/staff 중 하나여야 합니다.");
      return;
    }

    updateRow(row.id, {
      name: name.trim() || null,
      hourly_rate: Number(hourly),
      tax_rate: Number(tax),
      role: roleClean,
    });
  }

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "22px 16px 40px" }}>
      <TopBar title="직원 관리" />

      {loading ? (
        <Card>불러오는 중…</Card>
      ) : !meRole || (meRole !== "admin" && meRole !== "manager") ? (
        <Card>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>접근 권한이 없습니다.</div>
          <div style={{ fontSize: 14, opacity: 0.75 }}>이 메뉴는 관리자/매니저만 사용할 수 있습니다.</div>
        </Card>
      ) : (
        <>
          {msg ? (
            <Card>
              <div style={{ fontSize: 13, color: "crimson" }}>{msg}</div>
            </Card>
          ) : null}

          <div style={{ marginTop: 14 }}>
            <SectionTitle title={`직원 목록 (${rows.length})`} />
            <Card>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead>
                    <tr style={{ textAlign: "left", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                      <th style={{ padding: "10px 8px" }}>이름</th>
                      <th style={{ padding: "10px 8px" }}>이메일</th>
                      <th style={{ padding: "10px 8px" }}>권한</th>
                      <th style={{ padding: "10px 8px" }}>활성</th>
                      <th style={{ padding: "10px 8px" }}>시급</th>
                      <th style={{ padding: "10px 8px" }}>세율</th>
                      <th style={{ padding: "10px 8px" }} />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                        <td style={{ padding: "10px 8px", whiteSpace: "nowrap" }}>{r.name ?? ""}</td>
                        <td style={{ padding: "10px 8px", whiteSpace: "nowrap" }}>{r.email}</td>
                        <td style={{ padding: "10px 8px" }}>{r.role}</td>
                        <td style={{ padding: "10px 8px" }}>
                          <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                            <input
                              type="checkbox"
                              checked={!!r.is_active}
                              onChange={(e) => updateRow(r.id, { is_active: e.target.checked })}
                            />
                            {r.is_active ? "ON" : "OFF"}
                          </label>
                        </td>
                        <td style={{ padding: "10px 8px", whiteSpace: "nowrap" }}>
                          {r.hourly_rate ? formatKRW(r.hourly_rate) : "0원"}
                        </td>
                        <td style={{ padding: "10px 8px", whiteSpace: "nowrap" }}>{r.tax_rate}</td>
                        <td style={{ padding: "10px 8px", whiteSpace: "nowrap" }}>
                          <button onClick={() => editComp(r)} style={btnTiny}>
                            편집
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
        <Link href="/dashboard/admin/approvals" style={linkBtn}>
          승인
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

const btnTiny: CSSProperties = {
  padding: "6px 10px",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.14)",
  background: "white",
  cursor: "pointer",
  fontSize: 12,
};
