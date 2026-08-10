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

- Le total du jour en grand. Il monte et franchit physiquement une barre de traction à mesure
  que l’objectif approche ; objectif franchi, la barre passe en ambre.
- Compteur `−` / `+`, chiffre éditable au clavier numérique, raccourcis **2 · 4 · 6 · 8 · 10 · 12**.
- **Charge en kg** présélectionnable : **0 · 5 · 10 · 15 · 20 · 25 · 30**. La valeur choisie reste
  d’une série à l’autre, le temps de la séance. Les séries lestées portent leur charge partout :
  pastilles du jour, journal, record.
- À l’enregistrement, le chiffre encaisse la charge, la barre fléchit et le nombre ajouté
  s’envole en orange ; franchir l’objectif déclenche une pulsation ambre. Tout se tait si
  l’appareil demande moins d’animations.
- Une série est toujours enregistrée **au jour du jour** : pas de saisie rétroactive.
- **Toutes les séries du jour** s’affichent en pastilles, dans l’ordre, sur autant de lignes
  qu’il en faut, charge comprise.
- Le bloc tient dans l’écran sans défiler, du plus petit au plus grand.

L’app se cale sur trois paliers de hauteur d’écran : compact sous 700 pt (iPhone SE),
intermédiaire entre 700 et 820, et généreux au-delà — scène, chiffres, boutons et onglets
grandissent d’un cran. Une journée chargée reste sans défilement : 20 séries sur iPhone 16 Pro,
16 sur iPhone SE. Au-delà, l’écran défile normalement. Vérifié aux dimensions réelles de l’iPhone SE (375 × 667),
16 (393 × 852), **16 Pro (402 × 874)** et 16 Pro Max (440 × 956), zones de sécurité
comprises : 59 pt de Dynamic Island en haut, 34 pt d’indicateur d’accueil en bas.

### 2. Record

Trois records, en grand, chacun avec sa date : **record sur une série**,
**record sur une journée**, **total tractions**.

### 3. Journal

Uniquement les journées actives, de la plus récente à la plus ancienne : la date, les séries
de la journée (`12 · 14 · 12`) et son total. Le total passe en ambre quand l’objectif du jour
a été franchi. Quand toute la journée est lestée pareil, la charge est notée une seule fois
(`12 · 14 · 12 · +10 kg`) ; sinon elle est précisée série par série.

**Toucher une journée l’ouvre en édition** : chaque série y a son champ tractions et son champ
charge, modifiables directement, avec suppression unitaire. Un bouton efface la journée entière,
en deux temps. La date est dans l’adresse (`#jour=AAAA-MM-JJ`), le bouton retour du navigateur
referme l’éditeur.

### 4. Évolution

Histogramme sur quatre échelles. **Chaque barre porte son nombre de tractions** — tourné d’un
quart de tour sur les échelles denses pour rester lisible. Variation vs la période précédente
et légende détaillée au clic sur une barre.

| Échelle  | Fenêtre affichée   | Ligne d’objectif              |
|----------|--------------------|-------------------------------|
| 7 jours  | 7 derniers jours   | objectif quotidien, constante |
| 30 jours | 30 derniers jours  | objectif quotidien, constante |
| Mois     | 12 derniers mois   | aucune                        |
| Année    | 5 dernières années | aucune                        |

Sur les deux échelles journalières, la ligne d’objectif est toujours tracée : c’est le repère
horizontal constant qui dit d’un coup d’œil quelles journées ont franchi la barre.

Mois et année n’en portent pas. Un objectif « quotidien × tous les jours de la période »
supposerait de s’entraîner sans jamais manquer un jour : la ligne resterait loin au-dessus des
barres sans rien apprendre. L’échelle s’y cale sur le maximum réel, ce qui rend les écarts
entre périodes bien plus lisibles.

### 5. Administration

- Objectif quotidien.
- Export et import d’un fichier `.json`, réinitialisation totale en deux temps.

La gestion des séries se fait depuis le Journal, où elle a sa place naturelle : par date.

**Hors ligne** : une fois la page chargée une première fois, l’app fonctionne sans réseau.

### Couleurs

Chaque section porte son accent, sur le même fond bleu pétrole : **orange** pour Training et
l’action principale, **ambre** pour Record et l’objectif franchi, **cyan** pour Évolution et
l’histogramme, **iris** pour Administration, **rouille** pour le destructif uniquement.
L’orange est complémentaire du fond, c’est le couple le plus contrasté de la palette. Les
quatre accents dépassent 4,5:1 de contraste sur le fond des cartes.

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

Le format d’export est en **version 2** : chaque série porte `id`, `date`, `reps`, `kg` et `ts`.
Les fichiers de **version 1**, antérieurs à la charge, restent importables — leurs séries sont
reprises à 0 kg, et l’import le dit.

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
