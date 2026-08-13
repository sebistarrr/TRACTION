# Tractions

Application web de suivi de tractions : statique, sans compte, sans réseau, installable
sur l’écran d’accueil d’un iPhone comme une vraie app.

## Ce que fait l’app

Cinq onglets, dans une barre figée en bas de l’écran :
**Training · Record · Journal · Évolution · Admin**.

L’interface est figée à la taille de l’écran : la page ne défile pas, le zoom est désactivé
et il n’y a aucun défilement latéral. Seul le contenu d’un onglet défile verticalement, et
uniquement quand il dépasse.

### 1. Training

Trois entraînements, au choix, sous une bascule **Libre · 50 tractions · EMOM** en haut
de l’onglet. Le choix se garde d’une session à l’autre et se change à tout moment.

#### 1a. Libre

- Le total du jour en grand. Il monte et franchit physiquement une barre de traction à mesure
  que l’objectif approche ; objectif franchi, la barre passe en ambre.
- Compteur `−` / `+`, chiffre éditable au clavier numérique, raccourcis **2 · 4 · 6 · 8 · 10 · 12**.
- **Charge en kg** présélectionnable : **0 · 5 · 10 · 15 · 20 · 25 · 30**. La valeur choisie reste
  d’une série à l’autre, le temps de la séance. Les séries lestées portent leur charge partout :
  pastilles du jour, journal, record.
- À l’enregistrement, le chiffre encaisse la charge, la barre fléchit et le nombre ajouté
  s’envole en orange ; franchir l’objectif déclenche une pulsation ambre. Tout se tait si
  l’appareil demande moins d’animations.
- Une série est toujours enregistrée **au jour du jour**. Une séance oubliée se rattrape
  depuis **Admin → Ajouter une série passée**.
- **Toutes les séries du jour** s’affichent en pastilles, dans l’ordre, sur autant de lignes
  qu’il en faut, charge comprise.
- Le bloc tient dans l’écran sans défiler, du plus petit au plus grand.

L’app se cale sur trois paliers de hauteur d’écran : compact sous 700 pt (iPhone SE),
intermédiaire entre 700 et 820, et généreux au-delà — scène, chiffres, boutons et onglets
grandissent d’un cran. Une journée chargée reste sans défilement : 20 séries sur iPhone 16 Pro,
16 sur iPhone SE. Au-delà, l’écran défile normalement. Vérifié aux dimensions réelles de l’iPhone SE (375 × 667),
16 (393 × 852), **16 Pro (402 × 874)** et 16 Pro Max (440 × 956), zones de sécurité
comprises : 59 pt de Dynamic Island en haut, 34 pt d’indicateur d’accueil en bas.

#### 1b. Programme 50 tractions

Les cycles de [50tractions.com](https://www.50tractions.com/objectif-50-tractions/les-principes-du-programme),
repris tels quels : **onze niveaux**, cinq séries par séance, **120 secondes de repos**
entre les séries.

**Au premier lancement**, un mot de bienvenue et une seule question : le **record de
tractions strictes** — bras tendus en bas, menton au-dessus de la barre. Un bouton
valide, et c’est tout.

Ce record choisit le cycle — 7 tractions ouvrent le cycle *6-8*, et ainsi de suite
jusqu’à *plus de 40* — et l’app s’ouvre sur le programme, qui en découle directement.
La bascule en haut de Training mène au libre et à l’EMOM ; le niveau et le jour se
reprennent depuis **Admin → Programme 50 tractions**.

| Record      | Cycle | Journées |
|-------------|-------|----------|
| 0 – 3       | Moins de 4 tractions | 6 |
| 4 – 5       | 4-5 tractions        | 6 |
| 6 – 8       | 6-8 tractions        | 6 |
| 9 – 11      | 9-11 tractions       | 6 |
| 12 – 15     | 12-15 tractions      | 6 |
| 16 – 20     | 16-20 tractions      | 9 |
| 21 – 25     | 21-25 tractions      | 9 |
| 26 – 30     | 26-30 tractions      | 9 |
| 31 – 35     | 31-35 tractions      | 9 |
| 36 – 40     | 36-40 tractions      | 9 |
| 41 et plus  | Plus de 40 tractions | 9 |

Les **deux premiers cycles se font en tractions négatives** : on ne se hisse pas, on
part menton à la barre et on descend lentement. L’app le signale partout où le cycle
est nommé — carte du jour et écran des jours.

La **séance du jour** affiche le niveau, le jour dans le cycle et les cinq objectifs.
Un nombre est un objectif ferme ; **`3+`** est une série à l’épuisement, validée à
partir de 3.

**Démarrer un entraînement** ouvre la séance, série par série :

1. l’objectif en grand, le champ prérempli à cette valeur ;
2. on corrige le nombre réellement effectué, on valide ;
3. le **repos de 120 secondes** part aussitôt, en anneau. Il se passe d’un bouton, et
   se termine seul : un **panneau ambre** annonce la série qui vient et son objectif,
   par-dessus la séance, et s’efface au bout de quatre secondes ou à la touche —
   l’écran n’est pas forcément sous les yeux. Passer le repos à la main n’annonce rien ;
4. après la cinquième série, le **bilan** : chaque série face à son objectif.

**Objectif rempli** — les cinq séries au moins à leur objectif — fait passer au jour
suivant, et au **niveau suivant** une fois le dernier jour du cycle franchi.
**Objectif manqué**, le même jour revient à la prochaine séance.

Le programme conseille **un jour de repos** entre deux séances, **deux jours** toutes
les trois séances. La carte affiche le repos restant sans jamais bloquer la séance.

#### Reprendre la main sur le cycle

**Admin → Programme 50 tractions → Choisir jour du programme** ouvre le programme
entier. Le cycle se feuillette à la flèche, du *moins de 4* au *plus de 40* ; chaque
journée y montre ses cinq objectifs et ses deux repos — les 120 secondes entre les
séries, puis le ou les jours de pause avant la séance suivante. Celle où en est le
programme porte la mention *en cours*.

Toucher une journée la désigne comme **prochaine séance** ; **Valider** l’enregistre,
le bouton retour ressort sans rien changer. Une séance laissée en cours ailleurs dans
le cycle est abandonnée à la validation — elle imposerait sa propre suite au moment du
bilan. Les séries déjà enregistrées, elles, restent au journal.

Une séance interrompue se retrouve intacte, repos compris : le décompte est un
horodatage, pas un minuteur. Le bouton propose alors de **reprendre la séance**.

Les séries du programme sont des séries comme les autres : elles nourrissent le
journal, les records et l’évolution.

#### 1c. EMOM

*Every Minute On the Minute* : une série au début de chaque minute, le reste de la
minute sert de repos.

Avant de partir, deux réglages : les **tractions par série** et le **nombre de
minutes**. La carte annonce la séance prévue — « 50 tractions en 10 minutes ».

Pendant la séance, **le chrono ne s’arrête jamais**. L’anneau se remplit sur la minute
en cours, et c’est lui qui mène :

- on renseigne le **nombre réellement effectué**, puis on valide ;
- validée en avance, la série laisse souffler jusqu’à la minute suivante, qui
  reprend la main toute seule. Chaque minute qui s’ouvre s’annonce par le même
  **panneau ambre** que le repos du programme : son rang et son objectif, quatre
  secondes ;
- **la minute se referme sur le nombre affiché** si rien n’est validé. Une minute
  passée entièrement à côté — écran éteint, téléphone dans la poche — se referme
  sur l’objectif ;
- après la dernière minute, le bilan : total, et combien de minutes ont tenu
  l’objectif.

**Arrêter l’EMOM** en cours de route ne perd rien : les minutes déjà faites restent
au journal.

### 2. Record

Trois records, en grand, chacun avec sa date : **record sur une série**,
**record sur une journée**, **total tractions**.

### 3. Journal

Uniquement les journées actives, de la plus récente à la plus ancienne : la date, le total,
et les séries en étiquettes, exactement celles de Training — une pastille par série,
la charge accolée. Le total passe en ambre quand l’objectif du jour a été franchi.

**L’origine de chaque série se lit sur la pastille**, à sa couleur : **orange** en libre,
**orchidée** au programme, **cyan** en EMOM — trois teintes séparées d’environ 95° les
unes des autres, pour se distinguer d’un coup d’œil même en petites pastilles. Sous la
date, la journée annonce ce qu’elle contient — `Libre`, `50 tractions`, `EMOM`, ou
plusieurs si elle a mélangé.

**Toucher une journée l’ouvre en édition** : chaque série y a son champ tractions et son champ
charge, modifiables directement, avec suppression unitaire, et **son origine en toutes
lettres**. Un bouton efface la journée entière, en deux temps. La date est dans l’adresse
(`#jour=AAAA-MM-JJ`), le bouton retour du navigateur referme l’éditeur.

### 4. Évolution

Histogramme sur quatre échelles. **Chaque barre porte son nombre de tractions** — tourné d’un
quart de tour sur les échelles denses pour rester lisible. Variation vs la période précédente
et légende détaillée au clic sur une barre.

| Échelle  | Fenêtre affichée              | Flèches | Ligne d’objectif    |
|----------|-------------------------------|---------|---------------------|
| Semaine  | du lundi au dimanche          | oui     | objectif, constante |
| 30 jours | 30 jours glissants            | oui     | objectif, constante |
| Mois     | 12 derniers mois              | non     | aucune              |
| Année    | 5 dernières années            | non     | aucune              |

**Semaine** et **30 jours** se remontent le temps à la flèche, une période entière à la fois :
la semaine d’avant, les trente jours d’avant. L’étiquette dit la fenêtre affichée — « 10 – 16 août » —
et passe en cyan dès qu’on quitte la période en cours. La flèche avant s’éteint sur le présent,
la flèche arrière quand il n’y a plus rien de plus ancien à voir. Changer d’échelle ramène au présent.

La **tendance compare la fenêtre à la précédente**, à portion égale : une semaine entamée le
mardi se compare aux deux premiers jours de la semaine d’avant, pas à sept.

Dans la semaine en cours, **les jours qui ne sont pas encore venus** gardent leur place sans
porter de nombre : ils n’ont pas fait zéro.

Sur les deux échelles journalières, la ligne d’objectif est toujours tracée : c’est le repère
horizontal constant qui dit d’un coup d’œil quelles journées ont franchi la barre.

Mois et année n’en portent pas. Un objectif « quotidien × tous les jours de la période »
supposerait de s’entraîner sans jamais manquer un jour : la ligne resterait loin au-dessus des
barres sans rien apprendre. L’échelle s’y cale sur le maximum réel, ce qui rend les écarts
entre périodes bien plus lisibles.

### 5. Administration

- **Objectif** : le nombre de tractions à franchir dans la journée.
- **Ajouter une série passée** : la date, le nombre, la charge. La série part au jour
  choisi comme une série libre, et se range à la fin de cette journée-là. Une date à
  venir est refusée.
- **Programme 50 tractions** : niveau et jour en cours, et *Choisir les jours du
  programme* pour reprendre la main dessus.
- Export et import d’un fichier `.json`, réinitialisation totale en deux temps.

La modification des séries existantes se fait depuis le Journal, où elle a sa place
naturelle : par date.

**Hors ligne** : une fois la page chargée une première fois, l’app fonctionne sans réseau.

### Couleurs

Chaque section porte son accent, sur le même fond bleu pétrole : **orange** pour Training et
l’action principale, **ambre** pour Record et l’objectif franchi, **cyan** pour Évolution et
l’histogramme, **iris** pour Administration, **rouille** pour le destructif uniquement.
L’orange est complémentaire du fond, c’est le couple le plus contrasté de la palette. Les
quatre accents dépassent 4,5:1 de contraste sur le fond des cartes.

Un cinquième accent, l’**orchidée**, ne sert qu’à une chose : dire qu’une série vient du
programme, au journal. Les trois origines y sont orange, orchidée et cyan — un écart de
teinte d’environ 95° entre chacune, là où l’ambre du programme se confondait avec
l’orange du libre. L’anneau de repos, comme l’histogramme, tourne en cyan.

La couleur n’est jamais seule à porter l’information : la journée nomme ses origines et
chaque pastille garde son libellé.

Aucun backend, aucun tracking, aucune requête au runtime. Tout tient dans `localStorage`.

## Tester en local

L’app fonctionne en ouvrant `index.html` directement dans un navigateur.

Pour tester le service worker et l’installation, il faut passer par un serveur HTTP —
et tant qu’à faire, depuis un sous-dossier, comme sur GitHub Pages :

```sh
# depuis le dossier parent du dépôt
python3 -m http.server 8000
# puis http://localhost:8000/tractions/
```

Vérifie qu’aucune requête ne part en 404 : `sw.js`, `manifest.webmanifest`, les icônes et les
polices sont tous appelés en chemins relatifs.

## Déployer sur GitHub Pages

### Automatiquement (ce dépôt)

`.github/workflows/pages.yml` déploie le site à chaque poussée sur la branche par défaut :
il assemble `index.html`, `styles.css`, `app.js`, `sw.js`, le manifeste, `icons/` et `fonts/`
dans un artefact, puis publie. L’URL apparaît dans le résumé du run (onglet **Actions**) et
dans **Settings → Pages**.

Une activation manuelle est nécessaire **une seule fois**, le jeton d’Actions pouvant publier
mais pas créer le site : **Settings → Pages → Source → GitHub Actions**. Ensuite, tout est
automatique.

### À la main, depuis un dépôt neuf

1. Crée un dépôt public sur GitHub, par exemple `tractions`.
2. Place les fichiers **à la racine** du dépôt (pas dans un sous-dossier) et pousse sur `main` :

   ```sh
   git init
   git add .
   git commit -m "Application Tractions"
   git branch -M main
   git remote add origin https://github.com/<utilisateur>/tractions.git
   git push -u origin main
   ```

3. Sur GitHub : **Settings → Pages**.
4. Section *Build and deployment*, source **Deploy from a branch**.
5. Branche `main`, dossier `/ (root)`, puis **Save**.
6. Attends une à deux minutes : l’URL `https://<utilisateur>.github.io/tractions/` apparaît en
   haut de la page Settings → Pages. Ouvre-la pour vérifier.

Tous les chemins de l’app sont relatifs, elle fonctionne donc telle quelle depuis ce
sous-chemin. Après une mise à jour, incrémente `CACHE` dans `sw.js` pour que les appareils
déjà installés récupèrent la nouvelle version.

## Ajouter à l’écran d’accueil de l’iPhone

1. Ouvre l’URL **dans Safari** (Chrome iOS ne sait pas installer une app web).
2. Touche le bouton **Partager** (le carré avec la flèche vers le haut).
3. Fais défiler, choisis **Sur l’écran d’accueil**.
4. Valide avec **Ajouter**.

L’icône apparaît sur l’écran d’accueil. Lancée depuis là, l’app s’ouvre en plein écran, sans
barre d’adresse, et fonctionne hors ligne.

## ⚠️ Tes données vivent dans ce navigateur

Les séries sont stockées **uniquement** dans le stockage local de l’appareil et du navigateur
qui les a saisies. Elles ne sont ni synchronisées, ni envoyées quelque part, ni sauvegardées
ailleurs.

Elles disparaissent si tu effaces les données du site, si tu désinstalles l’app depuis l’écran
d’accueil, ou si iOS libère de l’espace. Ouvrir la même URL sur un autre appareil ou dans un
autre navigateur donne un historique vide.

**Utilise régulièrement Administration → Exporter.** Le fichier `tractions-AAAA-MM-JJ.json`
se réimporte tel quel, en fusion ou en remplacement.

Le format d’export est en **version 4** : chaque série porte `id`, `date`, `reps`, `kg`,
`ts` et `src` — son origine — et le fichier porte en plus la progression du programme
sous `prog` et les réglages EMOM sous `emom`. Les versions antérieures restent
importables : la **version 1** ignorait la charge — ses séries sont reprises à 0 kg, et
l’import le dit — la **version 2** ignorait le programme et la **version 3** l’origine,
dont les séries sont alors reprises comme libres. Un remplacement à partir d’un fichier
qui ne porte ni `prog` ni `emom` laisse ces réglages en place.

## Structure

```
index.html              structure et balises PWA / iOS
styles.css              palette, typographie, mise en page
app.js                  stockage, agrégations, rendu, administration
sw.js                   service worker cache-first
manifest.webmanifest    manifeste PWA
icons/                  icône SVG source + PNG 180 / 192 / 512 (dont maskable)
fonts/                  Anton, Instrument Sans, JetBrains Mono en woff2 auto-hébergés
tools/make_icons.py     régénère icons/ depuis la géométrie de l’icône
```
