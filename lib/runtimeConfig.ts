export function isAccountSyncEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_ACCOUNT_SYNC === "1";
}

export function isPasswordResetEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.AUTH_EMAIL_FROM?.trim());
}

