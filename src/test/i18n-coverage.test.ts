/**
 * i18n coverage guard
 * ----------------------------------------------------------------
 * Ensures the GenericPage / entitySchemas pipeline never falls back
 * to hardcoded Portuguese when the user switches to EN or ES.
 *
 * Three checks:
 *  1. Every `label` / `filters[].label` in entitySchemas.ts uses a
 *     namespaced i18n key (contains a ".") — never a raw PT string.
 *  2. Every key referenced by entitySchemas.ts exists in pt.json,
 *     en.json AND es.json (no missing translation = no fallback).
 *  3. GenericPage.tsx does not contain a curated blacklist of
 *     hardcoded PT UI strings ("Filtrar resultados", "Sim", "Não",
 *     "Selecione...", "Exportar", "Pesquisar", "Limpar", etc.).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { entitySchemas } from "@/config/entitySchemas";
import ptLocale from "@/i18n/locales/pt.json";
import enLocale from "@/i18n/locales/en.json";
import esLocale from "@/i18n/locales/es.json";

/* ---------- helpers ---------- */
function getByPath(obj: any, path: string): unknown {
  return path.split(".").reduce<any>((acc, k) => (acc == null ? acc : acc[k]), obj);
}

function collectSchemaLabels(): { key: string; where: string }[] {
  const out: { key: string; where: string }[] = [];
  for (const [entity, schema] of Object.entries(entitySchemas as any)) {
    const s: any = schema;
    if (s.titleKey) out.push({ key: s.titleKey, where: `${entity}.titleKey` });
    for (const f of s.fields ?? []) {
      if (f.label) out.push({ key: f.label, where: `${entity}.field:${f.key}` });
    }
    for (const f of s.filters ?? []) {
      if (f.label) out.push({ key: f.label, where: `${entity}.filter:${f.paramName}` });
    }
  }
  return out;
}

/* ---------- 1. Schema labels must be i18n keys ---------- */
describe("entitySchemas — labels are i18n keys", () => {
  const labels = collectSchemaLabels();

  it("collects at least one label", () => {
    expect(labels.length).toBeGreaterThan(0);
  });

  it("no label is a raw Portuguese string (must contain a dot)", () => {
    const offenders = labels.filter(({ key }) => !key.includes("."));
    if (offenders.length) {
      const sample = offenders.slice(0, 10).map((o) => `  - ${o.where}: "${o.key}"`).join("\n");
      throw new Error(
        `Found ${offenders.length} hardcoded label(s) in entitySchemas.ts.\n` +
        `Convert each to an i18n key (e.g. "fields.code") and add it to pt/en/es.json.\nFirst offenders:\n${sample}`
      );
    }
  });
});

/* ---------- 2. Every key resolves in PT, EN and ES ---------- */
describe("entitySchemas — every i18n key exists in pt/en/es", () => {
  const labels = collectSchemaLabels().filter((l) => l.key.includes("."));

  for (const locale of [
    { name: "pt", data: ptLocale },
    { name: "en", data: enLocale },
    { name: "es", data: esLocale },
  ]) {
    it(`all keys resolve in ${locale.name}.json`, () => {
      const missing = labels.filter(({ key }) => {
        const v = getByPath(locale.data, key);
        return typeof v !== "string" || v.length === 0;
      });
      if (missing.length) {
        const sample = missing.slice(0, 15).map((o) => `  - ${o.where} → "${o.key}"`).join("\n");
        throw new Error(
          `${missing.length} key(s) missing in ${locale.name}.json (would fall back to PT).\nFirst missing:\n${sample}`
        );
      }
    });
  }
});

/* ---------- 3. GenericPage must not ship hardcoded PT UI strings ---------- */
describe("GenericPage.tsx — no hardcoded PT UI strings", () => {
  const file = readFileSync(resolve(__dirname, "../pages/GenericPage.tsx"), "utf8");

  // strip line/block comments so commented examples don't trip the guard
  const code = file
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

  // Curated list of PT phrases that historically leaked into the UI.
  // Each must reach the user only via t("..."); never as a literal.
  const forbidden = [
    "Filtrar resultados",
    "Selecione...",
    "Selecione uma opção",
    "Todos os registros",
    "Pesquisar",
    "Limpar",
    "Exportar",
    "Exportar Excel",
    "Exportar PDF",
    "Novo registro",
    "Nova",
    "Salvar",
    "Cancelar",
    "Editar",
    "Excluir",
    "registros",
    "Linhas por página",
    "Carregando...",
    "Nenhum resultado",
    "Sim",
    "Não",
  ];

  it("does not contain any blacklisted Portuguese literal", () => {
    const hits: string[] = [];
    for (const phrase of forbidden) {
      // Match the phrase wrapped in single, double or backtick quotes.
      const re = new RegExp(`["'\`]${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'\`]`);
      if (re.test(code)) hits.push(phrase);
    }
    if (hits.length) {
      throw new Error(
        `GenericPage.tsx contains hardcoded PT string(s): ${hits.map((h) => `"${h}"`).join(", ")}.\n` +
        `Replace each with t("common.<key>") and register the key in pt/en/es.json.`
      );
    }
  });
});
