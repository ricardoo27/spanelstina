#!/usr/bin/env node
/* Test plánování relace: node tools/test-plan.js
   Pustí celé assets/app.js nad falešným DOM a hlídá, že se procvičovat dá
   opakovaně — i když na dnes už není co opakovat. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const SOURCE = fs.readFileSync(path.join(ROOT, "okruhy", "vychozi.txt"), "utf8");

/* ---------- minimum DOM, aby app.js naběhla ---------- */

function makeEl(tag) {
  return {
    tagName: tag || "div",
    children: [],
    style: {},
    dataset: {},
    attrs: {},
    hidden: false,
    disabled: false,
    value: "",
    className: "",
    textContent: "",
    innerHTML: "",
    listeners: {},
    classList: {
      _set: new Set(),
      add(...c) { c.forEach((x) => this._set.add(x)); },
      remove(...c) { c.forEach((x) => this._set.delete(x)); },
      contains(c) { return this._set.has(c); },
      toggle(c) { this._set.has(c) ? this._set.delete(c) : this._set.add(c); }
    },
    setAttribute(k, v) { this.attrs[k] = v; },
    appendChild(c) { this.children.push(c); return c; },
    addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); },
    click() { (this.listeners.click || []).forEach((f) => f({ target: this })); },
    focus() {},
    querySelectorAll() { return []; },
    closest() { return null; }
  };
}

/* appka naběhne nad textem okruhů; prázdný text = stránka bez okruhů */
function boot(text) {
  const store = {};
  const byId = {};
  const document = {
    getElementById(id) { return byId[id] || (byId[id] = makeEl("div")); },
    createElement(tag) { return makeEl(tag); },
    addEventListener() {}
  };
  const sandbox = {
    document,
    localStorage: {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; }
    },
    console,
    setTimeout,
    scrollTo() {},
    /* fetch() okruhy/vychozi.txt — stejně jako na GitHub Pages */
    fetch: (url) => url.startsWith("okruhy/")
      ? Promise.resolve({ ok: true, text: () => Promise.resolve(text) })
      : Promise.reject(new Error("404"))
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  ["decks.js", "srs.js", "app.js"].forEach((f) => {
    vm.runInContext(fs.readFileSync(path.join(ROOT, "assets", f), "utf8"), sandbox, { filename: f });
  });
  return {
    win: sandbox,
    el: (id) => sandbox.document.getElementById(id),
    all: () => sandbox.DECKS.practiceable().reduce((a, d) => a.concat(
      d.words.map((w) => Object.assign({ deck: d.id }, w))
    ), []),
    reload: () => sandbox.document.getElementById("back-btn").click()   /* překreslí úvod */
  };
}

/* ---------- tvrzení ---------- */

let failed = 0;
function is(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failed++;
  console.log((ok ? "  ✓ " : "  ✗ ") + label + (ok ? "" : `\n      očekáváno: ${JSON.stringify(expected)}\n      dostáno:   ${JSON.stringify(actual)}`));
}
function ok(label, value) { is(label, !!value, true); }

const tick = () => new Promise((r) => setTimeout(r, 0));

/* klikne na dlaždík podle textu, třeba na počet nových karet */
function pick(app, containerId, text) {
  const hit = app.el(containerId).children.find((c) => c.textContent === text);
  if (!hit) throw new Error("nenalezeno: " + text);
  hit.click();
}

(async function () {
  const app = boot(SOURCE);
  await tick();   /* počkáme, než se okruhy načtou z fetch() */
  const { win, el, all, reload } = app;
  const SRS = win.SRS;
  const N = all().length;

  console.log("výchozí stav (všechno nové)");
  is("slovíček v sade", N > 40, true);
  is("tlačítko nabízí jen nové karty", el("start-btn").textContent, "Začít (20)");
  is("tlačítko žije", el("start-btn").disabled, false);
  is("poznámka u tlačítka", el("queue-note").textContent, "K procvičení teď: 20 nových.");
  ok("už žádný stav „všechno probrané“", el("start-btn").textContent.indexOf("probrané") < 0);

  console.log("\nrelace jede");
  el("start-btn").click();
  is("relace má 20 karet", el("progress-text").textContent, "0 / 20");
  el("back-btn").click();

  console.log("\ndvě vyžádané karty se nesmí rozbít řazením");
  SRS.reset();
  SRS.grade("U:los-colores|rojo/a", 0);
  SRS.grade("U:los-colores|azul", 0);
  is("obě jsou vyžádané", SRS.queue(all()).due.map((e) => e.es).sort(), ["azul", "rojo/a"]);
  reload();
  is("tlačítko je nabídne", el("queue-note").textContent, "K procvičení teď: 2 vyžádaných, 20 nových.");

  console.log("\nuž je všechno zvládnuté — relace se dá zopakovat");
  SRS.reset();
  all().forEach((e) => SRS.grade(e.deck + "|" + e.es, 2));
  const q = SRS.queue(all());
  is("dnes už není nic vyžádaného", q.due.length, 0);
  is("ani nic nového", q.fresh.length, 0);
  is("extra = všechna slovíčka", q.extra.length, N);
  ok("extra neopakuje kartu dvakrát", q.extra.every((e) => q.due.indexOf(e) < 0 && q.fresh.indexOf(e) < 0));
  reload();
  is("tlačítko láte na opakování", el("start-btn").textContent, "Procvičit znovu (20)");
  is("tlačítko žije", el("start-btn").disabled, false);
  is("poznámka", el("queue-note").textContent, "K procvičení teď: 20 na opakování.");
  el("start-btn").click();
  is("opakování má 20 karet", el("progress-text").textContent, "0 / 20");
  el("back-btn").click();
  el("again-btn").click();
  is("a další kolo ze shrnutí taky", el("progress-text").textContent, "0 / 20");
  el("back-btn").click();

  console.log("\nvolba délky relace platí i pro opakování");
  pick(app, "limit-chips", "50");
  is("50 na opakování", el("queue-note").textContent, "K procvičení teď: 50 na opakování.");
  is("tlačítko", el("start-btn").textContent, "Procvičit znovu (50)");
  pick(app, "limit-chips", "10");
  is("10 na opakování", el("queue-note").textContent, "K procvičení teď: 10 na opakování.");
  pick(app, "limit-chips", "20");

  console.log("\nopakování jde od nejslabších karet");
  SRS.reset();
  SRS.grade("U:los-colores|rojo/a", 2);
  SRS.grade("U:los-colores|rojo/a", 2);
  SRS.grade("U:los-colores|rojo/a", 2);
  SRS.grade("U:los-colores|azul", 2);
  is("napřed má slabší karta", SRS.queue(all()).extra.slice(0, 2).map((e) => e.es), ["azul", "rojo/a"]);

  console.log("\nvyžádané karty mají přednost před opakováním");
  SRS.reset();
  all().forEach((e) => SRS.grade(e.deck + "|" + e.es, 2));
  SRS.grade("U:los-colores|azul", 0);   /* tohle se musí vrátit dnes */
  pick(app, "limit-chips", "10");
  is("nejdřív vyžádaná, pak opakování", el("queue-note").textContent, "K procvičení teď: 1 vyžádaných, 9 na opakování.");
  is("tlačítko", el("start-btn").textContent, "Začít (10)");

  console.log("\nbez okruhů je tlačítko mrtvé (a neříká „probrané“)");
  const empty = boot("");
  await tick();
  is("tlačítko mrtvé", empty.el("start-btn").disabled, true);
  is("text tlačítka", empty.el("start-btn").textContent, "Žádné okruhy");
  is("poznámka", empty.el("queue-note").textContent, "V tomto okruhu nejsou žádná slovíčka.");

  console.log(failed ? `\n${failed} testů selhalo` : "\nvšechny testy prošly ✓");
  process.exit(failed ? 1 : 0);
})();
