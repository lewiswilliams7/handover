/** One contextual upgrade prompt (post-gen banner or Pro gate modal) per browser session. */
export const UPGRADE_PROMPT_SESSION_KEY = "handover_upgrade_prompt_used_v1";

export function readUpgradePromptConsumed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(UPGRADE_PROMPT_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function markUpgradePromptConsumed(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(UPGRADE_PROMPT_SESSION_KEY, "1");
  } catch {
    /* ignore */
  }
}
