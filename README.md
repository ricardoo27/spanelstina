# Španelština — procvičování slovíčka

Aplikace na učení španělských slovíček. Statický HTML/JavaScript, žádné buildování,
žádné závislosti. Hodí se na GitHub Pages i na otevření lokálně (`file://`).

- **490 slovíček** ve třech úrovních: A1 (165), A2 (150), B1 (175)
- **výchozí sada** v `okruhy/vychozi.txt` (9 okruhů / 181 slovíček: zvířata, dům,
  zájmy, tělo, dny, měsíce, barvy, **čísla 1–100**, jídlo) — načte se sama při
  první návštěvě
- **vlastní okruhy** importem ze souboru `.txt` nebo vložením textu
- režim **Vlastní** = procvičit jen okruhy z importu, bez A1/A2/B1
- tři režimy: **flashcardy** (otáčení), **výběr z možností** (česky → španělsky)
  a **psaní** (španělsky → česky, překlad napíšeš sám)
- plánování opakování (SM-2), karty se vrací ve vhodných intervalech
- postup se ukládá jen do prohlížeče (localStorage) — žádný účet, žádný server

## Zprovoznění

**Lokálně:** stačí otevřít `index.html` v prohlížeči.

**Na GitHub Pages:**

1. Nahraj repozitář na GitHub.
2. V repozitáři jdi do **Settings → Pages**.
3. Zvol **Deploy from a branch**, větev `main`, složka `/ (root)` a **Save**.

Pak je appka na `https://<tvuj-ucet>.github.io/<nazev-repozitare>/`.
Soubor `.nojekyll` v kořeni zajistí, aby Pages neservíroval přes Jekyll (jinak by se
pomlčkami v názvu repozitáře rozbila cesta ke skriptům).

## Jak se procvičuje

Na úvodní obrazovce vybereš **úroveň** (A1, A2, B1, jeden z vlastních okruhů,
**Vlastní** = jen importované, nebo **Mix** = všechno dohromady), **režim** a kolik
**nových karet** chceš v jedné relaci. Tlačítko *Začít* vypíše, kolik karet tě čeká.

Rozhodnutí, jestli karta přijde z A1, nebo z okruhu, se drží u karty, ne u režimu:
karta procvičená přes *Vlastní* má stejný rozvrh jako procvičená přes konkrétní okruh.

Relace bere nejdřív karty, které se mají opakovat, a doplní je novými. Karta,
kterou neznáš, se objeví znovu na konci relace.

**Flashcardy** — karta se otočí kliknutím, mezerem nebo Enterem. Po otočení ji
ohodíš: *Nevím* / *Složité* / *Jisté* (klávesy 1–3).

**Výběr z možností** — české slovo, vybereš španělské. Tři možnosti se berou
pokud možno ze stejného slovního druhu, aby to nebyla triviální hádanka (u slovese
tedy dostaneš slovesa, ne podstatná jména). Klávesy 1–4.

**Psaní** — vidíš španělské slovo, český překlad napíšeš do pole a dáš *Zkontrolovat*
(Enter). Pole je po každé kartě vyčištěné a znovu se do něj zaměří, takže se jen
píše. Správná odpověď se vrací do rozvrhu jako *Jisté*, chybná jako *Nevím* a karta
se objeví znovu na konci relace. Aby to nebyla drsná hádanka, **se nepočítá
diakritika, velikost písmen ani mezidokud v okolí** a **lomítko v překladu znamená
„nebo“**: u `blanco/a – bílý/bílá` projde `bílá`, u `el –, la estantería – polička /
knihovna` projde `knihovna` i `polička`. Správně napsaná odpověď s diakritikou
samozřejmě taky.

Na konci relace uvidíš počet karet, kolik jsi zvládl a tempo.

## Klávesy

| Klávesa | Flashcardy | Výběr z možností | Psaní |
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

Výchozí okruhy jsou v jednom textovém souboru **`okruhy/vychozi.txt`** — ve stejném
formátu jako import, takže ho můžeš upravovat normálně v editoru. Dnes tam je
9 okruhů / 181 slovíček: zvířata, dům, zájmy, tělo, dny v týdně, měsíce, barvy,
čísla od 1 do 100 a jídlo.

Sada se do prohlížeče načte při první návštěvě, a to jen jednou — když okruhy
smažeš, už se nevrátí.

### Jak ji aktualizovat

1. Uprav `okruhy/vychozi.txt`.
2. Spusť `node tools/sync-defaults.js` — zkusí soubor naparsovat, vypíše počty
   okruhů a slov a přepíše `assets/data-vlastni.js`.
3. Až nahraješ na GitHub, uživatelé kliknou na *Načíst z okruhy/vychozi.txt* v
   sekci *Vlastní okruhy a slovíčka* a dostanou novou verzi.

`assets/data-vlastni.js` je jen automaticky vygenerovaná kopie téhož textu. Musí
existovat, protože stránku otevřenou přímo z disku (`file://`) prohlížeč nedovolí
načíst sousední `.txt` přes `fetch` — a nechci, aby appka fungovala jen přes
GitHub Pages. Kdybys na tenhle krok zapomněl, `node tools/test-decks.js` to
nahlásí a vypíše, na kterém řádku se soubory liší.

Tlačítko *Načíst z okruhy/vychozi.txt* jde použít, i když zanedbáš krok 2 —
načte rovnou soubor. Jen to neprojde z `file://` (viz hláška v aplikaci); tam
soubor přetáhni do zóny jako kterýkoli jiný.

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

## Vlastní okruhy a slovíčka

Na úvodní obrazovce rozbal **Vlastní okruhy a slovíčka** a přidej si vlastní materiál
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
  k okruhu a zobrazí v jeho řádku; při exportu se zase vypíše, takže soubor za
  sebou nepřeruší
- okruh může mít 0 slov (jen nadpis a poznámka) — zůstane v seznamu, ale nejde
  procvičit a nepočítá se do Mixu
- rozmezí čísel (`1–100`) se za slovíčko nerozpozná
- rod slovíčka se doplní z článku: `el`/`los` → mužský, `la`/`las` → ženský,
  bez článku se neuvádí
- příkladovou větu ze slovníku sem přidat nejde, u vlastních slov se prostí prázdná
  (karta pak ukáže jen překlad)
- okruh se pozná podle názvu, takže opakovaný import **přepíše** slovíčka stejného
  okruhu, ale jeho rozvržené opakování zůstane zachované
- duplicitní slovíčko v jednom okruhu se přeskočí a appka to napíše

Importované okruhy se ukládají do prohlížeče a objeví se v seznamu úrovní vedle
A1 / A2 / B1 / Mix — každý se dá rovnou **Procvičit**, **Stáhnout** (zpět do `.txt`
ve stejném formátu) nebo **Smazat**. Protože jde o data v prohlížeči, po přesunu
na jiné zařízení je potřeba okruhy naimportovat znovu — proto ta možnost stáhnutí.

Vzorový soubor k testování je `tools/sample-okruhy.txt`.

## Přidávání slovíček do vestavěných úrovní

Slovíčka jsou v `assets/data-a1.js`, `data-a2.js`, `data-b1.js`. Každý řádek:

```js
{ es: "el imperfecto", cs: "rozuměl jsem", g: "m", pos: "n", ex: "Hablaba español de niño." }
```

- `es` — španělsky, ideálně s článkem a diakritikou
- `cs` — česky
- `g` — rod: `"m"` (el), `"f"` (la), `"-"` (slovesa, přídavná, výrazy, číslovky)
- `pos` — slovní druh: `"n"` podstatné jméno, `"v"` sloveso, `"adj"` přídavné,
  `"adv"` příslovce, `"expr"` výraz, `"num"` číslovka
- `ex` — krátká španělská věta, ve které je to slovo použité

Heslo se v relaci ukazuje jako klíč `ÚROVEŇ|es`, takže po přejmenování slovíčka
se jeho historie ztratí a karta se začne znovu.

Nová úroveň: zkopíruj `assets/data-a1.js` na `assets/data-b2.js`, přejmenuj
`window.SPANELSTINA.levels.A1` na `B2` a přidej `<script>` do `index.html`.

## Kontrola (jen pro vývoj, potřebuje Node)

Stránka sama Node nepotřebuje, ale v repozitáři jsou dva kontrolní skripty:

```sh
node tools/check.js          # slovníčko: duplicity, rod, slovní druh, divné znaky
node tools/test-decks.js     # parser okruhů, poznámky, ukládání, soulad souborů
node tools/sync-defaults.js  # okruhy/vychozi.txt -> assets/data-vlastni.js
```

## Struktura

```
index.html            rozvržení obrazovek
.nojekyll             aby to fungovalo na GitHub Pages
assets/style.css      styly
assets/srs.js         localStorage + plánování opakování
assets/app.js         UI a běh relace
assets/decks.js       parser a úložiště vlastních okruhů
okruhy/vychozi.txt    výchozí sada okruhů — tohle upravuješ
assets/data-*.js      slovíčka
tools/check.js        kontrola slovníku (Node, volitelné)
tools/test-decks.js   testy parseru okruhů
tools/sync-defaults.js  přegeneruje assets/data-vlastni.js z okruhy/vychozi.txt
tools/sample-okruhy.txt  vzorový soubor pro import
```
