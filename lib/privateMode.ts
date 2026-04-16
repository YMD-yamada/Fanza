export const PRIVATE_MODE_COOKIE_NAME = "fanza_private_mode";
export const PRIVATE_MODE_STORAGE_KEY = "fanza_private_mode";
export const PRIVATE_MODE_CHANGE_EVENT = "fanza-private-mode-change";

export function isPrivateModeValue(value: string | undefined): boolean {
  return value === "1";
}

export function getPrivateModeClient(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(PRIVATE_MODE_STORAGE_KEY) === "1";
}

export function setPrivateModeClient(enabled: boolean) {
  if (typeof window === "undefined") return;
  const value = enabled ? "1" : "0";
  localStorage.setItem(PRIVATE_MODE_STORAGE_KEY, value);
  document.cookie = `${PRIVATE_MODE_COOKIE_NAME}=${value}; Path=/; Max-Age=31536000; SameSite=Lax`;
  window.dispatchEvent(new Event(PRIVATE_MODE_CHANGE_EVENT));
}

export async function getPrivateModeFromCookie(): Promise<boolean> {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  return isPrivateModeValue(cookieStore.get(PRIVATE_MODE_COOKIE_NAME)?.value);
}
