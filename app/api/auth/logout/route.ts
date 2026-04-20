import { NextResponse } from "next/server";

import { logoutCurrentUser } from "@/lib/auth";
import { isAccountSyncEnabled } from "@/lib/runtimeConfig";

export async function POST() {
  if (!isAccountSyncEnabled()) {
    return NextResponse.json({ message: "アカウント同期は現在無効です。" }, { status: 403 });
  }
  await logoutCurrentUser();
  return NextResponse.json({ ok: true });
}
