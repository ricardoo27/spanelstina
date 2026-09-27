/* Španelština — UI a běh relace */
(function () {
  "use strict";

  var LIMITS = [10, 20, 30, 50];
  var MODES = {
    flash: { title: "Flashcardy", desc: "Otoč kartu a ohodť se", dir: "es2cs" },
    choice: { title: "Výběr z možností", desc: "Česky → španělsky", dir: "cs2es" },
    type: { title: "Psaní česky", desc: "Uvidíš španělsky, napíšeš česky", dir: "es2cs", typed: true },
    typeEs: { title: "Psaní španělsky", desc: "Uvidíš česky, napíšeš španělsky", dir: "cs2es", typed: true }
  };

  var el = function (id) { return document.getElementById(id); };
  var screens = { home: el("screen-home"), session: el("screen-session"), summary: el("screen-summary") };

  var sel = { deck: "MIX", mode: "flash", limit: 20 };
  var session = null;
  var MAX_SESSION = 40;   /* delší relace už nikomu nepomůže */

  /* ---------- data ---------- */

  /* okruhy (výchozí sada i importované), sjednoceně do jednoho registru */
  var REG = null;

  function registry() {
    if (REG) return REG;
    var reg = {};
    DECKS.practiceable().forEach(function (d) {
      reg[d.id] = d.words.map(function (w) { return entry(w, d.id); });
    });
    REG = reg;
    return reg;
  }

  function entry(e, deck) {
    return { es: e.es, cs: e.cs, g: e.g, pos: e.pos, ex: e.ex || "", deck: deck };
  }

  function forgetRegistry() { REG = null; }

  function labelFor(id) {
    if (id === "MIX") return "Všecko dohromady";
    var d = DECKS.get(id);
    return d ? d.csName || d.name : id;
  }

  /* seznam slov pro okruh; MIX = všechny okruhy dohromady. Karty si nesou id
     okruhu, takže se rozvrh sdílí s procvičováním konkrétního okruhu. */
  function pool(id) {
    var reg = registry();
    if (id === "MIX") {
      return Object.keys(reg).reduce(function (a, k) { return a.concat(reg[k]); }, []);
    }
    return reg[id] || [];
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function idOf(e) { return e.deck + "|" + e.es; }

  /* 1 řádek / 3 řádky / 5 řádků */
  function plural(n, one, few, many) { return n === 1 ? one : n < 5 ? few : many; }

  /* vybere nesprávné možnosti, každý text jen jednou a nikdy nesmí být
     shodný se správnou odpovědí */
  function pickWrong(answerText, entries, askCs) {
    var used = [answerText];
    var out = [];
    shuffle(entries).forEach(function (x) {
      if (out.length >= 3) return;
      var t = askCs ? x.cs : x.es;
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

  /* pod titulem u celé skupiny: "9 okruhů · 181 slov", u jednoho okruhu počet slov */
  function deckSub(id) {
    var n = pool(id).length;
    if (id !== "MIX") return n + " " + plural(n, "slovo", "slova", "slov");
    var count = Object.keys(registry()).length;
    return count + " " + plural(count, "okruh", "okruhy", "okruhů") + " · " + n + " slov";
  }

  /* výběr okruhu — mřížka karet. Každý okruh je volitelný sám o sobě,
     "Všecko dohromady" a "Jen moje okruhy" jsou zkratky nad celým registrem. */
  function buildDeckPicker() {
    var reg = registry();
    var box = el("deck-picker");
    box.innerHTML = "";
    var ids = Object.keys(reg);
    if (ids.indexOf(sel.deck) < 0) sel.deck = ids.length > 1 ? "MIX" : ids[0] || "MIX";

    var list = ids.slice();
    if (ids.length > 1) list.unshift("MIX");

    list.forEach(function (k) {
      var b = document.createElement("button");
      b.className = "deck-card" + (k === "MIX" ? " all" : "");
      b.type = "button";
      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", String(sel.deck === k));
      b.innerHTML = "<b>" + esc(labelFor(k)) + "</b><span>" + esc(deckSub(k)) + "</span>";
      b.addEventListener("click", function () { sel.deck = k; buildPickers(); renderHome(); });
      box.appendChild(b);
    });
  }

  function buildPickers() {
    buildDeckPicker();

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
    var entries = pool(sel.deck);
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
    var entries = pool(sel.deck);
    var p = plan(entries);
    session = {
      deck: sel.deck,
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
    el("type-view").hidden = !MODES[session.mode].typed;
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
    el("fc-badge").textContent = labelFor(e.deck);
    el("fc-badge-back").textContent = labelFor(e.deck);
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
    var askCs = MODES[session.mode].dir === "es2cs";
    el("type-prompt").innerHTML =
      (askCs ? "Přelož do češtiny:" : "Přelož do španělštiny:") +
      '<span class="word">' + esc(askCs ? e.es : e.cs) + "</span>";
    el("type-hint").textContent = askCs
      ? "Enter = zkontrolovat · diakritika nejsou potřeba, lomítko beru jako „nebo“"
      : "Enter = zkontrolovat · projde to i bez článku a bez diakritiky";
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

  var ARTICLE = /^(el|la|los|las|un|una) /;

  function answersFor(e, askCs) {
    var text = askCs ? e.cs : e.es;
    return String(text).split("/").map(function (s) { return s.trim(); }).filter(Boolean);
  }

  /* najde napsanou odpověď mezi alternativami. Bez diakritiky a bez článku
     je to pořád totéž slovo, takže to bereme jako správné, jen to napíšeme
     jinak — kvůli si/sí a tu/tú by to byla zbytečně drsná hádanka. */
  function matchAnswer(list, typed, dropArticle) {
    var t = typed.trim().toLowerCase();
    var tf = fold(t);
    var exact = null, folded = null, bare = null;
    list.forEach(function (a) {
      var al = a.toLowerCase();
      if (al === t) { if (!exact) exact = a; return; }
      var f = fold(a);
      if (f === tf) { if (!folded) folded = a; return; }
      if (!dropArticle) return;
      var m = f.match(ARTICLE);
      if (m && f.slice(m[0].length).trim() === tf) bare = bare || a;
    });
    if (exact) return { text: exact, exact: true };
    if (folded) return { text: folded, exact: false };
    if (bare) return { text: bare, exact: false };
    return null;
  }

  function checkType() {
    if (!session || !MODES[session.mode].typed) return;
    var e = session.current;
    var askCs = MODES[session.mode].dir === "es2cs";
    var inp = el("type-input");
    var btn = el("type-btn");
    var fb = el("type-feedback");
    var typed = fold(inp.value);

    if (!typed) { fb.textContent = "Tak co — napiš aspoň něco."; return; }
    if (btn.textContent !== "Zkontrolovat") { nextCard(); return; }   /* už ověřeno = další */

    var hit = matchAnswer(answersFor(e, askCs), inp.value, !askCs);
    var right = askCs ? e.cs : e.es;

    grade(hit ? 2 : 0);
    updateProgress();

    inp.disabled = true;
    inp.className = hit ? "right" : "wrong";
    fb.className = "feedback " + (hit ? "right" : "wrong");
    fb.textContent = !hit ? "✗ Správně je „" + right + "“."
      : hit.exact ? "✓ Správně!"
      : "✓ Téměř — správně se píše „" + hit.text + "“.";
    btn.textContent = "Další";
    btn.className = "primary";
    btn.focus();
  }

  /* ---------- výběr z možností ---------- */

  function renderChoice() {
    var e = session.current;
    var askCs = MODES[session.mode].dir === "es2cs";

    el("mc-prompt").innerHTML =
      (askCs ? "Přelož do češtiny:" : "Jak se řekne česky?") +
      '<span class="word">' + (askCs ? esc(e.es) : esc(e.cs)) + "</span>";

    /* 3 nesprávné možnosti ze stejného okruhu, s podobným slovním druhem */
    var sameKind = pool(session.deck).filter(function (x) { return x.pos === e.pos; });
    var any = pool(session.deck);
    var answerText = askCs ? e.cs : e.es;
    var wrong = pickWrong(answerText, sameKind.length >= 3 ? sameKind : any, askCs);
    if (wrong.length < 3) {
      wrong = wrong.concat(pickWrong(answerText, pool("MIX"), askCs).slice(0, 3 - wrong.length));
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
      b.addEventListener("click", function () { pickOption(b, text, answerText, e, askCs); });
      box.appendChild(b);
    });
  }

  function pickOption(btn, text, correct, entry, askCs) {
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
    sel.deck = r.decks[0].id;   /* rovnou se podívej na první nový okruh */
    buildPickers();
    renderHome();
    renderDeckList();

    var words = r.decks.reduce(function (n, d) { return n + d.words.length; }, 0);
    var msg = "Přidáno: " + r.decks.length + " " + plural(r.decks.length, "okruh", "okruhy", "okruhů") +
      ", " + words + " " + plural(words, "slovo", "slova", "slov") + ".";
    if (r.skipped.length) msg += " " + skippedInfo(r.skipped);
    say(msg, "right");
  }

  var DEFAULTS_FILE = "okruhy/vychozi.txt";

  /* načte výchozí sadu přímo ze souboru v repu — když ji člověk upravil
     a chce ji mít v prohlížeči */
  function loadDefaultsFile() {
    fetch(DEFAULTS_FILE, { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error(res.status);
        return res.text();
      })
      .then(function (text) {
        var r = DECKS.parse(text);
        if (!r.decks.length) {
          say("V " + DEFAULTS_FILE + " nejsou žádná slovíčka.", "wrong");
          return;
        }
        DECKS.importAll(r.decks);
        forgetRegistry();
        buildPickers();
        renderHome();
        renderDeckList();
        var words = r.decks.reduce(function (n, d) { return n + d.words.length; }, 0);
        var msg = "Načteno z " + DEFAULTS_FILE + ": " + r.decks.length + " " +
          plural(r.decks.length, "okruh", "okruhy", "okruhů") + ", " + words + " " +
          plural(words, "slovo", "slova", "slov") + ".";
        if (r.skipped.length) msg += " " + skippedInfo(r.skipped);
        say(msg, r.skipped.length ? "" : "right");
      })
      .catch(function () {
        say(
          "Soubor " + DEFAULTS_FILE + " nejde přes tuto stránku načíst. Otevři appku přes http (např. na GitHub Pages) nebo soubor rovnou přetáhni do zóny nahoře.",
          "wrong"
        );
      });
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
          sel.deck = d.id;
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
  el("reload-defaults").addEventListener("click", loadDefaultsFile);
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
    if (MODES[session.mode].typed) {
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
