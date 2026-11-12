"use client";

import { useCallback, useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { useToast } from "@monetio/ui";
import { removePushSubscription, savePushSubscription, sendTestNotification } from "@/app/actions/push";
import type { ActionState } from "@/app/actions/state";
import { vapidKeyToBytes } from "@/lib/push/subscription";
import { type PushSupport, pushSupport, readPushEnvironment } from "@/lib/push/support";

/** Push availability as shown in Settings; "unconfigured" = no VAPID key in this build. */
export type PushStatus = PushSupport | "unconfigured" | "denied";

export interface PushNotificationsState {
  /** null until checked on the client. */
  status: PushStatus | null;
  subscribed: boolean;
  pending: boolean;
  setEnabled(on: boolean): void;
  sendTest(): void;
}

const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

const noopSubscribe = () => () => {};

function browserStatus(vapidKey: string): PushStatus {
  const support = pushSupport(readPushEnvironment());
  if (support !== "ready") return support;
  if (!vapidKey) return "unconfigured";
  return Notification.permission === "denied" ? "denied" : "ready";
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

/** Browser permission, subscription and server sync for this device's notifications. */
export function usePushNotifications(vapidKey: string = VAPID_KEY): PushNotificationsState {
  const toast = useToast();
  // Browser capabilities are client-only: null on the server and during hydration.
  const detected = useSyncExternalStore(noopSubscribe, () => browserStatus(vapidKey), () => null);
  const [deniedNow, setDeniedNow] = useState(false);
  const status = deniedNow ? "denied" : detected;
  const [subscribed, setSubscribed] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (detected !== "ready") return;
    let alive = true;
    currentSubscription()
      .then((sub) => alive && setSubscribed(sub !== null))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [detected]);

  const report = useCallback((res: ActionState) => res.message && toast.show(res.message, { tone: res.ok ? "success" : "danger" }), [toast]);

  const enable = useCallback(async () => {
    // Must run inside the click handler: browsers ignore permission prompts without a user gesture.
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      if (permission === "denied") setDeniedNow(true);
      return;
    }
    const reg = await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKeyToBytes(vapidKey) }));
    const res = await savePushSubscription(sub.toJSON(), navigator.userAgent);
    if (!res.ok) await sub.unsubscribe();
    setSubscribed(res.ok === true);
    report(res);
  }, [vapidKey, report]);

  const disable = useCallback(async () => {
    const sub = await currentSubscription();
    if (!sub) return setSubscribed(false);
    const res = await removePushSubscription(sub.endpoint);
    await sub.unsubscribe();
    setSubscribed(false);
    report(res);
  }, [report]);

  const setEnabled = (on: boolean) =>
    start(async () => {
      try {
        await (on ? enable() : disable());
      } catch {
        toast.show("Non è stato possibile cambiare le notifiche. Riprova.", { tone: "danger" });
      }
    });

  const sendTest = () => start(async () => void report(await sendTestNotification()));

  return { status, subscribed, pending, setEnabled, sendTest };
}
