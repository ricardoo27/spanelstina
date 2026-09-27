/* Španelština — ukládání postupu a plánování opakování (SM-2 lite)
   Klíč karty: "ÚROVEŇ|španělské heslo", aby se progress držel zvlášť pro každou úroveň. */
(function () {
  "use strict";

  var KEY = "spanelstina.v1";
  var DAY = 86400000;

  var state = load();

  function load() {
    var empty = { cards: {}, streak: 0, lastDay: null, sessions: 0, answered: 0, correct: 0 };
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return empty;
      var data = JSON.parse(raw);
      if (!data || typeof data !== "object" || typeof data.cards !== "object") return empty;
      data.cards = data.cards || {};
      data.streak = data.streak || 0;
      data.answered = data.answered || 0;
      data.correct = data.correct || 0;
      data.sessions = data.sessions || 0;
      return data;
    } catch (e) {
      return empty;
    }
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      /* soukromý režim prohlížeče — appka funguje dál, jen neukládá */
    }
  }

  /* dnešní den jako pořadové číslo (bez času, jen kalendářní den) */
  function today() {
    var d = new Date();
    d.setHours(12, 0, 0, 0);
    return Math.round(d.getTime() / DAY);
  }

  function get(id) {
    return state.cards[id] || null;
  }

  /* nová karta: interval 0, ef 2.5, naplánovaná na dnes */
  function ensure(id) {
    if (!state.cards[id]) {
      state.cards[id] = { ef: 2.5, reps: 0, interval: 0, due: today(), seen: 0, lapses: 0 };
    }
    var c = state.cards[id];
    c.seen++;
    return c;
  }

  function isNew(id) {
    return !state.cards[id];
  }

  /* q: 0 = nevím, 1 = složité, 2 = jisté */
  function grade(id, q) {
    var c = ensure(id);
    c.last = today();
    if (q === 0) {
      c.ef = Math.max(1.3, c.ef - 0.2);
      c.reps = 0;
      c.interval = 0;
      c.due = today();
      c.lapses++;
    } else if (q === 1) {
      c.ef = Math.max(1.3, c.ef - 0.15);
      c.reps = Math.max(1, c.reps);
      c.interval = Math.max(1, c.interval === 0 ? 1 : Math.round(c.interval * 1.2));
      c.due = today() + c.interval;
    } else {
      c.ef = Math.min(2.8, c.ef + 0.05);
      c.reps++;
      if (c.reps === 1) c.interval = 1;
      else if (c.reps === 2) c.interval = 3;
      else c.interval = Math.min(180, Math.round(c.interval * c.ef));
      c.due = today() + c.interval;
    }
    save();
    return c;
  }

  /* karty k procvičení: nejdřív ty splněné, pak nové (neuspořádané) */
  function queue(entries) {
    var t = today();
    var due = [];
    var fresh = [];
    entries.forEach(function (e) {
      var id = e.level + "|" + e.es;
      var c = get(id);
      if (!c) {
        fresh.push(e);
      } else if (c.due <= t && c.seen > 0) {
        due.push(e);
      }
    });
    due.sort(function (a, b) {
      return get(a.level + "|" + a.es).due - get(b.level + "|" + b.es).due;
    });
    return { due: due, fresh: fresh };
  }

  function stats(entries) {
    var t = today();
    var due = 0;
    var learning = 0;
    var known = 0;
    var seen = 0;
    entries.forEach(function (e) {
      var c = get(e.level + "|" + e.es);
      if (!c) return;
      seen++;
      if (c.due <= t) due++;
      if (c.interval >= 4) known++;
      else learning++;
    });
    return { total: entries.length, due: due, learning: learning, known: known, seen: seen, fresh: entries.length - seen };
  }

  /* denní série */
  function touchStreak() {
    var t = today();
    if (state.lastDay === null) state.streak = 1;
    else if (state.lastDay === t) { /* dnes už procvičeno */ }
    else if (state.lastDay === t - 1) state.streak++;
    else state.streak = 1;
    state.lastDay = t;
    save();
  }

  function recordAnswer(wasCorrect) {
    state.answered++;
    if (wasCorrect) state.correct++;
  }

  function endSession() {
    state.sessions++;
    save();
  }

  function reset() {
    state = { cards: {}, streak: 0, lastDay: null, sessions: 0, answered: 0, correct: 0 };
    save();
  }

  window.SRS = {
    get: get,
    isNew: isNew,
    grade: grade,
    queue: queue,
    stats: stats,
    touchStreak: touchStreak,
    recordAnswer: recordAnswer,
    endSession: endSession,
    reset: reset,
    today: today,
    streak: function () { return state.streak; },
    /* null = zatím žádná ověřená odpověď (úspěšnost se počítá jen u výběru z možností) */
    accuracy: function () { return state.answered ? Math.round(state.correct / state.answered * 100) : null; }
  };
})();
