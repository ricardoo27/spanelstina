/* Španelština — UI a běh relace */
(function () {
  "use strict";

  var LEVELS = window.SPANELSTINA.levels;
  var LIMITS = [10, 20, 30, 50];
  var MODES = {
    flash: { title: "Flashcardy", desc: "Otoč kartu a ohodť se", dir: "es2cs" },
    choice: { title: "Výběr z možností", desc: "Česky → španělsky", dir: "cs2es" },
    type: { title: "Psaní", desc: "Španělsky → česky", dir: "es2cs" }
  };

  var el = function (id) { return document.getElementById(id); };
  var screens = { home: el("screen-home"), session: el("screen-session"), summary: el("screen-summary") };

  var sel = { level: "A1", mode: "flash", limit: 20 };
  var session = null;
  var MAX_SESSION = 40;   /* delší relace už nikomu nepomůže */

  /* ---------- data ---------- */

  var VLASTNI = "U:*";   /* jen okruhy z vlastního importu, bez A1/A2/B1 */

  /* vestavěné úrovně + importované okruhy, sjednoceně do jednoho registru */
  var REG = null;

  function registry() {
    if (REG) return REG;
    var reg = {};
    Object.keys(LEVELS).forEach(function (k) {
      reg[k] = LEVELS[k].map(function (e) { return entry(e, k); });
    });
    DECKS.practiceable().forEach(function (d) {
      reg[d.id] = d.words.map(function (w) { return entry(w, d.id); });
    });
    REG = reg;
    return reg;
  }

  function entry(e, level) {
    return { es: e.es, cs: e.cs, g: e.g, pos: e.pos, ex: e.ex || "", level: level };
  }

  function forgetRegistry() { REG = null; }

  function labelFor(id) {
    if (id === "MIX") return "Mix";
    if (id === VLASTNI) return "Vlastní";
    if (LEVELS[id]) return id;
    var d = DECKS.get(id);
    return d ? d.csName || d.name : id;
  }

  /* seznam slov pro úroveň
     MIX    = všechno dohromady
     VLASTNI = jen importované okruhy (karty si nesou id vlastního okruhu, takže
              opakování se sdílí s procvičováním konkrétního okruhu) */
  function pool(level) {
    var reg = registry();
    if (level === "MIX" || level === VLASTNI) {
      return Object.keys(reg).filter(function (k) { return level === "MIX" || !LEVELS[k]; })
        .reduce(function (a, k) { return a.concat(reg[k]); }, []);
    }
    return reg[level] || [];
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function idOf(e) { return e.level + "|" + e.es; }

  /* 1 řádek / 3 řádky / 5 řádků */
  function plural(n, one, few, many) { return n === 1 ? one : n < 5 ? few : many; }

  /* vybere nesprávné možnosti, každý text jen jednou a nikdy nesmí být
     shodný se správnou odpovědí */
  function pickWrong(answerText, entries, askEs) {
    var used = [answerText];
    var out = [];
    shuffle(entries).forEach(function (x) {
      if (out.length >= 3) return;
      var t = askEs ? x.cs : x.es;
      if (used.indexOf(t) < 0) { used.push(t); out.push(t); }
    });
    return out;
  }

  function skippedInfo(list) {
    var s = list[0];
    return "Přeskočeno: " + list.length + " " +
      plural(list.length, "řádek", "řádky", "řádků") +
      " — např. řádek " + s.line + " („" + s.text.trim() + "“ — " + s.why + ").";
  }

  /* ---------- úvodní obrazovka ---------- */

  function buildPickers() {
    var reg = registry();
    var lc = el("level-chips");
    lc.innerHTML = "";
    var ids = Object.keys(reg);
    if (sel.level !== "MIX" && sel.level !== VLASTNI && ids.indexOf(sel.level) < 0) sel.level = "A1";

    /* "Vlastní" = jen importované okruhy, "Mix" = úrovně i vlastní dohromady.
     * Oba jsou výběr nad celým registrem, takže do jejich součtu se nepočítají. */
    var list = ids.slice();
    if (DECKS.practiceable().length) list.push(VLASTNI);
    if (ids.length > 1) list.push("MIX");

    list.forEach(function (k) {
      var n = pool(k).length;
      var b = document.createElement("button");
      b.className = "chip";
      b.type = "button";
      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", String(sel.level === k));
      b.innerHTML = esc(labelFor(k)) + '<span class="sub">' + n + " slov</span>";
      b.addEventListener("click", function () { sel.level = k; buildPickers(); renderHome(); });
      lc.appendChild(b);
    });

    var mc = el("mode-picker");
    mc.innerHTML = "";
    Object.keys(MODES).forEach(function (k) {
      var b = document.createElement("button");
      b.className = "mode-card";
      b.type = "button";
      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", String(sel.mode === k));
      b.innerHTML = "<strong>" + MODES[k].title + "</strong><span>" + MODES[k].desc + "</span>";
      b.addEventListener("click", function () { sel.mode = k; buildPickers(); });
      mc.appendChild(b);
    });

    var nc = el("limit-chips");
    nc.innerHTML = "";
    LIMITS.forEach(function (n) {
      var b = document.createElement("button");
      b.className = "chip";
      b.type = "button";
      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", String(sel.limit === n));
      b.textContent = String(n);
      b.addEventListener("click", function () { sel.limit = n; buildPickers(); renderHome(); });
      nc.appendChild(b);
    });
  }

  function renderHome() {
    var entries = pool(sel.level);
    var p = plan(entries);
    var s = SRS.stats(entries);
    var total = p.due.length + p.fresh.length;

    var note = "K procvičení teď: " + p.dueCount + " vyžádaných + " + p.newCount + " nových";
    if (p.dueCount > MAX_SESSION) note += " (beru prvních " + MAX_SESSION + ")";
    el("queue-note").textContent = note + ".";

    var acc = SRS.accuracy();
    var streak = SRS.streak();
    el("home-stats").innerHTML = [
      ["K dnesku", s.due],
      ["Známých", s.known],
      ["V učení", s.learning],
      ["Nových", s.fresh],
      ["Úspěšnost", acc === null ? "—" : acc + " %"],
      ["Dní v řadě", streak]
    ].map(function (pair) {
      return '<div class="stat"><b>' + pair[1] + "</b><span>" + pair[0] + "</span></div>";
    }).join("");

    var st = el("streak");
    st.hidden = streak === 0;
    st.textContent = "🔥 " + streak;

    el("start-btn").disabled = total === 0;
    el("start-btn").textContent = total === 0 ? "Všechno probrané ✓" : "Začít (" + total + ")";
  }

  function show(name) {
    Object.keys(screens).forEach(function (k) { screens[k].hidden = k !== name; });
    el("back-btn").hidden = name === "home";
    window.scrollTo(0, 0);
  }

  /* ---------- relace ---------- */

  /* co dnes procvičit: vyžádané karty, doplněné losovanými novými */
  function plan(entries) {
    var q = SRS.queue(entries);
    var due = shuffle(q.due).slice(0, MAX_SESSION);
    var fresh = shuffle(q.fresh);
    var room = Math.max(0, MAX_SESSION - due.length);
    var newCount = Math.min(fresh.length, sel.limit, room);
    return {
      due: due,
      fresh: fresh.slice(0, newCount),
      dueCount: due.length,
      newCount: newCount
    };
  }

  function start() {
    var entries = pool(sel.level);
    var p = plan(entries);
    session = {
      level: sel.level,
      mode: sel.mode,
      review: [],
      todo: p.due.concat(p.fresh),
      done: 0,
      missed: 0,
      total: p.due.length + p.fresh.length,
      answers: [],
      startAt: Date.now()
    };
    SRS.touchStreak();
    show("session");
    el("card-view").hidden = session.mode !== "flash";
    el("mc-view").hidden = session.mode !== "choice";
    el("type-view").hidden = session.mode !== "type";
    el("grades").hidden = true;
    nextCard();
  }

  function nextCard() {
    if (!session.todo.length) {
      /* karty, které selhaly, jdou ještě jednou do konce relace */
      if (session.review.length) {
        session.todo = session.review;
        session.review = [];
      } else {
        return finish();
      }
    }
    session.current = session.todo.shift();
    if (session.mode === "flash") renderFlash();
    else if (session.mode === "choice") renderChoice();
    else renderType();
    updateProgress();
  }

  function updateProgress() {
    el("progress-bar").style.width = (session.done / session.total * 100) + "%";
    el("progress-text").textContent = session.done + " / " + session.total;
  }

  function cardId(e) { return idOf(e); }

  function renderFlash() {
    var e = session.current;
    var c = el("card");
    c.classList.remove("flipped");
    el("fc-badge").textContent = labelFor(e.level);
    el("fc-badge-back").textContent = labelFor(e.level);
    el("fc-word").textContent = e.es;
    el("fc-cs").textContent = e.cs;
    el("fc-ex").textContent = e.ex || "";
    el("fc-ex").hidden = !e.ex;
    el("grades").hidden = true;
  }

  function flip() {
    if (session.mode !== "flash") return;
    el("card").classList.toggle("flipped");
    el("grades").hidden = !el("card").classList.contains("flipped");
  }

  function answer(q) {
    grade(q);
    nextCard();
  }

  /* zaznamená odpověď, ale nepřechází na další kartu */
  function grade(q) {
    var e = session.current;
    SRS.grade(cardId(e), q);
    session.answers.push(q);
    if (q === 0) { session.review.push(e); session.missed++; }
    session.done++;
  }

  /* ---------- psaní odpovědi ---------- */

  function renderType() {
    var e = session.current;
    el("type-prompt").innerHTML = "Přelož do češtiny:" + '<span class="word">' + esc(e.es) + "</span>";
    var inp = el("type-input");
    inp.value = "";
    inp.disabled = false;
    inp.className = "";
    el("type-btn").textContent = "Zkontrolovat";
    el("type-feedback").textContent = "";
    el("type-feedback").className = "feedback";
    focusInput();
  }

  function focusInput() {
    var inp = el("type-input");
    if (screens.session.hidden || inp.disabled) return;
    try { inp.focus({ preventScroll: true }); } catch (e) { inp.focus(); }
  }

  /* lomítko v překladu znamená "nebo", diakritika se nepočítá a na velikosti
     písmen nezáleží — jinak by to byla drsná hádanka, ne procvičování */
  function fold(s) {
    return String(s)
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function answersFor(e, askEs) {
    var text = askEs ? e.cs : e.es;
    return String(text).split("/").map(fold).filter(Boolean);
  }

  function checkType() {
    if (!session || session.mode !== "type") return;
    var e = session.current;
    var askEs = MODES[session.mode].dir === "es2cs";
    var inp = el("type-input");
    var btn = el("type-btn");
    var fb = el("type-feedback");
    var typed = fold(inp.value);

    if (!typed) { fb.textContent = "Tak co — napiš aspoň něco."; return; }
    if (btn.textContent !== "Zkontrolovat") { nextCard(); return; }   /* už ověřeno = další */

    var list = answersFor(e, askEs);
    var ok = list.indexOf(typed) >= 0;
    var right = askEs ? e.cs : e.es;

    grade(ok ? 2 : 0);
    updateProgress();

    inp.disabled = true;
    inp.className = ok ? "right" : "wrong";
    fb.className = "feedback " + (ok ? "right" : "wrong");
    fb.textContent = (ok ? "✓ Správně!" : "✗ Správně je „" + right + "“.");
    btn.textContent = "Další";
    btn.className = "primary";
    btn.focus();
  }

  /* ---------- výběr z možností ---------- */

  function renderChoice() {
    var e = session.current;
    var askEs = MODES[session.mode].dir === "es2cs";

    el("mc-prompt").innerHTML =
      (askEs ? "Přelož do češtiny:" : "Jak se řekne česky?") +
      '<span class="word">' + (askEs ? esc(e.es) : esc(e.cs)) + "</span>";

    /* 3 nesprávné možnosti ze stejné úrovně, s podobným slovním druhem */
    var sameKind = pool(session.level).filter(function (x) { return x.pos === e.pos; });
    var any = pool(session.level);
    var answerText = askEs ? e.cs : e.es;
    var wrong = pickWrong(answerText, sameKind.length >= 3 ? sameKind : any, askEs);
    if (wrong.length < 3) {
      wrong = wrong.concat(pickWrong(answerText, pool("MIX"), askEs).slice(0, 3 - wrong.length));
    }

    var opts = shuffle(wrong.concat([answerText]));

    var box = el("mc-options");
    box.innerHTML = "";
    var fb = el("mc-feedback");
    fb.textContent = "";
    fb.className = "feedback";

    opts.forEach(function (text) {
      var b = document.createElement("button");
      b.className = "option";
      b.type = "button";
      b.textContent = text;
      b.addEventListener("click", function () { pickOption(b, text, answerText, e, askEs); });
      box.appendChild(b);
    });
  }

  function pickOption(btn, text, correct, entry, askEs) {
    var ok = text === correct;
    var all = el("mc-options").querySelectorAll(".option");
    Array.prototype.forEach.call(all, function (b) {
      b.disabled = true;
      if (b.textContent === correct) b.classList.add("right");
    });
    if (!ok) btn.classList.add("wrong");

    var fb = el("mc-feedback");
    fb.className = "feedback " + (ok ? "right" : "wrong");
    fb.textContent = (ok ? "✓ " : "✗ ") + (ok ? "Správně!" : "Správně je „" + correct + "“.") + (entry.ex ? "  " + entry.ex : "");

    SRS.grade(cardId(entry), ok ? 2 : 0);
    SRS.recordAnswer(ok);
    session.answers.push(ok ? 2 : 0);
    if (!ok) { session.review.push(entry); session.missed++; }
    session.done++;

    setTimeout(function () { nextCard(); }, ok ? 700 : 1900);
  }

  /* ---------- shrnutí ---------- */

  function finish() {
    SRS.endSession();
    var good = session.answers.filter(function (a) { return a === 2; }).length;
    var okCount = session.answers.length ? Math.round(good / session.answers.length * 100) : 0;
    var secs = Math.round((Date.now() - session.startAt) / 1000);

    el("sum-title").textContent = "Hotovo!";
    el("sum-stats").innerHTML = [
      ["Karet", session.answers.length],
      ["Jisté", good + " (" + okCount + " %)"],
      ["Na minutu", Math.max(1, Math.round(session.answers.length / (secs / 60)))]
    ].map(function (p) {
      return '<div class="stat"><b>' + p[1] + "</b><span>" + p[0] + "</span></div>";
    }).join("");

    el("sum-note").textContent = session.missed
      ? session.missed + " " + plural(session.missed, "karta", "karty", "karet") + " se objeví ještě jednou v této relaci."
      : "Všechno v této relaci zvládnuté. Karty se vrátí, až je bude potřeba zopakovat.";

    show("summary");
  }

  /* ---------- vlastní okruhy ---------- */

  function say(msg, kind) {
    var m = el("decks-msg");
    m.textContent = msg;
    m.className = "feedback" + (kind ? " " + kind : "");
  }

  function importText(text) {
    var r = DECKS.parse(text);
    if (!r.decks.length) {
      say(
        r.skipped.length
          ? "Nepodařilo se nic naimportovat. " + skippedInfo(r.skipped)
          : "V textu nejsou žádná slovíčka. Očekávám nadpis okruhu velkými písmeny a pod ním řádky „el perro – pes“.",
        "wrong"
      );
      return;
    }

    DECKS.importAll(r.decks);
    forgetRegistry();
    sel.level = r.decks[0].id;   /* rovnou se podívej na první nový okruh */
    buildPickers();
    renderHome();
    renderDeckList();

    var words = r.decks.reduce(function (n, d) { return n + d.words.length; }, 0);
    var msg = "Přidáno: " + r.decks.length + " " + plural(r.decks.length, "okruh", "okruhy", "okruhů") +
      ", " + words + " " + plural(words, "slovo", "slova", "slov") + ".";
    if (r.skipped.length) msg += " " + skippedInfo(r.skipped);
    say(msg, "right");
  }

  function readFile(file) {
    if (!file) return;
    var fr = new FileReader();
    fr.onload = function () { importText(String(fr.result)); };
    fr.onerror = function () { say("Soubor se nepodařilo načíst.", "wrong"); };
    fr.readAsText(file, "utf-8");
  }

  function download(text, filename) {
    var url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function renderDeckList() {
    var box = el("decks-list");
    var decks = DECKS.all();
    el("export-btn").hidden = decks.length === 0;
    box.innerHTML = "";
    if (!decks.length) {
      box.innerHTML = '<p class="note">Zatím žádné vlastní okruhy.</p>';
      return;
    }
    decks.forEach(function (d) {
      var row = document.createElement("div");
      row.className = "deck-row";

      var name = document.createElement("div");
      name.className = "deck-name";
      name.innerHTML = "<b>" + esc(d.name) + "</b>" +
        (d.csName ? " <span>– " + esc(d.csName) + "</span>" : "") +
        '<span class="deck-count">' + (d.words.length
          ? d.words.length + " slov"
          : "0 slov – jen poznámka") +
        (d.note ? '<span class="deck-note">Poznámka: ' + esc(d.note) + "</span>" : "") +
        "</span>";
      row.appendChild(name);

      var btns = document.createElement("div");
      btns.className = "deck-btns";
      if (d.words.length) {
        btns.appendChild(miniBtn("Procvičit", function () {
          sel.level = d.id;
          buildPickers();
          renderHome();
          el("decks-box").open = false;
          start();
        }));
      }
      btns.appendChild(miniBtn("Stáhnout", function () {
        download(DECKS.serialize([d]), d.id.replace(/^U:/, "") + ".txt");
      }));
      btns.appendChild(miniBtn("Smazat", function () {
        if (!confirm('Smazat okruh "' + d.name + '"?')) return;
        DECKS.remove(d.id);
        forgetRegistry();
        buildPickers();
        renderHome();
        renderDeckList();
        say('Smazán okruh "' + d.name + '".', "");
      }, true));
      row.appendChild(btns);

      box.appendChild(row);
    });
  }

  function miniBtn(text, onClick, danger) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "mini" + (danger ? " danger" : "");
    b.textContent = text;
    b.addEventListener("click", onClick);
    return b;
  }

  /* ---------- události ---------- */

  el("start-btn").addEventListener("click", start);
  el("card").addEventListener("click", flip);
  el("type-btn").addEventListener("click", checkType);
  el("type-input").addEventListener("keydown", function (ev) {
    if (ev.key === "Enter") { ev.preventDefault(); checkType(); }
  });
  el("grades").addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-q]");
    if (b) answer(Number(b.dataset.q));
  });
  el("back-btn").addEventListener("click", function () {
    session = null;
    renderHome();
    show("home");
  });
  el("home-btn").addEventListener("click", function () {
    session = null;
    renderHome();
    show("home");
  });
  el("again-btn").addEventListener("click", start);
  el("reset-btn").addEventListener("click", function () {
    if (!confirm("Opravdu smazat všechen uložený postup?")) return;
    SRS.reset();
    renderHome();
  });

  /* import: soubor, přetažení, vložený text, export */
  el("pick-btn").addEventListener("click", function () { el("file-input").click(); });
  el("file-input").addEventListener("change", function (ev) {
    readFile(ev.target.files[0]);
    ev.target.value = "";          /* aby šlo vybrat ten samý soubor znovu */
  });
  el("import-btn").addEventListener("click", function () {
    var text = el("paste-area").value.trim();
    if (!text) return say("Nejdřív něco vlož do textového pole.", "wrong");
    importText(text);
    el("paste-area").value = "";
  });
  el("export-btn").addEventListener("click", function () {
    download(DECKS.serialize(DECKS.all()), "spanelstina-okruhy.txt");
  });

  var dz = el("dropzone");
  ["dragenter", "dragover"].forEach(function (t) {
    dz.addEventListener(t, function (ev) { ev.preventDefault(); dz.classList.add("over"); });
  });
  ["dragleave", "drop"].forEach(function (t) {
    dz.addEventListener(t, function () { dz.classList.remove("over"); });
  });
  dz.addEventListener("drop", function (ev) {
    ev.preventDefault();
    var file = ev.dataTransfer && ev.dataTransfer.files[0];
    if (file) readFile(file);
  });

  document.addEventListener("keydown", function (ev) {
    if (screens.session.hidden) return;
    /* v psaní se píše do pole, klávesy 1–4 patří textu, ne kartám */
    if (session.mode === "type") {
      /* na poli i tlačítku Enter vyvolá událost samotný prohlížeč — kdyby se
         zpracoval i tady, přeskočila by se po každém ohodnocení karta */
      if (ev.target === el("type-input") || ev.target === el("type-btn")) return;
      if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); checkType(); }
      return;
    }
    if (session.mode === "flash") {
      if (ev.key === " " || ev.key === "Enter") {
        ev.preventDefault();
        if (!el("grades").hidden) return;
        flip();
      } else if (!el("grades").hidden && ["1", "2", "3"].indexOf(ev.key) >= 0) {
        answer(Number(ev.key) - 1);
      }
    } else if (["1", "2", "3", "4"].indexOf(ev.key) >= 0) {
      var opt = el("mc-options").querySelectorAll(".option")[Number(ev.key) - 1];
      if (opt && !opt.disabled) opt.click();
    }
  });

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  /* výchozí sada z data-vlastni.js — jen při první návštěvě, flag v localStorage
     zajišťuje, že ji smazání nevrátí zpět */
  var seeded = DECKS.seed();

  buildPickers();
  renderHome();
  renderDeckList();
  if (seeded) {
    say(
      "Načtena výchozí sada: " + seeded.decks.length + " " +
      plural(seeded.decks.length, "okruh", "okruhy", "okruhů") + ", " +
      DECKS.count() + " slov.",
      ""
    );
  }
  show("home");
})();
