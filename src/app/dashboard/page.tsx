"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client"; // ← 여기 경로/이름이 다르면 네 프로젝트에 맞게 수정

type UserRole = "admin" | "manager" | "staff";

type Profile = {
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

function RoleBadge({ role }: { role: UserRole }) {
  const label =
    role === "admin" ? "관리자" : role === "manager" ? "매니저" : "직원";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 999,
        border: "1px solid rgba(0,0,0,0.12)",
        fontSize: 12,
        background: "rgba(0,0,0,0.03)",
      }}
    >
      {label}
    </span>
  );
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isAdminLike = useMemo(() => {
    return profile?.role === "admin" || profile?.role === "manager";
  }, [profile?.role]);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError(null);

      // 1) 로그인 세션 확인
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (!alive) return;

      if (sessionError) {
        setError(sessionError.message);
        setLoading(false);
        return;
      }

      const user = sessionData.session?.user;
      if (!user) {
        // 로그인 안 된 상태면 로그인 페이지로 유도
        setProfile(null);
        setLoading(false);
        return;
      }

      // 2) profiles 조회
      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("id,email,name,role,is_active,hourly_rate,tax_rate")
        .eq("id", user.id)
        .maybeSingle();

      if (!alive) return;

      if (profileError) {
        setError(profileError.message);
        setLoading(false);
        return;
      }

      setProfile((data as Profile) ?? null);
      setLoading(false);
    }

    load();

    return () => {
      alive = false;
    };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    location.href = "/"; // 프로젝트에 로그인 페이지가 있으면 거기로 변경 가능
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "24px 16px 40px",
        background: "linear-gradient(180deg, rgba(0,0,0,0.02), rgba(0,0,0,0))",
      }}
    >
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 20,
          }}
        >
          <div>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
              제이팜약국
            </div>
            <h1 style={{ fontSize: 24, margin: 0, lineHeight: 1.25 }}>
              근태관리 시스템
            </h1>
            <div style={{ marginTop: 10, opacity: 0.8, fontSize: 14 }}>
              출퇴근 기록, 승인, 급여 정산까지 한 곳에서 관리합니다.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={handleLogout}
              style={{
                border: "1px solid rgba(0,0,0,0.12)",
                background: "white",
                borderRadius: 10,
                padding: "10px 12px",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              로그아웃
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <Card>
            <div style={{ fontSize: 14, opacity: 0.75 }}>불러오는 중…</div>
          </Card>
        ) : !profile ? (
          <Card>
            <div style={{ fontSize: 16, marginBottom: 8 }}>
              로그인 정보가 없습니다.
            </div>
            <div style={{ fontSize: 14, opacity: 0.75, marginBottom: 14 }}>
              먼저 로그인한 뒤 다시 접속해 주세요.
            </div>
            <LinkButton href="/">로그인 페이지로</LinkButton>
          </Card>
        ) : (
          <>
            {error ? (
              <Card>
                <div style={{ fontSize: 16, marginBottom: 8 }}>
                  오류가 발생했습니다
                </div>
                <div style={{ fontSize: 14, color: "crimson" }}>{error}</div>
              </Card>
            ) : null}

            {/* Top cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(12, 1fr)",
                gap: 14,
                marginBottom: 14,
              }}
            >
              <div style={{ gridColumn: "span 12" }}>
                <Card>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>
                        {profile.name || profile.email}
                      </div>
                      <div style={{ marginTop: 6, fontSize: 13, opacity: 0.75 }}>
                        {profile.email}
                      </div>
                      <div style={{ marginTop: 10 }}>
                        <RoleBadge role={profile.role} />
                        {!profile.is_active ? (
                          <span
                            style={{
                              marginLeft: 8,
                              fontSize: 12,
                              color: "crimson",
                              border: "1px solid rgba(220,20,60,0.35)",
                              padding: "4px 10px",
                              borderRadius: 999,
                              background: "rgba(220,20,60,0.06)",
                            }}
                          >
                            비활성 계정
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        gap: 10,
                        minWidth: 260,
                      }}
                    >
                      <MiniStat
                        label="시급"
                        value={
                          profile.hourly_rate
                            ? formatKRW(profile.hourly_rate)
                            : "미설정"
                        }
                      />
                      <MiniStat
                        label="세율"
                        value={`${Math.round((profile.tax_rate ?? 0) * 1000) / 10}%`}
                      />
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            {/* Actions */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(12, 1fr)",
                gap: 14,
              }}
            >
              <div style={{ gridColumn: "span 12" }}>
                <SectionTitle title="바로가기" />
              </div>

              <div style={{ gridColumn: "span 12" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
                    gap: 14,
                  }}
                >
                  <ActionCard
                    title="근무기록 작성"
                    desc="출근/퇴근 시간과 휴게시간을 기록하고 제출하세요."
                    href="/dashboard/work-logs"
                    cta="근무기록으로 이동"
                  />

                  {isAdminLike ? (
                    <ActionCard
                      title="근무 승인"
                      desc="제출된 근무기록을 승인/반려합니다."
                      href="/dashboard/admin/approvals"
                      cta="승인 화면으로"
                    />
                  ) : (
                    <ActionCard
                      title="내 제출 현황"
                      desc="제출/승인 상태를 확인하세요."
                      href="/dashboard/work-logs"
                      cta="현황 확인"
                    />
                  )}

                  {isAdminLike ? (
                    <ActionCard
                      title="직원 관리"
                      desc="직원 활성/비활성, 시급 등을 관리합니다."
                      href="/dashboard/admin/users"
                      cta="직원 관리로"
                    />
                  ) : (
                    <ActionCard
                      title="급여 확인"
                      desc="급여기간별 정산 결과를 확인합니다(준비 중)."
                      href="/dashboard/payroll"
                      cta="급여로 이동"
                      disabled
                    />
                  )}
                </div>
              </div>

              <div style={{ gridColumn: "span 12", marginTop: 6 }}>
                <Card>
                  <div style={{ fontSize: 14, opacity: 0.8 }}>
                    다음 단계: <b>근무기록 페이지</b>부터 실제 입력/제출이 가능하게 만들겠습니다.
                  </div>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- UI Components (No external libs) ---------- */

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
  return (
    <div style={{ fontSize: 16, fontWeight: 700, margin: "6px 0" }}>
      {title}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        border: "1px solid rgba(0,0,0,0.10)",
        borderRadius: 12,
        padding: 12,
        background: "rgba(0,0,0,0.02)",
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.7 }}>{label}</div>
      <div style={{ marginTop: 6, fontSize: 15, fontWeight: 700 }}>
        {value}
      </div>
    </div>
  );
}

function LinkButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "10px 12px",
        borderRadius: 10,
        border: "1px solid rgba(0,0,0,0.12)",
        background: "white",
        textDecoration: "none",
        color: "inherit",
        fontSize: 14,
      }}
    >
      {children}
    </Link>
  );
}

function ActionCard({
  title,
  desc,
  href,
  cta,
  disabled,
}: {
  title: string;
  desc: string;
  href: string;
  cta: string;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <Card>
        <div style={{ fontSize: 16, fontWeight: 800 }}>{title}</div>
        <div style={{ marginTop: 8, fontSize: 14, opacity: 0.75 }}>{desc}</div>
        <div style={{ marginTop: 12, fontSize: 13, opacity: 0.6 }}>
          준비 중…
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div style={{ fontSize: 16, fontWeight: 800 }}>{title}</div>
      <div style={{ marginTop: 8, fontSize: 14, opacity: 0.75 }}>{desc}</div>
      <div style={{ marginTop: 14 }}>
        <LinkButton href={href}>{cta}</LinkButton>
      </div>
    </Card>
  );
}
