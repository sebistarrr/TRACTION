# Consignes de travail — Tractions

Lis ce fichier avant toute modification. Il dit ce qui est non négociable, où
trouver quoi, et ce qui a déjà été essayé. Le détail technique est dans
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), le protocole de vérification dans
[`docs/TESTS.md`](docs/TESTS.md), le mode d’emploi utilisateur dans le
[`README.md`](README.md).

## Le projet en trois lignes

Application web de suivi de tractions, **en français**, **hors ligne**, sans
compte, sans backend, installée sur l’écran d’accueil d’un iPhone. Cinq onglets :
Training · Record · Journal · Évolution · Admin. Tout tient dans quatre fichiers
servis tels quels par GitHub Pages.

## Non négociable

Ces contraintes ne se discutent pas sans demande explicite de l’utilisateur.

| Règle | Pourquoi |
|---|---|
| **Aucune étape de build** | `index.html` s’ouvre directement dans un navigateur. Pas de npm, pas de bundler, pas de transpileur, pas de `package.json`. |
| **Aucune dépendance runtime** | Zéro CDN, zéro framework, zéro requête réseau une fois la page chargée. Les polices sont auto-hébergées en woff2. |
| **JavaScript ES5, un seul IIFE** | `var`, `function`, pas de `let`/`const`/fléchées/template strings/classes/modules. Safari iOS ancien reste la cible. |
| **Tout en français** | Interface, commentaires de code, noms de commits, documentation. Les identifiants de code restent en anglais quand c’est l’usage (`reps`, `sets`, `goal`). |
| **`localStorage` seul** | Une clé, `tractions:v1`. Aucune donnée ne sort de l’appareil. |
| **Chemins relatifs partout** | L’app vit dans un sous-dossier (`/TRACTION/`). Jamais de `/` initial dans un `src`, `href` ou une URL de service worker. |
| **L’écran ne défile pas** | `body { overflow: hidden }`. Seul le contenu d’un onglet défile, et seulement s’il déborde. Toute nouvelle carte doit tenir sur iPhone SE. |
| **La couleur n’est jamais seule** | Toute information portée par une teinte est doublée d’un libellé. |

## Commandes

```sh
# Serveur local — obligatoire pour tester le service worker et l'installation.
# Depuis le dossier PARENT du dépôt, pour reproduire le sous-chemin de Pages.
python3 -m http.server 8765
# → http://localhost:8765/TRACTION/

# Régénérer les icônes après une modification de la géométrie
python3 tools/make_icons.py
```

Pas de linter, pas de suite de tests automatisée. La vérification se fait au
navigateur : voir `docs/TESTS.md`.

## Carte du code

Quatre fichiers livrés, plus les assets. Aucun n’est généré.

```
index.html    596 l.   structure, balises PWA/iOS, les cinq vues + cinq pages plein écran
styles.css   1641 l.   jetons de couleur, trois paliers de hauteur, une section par bloc d'UI
app.js       2738 l.   tout le comportement, un seul IIFE
sw.js          71 l.   service worker cache-first, constante CACHE à incrémenter
```

`app.js` est découpé par bandeaux de commentaires, dans cet ordre :

1. **Constantes** — `KEY`, `SCHEMA`, `SCOPES`, plafonds (`MAX_REPS`…)
2. **programme 50 tractions** — la table `LEVELS`, onze cycles figés
3. **outils dates** — tout en ISO `AAAA-MM-JJ`, comparé en chaîne
4. **stockage** — `normalizeSets` / `normalizeProg` / `normalizeEmom`, `load`, `commit`
5. **EMOM**
6. **agrégation** — `buildBuckets`, `windowEnd`, `scaleFor`, records
7. **vues** — la table `el` de tous les nœuds, puis un `renderXxx` par bloc
8. **actions** — mutations d’état, toujours suivies de `commit()`
9. **navigation à 3 vues** puis **pages dédiées** — `syncRoute` et les `open*`/`close*`
10. **écouteurs** puis **démarrage**

Pour trouver un bloc : `grep -n "^  /\* ---" app.js`.

## Les cinq lois du code

1. **Toute mutation passe par `commit()`.** Il sérialise dans `localStorage` puis
   appelle `render()`. Une écriture par mutation, jamais de rendu partiel à la main.
2. **La lecture est défensive.** `load()` ne fait jamais confiance au stockage :
   JSON cassé, schéma faux, champ absurde ⇒ valeur par défaut, jamais d’exception.
   Tout nouveau champ persisté doit être normalisé au même endroit.
3. **Les minuteries sont des horodatages, pas des compteurs.** `until` (repos) et
   `start` (EMOM) sont des `Date.now()` absolus. `setInterval` ne sert qu’à
   rafraîchir l’affichage. Une séance interrompue — app fermée, écran éteint — se
   retrouve intacte. Ne jamais remplacer par un décrément.
4. **Le rendu est idempotent.** `render()` reconstruit tout depuis `state`. Aucun
   `renderXxx` ne doit muter l’état.
5. **Les commentaires disent pourquoi, pas quoi.** C’est la convention du dépôt :
   des phrases complètes en français, qui justifient un choix. Ne pas les
   paraphraser en commentaires descriptifs.

## Avant de livrer

- [ ] **Incrémenter `CACHE` dans `sw.js`** dès que `index.html`, `styles.css`,
      `app.js` ou un asset change. Sans ça, les iPhone déjà installés restent sur
      l’ancienne version. C’est l’oubli le plus coûteux du projet.
- [ ] Vérifier au navigateur aux quatre tailles : iPhone SE 375×667, 16 393×852,
      16 Pro 402×874, 16 Pro Max 440×956, zones de sécurité comprises.
- [ ] Vérifier qu’aucun bloc ne déborde et que la page ne défile pas latéralement.
- [ ] Mettre le `README.md` à jour si le comportement visible change.
- [ ] Mettre `docs/ARCHITECTURE.md` à jour si le modèle de données ou une
      invariante change.
- [ ] Si le format persisté change : incrémenter `SCHEMA`, garder l’import des
      versions antérieures, documenter la reprise dans le README.

## Git et déploiement

- **La branche par défaut du dépôt — et la production — c’est
  `claude/cree-application-w5moka`.** Il n’y a pas de `main` : quand
  l’utilisateur dit « main », c’est cette branche. Le workflow
  `.github/workflows/pages.yml` ne se déclenche que sur elle (plus
  `workflow_dispatch`). Déployer = y pousser, en avance rapide.
- **Consigne permanente de l’utilisateur : livrer et déployer à chaque
  demande.** Tout travail terminé se commite sur la branche de session, puis se
  pousse en avance rapide sur la branche de production, sans redemander. Le
  déploiement se vérifie ensuite par l’API GitHub. Cette autorisation vaut pour
  la production seule ; toute autre branche demande un accord explicite.
- Incrémenter `CACHE` dans `sw.js` **avant** de pousser en production dès qu’un
  fichier du shell change. Une modification qui ne touche que la documentation
  ne le nécessite pas — le workflow ne copie pas ces fichiers.
- **Ne jamais ouvrir de pull request sans demande explicite.**
- Messages de commit en français, à l’impératif ou au présent, sujet court sans
  point final — regarder `git log` pour le ton. Jamais d’identifiant de modèle
  dans un commit, un titre ou un commentaire de code.
- Pages doit être activé une fois à la main : *Settings → Pages → Source →
  GitHub Actions*. Le jeton d’Actions publie mais ne crée pas le site.

## Pièges déjà rencontrés

- **Chromium pour Playwright** est à `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`.
  `/opt/pw-browsers/chromium` est un lien vers ce binaire, pas un dossier : le
  chemin `/opt/pw-browsers/chromium/chrome-linux/chrome` n’existe pas. Ne jamais
  lancer `playwright install`.
- **Le serveur HTTP local meurt entre deux appels d’outil.** Le relancer dès un
  `ERR_CONNECTION_REFUSED` plutôt que de chercher une cause dans le code.
- **`sebistarrr.github.io` est hors de la liste blanche du proxy sortant** : le
  site déployé n’est pas consultable depuis l’environnement d’exécution. La
  vérification d’un déploiement passe par l’API GitHub (statut du run, log du
  job), et ce point doit être dit explicitement à l’utilisateur.
- **Tester un repos ou une minute EMOM en écrivant un `until` presque expiré dans
  `localStorage` ne marche pas** : `normalizeProg` remet à zéro une échéance
  passée, et `openEmom` supprime volontairement l’annonce à la reprise. Il faut
  intercepter `app.js` et comprimer le temps — recette dans `docs/TESTS.md`.
- **`100dvh` se trompe d’une soixantaine de points sur iPhone.** D’où la cascade
  `100vh → 100dvh → var(--app-h)`, cette dernière écrite par `fitApp()` depuis
  `window.innerHeight` — et non depuis le viewport visuel, qui saute à l’ouverture
  du clavier.
- **Training peut déborder sur iPhone SE dans un état chargé** (mesuré 581 pt
  contre 557 disponibles, mode Libre, journée bien remplie). C’est préexistant,
  vérifié identique sur `HEAD`. Comparer par `git stash` avant d’attribuer un
  débordement à la modification en cours. Sur l’état par défaut, Training tient
  exactement : 557/557 sur SE, 738/738 sur 16, 760/760 sur 16 Pro, 842/842 sur
  16 Pro Max.

## Limites connues, non corrigées

Relevées lors de l’audit d’expérience utilisateur, jamais demandées à la
correction. Les signaler plutôt que les corriger en passant.

- **L’EMOM enregistre des minutes non effectuées.** `watchEmom` ferme chaque
  minute écoulée, et une minute passée entièrement à côté — téléphone dans la
  poche — est journalisée à l’objectif. Ces séries fantômes remontent dans les
  records et l’évolution.
- **La perte silencieuse de `localStorage`.** iOS peut purger le stockage d’une
  app web peu utilisée. `navigator.storage.persist()` est demandé, mais le refus
  est silencieux et l’utilisateur n’est prévenu de rien. Le garde-fou reste
  l’export manuel.
