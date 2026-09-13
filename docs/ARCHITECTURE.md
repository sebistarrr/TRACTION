# Architecture

Documentation technique de Tractions. Le mode d’emploi utilisateur est dans le
[`README.md`](../README.md), les consignes de contribution dans
[`CLAUDE.md`](../CLAUDE.md), le protocole de vérification dans
[`TESTS.md`](TESTS.md).

---

## 1. Vue d’ensemble

Une page HTML, une feuille de style, un script, un service worker. Rien n’est
généré, rien n’est compilé, rien n’est installé. L’app s’ouvre en `file://`
comme en `https://`, et fonctionne hors ligne dès la seconde visite.

```
index.html            structure et balises PWA / iOS
styles.css            palette, typographie, mise en page
app.js                stockage, agrégations, rendu, administration
sw.js                 service worker cache-first
manifest.webmanifest  manifeste PWA
icons/                icône SVG source + PNG 180 / 192 / 512 (dont maskable)
fonts/                Anton, Instrument Sans, JetBrains Mono en woff2
tools/make_icons.py   régénère icons/ depuis la géométrie de l'icône
```

Le flux est un cycle unique, sans exception :

```
événement → mutation de `state` → commit() → localStorage + render() → DOM
```

`render()` reconstruit chaque bloc depuis `state`. Aucune fonction de rendu ne
mute l’état ; aucune action ne touche le DOM directement — hors annonces
transitoires (`toast`, `flash`) qui ne sont pas des données.

---

## 2. Modèle de données

### 2.1 La clé de stockage

Une seule entrée `localStorage`, sous la clé **`tractions:v1`**, contenant le
JSON de l’état complet. `SCHEMA` vaut **4**.

```js
{
  version: 4,
  goal: 50,                 // objectif quotidien, 1..9999
  sets: [ /* séries */ ],
  prog: { /* programme 50 tractions */ },
  emom: { /* réglages et séance EMOM */ }
}
```

### 2.2 Une série

C’est l’unité de base. Tout — records, journal, histogramme — s’en déduit.

| Champ | Type | Contrainte |
|---|---|---|
| `id` | chaîne | unique ; généré par `uid()` si absent |
| `date` | chaîne | ISO `AAAA-MM-JJ`, jour d’attribution |
| `reps` | entier | 1 à `MAX_REPS` (999) |
| `kg` | entier | 0 à `MAX_KG` (200) ; 0 = poids du corps |
| `ts` | entier | horodatage ms, sert au tri **à l’intérieur** d’une journée |
| `src` | chaîne | `libre` · `programme` · `emom` |

`date` et `ts` sont volontairement redondants : `date` dit à quel jour la série
compte, `ts` dit où elle se range dans ce jour. C’est ce qui permet la saisie
rétroactive (voir §6.3).

Les dates sont partout des chaînes ISO, comparées **en chaîne** (`d >= from &&
d <= to`) : l’ordre lexicographique de `AAAA-MM-JJ` est l’ordre chronologique,
ce qui évite tout objet `Date` dans les boucles chaudes.

### 2.3 Le programme

```js
prog: {
  mode: 'libre' | 'programme' | 'emom' | null,  // null : jamais choisi → écran d'accueil
  level: 0..10,          // index dans LEVELS
  day: 0..(n-1),         // index dans LEVELS[level].days
  test: null | 0..999,   // record strict déclaré au premier lancement
  done: null | 'ISO',    // date de la dernière séance terminée
  last: null | { date, level, day, ok },
  session: null | { level, day, reps: [], until }
}
```

`mode` sert double : il retient l’entraînement choisi dans la bascule de
Training **et** signale, à `null`, qu’aucun premier lancement n’a eu lieu.

### 2.4 L’EMOM

```js
emom: {
  reps: 1..999,          // objectif par minute
  rounds: 1..60,         // nombre de minutes
  session: null | { reps, rounds, start, done: [] }
}
```

`start` est l’instant absolu du départ. `done` contient les minutes déjà
fermées ; sa longueur est le curseur de la séance.

### 2.5 La table des cycles

`LEVELS` est une constante figée, reprise de
[50tractions.com](https://www.50tractions.com/objectif-50-tractions/les-principes-du-programme) :
onze cycles, chacun `{ name, min, max, rest: 120, neg?, days: [{ sets, pause }] }`.
`min`/`max` bornent le record qui ouvre le cycle, `sets` liste les cinq
objectifs de la journée, `pause` le nombre de jours de repos conseillés après
elle, `neg` marque les deux premiers cycles, qui se font en tractions négatives.

Un objectif de série est un entier, ou un entier **négatif** qui code une série
à l’épuisement : `-3` s’affiche `3+` et se valide à partir de 3. C’est ce que
font `target()` et `targetLabel()`.

---

## 3. Lecture, écriture, migrations

### 3.1 La lecture ne fait jamais confiance

`load()` ne peut pas lever d’exception ni rendre un état invalide :
`localStorage` inaccessible, JSON cassé, racine non-objet ⇒ état vide. Ensuite
chaque branche est normalisée séparément.

- **`normalizeSets`** filtre entrée par entrée : non-objet, `reps` hors bornes
  ou date non ISO ⇒ rejet compté ; `ts` illisible ⇒ minuit du jour ; `kg`
  absent ⇒ 0 ; `id` dupliqué ⇒ rejet. Puis tri par `ts`, `id` en départage.
  Le compteur de rejets alimente le message d’import.
- **`normalizeProg`** re-borne `level`, puis `day` **contre la longueur réelle
  du cycle retenu** — les cycles n’ont pas tous le même nombre de journées, un
  fichier ancien peut désigner un jour qui n’existe plus. Un `until` déjà
  dépassé est remis à zéro : un repos ne survit pas au-delà de son échéance.
- **`normalizeEmom`** exige un `start` lisible ; sans lui la séance n’a plus de
  chrono et elle est abandonnée.

**Toute donnée persistée nouvelle doit être normalisée ici.** C’est la seule
frontière entre le stockage et l’état vivant.

### 3.2 L’écriture

`commit()` sérialise et écrit, en une fois, puis rend. Un `localStorage` plein
lève : l’exception est capturée et se traduit en toast, l’app continue de
tourner sur son état en mémoire.

### 3.3 Import / export

L’export est le `serialize()` de l’état courant, dans
`tractions-AAAA-MM-JJ.json`. L’import lit le fichier, valide, puis **propose**
deux issues avant toute écriture :

- **Fusionner** ajoute les séries dont l’`id` est inconnu, puis renormalise
  l’ensemble. Les réglages ne bougent pas.
- **Remplacer** substitue séries et objectif ; `prog` et `emom` ne sont
  remplacés **que si le fichier en porte**, sinon la progression locale reste.

Les versions 1 à 4 sont acceptées : la 1 ignorait la charge (reprise à 0 kg,
annoncé dans le message), la 2 le programme, la 3 l’origine (séries reprises
comme libres). Un fichier sans `version` est traité comme courant.

---

## 4. Agrégations et évolution

### 4.1 Les échelles

```js
SCOPES = {
  d7:    { count: 7,  daily, week, nav },  // lundi → dimanche
  d30:   { count: 30, daily, dense, nav }, // fenêtre glissante
  month: { count: 12, dense },             // 12 derniers mois
  year:  { count: 5 }                      // 5 dernières années
}
```

`daily` : un seau par jour. `dense` : trop de barres pour tout étiqueter.
`week` : semaine calendaire, `weekStart()` cale sur le lundi via
`(getDay() + 6) % 7`. `nav` : la fenêtre se remonte à la flèche.

### 4.2 La navigation temporelle

`periodOffset` compte les périodes en arrière — 0 la période en cours.
`windowEnd(name, offset)` en déduit le dernier jour affiché : le dimanche visé
en hebdomadaire, `aujourd’hui − count × offset` sur la fenêtre glissante.

`stepPeriod(n)` borne à 0 par le bas ; `renderPeriod()` désactive la flèche
avant sur le présent et la flèche arrière quand le premier seau visible atteint
`firstDate()`. Changer d’échelle (`activateTab`) ramène `periodOffset` à 0.

### 4.3 Les seaux

`buildBuckets(scope)` fabrique la liste, du plus ancien au plus récent, chaque
seau portant `key`, `axis` (libellé d’axe), `title` (libellé long), `goalRef`
(objectif de référence), et `future` en journalier. Les séries sont ensuite
distribuées en une passe via un index par clé, ce qui donne `value`, `sets` et
`activeDayCount`.

`future` est essentiel : dans la semaine en cours, les jours à venir gardent
leur place mais **n’affichent aucun nombre** — ils n’ont pas fait zéro. La même
règle exclut ces jours de `defaultKey()`, qui choisit la barre sélectionnée à
l’arrivée : la dernière journée passée qui porte quelque chose.

### 4.4 L’échelle verticale

`scaleFor()` réserve un dégagement de `HEADROOM = 1.24` au-dessus de la plus
haute barre, pour le nombre affiché.

En journalier la ligne d’objectif est **toujours** tracée : c’est un repère
horizontal constant. Mois et année n’en portent pas, et se calent sur le
maximum réel — un objectif « quotidien × tous les jours de la période »
supposerait de ne jamais manquer un jour, la ligne resterait loin au-dessus des
barres sans rien apprendre.

### 4.5 La tendance

`trendText()` compare **à portion égale**. En journalier, `elapsedSpan()` compte
les jours déjà passés de la fenêtre et la compare aux `span` premiers jours de
la fenêtre précédente : une semaine entamée le mardi se compare à deux jours,
pas à sept. Sur mois et année, c’est simplement le dernier seau contre
l’avant-dernier.

---

## 5. Le rendu

`el` centralise tous les nœuds, résolus une fois au chargement. Aucune
recherche DOM dans une boucle de rendu.

`render()` appelle, dans l’ordre : `renderToday`, `renderRecords`,
`renderJournal`, `renderChart`, `renderEntry`, `renderProgram`,
`renderEmomCard`, `renderProgAdmin`, `renderAdmin` — puis les pages plein écran
seulement si elles sont ouvertes.

Deux canaux transitoires, hors du cycle :

- **`toast(message)`** — confirmation discrète en bas, quelques secondes.
- **`flash(titre, sous-titre)`** — le **panneau ambre** de reprise, qui couvre
  la séance en cours et s’efface au bout de 4 s ou à la touche. Il double son
  contenu dans `#flashSay`, un `role="status"` `aria-live="assertive"`
  visuellement masqué, pour les lecteurs d’écran. `hideFlash()` le referme, et
  `syncRoute()` le referme d’office dès qu’on quitte une séance : une annonce
  n’a de sens que sur l’écran qui l’a déclenchée.

---

## 6. Les trois entraînements

### 6.1 Libre

Compteur, raccourcis, charge présélectionnée conservée d’une série à l’autre
(`loadKg`, en mémoire seulement). `addSet()` enregistre **toujours au jour du
jour**. Franchir l’objectif déclenche une pulsation ambre, sauf si l’appareil
demande moins d’animations (`calm`, lu une fois via `prefers-reduced-motion`).

### 6.2 Programme 50 tractions

Une séance est `{ level, day, reps: [], until }`. `validateSet()` pousse une
série `src: 'programme'` dans `state.sets`, l’ajoute à `s.reps`, et arme
`until = Date.now() + rest × 1000` — sauf après la dernière série.

**Le repos est un horodatage.** `tickRest()` n’affiche que le temps restant ;
`watchRest()`, appelé toutes les 250 ms, est le seul à écrire : à l’échéance il
met `until = 0`, commit, joue le signal visuel `ready()` et appelle
`announceSet()` — le panneau ambre qui nomme la série suivante et son objectif.
Passer le repos à la main (`skipRest`) n’annonce rien : on sait ce qu’on fait.

Conséquence directe : fermer l’app pendant un repos ne perd rien, le décompte
reprend juste où il en est réellement.

`finishSession()` arbitre : les cinq séries à leur objectif font avancer d’un
jour, puis d’un niveau au bout du cycle ; sinon la même journée revient.

### 6.3 EMOM

**Le chrono ne s’arrête jamais.** `emomMinute(s)` déduit la minute courante de
`(Date.now() − start) / 60000`. `watchEmom()` ferme toutes les minutes en
retard : celle qui vient de s’achever prend le nombre affiché à l’écran, les
minutes entièrement passées à côté prennent l’objectif.

`renderEmomSession()` annonce chaque minute qui s’ouvre par le même panneau
ambre, une fois et une seule, via le garde `emomFlashed`. `openEmom()` le cale
sur `done.length` avant d’ouvrir : reprendre une séance en cours n’annonce pas
une minute qu’on est déjà en train de vivre.

> **Attention** — c’est le comportement à l’origine de la limite connue : une
> minute non effectuée est tout de même journalisée à l’objectif, donc comptée
> dans les records et l’évolution.

---

## 7. Navigation et routage

Deux niveaux distincts.

**Les cinq onglets** ne touchent pas l’adresse : `activateView(i)` bascule
`hidden` sur les cinq sections et met à jour `aria-selected` / `tabIndex`
(pattern tablist, flèches gauche/droite au clavier).

**Les pages plein écran** passent par le hash, pour que le bouton retour du
navigateur les referme :

| Hash | Page | Condition d’ouverture |
|---|---|---|
| `#jour=AAAA-MM-JJ` | édition d’une journée | la journée porte au moins une série |
| `#seance` | séance du programme | `state.prog.session !== null` |
| `#emom` | séance EMOM | `state.emom.session !== null` |
| `#jours` | tous les jours du programme | — |

`syncRoute()` est la seule fonction qui ouvre ou ferme : elle lit le hash,
applique les conditions, verrouille le corps (`lockBody`), referme le panneau
d’annonce si aucune séance n’est ouverte, arrête les minuteries des pages
fermées, et rend celles qui s’ouvrent. Les `open*` poussent un état
(`history.pushState`) puis appellent `syncRoute()` ; `popstate` la rappelle.

Les conditions ne sont pas décoratives : **une adresse copiée-collée ne
fabrique pas d’entraînement.**

L’écran de première connexion échappe au hash. C’est un passage obligé — le
bouton retour ne doit pas pouvoir l’esquiver.

Au démarrage, tout hash présent est effacé par `replaceState` : un lancement
part toujours de l’écran d’ajout, jamais d’une page profonde.

---

## 8. Mise en page

### 8.1 Jetons

Fond bleu pétrole (`--ink`, `--ink2`, `--steel`), texte craie (`--chalk`),
secondaire (`--haze`). Un accent par section : `--orange` (Training et action
principale), `--flare` ambre (Record, objectif franchi), `--sky` cyan
(Évolution, anneaux), `--iris` (Admin), `--rust` réservé au destructif. Un
cinquième, `--orchid`, ne sert qu’à marquer l’origine « programme » au journal —
les trois origines sont séparées d’environ 95° de teinte pour rester
distinguables en petites pastilles.

Trois familles auto-hébergées : Anton (`--display`), Instrument Sans (`--sans`),
JetBrains Mono (`--mono`).

### 8.2 La coque

`body { overflow: hidden; overscroll-behavior: none }` : la page ne défile
jamais. `.app` est en `position: fixed` et prend toute la hauteur, par une
cascade de replis :

```css
height: 100vh;              /* socle */
height: 100dvh;             /* navigateurs modernes */
height: var(--app-h, 100dvh);  /* mesure JS, la seule fiable sur iPhone */
```

`fitApp()` écrit `--app-h` depuis **`window.innerHeight`** — délibérément, et
non depuis le viewport visuel : `innerHeight` ne bouge pas à l’ouverture du
clavier iOS, l’app ne saute donc pas pendant la saisie. Recalculé au `resize`,
à l’`orientationchange` et sur `visualViewport`.

Entre la barre du haut et la barre d’onglets du bas, seule la vue active défile,
et seulement si elle déborde. Les deux barres respectent `env(safe-area-inset-*)`.

### 8.3 Les trois paliers

L’app se cale sur la hauteur d’écran, pas sur la largeur :

| Palier | Cible |
|---|---|
| `max-height: 699px` | iPhone SE — tout se resserre |
| `min-height: 700px` | intermédiaire |
| `min-height: 820px` | grands iPhone — scène, chiffres, boutons et onglets d’un cran au-dessus |

Quelques ruptures de largeur complètent (`390px`, `460px`, `560px`, `900px`),
notamment pour passer les champs de saisie rétroactive de une à deux colonnes.

`@media (prefers-reduced-motion: reduce)` coupe les animations, et `calm` fait
la même chose côté JS pour celles qui sont déclenchées par script.

---

## 9. PWA et hors ligne

`sw.js` est **cache-first** sur une liste de shell figée : page, style, script,
manifeste, icônes, polices. À l’installation chaque ressource est ajoutée
individuellement — une seule manquante ne doit pas faire échouer l’installation
entière. À l’activation, toute clé de cache différente de `CACHE` est purgée.

Au `fetch` : seules les requêtes `GET` de même origine sont interceptées ; un
succès réseau est recopié dans le cache ; hors ligne, toute navigation retombe
sur `./index.html`.

> **`CACHE` doit être incrémenté à chaque livraison** qui touche un fichier du
> shell. Sans ça, les appareils déjà installés servent l’ancienne version
> indéfiniment. Valeur actuelle : `tractions-shell-v19`.

L’enregistrement est sauté en `file://`. `navigator.storage.persist()` est
demandé au démarrage ; un refus est silencieux.

Tous les chemins du manifeste et du service worker sont relatifs (`./`), l’app
fonctionne donc telle quelle depuis un sous-dossier de GitHub Pages.

---

## 10. Déploiement

`.github/workflows/pages.yml` se déclenche sur poussée vers
**`claude/cree-application-w5moka`** (ou à la main, `workflow_dispatch`). Il
copie les cinq fichiers plus `icons/` et `fonts/` dans `_site`, téléverse
l’artefact et publie. Concurrence `pages`, sans annulation du run en cours.

Pages doit avoir été activé une fois à la main dans *Settings → Pages → Source →
GitHub Actions* : le jeton d’Actions peut publier, pas créer le site.

Site en ligne : <https://sebistarrr.github.io/TRACTION/>.

---

## 11. Invariantes à préserver

Une modification qui casse l’une de ces propriétés est une régression, même si
elle passe visuellement.

1. Une série est immuable une fois écrite, sauf édition explicite depuis le
   Journal ou suppression.
2. Une séance interrompue — app fermée, écran éteint, appareil redémarré — se
   retrouve dans l’état réel du temps écoulé, jamais figée.
3. Aucune requête réseau au runtime.
4. Aucun état invalide ne peut sortir de `load()`.
5. La page ne défile ni verticalement ni latéralement ; les blocs tiennent sur
   iPhone SE.
6. Toute information portée par une couleur est doublée d’un libellé.
7. Une adresse forgée n’ouvre pas une séance qui n’existe pas.
