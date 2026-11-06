// Generates a random JWT secret plus matching anon/service_role keys for .env (Docker stack).
// Usage: node scripts/docker/gen-keys.ts [existing-secret]
import { randomBytes } from "node:crypto";
import { supabaseKeys } from "./keys.ts";

const secret = process.argv[2] ?? randomBytes(32).toString("hex");
const { anon, service } = supabaseKeys(secret);
console.log(`JWT_SECRET=${secret}\nANON_KEY=${anon}\nSERVICE_ROLE_KEY=${service}`);
