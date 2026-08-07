import { NextRequest, NextResponse } from "next/server";

import { sanitizeEmail } from "@/lib/authShared";
import { isValidEmail } from "@/lib/passkey";
import { isAccountSyncEnabled } from "@/lib/runtimeConfig";
import { getAuthMethods } from "@/lib/userStore";

export async function GET(request: NextRequest) {
  if (!isAccountSyncEnabled()) {
    return NextResponse.json({ message: "この環境ではアカウント同期は無効です。" }, { status: 404 });
  }

  const email = sanitizeEmail(request.nextUrl.searchParams.get("email"));
  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ message: "メールアドレス形式が正しくありません。" }, { status: 400 });
  }

  const methods = await getAuthMethods(email);
  return NextResponse.json(methods);
}
