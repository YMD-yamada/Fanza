import { NextRequest, NextResponse } from "next/server";

import { createPasswordHash, createUserSession, getCurrentUser } from "@/lib/auth";
import { validateAuthPayload } from "@/lib/authShared";
import { isAccountSyncEnabled } from "@/lib/runtimeConfig";
import { createStoredUser } from "@/lib/userStore";

export async function POST(request: NextRequest) {
  if (!isAccountSyncEnabled()) {
    return NextResponse.json({ message: "この環境ではアカウント同期は無効です。" }, { status: 404 });
  }
  const currentUser = await getCurrentUser();
  if (currentUser) {
    return NextResponse.json(
      { message: "You are already logged in." },
      { status: 400 },
    );
  }

  const payload = (await request.json()) as { email?: string; password?: string };
  const validation = validateAuthPayload(payload.email, payload.password);
  if (!validation.ok) {
    return NextResponse.json(
      { message: validation.message },
      { status: 400 },
    );
  }

  const passwordHash = createPasswordHash(validation.password);
  const created = await createStoredUser(validation.email, passwordHash);
  if (!created.ok) {
    return NextResponse.json(
      { message: "This email is already registered." },
      { status: 409 },
    );
  }

  await createUserSession(created.user.id);
  return NextResponse.json({
    ok: true,
    user: created.user,
    message: "アカウントを作成してログインしました。",
  });
}
