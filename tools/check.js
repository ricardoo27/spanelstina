#!/usr/bin/env node
/* Kontrola slovníků: duplicity, chybějící pole, podezřelé znaky v příkladech. */
const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "..", "assets");
const files = fs.readdirSync(dir).filter((f) => /^data-.*\.js$/.test(f));

const sandbox = { window: {} };
for (const f of files) {
  const code = fs.readFileSync(path.join(dir, f), "utf8");
  new Function("window", code)(sandbox.window);
}

const levels = sandbox.window.SPANELSTINA.levels;
const problems = [];

/* znaky, které se ve španělské větě vyskytují nesmějí */
const OK_EX = "áéíóúüñÁÉÍÓÚÜÑ¿¡(),.;:!?—–/\"' 0-9%";

const strip = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/* sloveso má ve větě jinou podobu (bebo, tengo, haré…), takže stačí
   společná začáteční písmena; číslovky a výrazy kontrolujeme jinak */
const hasStem = (exWords, key) => {
  const k = strip(key);
  if (k.length < 4) return true;
  return exWords.some(
    (w) =>
      w === k ||
      (w.length >= 4 && k.length >= 4 && (w.startsWith(k.slice(0, 4)) || k.startsWith(w.slice(0, 4))))
  );
};

/* nepravidelná slovesa — infinitiv se ve větě objeví ve změněné podobě */
const IRREGULAR = new Set([
  "ser", "estar", "tener", "hacer", "decir", "poder", "querer", "salir", "volver",
  "dormir", "doler", "deber", "leer", "mirar", "entender", "seguir", "impedir",
  "sugerir", "beber", "negar", "acordarse de", "dejar de", "malo"
]);

for (const [level, entries] of Object.entries(levels)) {
  const seen = new Map();
  entries.forEach((e, i) => {
    const at = `${level}[${i}]`;

    for (const key of ["es", "cs", "g", "pos", "ex"]) {
      if (!e[key] || typeof e[key] !== "string") problems.push(`${at}: chybí/neplatné pole "${key}"`);
    }
    if (!["m", "f", "-"].includes(e.g)) problems.push(`${at}: špatný rod "${e.g}"`);
    if (!["n", "v", "adj", "adv", "expr", "num"].includes(e.pos))
      problems.push(`${at}: špatný slovní druh "${e.pos}"`);

    /* duplicity v rámci úrovně */
    const key = strip(e.es);
    if (seen.has(key)) problems.push(`${at}: duplicita "${e.es}" (také ${seen.get(key)})`);
    else seen.set(key, at);

    /* shoda rodu: sloveso/přídavné/příslovce bez rodu, podstatné s rodem */
    if (e.pos === "n" && e.g === "-") problems.push(`${at}: podstatné jméno "${e.es}" bez rodu`);
    if (["v", "adj", "adv", "num"].includes(e.pos) && e.g !== "-")
      problems.push(`${at}: "${e.pos}" má rod "${e.g}"`);

    /* podezřelé znaky v příkladu */
    for (const ch of e.ex || "") {
      if (!OK_EX.includes(ch) && !/[a-zA-ZñÑ]/.test(ch)) {
        problems.push(`${at}: divný znak "${ch}" v příkladu: ${e.ex}`);
        break;
      }
    }
    if (/[぀-ヿ一-鿿가-힯]/.test(e.ex || "") || /[぀-ヿ一-鿿가-힯]/.test(e.es || "")) {
      problems.push(`${at}: asijské znaky v záznamu: ${e.es}`);
    }

    /* příklad by měl obsahovat heslo (bez článců) */
    const exWords = strip(e.ex).split(" ");
    const keyWords = strip(e.es)
      .split(" ")
      .filter((w) => !["el", "la", "los", "las", "un", "una", "de", "a", "y", "en"].includes(w));
    if (keyWords.length && !keyWords.some((w) => hasStem(exWords, w)) && !IRREGULAR.has(key)) {
      problems.push(`${at}: příklad neobsahuje heslo "${e.es}" → ${e.ex}`);
    }
  });

  console.log(`${level}: ${entries.length} záznamů`);
}

const total = Object.values(levels).reduce((n, e) => n + e.length, 0);
console.log(`celkem: ${total}`);

if (problems.length) {
  console.log(`\n${problems.length} problémů:`);
  problems.forEach((p) => console.log("  - " + p));
  process.exit(1);
}
console.log("\nvše v pořádku ✓");
