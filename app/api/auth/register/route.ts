import { NextRequest, NextResponse } from "next/server";

import { createPasswordHash, createUserSession, getCurrentUser } from "@/lib/auth";
import { validateAuthPayload } from "@/lib/authShared";
import { isAccountSyncEnabled } from "@/lib/runtimeConfig";
import { createStoredUser, getAuthMethods } from "@/lib/userStore";

export async function POST(request: NextRequest) {
  if (!isAccountSyncEnabled()) {
    return NextResponse.json(
      { error: "この環境ではアカウント同期は無効です。", message: "この環境ではアカウント同期は無効です。" },
      { status: 404 },
    );
  }
  const currentUser = await getCurrentUser();
  if (currentUser) {
    return NextResponse.json(
      { error: "すでにログインしています。", message: "すでにログインしています。" },
      { status: 400 },
    );
  }

  const payload = (await request.json()) as { email?: string; password?: string };
  const validation = validateAuthPayload(payload.email, payload.password);
  if (!validation.ok) {
    return NextResponse.json(
      { error: validation.message, message: validation.message },
      { status: 400 },
    );
  }

  const methods = await getAuthMethods(validation.email);
  if (methods.exists) {
    return NextResponse.json(
      {
        error: "このメールアドレスは既に登録されています。ログインしてください。",
        message: "このメールアドレスは既に登録されています。ログインしてください。",
        exists: true,
        hasPassword: methods.hasPassword,
        hasPasskey: methods.hasPasskey,
        canPasskey: methods.hasPasskey && !methods.hasPassword,
      },
      { status: 409 },
    );
  }

  const passwordHash = createPasswordHash(validation.password);
  const created = await createStoredUser(validation.email, passwordHash);
  if (!created.ok) {
    const again = await getAuthMethods(validation.email);
    return NextResponse.json(
      {
        error: "このメールアドレスは既に登録されています。ログインしてください。",
        message: "このメールアドレスは既に登録されています。ログインしてください。",
        exists: true,
        hasPassword: again.hasPassword,
        hasPasskey: again.hasPasskey,
        canPasskey: again.hasPasskey && !again.hasPassword,
      },
      { status: 409 },
    );
  }

  await createUserSession(created.user.id);
  return NextResponse.json({
    ok: true,
    user: {
      ...created.user,
      hasPassword: true,
      hasPasskey: false,
    },
    message: "アカウントを作成してログインしました。",
  });
}
