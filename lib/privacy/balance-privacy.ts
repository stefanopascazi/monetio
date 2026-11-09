// Client-only privacy mode: masks balances/totals through an attribute on <html> (CSS does the masking).
export const BALANCE_PRIVACY_STORAGE_KEY = "mio-hide-balances";
export const BALANCE_PRIVACY_ATTR = "data-hide-balances";
/** Class marking a container whose amounts get masked in privacy mode. */
export const BALANCES_CLASS = "mio-balances";

type ReadStorage = Pick<Storage, "getItem">;
type WriteStorage = Pick<Storage, "setItem" | "removeItem">;

/** Stored preference; defaults to visible when missing or storage is blocked. */
export function readBalancesHidden(storage: ReadStorage | undefined = safeStorage()): boolean {
  try {
    return storage?.getItem(BALANCE_PRIVACY_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Persists the preference; visible clears the key. Never throws. */
export function writeBalancesHidden(hidden: boolean, storage: WriteStorage | undefined = safeStorage()): void {
  try {
    if (hidden) storage?.setItem(BALANCE_PRIVACY_STORAGE_KEY, "1");
    else storage?.removeItem(BALANCE_PRIVACY_STORAGE_KEY);
  } catch {
    /* storage unavailable: preference lasts for this page only */
  }
}

export function applyBalancesHidden(hidden: boolean, root: HTMLElement = document.documentElement): void {
  root.toggleAttribute(BALANCE_PRIVACY_ATTR, hidden);
}

export function isBalancesHidden(root: HTMLElement = document.documentElement): boolean {
  return root.hasAttribute(BALANCE_PRIVACY_ATTR);
}

/** Inline <head> script: applies the stored preference before first paint (no flash of balances). */
export const balancePrivacyInitScript = `(function(){try{if(localStorage.getItem("${BALANCE_PRIVACY_STORAGE_KEY}")==="1")document.documentElement.setAttribute("${BALANCE_PRIVACY_ATTR}","");}catch(e){}})();`;

function safeStorage(): Storage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}
