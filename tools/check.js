#!/usr/bin/env node
/* Kontrola výchozí sady v okruhy/vychozi.txt: duplicity, shoda názvů,
   divné znaky a chyby, které by nešlo opravit ručně v prohlížeči.
   Parser je stejný jako v prohlížeči (assets/decks.js), takže co projde tady,
   to se načte i v aplikaci. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const text = fs.readFileSync(path.join(root, "okruhy", "vychozi.txt"), "utf8");

const store = {};
const sandbox = { window: { localStorage: {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); }
} } };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, "assets", "decks.js"), "utf8"), sandbox);
const DECKS = sandbox.window.DECKS;

const problems = [];

/* shoda bez diakritiky a bez článků — "El Perro" a "el perro" jsou duplicitní */
const norm = (s) => String(s)
  .toLowerCase()
  .normalize("NFD")
  .replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9ñ\s]/g, " ")
  .replace(/\s+/g, " ")
  .trim();

/* znaky, které se ve španělském hesle vyskytují nesmějí */
const OK_ES = "áéíóúüñÁÉÍÓÚÜÑ¿¡(),.;:!?—–/\"' 0-9%";
const OK_CS = "áčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ()–—.,!?/\"' 0-9%";

const { decks, skipped } = DECKS.parse(text);
skipped.forEach((s) => problems.push(`řádek ${s.line}: přeskočen (${s.why}) — ${s.text.trim()}`));

/* dva okruhy se stejným normalizovaným názvem by se sloučily do jednoho id */
const byId = new Map();
decks.forEach((d) => {
  const prev = byId.get(d.id);
  if (prev) problems.push(`„${d.name}“ má stejné ID jako „${prev.name}“ (${d.id}) — sloučily by se`);
  else byId.set(d.id, d);
});

decks.forEach((d) => {
  const at = d.name;
  if (!d.words.length) problems.push(`${at}: okruh bez slovíček — nebude se dá procvičit`);

  const seenEs = new Map();
  const seenCs = new Map();
  d.words.forEach((w) => {
    const es = w.es, cs = w.cs;
    const kEs = norm(es), kCs = norm(cs);

    if (!kEs || !kCs) problems.push(`${at}: prázdné heslo nebo překlad`);
    if (seenEs.has(kEs)) problems.push(`${at}: duplicitní heslo „${es}“ (také ${seenEs.get(kEs)})`);
    else seenEs.set(kEs, es);
    if (seenCs.has(kCs)) problems.push(`${at}: duplicitní překlad „${cs}“ (také ${seenCs.get(kCs)})`);
    else seenCs.set(kCs, cs);

    if (kEs && kEs === kCs) problems.push(`${at}: heslo a překlad jsou stejné: „${es}“`);

    for (const ch of es) {
      if (!OK_ES.includes(ch) && !/[a-zA-ZñÑ]/.test(ch)) {
        problems.push(`${at}: divný znak „${ch}“ v hesle „${es}“`);
        break;
      }
    }
    for (const ch of cs) {
      if (!OK_CS.includes(ch) && !/[a-zA-Zà-ž]/.test(ch)) {
        problems.push(`${at}: divný znak „${ch}“ v překladu „${cs}“`);
        break;
      }
    }
  });

  console.log(`${d.csName || d.name}: ${d.words.length} slov`);
});

const total = decks.reduce((n, d) => n + d.words.length, 0);
console.log(`celkem: ${decks.length} okruhů, ${total} slov`);

if (problems.length) {
  console.log(`\n${problems.length} problémů:`);
  problems.forEach((p) => console.log("  - " + p));
  process.exit(1);
}
console.log("\nvše v pořádku ✓");
