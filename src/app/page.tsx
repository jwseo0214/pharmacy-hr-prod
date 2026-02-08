import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Role = "admin" | "manager" | "staff";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user!;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,email,name,role,is_active,hourly_rate,tax_rate")
    .eq("id", user.id)
    .single();

  const role = (profile?.role ?? "staff") as Role;
  const canManage = role === "admin" || role === "manager";
  const isAdmin = role === "admin";

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">대시보드</h1>
          <p className="text-sm text-muted-foreground">
            로그인: {profile?.email ?? user.email}
          </p>
        </div>

        <div className="flex gap-2">
          <Link href="/logout">
            <Button>로그아웃</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>내 정보</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="rounded-lg border p-3">
            <div className="text-muted-foreground">이름</div>
            <div className="font-medium">{profile?.name ?? "-"}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-muted-foreground">권한</div>
            <div className="font-medium">{role}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-muted-foreground">상태</div>
            <div className="font-medium">
              {profile?.is_active ? "활성" : "비활성"}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>근태</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 space-y-3 text-sm text-muted-foreground">
            근무 기록 입력/제출
            <div>
              <Link href="/attendance">
                <Button className="w-full">근태로 이동</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>급여</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 space-y-3 text-sm text-muted-foreground">
            월별 급여 확인(준비중)
            <div>
              <Link href="/payroll">
                <Button className="w-full" variant="outline">
                  급여로 이동
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>승인/관리</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 space-y-3 text-sm text-muted-foreground">
            {canManage
              ? "제출된 기록 승인/반려"
              : "관리자/매니저만 접근 가능"}
            <div>
              <Link href="/manage">
                <Button
                  className="w-full"
                  variant={canManage ? "default" : "secondary"}
                  disabled={!canManage}
                >
                  승인/관리로 이동
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Admin 메뉴</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row gap-2">
            <Link href="/admin/users" className="flex-1">
              <Button className="w-full" variant="outline">
                직원 관리
              </Button>
            </Link>
            <Link href="/admin/audit" className="flex-1">
              <Button className="w-full" variant="outline">
                감사 로그
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
