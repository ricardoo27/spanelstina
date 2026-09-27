/* Španelština — okruhy: čtení souboru okruhy/vychozi.txt
   Okruhy se nikam neukládají, pokaždé se jen načtou ze souboru — jediný zdroj
   pravdy je ten .txt v repu. Formát (oddělovač je en/em dash nebo " - "):

     LOS ANIMALES – ZVÍŘATA
     el perro – pes
     el gato – kočka

     LA CASA – DŮM / BYDLENÍ
     la mesa – stůl
*/
(function () {
  "use strict";

  /* en/em dash nemá v španělštině význam, takže ho bereme vždy;
     obyčejné minus jen když je obklopené mezerami (aby se nerozbilo "post-it") */
  var SEP = /(?:\s*[–—]\s*)|(?:\s+-\s+)/;

  var ARTICLE = /^(el|la|los|las|un|una|unos|unas)\s+/i;

  var decks = [];

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

  function countWords(s) {
    return s.split(/\s+/).filter(Boolean).length;
  }

  function newDeck(name, csName) {
    return { id: "U:" + (slug(name) || "okruh"), name: name, csName: csName, note: "", words: [], index: {} };
  }

  /* text -> { decks, skipped }
     Poznámka k okruhu: řádek bez oddělovače, který má aspoň 4 slova a není nadpis
     (např. "Zopakujte si čísla 1–100…"). Jednoslovný řádek bez oddělovače je
     raději chyba — bez překladu se slovíčkem nic neudělá. */
  function parse(text) {
    var out = [];
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
            seen[deck.id] = out.length;
            out.push(deck);
            current = deck;
          } else {
            current = out[at];
          }
          return;
        }

        /* poznámka k okruhu */
        if (!parts && countWords(left) >= 4) {
          if (!current) {
            current = newDeck("Bez názvu", "");
            out.push(current);
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
          out.push(current);
        }
        if (current.index[left] !== undefined) {
          skipped.push({ line: i + 1, text: raw, why: "„" + left + "“ už v okruhu je" });
          return;
        }
        current.index[left] = true;
        current.words.push({ es: left, cs: right, g: genderOf(left), pos: "n", ex: "" });
      });

    out.forEach(function (d) { delete d.index; });   /* pomocná struktura jen na dobu parsingu */
    return { decks: out, skipped: skipped };
  }

  window.DECKS = {
    /* nahradí okruhy novým souborem; vrací { decks, skipped } jako parse() */
    set: function (text) {
      var r = parse(text);
      decks = r.decks;
      return r;
    },
    all: function () { return decks; },
    /* okruhy, z nichž se dá procvičovat — prázdný okruh (jen nadpis a poznámka)
       v mřížce okruhů nabídnout nemá smysl */
    practiceable: function () {
      return decks.filter(function (d) { return d.words.length; });
    },
    get: function (id) {
      for (var i = 0; i < decks.length; i++) if (decks[i].id === id) return decks[i];
      return null;
    },
    parse: parse
  };
})();
