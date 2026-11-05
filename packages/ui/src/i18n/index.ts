import { type Messages, en, it } from "./messages";

export { en, it, type Messages };

// Active UI language of the design system. MonetIO is Italian-only for now; switch here to change it.
// A module constant (not React context) keeps server-only components free of "use client".
export const messages: Messages = it;
