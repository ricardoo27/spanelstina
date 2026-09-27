#!/usr/bin/env node
/* Test čtení okruhů ze souboru: node tools/test-decks.js */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

/* assets/decks.js jako v prohlížeči */
function loadDECKS() {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "assets", "decks.js"), "utf8"), sandbox);
  return sandbox.window.DECKS;
}

const DECKS = loadDECKS();

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
is("diakritika v nadpisu", DECKS.parse("RŮŽE A BARVY – BARVY\nrojo – červená").decks[0].id, "U:ruze-a-barvy");

/* --- poznámka k okruhu --- */
console.log("\npoznámky");
const num = DECKS.parse("LOS NÚMEROS – ČÍSLA\nZopakujte si čísla 1–100, včetně jejich zápisu slovy.");
is("poznámka není slovíčko", num.decks[0].words.length, 0);
is("poznámka je uložená", num.decks[0].note, "Zopakujte si čísla 1–100, včetně jejich zápisu slovy.");
is("poznámka není chyba", num.skipped, []);
is("krátký řádek bez překladu je pořád chyba",
  DECKS.parse("TEMA 1 – Y\nel gato").skipped.map((s) => s.why),
  ["chybí překlad za –"]);

/* --- DECKS.set: okruhy se jen čtou ze souboru, neukládají se --- */
console.log("\nset()");
is("před načtením nic", DECKS.all().length, 0);
const set = DECKS.set(text);
is("set vrací okruhy i chyby", [set.decks.length, set.skipped.length], [2, 0]);
is("all() má co číst", DECKS.all().map((d) => d.id), ["U:los-animales", "U:la-casa"]);
is("get() najde okruh", DECKS.get("U:la-casa").csName, "DŮM / BYDLENÍ");
is("get() neznámé id vrátí null", DECKS.get("U:nic"), null);
is("prázdný okruh se neprocvičuje", DECKS.practiceable().length, 2);
DECKS.set("TEMA 1 – Y\n\nTEMA 2 – Z\na – b");
is("set nahrazuje celý soubor", DECKS.all().length, 2);
is("prázdný okruh se neprocvičuje", DECKS.practiceable().map((d) => d.id), ["U:tema-2"]);
DECKS.set("");
is("prázdný soubor = žádné okruhy", [DECKS.all().length, DECKS.practiceable().length], [0, 0]);

/* --- výchozí sada --- */
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
const parsedDefaults = DECKS.set(sourceTxt);
const N_DECKS = parsedDefaults.decks.length;
const N_WORDS = parsedDefaults.decks.reduce((n, d) => n + d.words.length, 0);

is("výchozí sada má aspoň 5 okruhů", N_DECKS >= 5, true);
is("výchozí sada má slovíčka", N_WORDS >= 40, true);
is("okruh ZVÍŘATA existuje", !!DECKS.get("U:los-animales"), true);
is("všechny okruhy se procvičují", DECKS.practiceable().length, N_DECKS);
is("rozmezí 1–100 se nerozbije", DECKS.parse("TEMA 1 – Y\nPozor na čísla 1–100 a 2–3, tady.").decks[0].words.length, 0);

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

console.log(failed ? `\n${failed} testů selhalo` : "\nvšechny testy prošly ✓");
process.exit(failed ? 1 : 0);
