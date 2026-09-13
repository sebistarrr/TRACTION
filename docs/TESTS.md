# Vérification

Il n’y a pas de suite de tests automatisée, et c’est un choix : l’app n’a pas
d’étape de build, donc pas d’endroit naturel où en accrocher une. Ce qui compte
ici — est-ce que ça tient dans un iPhone SE, est-ce que le panneau apparaît —
se mesure au navigateur.

Ce fichier donne les recettes qui marchent, vérifiées. Elles se lancent depuis
le répertoire de travail temporaire, jamais depuis le dépôt.

---

## 1. Le serveur local

Obligatoire pour tout : service worker, manifeste, `fetch`. Servi **depuis le
dossier parent**, pour reproduire le sous-chemin de GitHub Pages.

```sh
cd /home/user && python3 -m http.server 8765
# → http://localhost:8765/TRACTION/
```

Il meurt régulièrement entre deux commandes. Un `ERR_CONNECTION_REFUSED` veut
dire « relance-le », pas « cherche un bug ».

Vérifier qu’aucune ressource ne part en 404 : tous les chemins sont relatifs,
un `/` de trop et l’app marche en local mais casse en production.

---

## 2. Playwright

Installé globalement. Le navigateur est déjà là — **ne jamais lancer
`playwright install`**.

```js
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
});
```

Le lien `/opt/pw-browsers/chromium` pointe directement sur le binaire (ce n’est
pas un dossier : `/opt/pw-browsers/chromium/chrome-linux/chrome` n’existe pas).

---

## 3. Les quatre tailles

Le contrôle de base après toute modification visuelle : rien ne déborde
latéralement, et Training tient sans défiler.

```js
const DEVICES = [
  { name: 'iPhone SE',      width: 375, height: 667 },
  { name: 'iPhone 16',      width: 393, height: 852 },
  { name: 'iPhone 16 Pro',  width: 402, height: 874 },
  { name: 'iPhone 16 ProM', width: 440, height: 956 }
];

for (const d of DEVICES) {
  const ctx = await browser.newContext({
    viewport: { width: d.width, height: d.height },
    deviceScaleFactor: 3, isMobile: true, hasTouch: true
  });
  const page = await ctx.newPage();
  await page.goto('http://localhost:8765/TRACTION/', { waitUntil: 'networkidle' });

  // Contexte neuf ⇒ premier lancement : l'écran d'accueil bloque tout.
  if (await page.locator('#setupPage').isVisible()) await page.locator('#setupGo').click();

  const r = await page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
    training: document.querySelector('#view-training').scrollHeight,
    shell: document.querySelector('.shell').clientHeight
  }));

  console.log(d.name, r.scrollW <= r.clientW ? 'ok' : 'DÉBORDE',
              r.training, '/', r.shell);
  await ctx.close();
}
```

Relevé de référence sur l’état par défaut, après validation du record :

| Appareil | Training / coque |
|---|---|
| iPhone SE | 557 / 557 |
| iPhone 16 | 738 / 738 |
| iPhone 16 Pro | 760 / 760 |
| iPhone 16 Pro Max | 842 / 842 |

Un état chargé — mode Libre, journée à vingt séries — déborde davantage. Avant
de conclure à une régression, **comparer avec `HEAD`** : `git stash`, mesurer,
`git stash pop`. Un débordement identique avant et après la modification est
préexistant, et se signale au lieu d’être attribué au changement en cours.

---

## 4. Les minuteries : comprimer le temps

C’est la recette la plus utile du projet, et la moins évidente.

**Ce qui ne marche pas** : écrire dans `localStorage` un `until` presque expiré
puis recharger. `normalizeProg` remet à zéro toute échéance passée, et
`openEmom()` supprime volontairement l’annonce à la reprise d’une séance. On
observe alors « rien », et on conclut à tort que la fonctionnalité est cassée.

**Ce qui marche** : intercepter `app.js` et raccourcir les constantes de temps.
L’app tourne alors sur son vrai code, avec un repos de 3 secondes et une minute
d’EMOM de 4 secondes.

```js
await ctx.route('**/app.js', async (route) => {
  const res = await route.fetch();
  const src = (await res.text())
    .replace(/rest: 120/g, 'rest: 3')
    .replace(/var EMOM_MINUTE = 60000/, 'var EMOM_MINUTE = 4000');
  await route.fulfill({
    response: res, body: src,
    headers: { 'content-type': 'application/javascript' }
  });
});
```

Le scénario du programme, ensuite :

```js
await page.locator('#setupGo').click();       // record par défaut : 8 → cycle 6-8
await page.locator('#startSession').click();
await page.locator('#validateSet').click();   // le repos part

await page.waitForSelector('#flash:not([hidden])', { timeout: 8000 });
// → « Repos terminé » · « Série 2 sur 5 · objectif 3 »

await page.locator('#flash').click();         // fermer à la touche
await page.locator('#validateSet').click();
await page.locator('#skipRest').click();      // passer le repos à la main
// → #flash reste caché : c'est le comportement attendu
```

Le scénario EMOM, avec la seule compression de `EMOM_MINUTE` :

```js
await page.locator('[data-mode="emom"]').click();
await page.locator('#startEmom').click();   // rien ne s'annonce au départ
await page.locator('#emomLog').click();     // validée en avance → #emomWait

await page.waitForSelector('#flash:not([hidden])', { timeout: 8000 });
// → « Minute 2 sur 10 » · « Objectif : 5 tractions »

await page.locator('#emomBack').click();    // quitter puis rouvrir
await page.locator('#startEmom').click();   // reprise : #flash reste caché
```

Les quatre assertions qui comptent, toutes vérifiées sur le code courant :

1. le repos qui s’achève seul **annonce** la série suivante et son objectif ;
2. le repos passé à la main **n’annonce rien** ;
3. chaque minute d’EMOM qui s’ouvre s’annonce **une fois et une seule** ;
4. reprendre une séance EMOM déjà entamée **n’annonce rien** — la minute est
   déjà en cours.

---

## 5. Identifiants utiles

Le HTML n’a pas d’attributs de test ; on cible les `id` réels.

| Élément | `id` |
|---|---|
| Premier lancement — valider | `setupGo`, champ `setupScore` |
| Bascule d’entraînement | `[data-mode="libre"]`, `…="programme"`, `…="emom"` |
| Libre — compteur / enregistrer | `repsInput`, `decBtn`, `incBtn`, `saveBtn` |
| Programme — démarrer | `startSession` |
| Séance — valider / passer / abandonner | `validateSet`, `skipRest`, `quitSession` |
| Séance — bilan | `stepDone`, `finishSession` |
| EMOM — démarrer / valider / arrêter | `startEmom`, `emomLog`, `emomQuit`, champ `emomInput` |
| EMOM — attente / bilan | `emomWait`, `emomEnd`, `emomFinish` |
| Annonce | `flash`, `flashTitle`, `flashSub`, `flashSay` |
| Évolution — flèches | `periodPrev`, `periodNext`, `periodLabel` |
| Admin — objectif | `goalInput` |
| Admin — série passée | `backDate`, `backReps`, `backKg`, `backAdd`, `backMsg` |
| Toast | `toast` |

Repartir d’un état connu : `localStorage.removeItem('tractions:v1')`, ou plus
simplement un contexte Playwright neuf — chacun part vierge, donc sur l’écran
de première connexion.

---

## 6. Ce qui n’est pas vérifiable d’ici

`sebistarrr.github.io` est hors de la liste blanche du proxy sortant : **le site
déployé ne peut pas être chargé depuis l’environnement d’exécution**. Un
déploiement se vérifie par l’API GitHub — statut du run, `head_sha`, log du job,
la ligne `Reported success!` — et cette limite doit être dite à l’utilisateur
plutôt que masquée derrière un « c’est en ligne » non vérifié.

Ne restent testables qu’au vrai téléphone : l’installation sur l’écran
d’accueil, le comportement en veille écran éteint, la purge de `localStorage`
par iOS, et le rendu réel des zones de sécurité.
