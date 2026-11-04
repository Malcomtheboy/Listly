# Listly

Sjekk en leieannonse eller bruktbilannonse for faresignaler før du betaler noe. Brukeren tar med annonsen selv (lenke, tekst, skjermbilde eller «Del → Listly»), så appen fungerer på Finn, Hybel, Facebook-grupper og alt annet uten API-avtaler eller scraping.

Prototype. Norge først (norsk UI, husleieloven-regler), men analysen fungerer på annonser fra andre land også.

## Kjøre lokalt

```bash
cd Listly/apps/api && npm install && cp .env.example .env   # legg inn GEMINI_API_KEY
npm run dev                                                 # http://localhost:3100
```

```bash
cd Listly/apps/mobile && npm install
npm run web -- --port 8082    # eller: npm start (Expo Go)
```

Fra `App-Dev` finnes også launch-konfigurasjonene `listly-api` og `listly-mobile-web`.

Tester for faresignal-reglene: `cd Listly/apps/api && npm test`.

### «Del → Listly» krever en dev build

Delemenyen er en native share extension (`expo-share-intent`), så den finnes **ikke** i Expo Go eller på web. Der er den slått av automatisk, og resten av appen virker som vanlig. For å teste deling på telefon:

```bash
cd Listly/apps/mobile && npx expo install expo-dev-client && npx expo run:android   # eller run:ios på Mac
```

## Kategorier og faner

Appen har fire faner: **Sjekk** (velg Bolig eller Bil, lim inn eller last opp), **Historikk** (alle sjekker, filtrert per kategori), **Lær** (svindeltriks per kategori og hva du gjør hvis du har betalt) og **Profil** (personvern og sletting av historikk).

Kategorien sendes med til API-et (`category: "rental" | "car"`). Kommer annonsen fra delemenyen uten kategori, gjetter `detectCategory` ut fra lenken (finn.no/mobility, hybel.no …) og ordene i teksten. Hver kategori har eget faktaskjema for AI-en (`extract.ts`) og egne regler (`red-flags.ts`); regler som gjelder alt (Western Union, hastverk, kun e-post) deles.

Ny kategori = nytt faktaskjema + regelsett i API-et, og en oppføring i `src/categories.ts` i appen.

## Hvordan det henger sammen

```
Lenke / tekst / skjermbilde / Del-meny
        │
        ▼
apps/mobile  ──POST /api/analyze──▶  apps/api
                                       ├─ fetch-listing.ts  henter én side brukeren delte (SSRF-sikret)
                                       ├─ extract.ts        Gemini: fakta + AI-faresignaler (strukturert JSON)
                                       └─ red-flags.ts      egne regler (Western Union, «i utlandet»,
                                                            nøkler i posten, depositum > 6 mnd …) + score
        ◀── Analysis { facts, flags, score, verdict, summary }
        │
        ▼
Lagres lokalt på telefonen (AsyncStorage)
```

Faste regler kjører alltid, uansett hva AI-en svarer, slik at kjente svindelmønstre aldri slipper gjennom. Et alvorlig signal gir alltid «Høy risiko». Appen sier aldri at en annonse er «trygg», bare hvilke faresignaler den fant.

## Bevisst utelatt (neste steg)

- **Innlogging.** API-et er åpent og bare beskyttet med rate limit (10/min). Må på plass før lansering, ellers kan hvem som helst bruke opp AI-kvoten.
- **Egen AI-nøkkel.** `.env` bruker nå samme Gemini-nøkkel som Rihla, så de deler kvote.
- **Markedspris-sjekk** mot SSB-leiestatistikk (er prisen mistenkelig lav for området?).
- **Omvendt bildesøk** av annonsebildene (stjålne bilder er det sterkeste svindelsignalet).
- **Sjekk av adresse** mot Kartverket.
- **Oppslag på registreringsnummer** hos Statens vegvesen (krever API-nøkkel) og **heftelser** i Løsøreregisteret. Nå får brukeren bare beskjed om å sjekke dette selv.
- **Flere kategorier**: ting fra Finn Torget/Marketplace, billetter.
- **Betaling** (boligjakt-pass i stedet for abonnement), **ikoner/splash** og **sammenligning** av annonser.
