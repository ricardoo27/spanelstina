/* Španelština — vlastní okruhy: parsování souboru a ukládání
   Očekávaný formát (oddělovač je en/em dash nebo " - "):

     LOS ANIMALES – ZVÍŘATA
     el perro – pes
     el gato – kočka

     LA CASA – DŮM / BYDLENÍ
     la mesa – stůl
*/
(function () {
  "use strict";

  var KEY = "spanelstina.decks.v1";

  /* en/em dash nemá v španělštině význam, takže ho bereme vždy;
     obyčejné minus jen když je obklopené mezerami (aby se nerozbilo "post-it") */
  var SEP = /(?:\s*[–—]\s*)|(?:\s+-\s+)/;

  var ARTICLE = /^(el|la|los|las|un|una|unos|unas)\s+/i;

  /* --- čtení souboru --- */

  function splitLine(line) {
    var at = 0;
    while (at < line.length) {
      var m = line.slice(at).match(SEP);
      if (!m) return null;
      var start = at + m.index;
      var end = start + m[0].length;
      /* rozmezí čísel ("1–100") není oddělovač */
      if (!/\d/.test(line.charAt(start - 1)) || !/\d/.test(line.charAt(end))) {
        return {
          left: line.slice(0, start).trim(),
          right: line.slice(end).trim()
        };
      }
      at = end;
    }
    return null;
  }

  /* nadpis okruhu: "LOS ANIMALES", "LA CASA", "Tema 2" … */
  function looksLikeHeading(s) {
    var letters = s.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, "");
    if (letters.length < 3) return false;
    var upper = letters.replace(/[^A-ZÁÉÍÓÚÑ]/g, "").length;
    return upper / letters.length >= 0.6;
  }

  function genderOf(es) {
    var m = es.match(ARTICLE);
    if (!m) return "-";
    var a = m[1].toLowerCase();
    return a === "la" || a === "las" || a === "una" || a === "unas" ? "f" : "m";
  }

  function slug(name) {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  /* text -> { decks, skipped }
     Poznámka k okruhu: řádek bez oddělovače, který má aspoň 4 slova a není nadpis
     (např. "Zopakujte si čísla 1–100…"). Jednoslovný řádek bez oddělovače je
     raději chyba — bez překladu se slovíčkem nic neudělá. */
  function parse(text) {
    var decks = [];
    var skipped = [];
    var current = null;
    var seen = {};

    String(text || "")
      .replace(/^﻿/, "")
      .split(/\r?\n/)
      .forEach(function (raw, i) {
        var line = raw.trim();
        if (!line || line.charAt(0) === "#") return;

        var parts = splitLine(line);
        var left = parts ? parts.left : line;
        var right = parts ? parts.right : "";

        if (!left) {
          skipped.push({ line: i + 1, text: raw, why: "prázdná položka" });
          return;
        }

        /* nadpis okruhu; když se objeví podruhé, pokračuje se v tom samém */
        if (looksLikeHeading(left)) {
          var deck = newDeck(left, right);
          var at = seen[deck.id];
          if (at === undefined) {
            seen[deck.id] = decks.length;
            decks.push(deck);
            current = deck;
          } else {
            current = decks[at];
          }
          return;
        }

        /* poznámka k okruhu */
        if (!parts && countWords(left) >= 4) {
          if (!current) {
            current = newDeck("Bez názvu", "");
            decks.push(current);
          }
          current.note = current.note ? current.note + " " + line : line;
          return;
        }

        /* slovíčko */
        if (!right) {
          skipped.push({ line: i + 1, text: raw, why: "chybí překlad za –" });
          return;
        }
        if (!current) {
          current = newDeck("Bez názvu", "");
          decks.push(current);
        }
        if (current.index[left] !== undefined) {
          skipped.push({ line: i + 1, text: raw, why: "„" + left + "“ už v okruhu je" });
          return;
        }
        current.index[left] = true;
        current.words.push({ es: left, cs: right, g: genderOf(left), pos: "n", ex: "" });
      });

    return { decks: decks, skipped: skipped };
  }

  function countWords(s) {
    return s.split(/\s+/).filter(Boolean).length;
  }

  function newDeck(name, csName) {
    return { id: "U:" + (slug(name) || "okruh"), name: name, csName: csName, note: "", words: [], index: {} };
  }

  /* --- zápis --- */

  function serialize(decks) {
    return decks
      .map(function (d) {
        var head = (d.name || "OKRUH").toUpperCase() + (d.csName ? " – " + d.csName.toUpperCase() : "");
        var out = [head];
        if (d.note) out.push(d.note);   /* poznámka — bez oddělovače, naimportuje se zpět */
        return out.concat(d.words.map(function (w) { return w.es + " – " + w.cs; })).join("\n");
      })
      .join("\n\n") + "\n";
  }

  /* starší verze ukládala pole přímo, nová { seeded, decks } — obě se načtou */
  function load() {
    var state = { seeded: false, decks: [] };
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return state;
      var data = JSON.parse(raw);
      if (Array.isArray(data)) state.decks = data;
      else if (data && Array.isArray(data.decks)) {
        state.decks = data.decks;
        state.seeded = !!data.seeded;
      }
    } catch (e) {
      /* poskozená data — začneme od prázdna */
    }
    state.decks = state.decks.filter(function (d) { return d && d.id && Array.isArray(d.words); });
    state.decks.forEach(function (d) { if (!d.note) d.note = ""; });
    return state;
  }

  var state = load();
  var decks = state.decks;

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({ seeded: state.seeded, decks: decks }));
    } catch (e) {
      /* soukromý režim — okruhy se ukážou, ale neuloží */
    }
  }

  /* Výchozí sada se načte jen jednou, aby ji smazání nevrátilo zpět.
     seed: true = už proběhlo (i když se nic nenačetlo). */
  function seed() {
    if (state.seeded) return null;
    state.seeded = true;
    var text = (window.SPANELSTINA || {}).defaultDecksText;
    if (!text) { save(); return null; }
    var r = parse(text);
    if (r.decks.length) { importAll(r.decks); return r; }
    save();
    return null;
  }

  function get(id) {
    for (var i = 0; i < decks.length; i++) if (decks[i].id === id) return decks[i];
    return null;
  }

  /* okruh se stejným id přepíše, jeho slovíčka si ale nechají historii */
  function importAll(parsed) {
    parsed.forEach(function (d) {
      delete d.index;              /* pomocná struktura jen na dobu parsingu */
      var i = decks.findIndex(function (x) { return x.id === d.id; });
      if (i >= 0) decks[i] = d;
      else decks.push(d);
    });
    save();
  }

  function remove(id) {
    decks = decks.filter(function (d) { return d.id !== id; });
    save();
  }

  window.DECKS = {
    all: function () { return decks; },
    /* okruhy, z nichž se dá procvičovat — prázdný okruh (jen nadpis a poznámka)
       v seznamu úrovní nabídnout nemá smysl */
    practiceable: function () {
      return decks.filter(function (d) { return d.words.length; });
    },
    get: get,
    parse: parse,
    serialize: serialize,
    importAll: importAll,
    remove: remove,
    seed: seed,
    count: function () {
      return decks.reduce(function (n, d) { return n + d.words.length; }, 0);
    }
  };
})();
