// Queries on the target database: state before restoring, wiping public, checks afterwards.
import type { Sql } from "postgres";

// Objects created by extensions (e.g. pgcrypto installed in public) are never ours to drop or count.
const notExtension = (catalog: string, oid: string) =>
  `not exists (select 1 from pg_depend d where d.classid = '${catalog}'::regclass and d.objid = ${oid} and d.deptype = 'e')`;

const PUBLIC_OBJECTS = `
select
  (select count(*) from pg_class c where c.relnamespace = 'public'::regnamespace
     and c.relkind in ('r','p','v','m','S','f','c') and ${notExtension("pg_class", "c.oid")})
+ (select count(*) from pg_proc p where p.pronamespace = 'public'::regnamespace and ${notExtension("pg_proc", "p.oid")})
+ (select count(*) from pg_type t where t.typnamespace = 'public'::regnamespace
     and t.typtype in ('e','d','r') and ${notExtension("pg_type", "t.oid")}) as n`;

// Drops the contents of public but keeps the schema: its grants and Supabase's default privileges
// (which give anon/authenticated/service_role access to new tables) survive, so replayed migrations
// produce exactly the privileges they produce on a fresh project.
const WIPE_PUBLIC = `
do $$
declare r record;
begin
  for r in select c.relname, c.relkind from pg_class c
    where c.relnamespace = 'public'::regnamespace and c.relkind in ('r','p','v','m','f') and not c.relispartition
      and ${notExtension("pg_class", "c.oid")}
  loop
    execute format('drop %s if exists public.%I cascade',
      case r.relkind when 'v' then 'view' when 'm' then 'materialized view' when 'f' then 'foreign table' else 'table' end, r.relname);
  end loop;
  for r in select c.relname from pg_class c
    where c.relnamespace = 'public'::regnamespace and c.relkind = 'S' and ${notExtension("pg_class", "c.oid")}
  loop
    execute format('drop sequence if exists public.%I cascade', r.relname);
  end loop;
  for r in select p.proname, p.prokind, pg_get_function_identity_arguments(p.oid) as args from pg_proc p
    where p.pronamespace = 'public'::regnamespace and ${notExtension("pg_proc", "p.oid")}
  loop
    execute format('drop %s if exists public.%I(%s) cascade',
      case r.prokind when 'p' then 'procedure' when 'a' then 'aggregate' else 'function' end, r.proname, r.args);
  end loop;
  for r in select t.typname, t.typtype from pg_type t
    where t.typnamespace = 'public'::regnamespace and ${notExtension("pg_type", "t.oid")}
      and (t.typtype in ('e','d','r')
        or (t.typtype = 'c' and exists (select 1 from pg_class c where c.oid = t.typrelid and c.relkind = 'c')))
  loop
    execute format('drop %s if exists public.%I cascade', case r.typtype when 'd' then 'domain' else 'type' end, r.typname);
  end loop;
end $$`;

export interface TargetState {
  serverMajor: number;
  /** Our objects in public: 0 on a fresh Supabase project. */
  publicObjects: number;
  authTables: string[];
}

export async function inspectTarget(sql: Sql): Promise<TargetState> {
  const [{ v }] = await sql<{ v: number }[]>`select current_setting('server_version_num')::int as v`;
  const [{ n }] = await sql.unsafe<{ n: string }[]>(PUBLIC_OBJECTS);
  const auth = await sql<{ tablename: string }[]>`select tablename from pg_tables where schemaname = 'auth' order by tablename`;
  return { serverMajor: Math.floor(v / 10_000), publicObjects: Number(n), authTables: auth.map((r) => r.tablename) };
}

export async function wipePublic(sql: Sql) {
  await sql.unsafe(WIPE_PUBLIC);
  const [{ n }] = await sql.unsafe<{ n: string }[]>(PUBLIC_OBJECTS);
  if (Number(n) !== 0) throw new Error(`Dopo il reset restano ${n} oggetti nello schema public`);
}

export async function publicTables(sql: Sql): Promise<string[]> {
  return (await sql<{ tablename: string }[]>`select tablename from pg_tables where schemaname = 'public' order by tablename`).map((r) => r.tablename);
}

export interface RestoreSummary {
  counts: Record<string, number>;
  /** Whether a member could read their household through RLS (null: no linked member to try). */
  memberCheck: boolean | null;
}

/** Row counts, plus a read as a household member through RLS and grants, like the app does. */
export async function verifyRestore(sql: Sql): Promise<RestoreSummary> {
  const [counts] = await sql<Record<string, number>[]>`
    select (select count(*) from public._migrations)::int as migrations,
           (select count(*) from public.households)::int as households,
           (select count(*) from public.accounts)::int as accounts,
           (select count(*) from public.transactions)::int as transactions,
           (select count(*) from auth.users)::int as users`;
  const [member] = await sql<{ user_id: string; household_id: string }[]>`
    select m.user_id, m.household_id from public.household_members m join auth.users u on u.id = m.user_id limit 1`;
  if (!member) return { counts: { ...counts }, memberCheck: null };

  const claims = JSON.stringify({ sub: member.user_id, role: "authenticated" });
  const visible = await sql.begin(async (tx) => {
    await tx`select set_config('request.jwt.claims', ${claims}, true), set_config('request.jwt.claim.sub', ${member.user_id}, true)`;
    await tx.unsafe("set local role authenticated");
    const [{ n }] = await tx<{ n: number }[]>`select count(*)::int as n from public.households where id = ${member.household_id}`;
    return n;
  });
  // PostgREST caches the schema: make it reload after the swap.
  await sql`notify pgrst, 'reload schema'`;
  return { counts: { ...counts }, memberCheck: visible === 1 };
}
