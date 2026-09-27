# Španelština — procvičování slovíčka

Aplikace na učení španělských slovíček. Statický HTML/JavaScript, žádné buildování,
žádné závislosti. Hodí se na GitHub Pages i na otevření lokálně (`file://`).

- **výchozí sada 181 slovíček v 9 okruzích** z `okruhy/vychozi.txt` — zvířata,
  dům / bydlení, zájmy, tělo, dny v týdnu, měsíce, barvy, **čísla 1–100**, jídlo.
  Načte se sama při první návštěvě, dá se upravovat v tomhle souboru
- **vlastní okruhy** importem ze souboru `.txt` nebo vložením textu; okruh se
  pozná podle názvu, takže import stejného okruhu slovíčka přepíše
- **výběr okruhu** — každý tematický okruh se dá procvičit sám, nebo všechny
  dohromady
- čtyři režimy: **flashcardy** (otáčení), **výběr z možností** (česky → španělsky)
  a **psaní** v obou směrech — **česky** (španělské slovo, překlad napíšeš sám)
  i **španělsky** (české slovo, španělsky to napíšeš sám)
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

Importované okruhy se ukládají do prohlížeče a objeví se v mřížce okruhů —
každý se dá rovnou **Procvičit**, **Stáhnout** (zpět do `.txt`
ve stejném formátu) nebo **Smazat**. Protože jde o data v prohlížeči, po přesunu
na jiné zařízení je potřeba okruhy naimportovat znovu — proto ta možnost stáhnutí.

Vzorový soubor k testování je `tools/sample-okruhy.txt`.

## Přidávání slovíček

Slovíčka nejsou zapsaná v kódu, ale v `okruhy/vychozi.txt` — stejný formát jako
import. Stačí přidat řádek, uložit a v aplikaci kliknout na *Načíst z
okruhy/vychozi.txt* (přes `file://` to nefunguje, tam slovíčka přilož přes drag
& drop nebo sem vlož).

```txt
LOS ANIMALES – ZVÍŘATA
el perro – pes
la abeja – včela
```

Nový okruh vznikne novým nadpisem psaným velkými písmeny. Soubor `okruhy/vychozi.txt`
je zároveň to, co si aplikace načte poprvé, takže editace funguje i bez serveru:
`assets/data-vlastni.js` je jen jeho automatická kopie pro offline běh a přegeneruje
se skriptem `node tools/sync-defaults.js`.

Heslo se v relaci ukazuje jako klíč `ID_OKRUHU|es` (např. `U:los-animales|el perro`),
takže po přejmenování slovíčka se jeho historie ztratí a karta se začne znovu.

## Kontrola (jen pro vývoj, potřebuje Node)

Stránka sama Node nepotřebuje, ale v repozitáři jsou dva kontrolní skripty:

```sh
node tools/check.js          # výchozí sada: duplicity, prázdné okruhy, divné znaky
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
