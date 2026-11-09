"use client";

import { useEffect } from "react";
import { lastAccountCookie } from "@/lib/navigation/last-account";

/** Stores the opened account so the "Conti" tab reopens it. Renders nothing. */
export function RememberAccount({ id }: { id: string }) {
  useEffect(() => {
    document.cookie = lastAccountCookie(id);
  }, [id]);
  return null;
}
