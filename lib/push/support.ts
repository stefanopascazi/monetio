/**
 * Why push can or cannot be enabled on this browser:
 * - ready: APIs available;
 * - ios-install: iOS Safari tab, push needs the app added to the Home screen (iOS 16.4+);
 * - dev: service worker not registered outside production builds;
 * - unsupported: browser lacks the Push API.
 */
export type PushSupport = "ready" | "ios-install" | "dev" | "unsupported";

export interface PushEnvironment {
  production: boolean;
  hasServiceWorker: boolean;
  hasPushManager: boolean;
  hasNotification: boolean;
  userAgent: string;
  /** Running as an installed PWA (display-mode: standalone or navigator.standalone). */
  standalone: boolean;
}

const IOS_RE = /iPhone|iPad|iPod/;

export function pushSupport(env: PushEnvironment): PushSupport {
  const ios = IOS_RE.test(env.userAgent);
  // iOS exposes PushManager only inside an installed web app.
  if (ios && !env.standalone) return "ios-install";
  if (!env.hasServiceWorker || !env.hasPushManager || !env.hasNotification) return "unsupported";
  if (!env.production) return "dev";
  return "ready";
}

/** Reads the current browser environment (client only). */
export function readPushEnvironment(): PushEnvironment {
  const nav = navigator as Navigator & { standalone?: boolean };
  return {
    production: process.env.NODE_ENV === "production",
    hasServiceWorker: "serviceWorker" in nav,
    hasPushManager: typeof window !== "undefined" && "PushManager" in window,
    hasNotification: typeof window !== "undefined" && "Notification" in window,
    userAgent: nav.userAgent,
    standalone: nav.standalone === true || window.matchMedia?.("(display-mode: standalone)").matches === true,
  };
}
