# Španelština — procvičování slovíčka

Aplikace na učení španělských slovíček. Statický HTML/JavaScript, žádné buildování,
žádné závislosti. Hodí se na GitHub Pages i na otevření lokálně (`file://`).

- **výchozí sada 181 slovíček v 9 okruzích** z `okruhy/vychozi.txt` — zvířata,
  dům / bydlení, zájmy, tělo, dny v týdnu, měsíce, barvy, **čísla 1–100**, jídlo.
  Načte se sama při první návštěvě, dá se upravovat v tomhle souboru
- **181 slovíček v 9 okruzích** z jediného souboru `okruhy/vychozi.txt` — zvířata,
  dům / bydlení, zájmy, tělo, dny v týdnu, měsíce, barvy, **čísla 1–100**, jídlo.
  Appka si ho načte sama při každém otevření a jde ho normálně upravovat v editoru
- **výběr okruhu**
  dohromady
- čtyři režimy: **flashcardy** (otáčení), **výběr z možností** (česky → španělsky)
  a **psaní** v obou směrech — **česky** (španělské slovo, překlad napíšeš sám)
  i **španělsky** (české slovo, španělsky to napíšeš sám)
- plánování opakování (SM-2), karty se vrací ve vhodných intervalech; když už
  dnes není co opakovat, dá se pokračovat opakováním těch nejslabších
- rozvrh a postup se ukládají jen do prohlížeče (localStorage) — žádný účet, žádný
  server; slovíčka se neukládají, ta se vždy čtou ze souboru

## Zprovoznění

**Lokálně:** stačí otevřít `index.html` v prohlížeči. Když je stránka otevřená přímo
z disku, prohlížeč jí nedovolí přečíst sousední `okruhy/vychozi.txt`, takže appka
sáhne po automatické kopii `assets/data-vlastni.js` a napíše to pod mřížku okruhů.
Chceš-li vidět vlastní úpravy souboru, pusť si jednoduchý server
(`python3 -m http.server`) a otevři stránku přes `http://localhost:8000`.

**Na GitHub Pages:**

1. Nahraj repozitář na GitHub.
2. V repozitáři jdi do **Settings → Pages**.
3. Zvol **Deploy from a branch**, větev `main`, složka `/ (root)` a **Save**.

Pak je appka na `https://<tvuj-ucet>.github.io/<nazev-repozitare>/`.
Soubor `.nojekyll` v kořeni zajistí, aby Pages neservíroval přes Jekyll (jinak by se
pomlčkami v názvu repozitáře rozbila cesta ke skriptům).

## Jak se procvičuje

Na úvodní obrazovce vybereš **okruh** — mřížka karet, kde je každý okruh volitelný
sám o sobě (Zvířata, Čísla, Barvy, …) a nahoře zkratka **Všecko dohromady**, která
sáhne do všech okruhů najednou. Pak **režim** a kolik **nových karet** chceš v jedné
relaci. Tlačítko *Začít* vypíše, kolik karet tě čeká.

Rozhodnutí, odkud karta přišla, se drží u karty, ne u volby na úvodní obrazovce:
karta procvičená přes *Všecko dohromady* má stejný rozvrh jako procvičená přes konkrétní
okruh. Takže to, že jsi Zvířata jednou projel v mixu, ti nezkazí, až je vyberem
samostatně.

Relace bere nejdřív karty, které se mají opakovat, a doplní je novými. Karta,
kterou neznáš, se objeví znovu na konci relace.

**Opakovat se dá libovolně dlouho.** Když na dnes už nic neplatí, tlačítko
*Začít* se přepne na *Procvičit znovu* a relace se doplní kartami, které se
sice ještě neopakují, ale nejsou ani čerstvé — od těch nejméně zaběhnutých
(nejmenší lehkost, nejkratší interval, naposledy procvičené nejdáv). Delší
relace jde nastavit tlačítky pod *Nové karty v této relaci*, ta volba platí
i pro opakování. Karty přidané na opakování se normálně ohodnocují, takže
rozvrh se jen zpřesní.

**Flashcardy** — karta se otočí kliknutím, mezerem nebo Enterem. Po otočení ji
ohodíš: *Nevím* / *Složité* / *Jisté* (klávesy 1–3).

**Výběr z možností** — české slovo, vybereš španělské. Tři možnosti se berou
pokud možno ze stejného slovního druhu, aby to nebyla triviální hádanka (u slovese
tedy dostaneš slovesa, ne podstatná jména). Klávesy 1–4.

**Psaní česky** — vidíš španělské slovo, český překlad napíšeš do pole a dáš
*Zkontrolovat* (Enter). **Psaní španělsky** je to samé obráceně: české slovo,
španělský tvar. Pole je po každé kartě vyčištěné a znovu se do něj zaměří, takže
se jen píše. Správná odpověď se vrací do rozvrhu jako *Jisté*, chybná jako
*Nevím* a karta se objeví znovu na konci relace.

Aby to nebyla drsná hádanka, **se nepočítá diakritika, velikost písmen ani mezery
v okolí** a **lomítko v odpovědi znamená „nebo“**: u `blanco/a – bílý/bílá` projde
`bílá`, u `la estantería – polička / knihovna` projde `knihovna` i `polička`.
Správně napsaná odpověď s diakritikou samozřejmě taky.

Když napíšeš správné slovo, ale jinak napsané — v psaní španělsky bez článku
(`perro` místo `el perro`) nebo bez diakritiky (`cancion` místo `la canción`) —
uhodne to jako správně, ale appka ti to připomene: *„✓ Téměř — správně se píše
`el ratón`“*. Bez článku a bez diakritiky by to byla hádanka na psaní z klávesnice,
ne na pamatování slovíček.

Na konci relace uvidíš počet karet, kolik jsi zvládl a tempo.

## Klávesy

| Klávesa | Flashcardy | Výběr z možností | Psaní (obě šipky) |
|---|---|---|---|
| `1` `2` `3` | Nevím / Složité / Jisté | 1. / 2. / 3. možnost | píše se do pole |
| `4` | — | 4. možnost | píše se do pole |
| `Enter` | otočit kartu | — | zkontrolovat / další |
| `mezerník` | otočit kartu | — | zkontrolovat / další |

## Jak funguje plánování

Každá karta si pamatuje `ef` (faktor lehkosti), `reps` (počet úspěšných opakování)
a `interval` (za kolik dní se znovu objeví). Začíná na jednom dni:

| Ohodnocení | Efekt |
|---|---|
| Jisté | interval 1 → 3 → `interval × ef` dní (max 180) |
| Složité | interval `× 1.2`, ale nejméně 1 den |
| Nevím | interval nula, karta se vrátí hned a znovu v téže relaci |

V režimu výběru z možností rozhoduje správnost, vlastní ohodnocení nepotřebuješ.

## Výchozí sada

Jediný zdroj slovíček je textový soubor **`okruhy/vychozi.txt`**. Dnes v něm je
9 okruhů / 181 slovíček: zvířata, dům, zájmy, tělo, dny v týdnu, měsíce, barvy,
čísla od 1 do 100 a jídlo.

Appka ho čte při každém otevření stránky (`fetch` s `no-store`), takže úprava
souboru je vidět hned po obnovení stránky. Okruhy se nikam neukládají, takže se
v prohlížeči nemůže zaseknout stará kopie. Pod mřížkou okruhů je malá hláška,
odkud se sada načetla a jestli v souboru nebyly chybné řádky.

### Jak ji aktualizovat

1. Uprav `okruhy/vychozi.txt`.
2. Spusť `node tools/sync-defaults.js` — zkusí soubor naparsovat, vypíše počty
   okruhů a slov a přepíše `assets/data-vlastni.js`.
3. Až nahraješ na GitHub, všichni dostanou novou verzi hned při načtení.

`assets/data-vlastni.js` je jen automaticky vygenerovaná kopie téhož textu. Musí
existovat, protože stránku otevřenou přímo z disku (`file://`) prohlížeč nedovolí
načíst sousední `.txt` přes `fetch` — a nechci, aby appka fungovala jen přes
GitHub Pages. Kdybys na tenhle krok zapomněl, `node tools/test-decks.js` to
nahlásí a vypíše, na kterém řádku se soubory liší.

### Čísla

Okruh `LOS NÚMEROS – ČÍSLA` má všech 100 čísel (1–100), třeba `treinta y uno –
třicet jedna`. Bez článku, jako v učebnici.

U 16, 22 a 26 je zapsána tradiční podoba s tildou (`dieciséis`, `veintidós`,
`veintiséis`) — tak to píšou skripta pro cizince. Od RAE 2010 se smí i bez ní
(`dieciseis`, `veintidos`, `veintiseis`) a v režimu Psaní ti projde obojí, protože
se tam diakritika nepočítá. Ostatní tildy jsou povinné: `veintitrés`,
`treinta y tres`.

Pozor na rod v češtině — ve spojení je `jedna` ženského rodu: 21 je `dvacet
jedna`, ale 22 `dvacet dva`.

## Formát souboru s okruhy

`okruhy/vychozi.txt` je prostý text, který jde upravovat v jakémkoli editoru:

souborem nebo vložením textu — obojí jde přes stejný formát:

```
LOS ANIMALES – ZVÍŘATA
el perro – pes
el elefante – slon
la vaca – kráva

LA CASA – DŮM / BYDLENÍ
la mesa – stůl
la estantería – polička / knihovna
```

Pravidla:

- **nadpis okruhu** je napsaný velkými písmeny, za oddělovačem může být český název
- **slovíčko** je `španělsky – česky`; oddělovačem je en dash `–`, em dash `—`
  nebo obyčejné minus obklopené mezerami (`post-it` se tím nerozbije)
- v jednom souboru může být víc okruhů, prázdné řádky a řádky začínající `#`
  se ignorují
- **poznámka k okruhu** je řádek bez oddělovače s alespoň čtyřmi slovy — uloží se
  k okruhu a zobrazí se u něj
- okruh může mít 0 slov (jen nadpis a poznámka) — v mřížce se neukáže a nepočítá
  se do *Všecko dohromady*
- rozmezí čísel (`1–100`) se za slovíčko nerozpozná
- rod slovíčka se doplní z článku: `el`/`los` → mužský, `la`/`las` → ženský,
  bez článku se neuvádí
- příkladovou větu sem přidat nejde — u slovíček bez příkladu se prostí prázdná
  (karta pak ukáže jen překlad)
- duplicitní slovíčko v jednom okruhu se přeskočí a appka to napíše pod mřížkou

Nový okruh vznikne novým nadpisem psaným velkými písmeny, nové slovíčko jedním
řádkem `španělsky – česky`. Po uložení souboru je změna vidět hned přes
`http://…`, z disku až po `node tools/sync-defaults.js`. Vzorová sada pro
otestování parseru je v `tools/sample-okruhy.txt`.

Heslo se v relaci ukazuje jako klíč `ID_OKRUHU|es` (např. `U:los-animales|el perro`),
takže po přejmenování slovíčka se jeho historie ztratí a karta se začne znovu.

## Kontrola (jen pro vývoj, potřebuje Node)

Stránka sama Node nepotřebuje, ale v repozitáři jsou dva kontrolní skripty:

```sh
node tools/check.js          # výchozí sada: duplicity, prázdné okruhy, divné znaky
node tools/test-decks.js     # parser okruhů, načtení souboru, soulad kopie
node tools/test-plan.js      # plánování relace (spustí app.js nad falešným DOM)
node tools/sync-defaults.js  # okruhy/vychozi.txt -> assets/data-vlastni.js
```

## Struktura

```
index.html            rozvržení obrazovek
.nojekyll             aby to fungovalo na GitHub Pages
assets/style.css      styly
assets/srs.js         localStorage + plánování opakování
assets/app.js         UI a běh relace
assets/decks.js       čtení a parsování okruhů ze souboru
okruhy/vychozi.txt    jediný zdroj slovíček — tohle upravuješ
assets/data-vlastni.js  automatická kopie slovíček pro běh z disku (file://)
tools/check.js        kontrola slovníku (Node, volitelné)
tools/test-decks.js   testy parseru okruhů
tools/test-plan.js    testy plánování relace
tools/sync-defaults.js  přegeneruje assets/data-vlastni.js z okruhy/vychozi.txt
tools/sample-okruhy.txt  vzorový soubor pro testy parseru
```
