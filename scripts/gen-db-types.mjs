#!/usr/bin/env node
// Vygeneruje src/types/database.ts ze schématu PostgreSQL ve formátu `supabase gen types typescript`.
// S lokálním Supabase lze použít i: npx supabase gen types typescript --local > src/types/database.ts
// Použití: DATABASE_URL=postgres://... node scripts/gen-db-types.mjs
import pg from "pg";
import { writeFileSync } from "node:fs";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Nastavte DATABASE_URL");
  process.exit(1);
}
const client = new pg.Client({ connectionString: url });
await client.connect();
const q = async (sql, params = []) => (await client.query(sql, params)).rows;

const enums = await q(`
  select t.typname as name, array_agg(e.enumlabel::text order by e.enumsortorder) as labels
    from pg_type t join pg_enum e on e.enumtypid = t.oid join pg_namespace n on n.oid = t.typnamespace
   where n.nspname = 'public' group by t.typname order by t.typname`);
const enumNames = new Set(enums.map((e) => e.name));

const tables = await q(`
  select c.relname as name from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('r', 'p') order by c.relname`);
const columns = await q(`
  select c.relname as table, a.attname as name, format_type(a.atttypid, a.atttypmod) as formatted,
         t.typname as typname, t.typtype as typtype, et.typname as elemtype,
         not a.attnotnull as nullable, a.atthasdef as has_default, a.attidentity as identity, a.attgenerated as generated
    from pg_attribute a
    join pg_class c on c.oid = a.attrelid join pg_namespace n on n.oid = c.relnamespace
    join pg_type t on t.oid = a.atttypid
    left join pg_type et on et.oid = t.typelem and t.typcategory = 'A'
   where n.nspname = 'public' and c.relkind in ('r', 'p') and a.attnum > 0 and not a.attisdropped
   order by c.relname, a.attnum`);
const fks = await q(`
  select con.conname as name, cl.relname as table, rc.relname as ref_table, rn.nspname as ref_schema,
         array(select a.attname::text from unnest(con.conkey) with ordinality k(n, o) join pg_attribute a on a.attrelid = con.conrelid and a.attnum = k.n order by k.o) as cols,
         array(select a.attname::text from unnest(con.confkey) with ordinality k(n, o) join pg_attribute a on a.attrelid = con.confrelid and a.attnum = k.n order by k.o) as ref_cols,
         exists (select 1 from pg_constraint u where u.conrelid = con.conrelid and u.contype in ('p', 'u')
                  and (select array_agg(x order by x) from unnest(u.conkey) x) = (select array_agg(x order by x) from unnest(con.conkey) x)) as one_to_one
    from pg_constraint con
    join pg_class cl on cl.oid = con.conrelid join pg_namespace n on n.oid = cl.relnamespace
    join pg_class rc on rc.oid = con.confrelid join pg_namespace rn on rn.oid = rc.relnamespace
   where con.contype = 'f' and n.nspname = 'public' order by cl.relname, con.conname`);
const composites = await q(`
  select t.typname as name, a.attname as field, format_type(a.atttypid, a.atttypmod) as formatted,
         at.typname as typname, at.typtype as typtype, et.typname as elemtype
    from pg_type t join pg_namespace n on n.oid = t.typnamespace
    join pg_class c on c.oid = t.typrelid and c.relkind = 'c'
    join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
    join pg_type at on at.oid = a.atttypid
    left join pg_type et on et.oid = at.typelem and at.typcategory = 'A'
   where n.nspname = 'public' order by t.typname, a.attnum`);
const functions = await q(`
  select p.proname as name, p.proretset as retset, p.pronargdefaults as ndefaults,
         coalesce(p.proargnames, '{}')::text[] as argnames, coalesce(p.proargmodes::text[], '{}') as argmodes,
         array(select t.typname::text from unnest(coalesce(p.proallargtypes, p.proargtypes::oid[])) with ordinality x(toid, o) join pg_type t on t.oid = x.toid order by x.o) as argtypnames,
         rt.typname as rettype, rt.typtype as rettyptype, rc.relname as retrel, rc.relkind as retrelkind
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    join pg_type rt on rt.oid = p.prorettype
    left join pg_class rc on rc.oid = rt.typrelid
   where n.nspname = 'public' and p.prokind = 'f' and rt.typname <> 'trigger'
   order by p.proname`);
await client.end();

const base = (typname) => {
  const t = typname.replace(/^_/, "");
  if (enumNames.has(t)) return `Database["public"]["Enums"]["${t}"]`;
  if (["int2", "int4", "int8", "float4", "float8", "numeric", "oid"].includes(t)) return "number";
  if (t === "bool") return "boolean";
  if (["json", "jsonb"].includes(t)) return "Json";
  if (["uuid", "text", "varchar", "bpchar", "citext", "timestamptz", "timestamp", "date", "time", "interval", "name", "regdictionary"].includes(t)) return "string";
  return "unknown";
};
const tsType = (typname, elemtype) => (typname.startsWith("_") ? `${base(elemtype ?? typname)}[]` : base(typname));

const out = [];
out.push("// Vygenerováno skriptem scripts/gen-db-types.mjs – neupravujte ručně.");
out.push("export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];\n");
out.push("export type Database = {");
out.push("  __InternalSupabase: { PostgrestVersion: \"12\" };");
out.push("  public: {");
out.push("    Tables: {");
for (const { name } of tables) {
  const cols = columns.filter((c) => c.table === name);
  out.push(`      ${name}: {`);
  out.push("        Row: {");
  for (const c of cols) out.push(`          ${c.name}: ${tsType(c.typname, c.elemtype)}${c.nullable ? " | null" : ""};`);
  out.push("        };");
  out.push("        Insert: {");
  for (const c of cols) {
    if (c.identity === "a" || c.generated === "s") out.push(`          ${c.name}?: never;`);
    else out.push(`          ${c.name}${c.nullable || c.has_default || c.identity ? "?" : ""}: ${tsType(c.typname, c.elemtype)}${c.nullable ? " | null" : ""};`);
  }
  out.push("        };");
  out.push("        Update: {");
  for (const c of cols) {
    if (c.identity === "a" || c.generated === "s") out.push(`          ${c.name}?: never;`);
    else out.push(`          ${c.name}?: ${tsType(c.typname, c.elemtype)}${c.nullable ? " | null" : ""};`);
  }
  out.push("        };");
  const rels = fks.filter((f) => f.table === name && f.ref_schema === "public");
  out.push(`        Relationships: [${rels.length ? "" : "];"}`);
  for (const f of rels) {
    out.push(`          { foreignKeyName: "${f.name}"; columns: [${f.cols.map((c) => `"${c}"`).join(", ")}]; isOneToOne: ${f.one_to_one}; referencedRelation: "${f.ref_table}"; referencedColumns: [${f.ref_cols.map((c) => `"${c}"`).join(", ")}] },`);
  }
  if (rels.length) out.push("        ];");
  out.push("      };");
}
out.push("    };");
out.push("    Views: { [_ in never]: never };");
out.push("    Functions: {");
for (const f of functions) {
  const inArgs = [];
  f.argnames.forEach((argName, i) => {
    const mode = f.argmodes[i] ?? "i";
    if (mode === "i" || mode === "b") inArgs.push({ name: argName, type: tsType(f.argtypnames[i], f.argtypnames[i].replace(/^_/, "")) });
  });
  const firstOptional = inArgs.length - f.ndefaults;
  // Funkce PostgreSQL přijímají NULL u každého argumentu (nejsou STRICT) → typ povoluje null
  const args = inArgs.map((a, i) => `${a.name}${i >= firstOptional ? "?" : ""}: ${a.type} | null`);
  const tableOut = f.argnames.map((n, i) => ({ n, mode: f.argmodes[i], t: f.argtypnames[i] })).filter((a) => a.mode === "t");
  let ret;
  if (tableOut.length) ret = `{ ${tableOut.map((a) => `${a.n}: ${tsType(a.t, a.t.replace(/^_/, ""))}`).join("; ")} }[]`;
  else if (f.retrelkind === "r") ret = `Database["public"]["Tables"]["${f.retrel}"]["Row"]${f.retset ? "[]" : ""}`;
  else if (f.rettype === "void") ret = "undefined";
  else ret = `${tsType(f.rettype, f.rettype.replace(/^_/, ""))}${f.retset ? "[]" : ""}`;
  out.push(`      ${f.name}: { Args: ${args.length ? `{ ${args.join("; ")} }` : "Record<PropertyKey, never>"}; Returns: ${ret} };`);
}
out.push("    };");
out.push("    Enums: {");
for (const e of enums) out.push(`      ${e.name}: ${e.labels.map((l) => `"${l}"`).join(" | ")};`);
out.push("    };");
out.push("    CompositeTypes: {");
const compNames = [...new Set(composites.map((c) => c.name))];
for (const n of compNames) {
  out.push(`      ${n}: { ${composites.filter((c) => c.name === n).map((c) => `${c.field}: ${tsType(c.typname, c.elemtype)} | null`).join("; ")} };`);
}
out.push("    };");
out.push("  };");
out.push("};\n");
out.push(`type PublicSchema = Database["public"];`);
out.push(`export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];`);
out.push(`export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];`);
out.push(`export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];`);
out.push(`export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];`);
out.push("");
out.push("export const Constants = {");
out.push("  public: {");
out.push("    Enums: {");
for (const e of enums) out.push(`      ${e.name}: [${e.labels.map((l) => `"${l}"`).join(", ")}],`);
out.push("    },");
out.push("  },");
out.push("} as const;");

writeFileSync(new URL("../src/types/database.ts", import.meta.url), out.join("\n") + "\n");
console.log(`Typy: ${tables.length} tabulek, ${functions.length} funkcí, ${enums.length} výčtů → src/types/database.ts`);
