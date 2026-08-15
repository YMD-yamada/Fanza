import { NextRequest, NextResponse } from "next/server";

import { isValidEmail, sanitizeEmail } from "@/lib/authShared";
import { isAccountSyncEnabled } from "@/lib/runtimeConfig";
import { getAuthMethods } from "@/lib/userStore";

export async function GET(request: NextRequest) {
  if (!isAccountSyncEnabled()) {
    return NextResponse.json(
      { error: "この環境ではアカウント同期は無効です。", message: "この環境ではアカウント同期は無効です。" },
      { status: 404 },
    );
  }

  const email = sanitizeEmail(request.nextUrl.searchParams.get("email"));
  if (!email || !isValidEmail(email)) {
    return NextResponse.json(
      { error: "メールアドレス形式が正しくありません。", message: "メールアドレス形式が正しくありません。" },
      { status: 400 },
    );
  }

  const methods = await getAuthMethods(email);
  return NextResponse.json(methods);
}
