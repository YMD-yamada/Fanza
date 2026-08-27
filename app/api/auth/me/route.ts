import { NextResponse } from "next/server";

import { touchCurrentSessionWithAuthMethods } from "@/lib/auth";
import { isAccountSyncEnabled } from "@/lib/runtimeConfig";

export async function GET() {
  if (!isAccountSyncEnabled()) {
    return NextResponse.json({ user: null, syncEnabled: false });
  }
  const current = await touchCurrentSessionWithAuthMethods();
  if (!current) {
    return NextResponse.json({ user: null, syncEnabled: true });
  }
  const { user, methods } = current;
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
      hasPassword: methods.hasPassword,
      hasPasskey: methods.hasPasskey,
    },
    syncEnabled: true,
  });
}
