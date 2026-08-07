# Onboarding-näkymä: perheen luonti

**Päivämäärä:** 2026-08-07
**Laajuus:** UI-kerros vain (ei Firebase-kytkentää)

## Tavoite

Ensimmäisen käynnistyskerran flow, jossa vanhempi luo perheen ja voi lisätä jäseniä ennen sovellukseen siirtymistä.

## Komponenttirakenne

```
src/pages/onboarding/
  OnboardingView.tsx       — päävirtaus (step A → B), saa onComplete-propsin
  AddChildDialog.tsx       — "Lisää lapsi" -modaali
  InviteParentDialog.tsx   — "Lisää vanhempi" -modaali
```

`App.tsx` pitää `onboardingDone: boolean` -staten (`useState(false)`). Kun se on `false`, renderöidään `<OnboardingView onComplete={...} />`. Kun `onComplete` kutsutaan, asetetaan `onboardingDone = true` ja siirrytään app-shelliin.

## State (`OnboardingView` sisäinen)

```ts
step: 'create' | 'manage'
creatorName: string          // tallennetaan step A:n lomakkeesta
familyName: string           // tallennetaan step A:n lomakkeesta
members: { name: string; role: 'parent' | 'child' }[]
dialog: 'addChild' | 'inviteParent' | null
```

Luoja lisätään `members`-listaan automaattisesti step A:n submit-hetkellä (`role: 'parent'`). Häntä ei voi poistaa listalta.

## Step A — "Luo perhe"

- Keskitetty vertikaalisesti (`flex-direction: column; justify-content: center`)
- Logo-ympyrä: 56×56px, `border: 1.5px solid var(--color-accent)`, sisällä "K" heading-fontilla
- `<h1>` "Luo perheesi" (font-size 28px)
- Alaotsikko: "Aloitetaan lisäämällä sinut ensimmäisenä vanhempana." (opacity 0.7)
- Lomake:
  - `.field` + `.input`: "Oma nimi" (placeholder "esim. Liisa", required)
  - `.field` + `.input`: "Perheen nimi" (defaultValue "Virtanen", required)
  - `.btn.btn-primary.btn-block`: "Luo perhe" (type submit)
- Submit: tallennetaan `creatorName` + `familyName`, lisätään luoja `members`-listaan, asetetaan `step = 'manage'`

## Step B — "Hallinnoi"

- Yläosa: `.tag.tag-accent` jossa "Perhe {familyName}", alaotsikko "Perhe luotu. Lisää muut jäsenet, tai jatka sovellukseen."
- Jäsenlista: jokainen `.card` (flex row): avatar-ympyrä (30×30px, initial), nimi, `.tag` roolin mukaan (vanhempi: `tag-outline`, lapsi: `tag-accent`)
- Napit (flex row, gap): `.btn.btn-secondary` "Lisää lapsi" + `.btn.btn-secondary` "Lisää vanhempi"
- `.btn.btn-primary.btn-block` "Valmis, siirry sovellukseen" — kutsuu `onComplete(creatorName, familyName, members)`

## Dialogit

### AddChildDialog

- `.dialog-backdrop` + `.dialog`
- `.dialog-title` "Lisää lapsi"
- `.field` + `.input`: "Lapsen nimi" (required)
- `.dialog-actions`: `.btn.btn-secondary` "Peruuta" + `.btn.btn-primary` "Lisää"
- Submit: lisää `{ name, role: 'child' }` members-listaan, sulkee dialogin

### InviteParentDialog

- `.dialog-backdrop` + `.dialog`
- `.dialog-title` "Kutsu toinen vanhempi"
- Read-only `.input` jossa staattinen placeholder `https://kotihommat.app/invite/abc123`
- `.btn.btn-secondary.btn-block` "Kopioi linkki" — `navigator.clipboard.writeText(...)`, napin teksti muuttuu "Kopioitu!" ~1.8s ajaksi
- `.btn.btn-secondary` "Sulje"

## Ulkoasu

Kaikki komponenttiluokat (`btn`, `tag`, `card`, `field`, `input`, `dialog`, jne.) tulevat suoraan `src/styles.css`:stä muuttamattomina. Ei erillistä CSS-moduulia onboardingille.

## Props

```ts
interface OnboardingViewProps {
  onComplete: (
    creatorName: string,
    familyName: string,
    members: { name: string; role: 'parent' | 'child' }[]
  ) => void
}
```

## Rajaukset

- Ei client-puolen validaatiokirjastoa — natiivi HTML `required` riittää tässä vaiheessa
- Invite-linkki on staattinen placeholder, ei oikeaa Firestore-tokenia
- Ei Firebase-kytkentää — `onComplete` palauttaa datan App.tsx:lle, joka voi myöhemmin lähettää sen Firebaseen
