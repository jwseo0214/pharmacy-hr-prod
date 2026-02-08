import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import LoginForm from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: { next?: string };
}) {
  // ✅ 로그인 페이지에서는 "로그인 되어 있으면"만 대시보드로 보냄
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  if (data.user) {
    redirect(searchParams?.next || "/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-semibold">로그인</h1>
        <LoginForm nextPath={searchParams?.next} />
      </div>
    </div>
  );
}
