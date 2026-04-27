export function isAccountSyncEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_ACCOUNT_SYNC === "1";
}

