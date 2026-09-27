#!/usr/bin/env node
/* Z okruhy/vychozi.txt udělá assets/data-vlastni.js (stejný text uvnitř JS,
   aby šla výchozí sada načíst i z file://, kde prohlížeč fetch() blokuje).

   Změnil jsi okruhy/vychozi.txt? Spusť:
       node tools/sync-defaults.js

   Testy v tools/test-decks.js ověřují, že oba soubory sedí. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const TXT = path.join(ROOT, "okruhy", "vychozi.txt");
const JS = path.join(ROOT, "assets", "data-vlastni.js");

const raw = fs.readFileSync(TXT, "utf8").replace(/\r\n/g, "\n").replace(/\s+$/, "");

/* 1) text musí projít parserem bez chyb */
const sandbox = { window: { SPANELSTINA: { defaultDecksText: raw } }, localStorage: { getItem: () => null, setItem: () => {} } };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, "assets", "decks.js"), "utf8"), sandbox);
const parsed = sandbox.window.DECKS.parse(raw);
const words = parsed.decks.reduce((n, d) => n + d.words.length, 0);

if (!parsed.decks.length) {
  console.error("okruhy/vychozi.txt neobsahuje žádný okruh — nechci tím přepsat data-vlastni.js");
  process.exit(1);
}
if (parsed.skipped.length) {
  console.error("V okruhy/vychozi.txt jsou řádky, které parser odmítl:");
  parsed.skipped.forEach((s) => console.error(`  řádek ${s.line}: „${s.text.trim()}“ — ${s.why}`));
  process.exit(1);
}

/* 2) vygenerovat JS */
const body = raw.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
const out = `/* Výchozí sada okruhů — NEUPRAVUJ RUČNĚ.
   Změň okruhy/vychozi.txt a spusť: node tools/sync-defaults.js
   (testy v tools/test-decks.js hlídají, že oba soubory sedí).

   Tato kopie je potřeba, protože se z index.html otevřeného přímo z disku
   (file://) nedá fetchnout sousední .txt — prohlížeč to zablokuje. */
window.SPANELSTINA = window.SPANELSTINA || {};

/* ${parsed.decks.length} okruhů, ${words} slov */
window.SPANELSTINA.defaultDecksText = \`${body}\`;
`;
fs.writeFileSync(JS, out);

console.log(`assets/data-vlastni.js zapsán: ${parsed.decks.length} okruhů, ${words} slov`);
parsed.decks.forEach((d) => {
  const extra = d.note ? ` (poznámka: ${d.note})` : "";
  console.log(`  ${String(d.words.length).padStart(3)} slov  ${d.name}${d.csName ? " – " + d.csName : ""}${extra}`);
});
