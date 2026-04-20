import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { isAccountSyncEnabled } from "@/lib/runtimeConfig";

export async function GET() {
  if (!isAccountSyncEnabled()) {
    return NextResponse.json({ user: null, syncEnabled: false });
  }
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ user: null, syncEnabled: true });
  }
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
    },
    syncEnabled: true,
  });
}
