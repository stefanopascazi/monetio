// Email channel contract, ready for an SMTP or API provider. No provider is wired yet: the disabled
// sender reports every message as not delivered, so callers can be written and tested today.
import type { NotificationEvent } from "./events";
import type { NotificationKind } from "./prefs";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export type EmailResult = { delivered: true; id: string } | { delivered: false; reason: string };

export interface EmailSender {
  send(message: EmailMessage): Promise<EmailResult>;
}

/** Kinds worth an email too: the bank consent, because the sync silently stops when it ends. */
export const EMAIL_KINDS: readonly NotificationKind[] = ["bank_consent"];

export const isEmailKind = (kind: NotificationKind) => EMAIL_KINDS.includes(kind);

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Email for a notification event; `appUrl` is the public origin (e.g. https://monetio.app). */
export function emailForEvent(event: NotificationEvent, to: string, appUrl: string): EmailMessage {
  const link = new URL(event.url, appUrl).toString();
  return {
    to,
    subject: `MonetIO · ${event.title}`,
    text: `${event.body}\n\nApri MonetIO: ${link}\n\nRicevi questa email per le notifiche importanti di MonetIO.`,
    html: `<p>${escapeHtml(event.body)}</p><p><a href="${escapeHtml(link)}">Apri MonetIO</a></p><p style="color:#777;font-size:12px">Ricevi questa email per le notifiche importanti di MonetIO.</p>`,
  };
}

/** Placeholder until an SMTP provider is chosen. */
export const disabledEmailSender: EmailSender = {
  send: async () => ({ delivered: false, reason: "email non configurata" }),
};
