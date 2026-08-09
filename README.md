# Tractions

Application web de suivi de tractions : statique, sans compte, sans réseau, installable
sur l’écran d’accueil d’un iPhone comme une vraie app.

## Ce que fait l’app

- **Ajouter une série** : un nombre de tractions à une date. Compteur `−` / `+`, grand chiffre
  éditable au clavier numérique, raccourcis 3 · 5 · 8 · 10 · 12 · 15 · 20. La date est
  pré-remplie au jour du jour, modifiable pour rattraper une séance oubliée, jamais dans le futur.
- **Écran principal** : le total du jour en très grand. Il monte et franchit physiquement une
  barre de traction à mesure que l’objectif approche ; objectif franchi, la barre passe en ambre.
  Les séries du jour s’affichent en pastilles.
- **Évolution** en quatre onglets, avec histogramme, ligne d’objectif, variation vs la période
  précédente et trois indicateurs (moyenne par jour, record, jours d’affilée) :

  | Onglet  | Fenêtre affichée                     | Objectif de référence          |
  |---------|--------------------------------------|--------------------------------|
  | Jour    | 14 derniers jours                    | objectif quotidien             |
  | Semaine | 12 dernières semaines (lundi → dim.) | objectif × 7                   |
  | Mois    | 12 derniers mois                     | objectif × nb de jours du mois |
  | Année   | 5 dernières années                   | objectif × nb de jours de l’an |

  Chaque barre est cliquable et détaille la période sous le graphique.
- **Administration** (icône en haut à droite) : objectif quotidien, liste de toutes les séries
  groupées par jour avec suppression unitaire, réinitialisation en deux temps, export et import
  d’un fichier `.json`.
- **Hors ligne** : une fois la page chargée une première fois, l’app fonctionne sans réseau.

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
