// Strips personal and financial data from Sentry events before they leave the process.
// Shared by the Next.js app and the worker (packages/worker imports it relatively).

interface Breadcrumb {
  category?: string;
  message?: string;
  data?: Record<string, unknown>;
}

/** Structural subset of a Sentry event: only the fields this module touches. */
export interface ScrubbableEvent {
  message?: string;
  request?: { url?: string; headers?: Record<string, string>; cookies?: unknown; data?: unknown; query_string?: unknown };
  user?: { id?: string | number; [key: string]: unknown };
  breadcrumbs?: Breadcrumb[];
  exception?: { values?: { value?: string; stacktrace?: { frames?: { vars?: unknown }[] } }[] };
  extra?: Record<string, unknown>;
}

const REDACTIONS: [RegExp, string][] = [
  // Postgres constraint details carry row values: "Key (amount)=(12.50)", "Failing row contains (...)".
  [/(Key \([^)]*\)=)\([^)]*\)/g, "$1([redacted])"],
  [/(Failing row contains )\(.*\)/g, "$1([redacted])"],
  [/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, "[email]"],
  [/\b[A-Z]{2}\d{2}(?: ?[A-Z0-9]{4}){2,7}(?: ?[A-Z0-9]{1,3})?\b/g, "[iban]"],
  [/€\s?-?\d[\d.,]*|-?\d[\d.,]*\s?€/g, "[amount]"],
];

const BREADCRUMB_DATA_KEYS = ["method", "status_code"];

export function redactText(text: string): string {
  return REDACTIONS.reduce((out, [pattern, replacement]) => out.replace(pattern, replacement), text);
}

function stripQuery(url: string): string {
  const cut = url.search(/[?#]/);
  return cut === -1 ? url : url.slice(0, cut);
}

function scrubBreadcrumb(crumb: Breadcrumb): Breadcrumb {
  const out: Breadcrumb = { ...crumb };
  if (out.message) out.message = redactText(out.message);
  if (out.data) {
    const data: Record<string, unknown> = {};
    for (const key of BREADCRUMB_DATA_KEYS) if (key in out.data) data[key] = out.data[key];
    if (typeof out.data.url === "string") data.url = stripQuery(out.data.url);
    out.data = data;
  }
  return out;
}

type ExceptionValue = NonNullable<NonNullable<ScrubbableEvent["exception"]>["values"]>[number];

// Frame locals can hold amounts or rows: drop them even if collection is ever turned back on.
function scrubException(value: ExceptionValue): ExceptionValue {
  const out = { ...value };
  if (out.value) out.value = redactText(out.value);
  if (out.stacktrace?.frames) {
    out.stacktrace = { ...out.stacktrace, frames: out.stacktrace.frames.map((frame) => ({ ...frame, vars: undefined })) };
  }
  return out;
}

/** Sentry beforeSend: keeps stack traces and route context, drops bodies, cookies, query strings and values. */
export function scrubEvent<T extends ScrubbableEvent>(event: T): T {
  const out: T = { ...event };
  if (out.message) out.message = redactText(out.message);
  if (out.request) {
    const userAgent = out.request.headers?.["user-agent"];
    out.request = {
      url: out.request.url ? stripQuery(out.request.url) : undefined,
      headers: userAgent ? { "user-agent": userAgent } : undefined,
    };
  }
  if (out.user) out.user = out.user.id === undefined ? undefined : { id: out.user.id };
  if (out.exception?.values) {
    out.exception = { ...out.exception, values: out.exception.values.map(scrubException) };
  }
  // Console output may print anything: never forward it.
  if (out.breadcrumbs) out.breadcrumbs = out.breadcrumbs.filter((c) => c.category !== "console").map(scrubBreadcrumb);
  delete out.extra;
  return out;
}
