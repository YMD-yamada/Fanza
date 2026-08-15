import { isPasswordResetEmailConfigured } from "@/lib/runtimeConfig";
import type { AuthMethods } from "@/lib/userStore";

export function passkeyRecoveryFlags(methods: AuthMethods): {
  canPasskey: boolean;
  canClaimPassword: boolean;
} {
  const canPasskey = methods.exists && methods.hasPasskey && !methods.hasPassword;
  return {
    canPasskey,
    canClaimPassword: canPasskey && !isPasswordResetEmailConfigured(),
  };
}