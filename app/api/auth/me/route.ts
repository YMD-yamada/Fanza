import { NextResponse } from "next/server";

import { touchCurrentSession } from "@/lib/auth";
import { isAccountSyncEnabled } from "@/lib/runtimeConfig";
import { getAuthMethodsByUserId } from "@/lib/userStore";

export async function GET() {
  if (!isAccountSyncEnabled()) {
    return NextResponse.json({ user: null, syncEnabled: false });
  }
  const user = await touchCurrentSession();
  if (!user) {
    return NextResponse.json({ user: null, syncEnabled: true });
  }
  const methods = await getAuthMethodsByUserId(user.id);
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
