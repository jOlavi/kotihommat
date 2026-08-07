# Kotihommat — PROJECT SPEC (v2, design-handoffin mukainen)

## Yleiskuvaus

Mobiilikäyttöinen web-sovellus perheen kotitöiden ja taskurahan hallintaan. Kaksi roolia: **lapsi** (tekee ja merkitsee kotitöitä, seuraa saldoa) ja **vanhempi** (hallinnoi kotitöitä, perhettä ja maksuja). Toteutus: **React (Vite, TypeScript) + Firebase** (Auth, Firestore, Cloud Functions).

UI-suunnittelu tehty Claude Designilla ("Kotihommat", "Classical"-designjärjestelmä). Ks. design-referenssit: `README.md`, `styles.css`, `Kotihommat_dc.html` (interaktiivinen prototyyppi, korkea uskollisuus — copy, spacing ja tilat lopullisia).

## Roolit

| Rooli | Kirjautuminen | Oikeudet |
|---|---|---|
| **Parent (vanhempi)** | Google-tunnukset (Firebase Auth) | Luo/muokkaa kotitöitä, viikkosuunnittelu, lisää perheenjäseniä, merkitsee poissaoloja ja maksuja |
| **Child (lapsi)** | Käyttäjätunnus + salasana (luo vanhempi) | Näkee omat tehtävänsä, merkitsee tehdyksi, näkee oman saldon |

- Lapsen tunnus luodaan **Cloud Functionilla (Admin SDK)** — ei client-puolen `createUserWithEmailAndPassword`, ettei vanhemman sessio katkea.
- Lapsella ei sähköpostia: kiinteä sisäinen domain taustalla, UI näyttää vain käyttäjätunnuksen.
- Toinen vanhempi liittyy **kutsulinkin/tokenin** kautta (Firestore-doc, jossa vanheneminen), Google-kirjautumisen jälkeen.
- Rooli tulee aina autentikoidun käyttäjän member-dokumentista — ei manuaalista roolinvaihtoa tuotannossa (prototyypin dev-only badge-tap ei siirry tuotantoon).

## Tietomalli (Firestore) — design-handoffin mukainen rakenne

```
families/{familyId}
  name: string
  createdAt: timestamp
  inviteCode: string            // vanhemman kutsua varten, tokenoitu + vanhenee

families/{familyId}/members/{uid}
  role: "parent" | "child"
  firstName: string             // EI muita henkilötietoja — ei ikää, ei syntymäaikaa
  username: string              // vain child-roolilla

families/{familyId}/chores/{choreId}
  name: string
  priceCents: number            // 0,50€ = 50, aina 50c välein
  type: "daily" | "weekly" | "once"
  assignedMemberIds: string[]   // voi sisältää sekä lapsia että vanhempia (esim. koiran ulkoilutus)
  active: boolean

families/{familyId}/weeklyPlans/{weekId}/assignments/{choreId}
  // daily-tyyppiselle kotityölle: { ma: memberId, ti: memberId, ... su: memberId }
  // weekly-tyyppiselle: { all: memberId }

families/{familyId}/taskInstances/{instanceId}
  choreId: string
  memberId: string
  date: string                  // ISO-päivä, Europe/Helsinki
  isoWeek: number
  priceCents: number             // kopioitu chorelta luontihetkellä
  status: "tehty" | "tekematon" | "merkitty"
  completedAt: timestamp | null
  // generoidaan choresta + weeklyPlanista ajastetulla Cloud Functionilla,
  // ei suoraan clientissä

families/{familyId}/members/{childId}/absences/{id}
  type: "loma" | "sairas"
  from: string
  to: string

families/{familyId}/members/{childId}/payments/{id}
  amount: number                 // priceCents-yksikössä
  date: timestamp
  // kirjoituksen yhteydessä päivitetään denormalisoitu paidTotal
  // member-dokumenttiin (tai lasketaan Cloud Functionilla), jotta
  // odottaa = earnedTotal - paidTotal pysyy ajan tasalla ilman koko
  // subcollectionin lukemista clientillä
```

### Tilakone (taskInstances.status)

```
tekematon → tehty → merkitty   // "merkitty" = maksettu/käsitelty tämä instanssi
```

- **Ei hyväksyntävaihetta** — lapsen "tehty"-merkintä riittää suoraan.
- `daily`/`weekly`-tyyppinen kotityö: jos instanssi jää `tekematon`-tilaan kauden loputtua, se jää sellaiseksi historiaan (ei enää aktiivinen näkymässä).
- `once`-tyyppinen (kertaluontoinen): pysyy näkyvissä `tekematon`-tilassa kunnes tehdään, riippumatta viikonvaihteista.

### Maksaminen — manuaalinen (ei automaattista maksujaksoa)

- Vanhempi käyttää **"Merkitse maksetuksi"** -toimintoa lapsen profiilissa.
- Summa oletuksena koko odottava saldo (`earnedTotal - paidTotal`), muokattavissa, ei voi ylittää sitä.
- Kirjaa uuden `payments`-dokumentin ja päivittää `paidTotal`:n.
- Ei erillistä perhekohtaista `paycycle`-asetusta (viikko/2vk/kk) — päätös maksuajankohdasta jää vanhemman harkintaan.

### Kotitöiden jako koko perheelle

- `assignedMemberIds` voi sisältää sekä lapsia että vanhempia (esim. koiran ulkoilutus jaettuna).
- **Viikkosuunnittelu**-näkymä (vanhempi → Kotityöt-välilehti):
  - `daily`-kotityöt: 7 saraketta (Ma–Su), yksi vastuuhenkilö per päivä
  - `weekly`-kotityöt: yksi vastuuhenkilö koko viikolle
  - `once`-kotityöt eivät näy viikkosuunnittelussa
  - Tallennus kirjoittaa `weeklyPlans/{weekId}/assignments/{choreId}`, josta `taskInstances` generoidaan

### Poissaolot

- `loma` ja `sairas`, tallennetaan `members/{childId}/absences`.
- Poissaolopäivälle ei generoida/näytetä `taskInstancea`, eikä se lasketa tekemättömäksi.

### Template-muutosten vaikutusalue

- Choren muokkaus (hinta, tyyppi jne.) vaikuttaa vain **tulevaisuudessa generoitaviin** taskInstansseihin.
- Jo luodut/tehdyt/maksetut instanssit pysyvät koskemattomina (`priceCents` kopioitu instanssiin).
- Deaktivointi (`active: false`) lopettaa uusien instanssien generoinnin, säilyttää historian.

## Näkymät (ks. tarkat kuvaukset ja copy README.md:stä / Kotihommat_dc.html:stä)

**Lapsi:** Tänään (päivän tehtävät + banneri tekemättömistä + muistutus) · Viikko (koko ISO-viikko päivittäin ryhmiteltynä, read-only) · Oma saldo (piggy bank -visuaali + ansaittu/maksettu/odottaa)

**Vanhempi:** Kotityöt (Lista + Viikkosuunnittelu -segmentti) · Perhe (jäsenlista, lisää lapsi, kutsu vanhempi) · Lapsen profiili (7pv mini-kalenteri, saldot, poissaolot, maksuhistoria, Merkitse poissaolo / Merkitse maksetuksi)

**Kaikki roolit:** Asetukset-dialogi (tumma tila, push-ilmoitukset "tulossa pian" -placeholder, päivittäinen muistutusaika)

## Design-tokenit — ks. styles.css (source of truth)

- Fontit: Cormorant Garamond (otsikot) / Lora (leipäteksti)
- Roolin aksenttiväri vaihtuu CSS-muuttujien kautta: vanhempi = kulta (`--color-accent` ramp styles.css:stä), lapsi = sininen (oklch hue 220, sama lightness/chroma-skaala)
- Komponenttiluokat (`.btn`, `.tag`, `.card`, `.field`/`.input`, `.seg`, `.dialog` jne.) siirretään 1:1 uuteen projektiin
- Ikonit: Lucide (`lucide-react`-paketti tuotannossa)

## Ilmoitukset (v1)

- Ei oikeaa push-ilmoitusta (ei FCM:ää, ei service workeria).
- Kun lapsen näkymä avataan, haetaan päivän `tekematon`-instanssit ja näytetään banneri sovelluksen sisällä.
- Asetuksissa "Push-ilmoitukset" -toggle näkyy "Tulossa pian" -tekstillä placeholderina.
- Arkkitehtuuri jättää tilaa oikealle pushille myöhemmin.

## Tietosuoja

- Kerätään vain: etunimi, käyttäjätunnus (lapsi), kotitöihin ja maksuihin liittyvä data.
- **Ei ikää, ei muita henkilötietoja** — design-prototyypin valinnainen ikäkenttä jätetään pois toteutuksesta.
- Firestore security rules: `parent` lukee/kirjoittaa oman perheen kaikkea dataa; `child` lukee oman perheen dataa mutta kirjoittaa vain omien taskInstances-dokumenttiensa statusta.

## Rajauksia v1:ssä

- Ei hyväksyntävaihetta vanhemmalle
- Ei automaattista maksujaksoa (manuaalinen "Merkitse maksetuksi")
- Ei oikeaa push-ilmoitusta
- Ei ikää eikä muita henkilötietoja kuin etunimi
