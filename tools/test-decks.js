#!/usr/bin/env node
/* Test parseru vlastních okruhů: node tools/test-decks.js */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

/* localStorage jako v prohlížeči, ať se dá otestovat i ukládání */
function fakeStorage(initial) {
  const data = Object.assign({}, initial);
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
  };
}

function loadDECKS(storage, defaultText) {
  const sandbox = { window: { SPANELSTINA: { defaultDecksText: defaultText } }, localStorage: storage };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "assets", "decks.js"), "utf8"), sandbox);
  return { DECKS: sandbox.window.DECKS, sandbox };
}

const storage = fakeStorage();
const { DECKS } = loadDECKS(storage);

let failed = 0;
function is(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failed++;
  console.log((ok ? "  ✓ " : "  ✗ ") + label + (ok ? "" : `\n      očekáváno: ${JSON.stringify(expected)}\n      dostáno:   ${JSON.stringify(actual)}`));
}

/* --- tvůj soubor --- */
const text = fs.readFileSync(path.join(__dirname, "sample-okruhy.txt"), "utf8");
const r = DECKS.parse(text);

console.log("sample-okruhy.txt");
is("2 okruhy", r.decks.length, 2);
is("názvy", r.decks.map((d) => d.name), ["LOS ANIMALES", "LA CASA"]);
is("české názvy", r.decks.map((d) => d.csName), ["ZVÍŘATA", "DŮM / BYDLENÍ"]);
is("9 slov v prvním", r.decks[0].words.length, 9);
is("13 slov ve druhém", r.decks[1].words.length, 13);
is("id okruhu", r.decks[0].id, "U:los-animales");
is("překlad", r.decks[0].words[0], { es: "el perro", cs: "pes", g: "m", pos: "n", ex: "" });
is("rod la", DECKS.parse("TEMA 1 – Y\nla vaca – kráva").decks[0].words[0].g, "f");
is("rod los", DECKS.parse("TEMA 1 – Y\nlos gatos – kočky").decks[0].words[0].g, "m");
is("bez článku", DECKS.parse("TEMA 1 – Y\nperro – pes").decks[0].words[0].g, "-");
is("lomítka ve variantách", DECKS.parse("TEMA 1 – Y\nla estantería – polička / knihovna").decks[0].words[0].cs, "polička / knihovna");
is("přeskočeno", r.skipped, []);
is("round-trip počet slov", DECKS.parse(DECKS.serialize(r.decks)).decks.map((d) => d.words.length), [9, 13]);

/* --- krajní případy --- */
console.log("\nkrajní případy");
is("okruh bez překladu v nadpisu", DECKS.parse("LOS PERROS\nel gato – kočka").decks[0].csName, "");
is("slovíčko bez článku v nadpisu", DECKS.parse("MI PERROS – MOJE PSI\nel gato – kočka").decks[0].csName, "MOJE PSI");
is("komentáře a prázdné řádky", DECKS.parse("# poznámka\n\nTEMA 1 – Y\na – b\n\n").decks[0].words.length, 1);
is("slovíčko bez překladu se přeskočí", DECKS.parse("TEMA 1 – Y\nel gato\nla mesa – stůl").decks[0].words.length, 1);
is("slovíčko před nadpisem se neztratí", DECKS.parse("el gato – kočka\nTEMA 1 – Y\nla mesa – stůl").decks[0].name, "Bez názvu");
is("slovíčko před nadpisem má vlastní okruh", DECKS.parse("el gato – kočka\nTEMA 1 – Y\nla mesa – stůl").decks[1].name, "TEMA 1");
is("opakování nadpisu pokračuje", DECKS.parse("TEMA 1 – Y\na – b\nTEMA 1 – Y\nc – d").decks.length, 1);
is("opakování nadpisu nezdvojuje slovíčka", DECKS.parse("TEMA 1 – Y\na – b\nTEMA 1 – Y\nc – d").decks[0].words.length, 2);
is("duplicitní slovíčko se přeskočí", DECKS.parse("TEMA 1 – Y\na – b\na – jiné").decks[0].words.length, 1);
is("a nahlásí se", DECKS.parse("TEMA 1 – Y\na – b\na – jiné").skipped[0].why, "„a“ už v okruhu je");
is("a hlásí chybu", DECKS.parse("TEMA 1 – Y\nel gato").skipped.length, 1);
is("BOM na začátku", DECKS.parse("﻿TEMA 1 – Y\na – b").decks[0].name, "TEMA 1");
is("minus s mezerami jako oddělovač", DECKS.parse("TEMA 1 - Y\na - b").decks[0].words[0].cs, "b");
is("minus uvnitř slova se nedotkne", DECKS.parse("TEMA 1 – Y\npost-it – lepítko").decks[0].words[0].es, "post-it");
is("CRLF", DECKS.parse("TEMA 1 – Y\r\na – b\r\n").decks[0].words.length, 1);
is("opakování stejného okruhu", DECKS.parse("TEMA 1 – Y\na – b\n\nTEMA 1 – Y\nc – d").decks.length, 1);
is("prázdný vstup", DECKS.parse("").decks.length, 0);
is("nadpis bez slov zůstane", DECKS.parse("TEMA 1 – Y\n").decks.map((d) => d.words.length), [0]);
is("nadpis bez slov se neprocvičuje", DECKS.parse("TEMA 1 – Y\n").decks[0].words.length === 0, true);

/* --- poznámka k okruhu --- */
console.log("\npoznámky");
const num = DECKS.parse("LOS NÚMEROS – ČÍSLA\nZopakujte si čísla 1–100, včetně jejich zápisu slovy.");
is("poznámka není slovíčko", num.decks[0].words.length, 0);
is("poznámka je uložená", num.decks[0].note, "Zopakujte si čísla 1–100, včetně jejich zápisu slovy.");
is("poznámka není chyba", num.skipped, []);
is("poznámka přežije round-trip",
  DECKS.parse(DECKS.serialize(num.decks)).decks[0].note,
  "Zopakujte si čísla 1–100, včetně jejich zápisu slovy.");
is("krátký řádek bez překladu je pořád chyba",
  DECKS.parse("TEMA 1 – Y\nel gato").skipped.map((s) => s.why),
  ["chybí překlad za –"]);

/* --- výchozí sada a ukládání --- */
console.log("\nvýchozí sada");
const defaults = fs.readFileSync(path.join(__dirname, "..", "assets", "data-vlastni.js"), "utf8");
const sourceTxt = fs.readFileSync(path.join(__dirname, "..", "okruhy", "vychozi.txt"), "utf8");
const defaultText = (function () {
  const box = { window: {} };
  vm.createContext(box);
  vm.runInContext(defaults, box);
  return box.window.SPANELSTINA.defaultDecksText;
})();
/* pocity se odvodeji ze souboru, ne fixne — at si clovek muze vychozi sadu upravit */
const parsedDefaults = DECKS.parse(sourceTxt);
const N_DECKS = parsedDefaults.decks.length;
const N_WORDS = parsedDefaults.decks.reduce((n, d) => n + d.words.length, 0);
const N_EMPTY = parsedDefaults.decks.filter((d) => !d.words.length).length;

is("výchozí sada má aspoň 5 okruhů", N_DECKS >= 5, true);
is("výchozí sada má slovíčka", N_WORDS >= 40, true);
is("okruh ZVÍŘATA existuje", !!parsedDefaults.decks.find((d) => d.id === "U:los-animales"), true);
is("rozmezí 1–100 se nerozbije", DECKS.parse("TEMA 1 – Y\nPozor na čísla 1–100 a 2–3, tady.").decks[0].words.length, 0);

const store2 = fakeStorage();
const fresh = loadDECKS(store2, defaultText);
const seeded = fresh.DECKS.seed();
is("seed napoprvé okruh", seeded.decks.length, N_DECKS);
is("seed napoprvé slov", fresh.DECKS.count(), N_WORDS);
is("seed uloží do localStorage", JSON.parse(store2.data["spanelstina.decks.v1"]).seeded, true);
is("seed podruhé nic", fresh.DECKS.seed(), null);
fresh.DECKS.remove("U:los-animales");
is("po smazání zůstalo", fresh.DECKS.all().length, N_DECKS - 1);
is("smazání se po novém načtení nevrací", loadDECKS(store2, defaultText).DECKS.all().length, N_DECKS - 1);
is("prázdný okruh se neprocvičuje", [fresh.DECKS.all().length, fresh.DECKS.practiceable().length], [N_DECKS - 1, N_DECKS - 1 - N_EMPTY]);
is("starý tvar uložení se načte", loadDECKS(fakeStorage({ "spanelstina.decks.v1": '[{"id":"U:x","name":"X","words":[{"es":"a","cs":"b"}]}]' })).DECKS.all().length, 1);
is("prázdné localStorage = žádné okruhy", loadDECKS(fakeStorage(), defaultText).DECKS.all().length, 0);

/* --- data-vlastni.js musí být přesná kopie okruhy/vychozi.txt --- */
console.log("\nsoulad souborů");
/* dlouhe texty nechci vypisovat — staci rict, ktera radek se lisi */
const txtNorm = sourceTxt.replace(/\r\n/g, "\n").replace(/\s+$/, "");
const firstDiff = (function () {
  const a = defaultText.split("\n"), b = txtNorm.split("\n");
  for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i] !== b[i]) return i + 1;
  return 0;
})();
is("data-vlastni.js odpovídá okruhy/vychozi.txt", firstDiff, 0);
if (firstDiff) {
  console.log(`      rozdíl na řádku ${firstDiff}:`);
  console.log(`      vychozi.txt:      ${JSON.stringify(txtNorm.split("\n")[firstDiff - 1])}`);
  console.log(`      data-vlastni.js:  ${JSON.stringify(defaultText.split("\n")[firstDiff - 1])}`);
  console.log("      spusť: node tools/sync-defaults.js");
}
is("okruhy/vychozi.txt projde parserem bez chyb", DECKS.parse(sourceTxt).skipped, []);
is("sync-defaults.js existuje", fs.existsSync(path.join(__dirname, "sync-defaults.js")), true);
is("diakritika v nadpisu", DECKS.parse("RŮŽE A BARVY – BARVY\nrojo – červená").decks[0].id, "U:ruze-a-barvy");

console.log(failed ? `\n${failed} testů selhalo` : "\nvšechny testy prošly ✓");
process.exit(failed ? 1 : 0);
