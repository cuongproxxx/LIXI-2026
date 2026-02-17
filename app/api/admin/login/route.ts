import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, createAdminSession, getAdminSessionMaxAgeSec } from "@/lib/auth";
import { getServerEnv } from "@/lib/env-store";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";
import { isSameOrigin } from "@/lib/security";
import { adminLoginSchema } from "@/lib/validation";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return jsonError("Yêu cầu không hợp lệ.", 403);

  const ip = getClientIp(request);
  const rate = checkRateLimit(`admin-login:${ip}`, 10, 5 * 60 * 1000);
  if (!rate.allowed) return jsonError("Bạn thử quá nhiều lần. Vui lòng đợi thêm.", 429);

  const adminPassword = await getServerEnv("ADMIN_PASSWORD");
  if (!adminPassword) return jsonError("ADMIN_PASSWORD chưa được thiết lập.", 412);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Dữ liệu đăng nhập không hợp lệ.", 400);
  }

  const parsed = adminLoginSchema.safeParse(body);
  if (!parsed.success) return jsonError("Mật khẩu không hợp lệ.", 400);
  if (parsed.data.password !== adminPassword) return jsonError("Sai mật khẩu.", 401);

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: createAdminSession(adminPassword),
    path: "/",
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: getAdminSessionMaxAgeSec()
  });
  return response;
}
