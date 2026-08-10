/* Tractions — logique applicative.
   Stockage local, agrégations jour/mois/année, journal, rendu, administration. */

(function () {
  'use strict';

  var KEY = 'tractions:v1';
  var SCHEMA = 2;              /* v1 : sans charge — relu et converti en kg = 0 */
  var DEFAULT_GOAL = 50;
  var MAX_REPS = 999;
  var MAX_GOAL = 9999;
  var MAX_KG = 200;

  var SCOPES = {
    d7:    { count: 7,  trend: 'vs hier',          daily: true },
    d30:   { count: 30, trend: 'vs hier',          daily: true, dense: true },
    month: { count: 12, trend: 'vs mois dernier',  dense: true },
    year:  { count: 5,  trend: 'vs an dernier' }
  };

  var MONTH_INITIALS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

  /* ---------------------------------------------------------- outils dates */

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  function isoOf(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function todayISO() { return isoOf(new Date()); }

  /* Toujours local : minuit heure locale, jamais d'interprétation UTC. */
  function fromISO(iso) {
    var p = iso.split('-');
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }

  function addDays(d, n) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  }

  function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }

  function daysInYear(y) {
    return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 366 : 365;
  }

  function isValidISO(v) {
    if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
    var d = fromISO(v);
    return isoOf(d) === v;
  }

  function fmt(n) { return Number(n).toLocaleString('fr-FR'); }

  function longDate(iso) {
    return fromISO(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' });
  }

  function fullDate(iso) {
    return fromISO(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }

  function uid() {
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  function plural(n) { return n > 1 ? 's' : ''; }

  /* « 12 » à poids de corps, « 12 +10 kg » lesté. */
  function setLabel(s) {
    return fmt(s.reps) + (s.kg > 0 ? ' +' + s.kg + ' kg' : '');
  }

  /* ------------------------------------------------------------- stockage */

  function normalizeSets(input) {
    if (!Array.isArray(input)) return { sets: [], rejected: 0 };
    var seen = Object.create(null);
    var out = [];
    var rejected = 0;

    for (var i = 0; i < input.length; i++) {
      var raw = input[i];
      if (!raw || typeof raw !== 'object') { rejected++; continue; }

      var reps = Math.floor(Number(raw.reps));
      if (!isFinite(reps) || reps < 1 || reps > MAX_REPS) { rejected++; continue; }
      if (!isValidISO(raw.date)) { rejected++; continue; }

      var ts = Number(raw.ts);
      if (!isFinite(ts) || ts <= 0) ts = fromISO(raw.date).getTime();

      /* Charge absente (fichier v1) ou illisible : poids du corps, soit 0. */
      var kg = Math.floor(Number(raw.kg));
      if (!isFinite(kg) || kg < 0) kg = 0;
      if (kg > MAX_KG) kg = MAX_KG;

      var id = typeof raw.id === 'string' && raw.id ? raw.id : uid();
      if (seen[id]) { rejected++; continue; }
      seen[id] = true;

      out.push({ id: id, date: raw.date, reps: reps, kg: kg, ts: ts });
    }

    out.sort(function (a, b) {
      if (a.ts !== b.ts) return a.ts - b.ts;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });

    return { sets: out, rejected: rejected };
  }

  function normalizeGoal(v) {
    var g = Math.floor(Number(v));
    return isFinite(g) && g >= 1 && g <= MAX_GOAL ? g : DEFAULT_GOAL;
  }

  /* Lecture défensive : rien, JSON cassé ou schéma faux ⇒ état vide. */
  function load() {
    var empty = { version: SCHEMA, goal: DEFAULT_GOAL, sets: [] };
    var raw;
    try { raw = localStorage.getItem(KEY); } catch (e) { return empty; }
    if (!raw) return empty;

    var parsed;
    try { parsed = JSON.parse(raw); } catch (e) { return empty; }
    if (!parsed || typeof parsed !== 'object') return empty;

    return {
      version: SCHEMA,
      goal: normalizeGoal(parsed.goal),
      sets: normalizeSets(parsed.sets).sets
    };
  }

  var state = load();

  function serialize() {
    return JSON.stringify({
      version: SCHEMA,
      goal: state.goal,
      sets: state.sets.map(function (s) {
        return { id: s.id, date: s.date, reps: s.reps, kg: s.kg, ts: s.ts };
      })
    }, null, 2);
  }

  /* Une seule écriture par mutation. */
  function commit() {
    try {
      localStorage.setItem(KEY, serialize());
    } catch (e) {
      toast('Sauvegarde impossible : la mémoire du navigateur est pleine.');
    }
    render();
  }

  /* ------------------------------------------------------------ agrégation */

  function totalsByDate() {
    var map = Object.create(null);
    for (var i = 0; i < state.sets.length; i++) {
      var s = state.sets[i];
      map[s.date] = (map[s.date] || 0) + s.reps;
    }
    return map;
  }

  function totalFor(date) {
    var t = 0;
    for (var i = 0; i < state.sets.length; i++) {
      if (state.sets[i].date === date) t += state.sets[i].reps;
    }
    return t;
  }

  function setsFor(date) {
    return state.sets.filter(function (s) { return s.date === date; });
  }

  function grandTotal() {
    return state.sets.reduce(function (a, s) { return a + s.reps; }, 0);
  }

  /* Meilleure série unique, toutes dates confondues. */
  function bestSet() {
    var best = null;
    for (var i = 0; i < state.sets.length; i++) {
      var s = state.sets[i];
      if (best === null || s.reps > best.reps) best = s;
    }
    return best;
  }

  /* Meilleure journée, toutes dates confondues. */
  function bestDay() {
    var map = totalsByDate();
    var best = null;
    for (var date in map) {
      if (best === null || map[date] > best.reps) best = { date: date, reps: map[date] };
    }
    return best;
  }

  function firstDate() {
    var first = null;
    for (var i = 0; i < state.sets.length; i++) {
      if (first === null || state.sets[i].date < first) first = state.sets[i].date;
    }
    return first;
  }

  function bucketKey(name, iso) {
    if (SCOPES[name].daily) return iso;
    if (name === 'month') return iso.slice(0, 7);
    return iso.slice(0, 4);
  }

  /* Construit les seaux affichés pour un onglet, du plus ancien au plus récent. */
  function buildBuckets(name) {
    var today = new Date();
    var n = SCOPES[name].count;
    var goal = state.goal;
    var list = [];
    var i;

    if (SCOPES[name].daily) {
      /* Échelle journalière : l'objectif de référence est le même chaque jour,
         d'où une ligne d'objectif parfaitement horizontale. */
      for (i = n - 1; i >= 0; i--) {
        var d = addDays(today, -i);
        var iso = isoOf(d);
        list.push({
          key: iso,
          axis: n <= 7
            ? d.toLocaleDateString('fr-FR', { weekday: 'narrow' }) + ' ' + d.getDate()
            : String(d.getDate()),
          title: capitalize(longDate(iso)),
          goalRef: goal
        });
      }
    } else if (name === 'month') {
      for (i = n - 1; i >= 0; i--) {
        var mDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
        var y = mDate.getFullYear();
        var m = mDate.getMonth();
        list.push({
          key: y + '-' + pad2(m + 1),
          axis: MONTH_INITIALS[m],
          title: capitalize(mDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })),
          goalRef: goal * daysInMonth(y, m)
        });
      }
    } else {
      for (i = n - 1; i >= 0; i--) {
        var yy = today.getFullYear() - i;
        list.push({
          key: String(yy),
          axis: String(yy),
          title: String(yy),
          goalRef: goal * daysInYear(yy)
        });
      }
    }

    var index = Object.create(null);
    for (i = 0; i < list.length; i++) {
      list[i].value = 0;
      list[i].sets = 0;
      list[i].activeDays = Object.create(null);
      index[list[i].key] = list[i];
    }

    for (i = 0; i < state.sets.length; i++) {
      var s = state.sets[i];
      var b = index[bucketKey(name, s.date)];
      if (!b) continue;
      b.value += s.reps;
      b.sets++;
      b.activeDays[s.date] = true;
    }

    for (i = 0; i < list.length; i++) {
      list[i].activeDayCount = Object.keys(list[i].activeDays).length;
      delete list[i].activeDays;
    }

    return list;
  }

  /* Échelle du graphique : la ligne d'objectif ne s'affiche que si elle
     n'écrase pas les barres réelles. */
  /* Le dégagement au-dessus des barres laisse la place au nombre affiché. */
  var HEADROOM = 1.24;

  function scaleFor(name, buckets) {
    var max = 0;
    for (var i = 0; i < buckets.length; i++) max = Math.max(max, buckets[i].value);
    var goalRef = buckets[buckets.length - 1].goalRef;

    /* En journalier, l'objectif quotidien est toujours tracé : c'est le repère. */
    if (SCOPES[name].daily) {
      return { max: Math.max(max, goalRef, 1) * HEADROOM, goalRef: goalRef, showGoal: goalRef > 0 };
    }

    /* Mois et année : pas de ligne d'objectif. Un objectif « quotidien × tous
       les jours de la période » suppose de s'entraîner sans jamais manquer un
       jour ; la ligne resterait loin au-dessus des barres sans rien apprendre.
       L'échelle se cale donc sur le maximum réel. */
    return { max: Math.max(max, 1) * HEADROOM, goalRef: goalRef, showGoal: false };
  }

  /* ------------------------------------------------------------------ vues */

  function $(id) { return document.getElementById(id); }

  var el = {
    navTabs: Array.prototype.slice.call(document.querySelectorAll('.navbtn')),
    views: {
      training: $('view-training'),
      record: $('view-record'),
      journal: $('view-journal'),
      stats: $('view-stats'),
      admin: $('view-admin')
    },
    stage: $('stage'),
    todayCount: $('todayCount'),
    dayState: $('dayState'),
    todaySets: $('todaySets'),
    reps: $('repsInput'),
    shortcuts: $('shortcuts'),
    loadChips: $('loadChips'),
    tabs: Array.prototype.slice.call(document.querySelectorAll('.tab')),
    panel: $('panel'),
    trend: $('trend'),
    chart: document.querySelector('.chart'),
    journal: $('journal'),
    journalSummary: $('journalSummary'),
    plot: $('chartPlot'),
    axis: $('chartAxis'),
    goalLine: $('goalLine'),
    goalLineTag: $('goalLineTag'),
    detail: $('detail'),
    rSet: $('rSet'),
    rSetSub: $('rSetSub'),
    rDay: $('rDay'),
    rDaySub: $('rDaySub'),
    rTotal: $('rTotal'),
    rTotalSub: $('rTotalSub'),
    toast: $('toast'),
    goalInput: $('goalInput'),
    dayPage: $('dayPage'),
    dayBack: $('dayBack'),
    dayTitle: $('dayTitle'),
    daySub: $('daySub'),
    dayRows: $('dayRows'),
    deleteDay: $('deleteDay'),
    resetBtn: $('resetBtn'),
    exportBtn: $('exportBtn'),
    importBtn: $('importBtn'),
    importFile: $('importFile'),
    importMsg: $('importMsg'),
    importChoice: $('importChoice'),
    mergeBtn: $('mergeBtn'),
    replaceBtn: $('replaceBtn'),
    cancelImport: $('cancelImport')
  };

  var view = 'training';
  var scope = 'd7';
  var selected = null;       // clé du seau sélectionné dans le graphique
  var toastTimer = null;
  var resetArmed = false;
  var pendingImport = null;
  var freshPillId = null;        // la pastille tout juste ajoutée, pour l'animer
  var celebrateTimer = null;
  var loadKg = 0;                // charge sélectionnée, conservée d'une série à l'autre
  var openDay = null;            // date de la journée en cours d'édition
  var dayArmed = false;          // suppression de journée : premier appui

  var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function toast(message) {
    el.toast.textContent = message;
    el.toast.hidden = false;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.toast.hidden = true; }, 3200);
  }

  function renderToday() {
    var iso = todayISO();
    var total = totalFor(iso);
    var goal = state.goal;
    var progress = goal > 0 ? clamp(total / goal, 0, 1) : 1;

    el.todayCount.textContent = fmt(total);

    /* Le chiffre monte et franchit la barre. L'amplitude est fixée en CSS
       (--amp), elle change avec la hauteur d'écran ; ici on ne passe que
       l'avancement 0 → 1. */
    el.stage.style.setProperty('--p', progress.toFixed(3));

    var done = goal > 0 && total >= goal;
    el.stage.classList.toggle('is-done', done);
    el.stage.classList.toggle('is-close', !done && progress >= .6);
    el.dayState.classList.toggle('is-done', done);

    if (total === 0) {
      el.dayState.textContent = 'Rien aujourd’hui. Première série ?';
    } else if (!done) {
      el.dayState.textContent = 'Encore ' + fmt(goal - total) + ' pour franchir la barre.';
    } else if (total === goal) {
      el.dayState.textContent = 'Objectif franchi, pile poil.';
    } else {
      el.dayState.textContent = 'Objectif franchi, ' + fmt(total - goal) + ' en rab.';
    }

    /* Une seule ligne de pastilles : les plus récentes, précédées d'un
       compteur quand la journée en compte davantage. */
    el.todaySets.textContent = '';
    var list = setsFor(iso);
    var shown = list.slice(-4);
    var hidden = list.length - shown.length;
    var li;

    if (hidden > 0) {
      li = document.createElement('li');
      li.className = 'pill pill--more';
      li.textContent = '+' + hidden;
      el.todaySets.appendChild(li);
    }
    for (var i = 0; i < shown.length; i++) {
      li = document.createElement('li');
      li.className = shown[i].id === freshPillId ? 'pill pill--new' : 'pill';
      li.textContent = fmt(shown[i].reps);
      if (shown[i].kg > 0) {
        var kg = document.createElement('span');
        kg.className = 'pill-kg';
        kg.textContent = '+' + shown[i].kg;
        li.appendChild(kg);
      }
      el.todaySets.appendChild(li);
    }
    freshPillId = null;
  }

  function renderRecords() {
    var set = bestSet();
    var day = bestDay();
    var total = grandTotal();
    var first = firstDate();

    el.rSet.textContent = set ? fmt(set.reps) : '0';
    el.rSetSub.textContent = set
      ? (set.kg > 0 ? '+' + set.kg + ' kg · ' : '') + longDate(set.date)
      : '—';

    el.rDay.textContent = day ? fmt(day.reps) : '0';
    el.rDaySub.textContent = day ? longDate(day.date) : '—';

    el.rTotal.textContent = fmt(total);
    el.rTotalSub.textContent = first ? 'depuis le ' + fullDate(first) : '—';
  }

  function trendText(buckets) {
    var n = buckets.length;
    var cur = buckets[n - 1].value;
    var prev = buckets[n - 2].value;
    var label = SCOPES[scope].trend;

    if (prev === 0 && cur === 0) return '<em>Rien à comparer ' + label + '.</em>';
    if (prev === 0) return '<b class="up">↑ nouveau</b> ' + label;

    var pct = Math.round((cur - prev) / prev * 100);
    if (pct === 0) return '<b>→ stable</b> ' + label;
    var arrow = pct > 0 ? '↑' : '↓';
    var cls = pct > 0 ? 'up' : 'down';
    return '<b class="' + cls + '">' + arrow + ' ' + Math.abs(pct) + ' %</b> ' + label;
  }

  function detailText(bucket) {
    var head = '<strong>' + bucket.title + '</strong>';
    if (bucket.value === 0) return head + ' — <em>aucune traction</em>';

    /* Une journée se décrit par ses séries, une période par ses jours actifs. */
    var body = fmt(bucket.value) + ' traction' + plural(bucket.value) + ' · ';
    body += SCOPES[scope].daily
      ? bucket.sets + ' série' + plural(bucket.sets)
      : bucket.activeDayCount + ' jour' + plural(bucket.activeDayCount) +
        ' actif' + plural(bucket.activeDayCount);

    if (bucket.goalRef > 0) {
      body += ' · ' + Math.round(bucket.value / bucket.goalRef * 100) + ' % de l’objectif';
    }
    return head + ' — ' + body;
  }

  function renderChart() {
    var buckets = buildBuckets(scope);
    var scale = scaleFor(scope, buckets);
    var dense = !!SCOPES[scope].dense;
    var n = buckets.length;
    var i;

    el.chart.classList.toggle('is-dense', dense);

    if (!selected || !buckets.some(function (b) { return b.key === selected; })) {
      selected = buckets[n - 1].key;
    }

    el.trend.innerHTML = trendText(buckets);

    el.plot.querySelectorAll('.bar').forEach(function (b) { b.remove(); });
    el.axis.textContent = '';

    for (i = 0; i < n; i++) {
      var b = buckets[i];
      var pct = scale.max > 0 ? b.value / scale.max * 100 : 0;

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'bar';
      if (b.value === 0) btn.className += ' is-empty';
      if (b.goalRef > 0 && b.value >= b.goalRef) btn.className += ' is-over';
      if (b.key === selected) btn.className += ' is-selected';
      btn.dataset.key = b.key;
      btn.setAttribute('aria-label', b.title + ' : ' + fmt(b.value) + ' tractions');

      btn.style.setProperty('--h', pct.toFixed(2) + '%');

      /* Le nombre de tractions, au-dessus de sa barre. Les journées vides des
         échelles denses restent muettes : un « 0 » répété n'apprend rien. */
      if (b.value > 0 || !dense) {
        var value = document.createElement('span');
        value.className = 'bar-value';
        value.textContent = fmt(b.value);
        btn.appendChild(value);
      }

      var fill = document.createElement('span');
      fill.className = 'bar-fill';
      btn.appendChild(fill);
      el.plot.appendChild(btn);

      /* Les libellés d'axe sont espacés quand ils risquent de se toucher. */
      var span = document.createElement('span');
      var showLabel = !dense || (n - 1 - i) % (scope === 'd30' ? 5 : 1) === 0;
      span.textContent = showLabel ? b.axis : '';
      el.axis.appendChild(span);
    }

    if (scale.showGoal) {
      el.goalLine.hidden = false;
      el.goalLine.style.setProperty('--goal', (scale.goalRef / scale.max * 100).toFixed(2) + '%');
      el.goalLineTag.textContent = 'obj. ' + fmt(scale.goalRef);
    } else {
      el.goalLine.hidden = true;
    }

    for (i = 0; i < n; i++) {
      if (buckets[i].key === selected) el.detail.innerHTML = detailText(buckets[i]);
    }
  }

  /* Journées actives, de la plus récente à la plus ancienne. */
  function activeDays() {
    var days = [];
    var byDate = Object.create(null);
    var sorted = state.sets.slice().sort(function (a, b) {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return a.ts - b.ts;
    });

    for (var i = 0; i < sorted.length; i++) {
      var s = sorted[i];
      if (!byDate[s.date]) {
        byDate[s.date] = { date: s.date, sets: [], total: 0 };
        days.push(byDate[s.date]);
      }
      byDate[s.date].sets.push(s);
      byDate[s.date].total += s.reps;
    }
    return days;
  }

  /* « 12 · 14 · 12 » ; « 12 · 14 · 12 · +10 kg » quand toute la journée est
     lestée pareil ; sinon la charge est notée série par série. */
  function dayRepsLabel(day) {
    var loads = day.sets.map(function (s) { return s.kg; });
    var same = loads.every(function (k) { return k === loads[0]; });

    if (same) {
      var reps = day.sets.map(function (s) { return fmt(s.reps); }).join(' · ');
      return loads[0] > 0 ? reps + ' · +' + loads[0] + ' kg' : reps;
    }
    return day.sets.map(setLabel).join(' · ');
  }

  /* Journal : uniquement les journées actives, séries puis total. */
  function renderJournal() {
    el.journal.textContent = '';

    var days = activeDays();
    el.journalSummary.textContent = days.length === 0
      ? 'Aucune journée active.'
      : days.length + ' journée' + plural(days.length) + ' active' + plural(days.length) +
        ' · ' + fmt(grandTotal()) + ' tractions · touche une journée pour la modifier';

    for (var d = 0; d < days.length; d++) {
      var day = days[d];

      var li = document.createElement('li');
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = day.total >= state.goal ? 'journal-day is-done' : 'journal-day';
      btn.dataset.day = day.date;
      btn.setAttribute('aria-label',
        'Modifier le ' + longDate(day.date) + ' : ' + fmt(day.total) + ' tractions');

      var head = document.createElement('span');
      head.className = 'journal-head';

      var date = document.createElement('span');
      date.className = 'journal-date';
      date.textContent = capitalize(longDate(day.date));

      var total = document.createElement('span');
      total.className = 'journal-total';
      total.textContent = fmt(day.total);

      head.appendChild(date);
      head.appendChild(total);

      var reps = document.createElement('span');
      reps.className = 'journal-reps';
      reps.textContent = dayRepsLabel(day);

      btn.appendChild(head);
      btn.appendChild(reps);
      li.appendChild(btn);
      el.journal.appendChild(li);
    }
  }

  /* ------------------------------------------ édition d'une journée */

  function renderDay() {
    if (!openDay) return;

    var sets = setsFor(openDay).sort(function (a, b) { return a.ts - b.ts; });
    var total = totalFor(openDay);

    el.dayTitle.textContent = capitalize(longDate(openDay));
    el.daySub.textContent = sets.length === 0
      ? 'Plus aucune série'
      : sets.length + ' série' + plural(sets.length) + ' · ' + fmt(total) + ' tractions';

    el.dayRows.textContent = '';
    el.deleteDay.disabled = sets.length === 0;
    disarmDay();

    for (var i = 0; i < sets.length; i++) {
      var s = sets[i];

      var row = document.createElement('div');
      row.className = 'day-row';

      var time = document.createElement('span');
      time.className = 'day-time';
      time.textContent = new Date(s.ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      row.appendChild(time);

      row.appendChild(field('Tractions', 'reps', s.id, s.reps, 3));
      row.appendChild(field('Charge kg', 'kg', s.id, s.kg, 3));

      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'day-del';
      del.dataset.del = s.id;
      del.setAttribute('aria-label', 'Supprimer la série de ' + setLabel(s));
      del.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
        '<path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" fill="none" stroke="currentColor" ' +
        'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      row.appendChild(del);

      el.dayRows.appendChild(row);
    }
  }

  function field(label, kind, id, value, maxlength) {
    var wrap = document.createElement('label');
    wrap.className = 'day-field';

    var name = document.createElement('span');
    name.textContent = label;

    var input = document.createElement('input');
    input.type = 'text';
    input.inputMode = 'numeric';
    input.pattern = '[0-9]*';
    input.autocomplete = 'off';
    input.maxLength = maxlength;
    input.value = String(value);
    input.dataset.edit = kind;
    input.dataset.id = id;

    wrap.appendChild(name);
    wrap.appendChild(input);
    return wrap;
  }

  function editSet(id, kind, raw) {
    var n = parseInt(raw, 10);
    for (var i = 0; i < state.sets.length; i++) {
      if (state.sets[i].id !== id) continue;
      if (kind === 'reps') {
        state.sets[i].reps = clamp(isFinite(n) ? n : 1, 1, MAX_REPS);
      } else {
        state.sets[i].kg = clamp(isFinite(n) ? n : 0, 0, MAX_KG);
      }
      commit();
      return;
    }
  }

  function disarmDay() {
    dayArmed = false;
    el.deleteDay.classList.remove('is-armed');
    el.deleteDay.textContent = 'Supprimer la journée';
  }

  function renderEntry() {
    var value = el.reps.value;
    var chips = el.shortcuts.querySelectorAll('.chip');
    var i;
    for (i = 0; i < chips.length; i++) {
      chips[i].classList.toggle('is-active', chips[i].dataset.reps === value);
    }

    var loads = el.loadChips.querySelectorAll('.chip');
    for (i = 0; i < loads.length; i++) {
      loads[i].classList.toggle('is-active', Number(loads[i].dataset.kg) === loadKg);
    }
  }

  function renderAdmin() {
    if (document.activeElement !== el.goalInput) el.goalInput.value = String(state.goal);
    disarmReset();
    el.resetBtn.disabled = state.sets.length === 0;
  }

  function render() {
    renderToday();
    renderRecords();
    renderJournal();
    renderChart();
    renderEntry();
    renderAdmin();
    if (!el.dayPage.hidden) renderDay();
  }

  /* -------------------------------------------------------------- actions */

  function readReps() {
    var n = parseInt(el.reps.value, 10);
    return isFinite(n) ? clamp(n, 0, MAX_REPS) : 0;
  }

  function setReps(n) {
    el.reps.value = String(clamp(n, 1, MAX_REPS));
    renderEntry();
  }

  /* Petite animation à l'enregistrement : le chiffre encaisse, la barre vibre,
     le nombre ajouté s'envole. Silencieuse si l'appareil demande moins d'animations. */
  function celebrate(reps, crossed) {
    if (calm) return;

    /* Deux séries enchaînées ne doivent pas empiler deux nombres. */
    var previous = el.stage.querySelectorAll('.floater');
    for (var i = 0; i < previous.length; i++) previous[i].remove();

    var floater = document.createElement('span');
    floater.className = 'floater';
    floater.setAttribute('aria-hidden', 'true');
    floater.textContent = '+' + fmt(reps);
    el.stage.appendChild(floater);
    setTimeout(function () { floater.remove(); }, 900);

    el.stage.classList.remove('is-bumped', 'is-cheering');
    void el.stage.offsetWidth;                       /* relance les animations */
    el.stage.classList.add('is-bumped');
    if (crossed) el.stage.classList.add('is-cheering');

    if (celebrateTimer) clearTimeout(celebrateTimer);
    celebrateTimer = setTimeout(function () {
      el.stage.classList.remove('is-bumped', 'is-cheering');
    }, crossed ? 1200 : 600);
  }

  function addSet() {
    var reps = readReps();
    if (reps < 1) {
      toast('Indique au moins 1 traction.');
      el.reps.focus();
      return;
    }

    /* Une série est toujours celle du jour : pas de saisie rétroactive. */
    var iso = todayISO();
    var before = totalFor(iso);
    var set = { id: uid(), date: iso, reps: reps, kg: loadKg, ts: Date.now() };

    state.sets.push(set);
    freshPillId = set.id;
    commit();

    var crossed = state.goal > 0 && before < state.goal && before + reps >= state.goal;
    celebrate(reps, crossed);
    toast(crossed
      ? 'Série enregistrée, objectif franchi !'
      : 'Série enregistrée' + (loadKg > 0 ? ' à +' + loadKg + ' kg.' : '.'));
  }

  function removeSet(id) {
    var before = state.sets.length;
    state.sets = state.sets.filter(function (s) { return s.id !== id; });
    if (state.sets.length !== before) {
      commit();
      toast('Série supprimée.');
    }
  }

  function setGoal(n) {
    state.goal = clamp(Math.floor(n) || DEFAULT_GOAL, 1, MAX_GOAL);
    commit();
  }

  function disarmReset() {
    resetArmed = false;
    el.resetBtn.classList.remove('is-armed');
    el.resetBtn.textContent = 'Tout effacer';
  }

  function download(name, text) {
    var blob = new Blob([text], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function showBackupNote(text, isError) {
    el.importMsg.textContent = text;
    el.importMsg.classList.toggle('is-error', !!isError);
    el.importMsg.hidden = false;
  }

  function resetImport() {
    pendingImport = null;
    el.importChoice.hidden = true;
    el.importFile.value = '';
  }

  function readImport(file) {
    var reader = new FileReader();

    reader.onerror = function () {
      resetImport();
      showBackupNote('Fichier illisible : le navigateur n’a pas pu l’ouvrir.', true);
    };

    reader.onload = function () {
      var parsed;
      try {
        parsed = JSON.parse(String(reader.result));
      } catch (e) {
        resetImport();
        showBackupNote('Fichier invalide : ce n’est pas du JSON lisible.', true);
        return;
      }

      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        resetImport();
        showBackupNote('Fichier invalide : le contenu attendu est un objet JSON.', true);
        return;
      }
      /* Les fichiers d'avant la charge (version 1) restent lisibles. */
      var fileVersion = parsed.version === undefined ? SCHEMA : Number(parsed.version);
      if (!(fileVersion === 1 || fileVersion === SCHEMA)) {
        resetImport();
        showBackupNote('Fichier invalide : version « ' + parsed.version + ' » inconnue, ' +
          'versions 1 et ' + SCHEMA + ' acceptées.', true);
        return;
      }
      if (!Array.isArray(parsed.sets)) {
        resetImport();
        showBackupNote('Fichier invalide : la clé « sets » est absente ou n’est pas une liste.', true);
        return;
      }

      var result = normalizeSets(parsed.sets);
      if (!result.sets.length) {
        resetImport();
        showBackupNote(parsed.sets.length
          ? 'Fichier invalide : les ' + parsed.sets.length + ' entrées sont toutes inexploitables (date, id ou nombre de tractions).'
          : 'Fichier vide : aucune série à importer.', true);
        return;
      }

      pendingImport = { sets: result.sets, goal: normalizeGoal(parsed.goal) };
      var msg = result.sets.length + ' série' + plural(result.sets.length) + ' lue' +
        plural(result.sets.length) + ', objectif ' + pendingImport.goal + '.';
      if (fileVersion === 1) msg += ' Fichier sans charge : les séries sont reprises à 0 kg.';
      if (result.rejected) {
        msg += ' ' + result.rejected + ' entrée' + plural(result.rejected) + ' ignorée' +
          plural(result.rejected) + ' (format invalide).';
      }
      msg += ' Fusionner ou remplacer ?';
      showBackupNote(msg, false);
      el.importChoice.hidden = false;
      el.mergeBtn.focus();
    };

    reader.readAsText(file);
  }

  function applyMerge() {
    if (!pendingImport) return;
    var known = Object.create(null);
    var i;
    for (i = 0; i < state.sets.length; i++) known[state.sets[i].id] = true;

    var added = 0;
    for (i = 0; i < pendingImport.sets.length; i++) {
      var s = pendingImport.sets[i];
      if (known[s.id]) continue;
      known[s.id] = true;
      state.sets.push(s);
      added++;
    }
    state.sets = normalizeSets(state.sets).sets;

    resetImport();
    showBackupNote(added
      ? added + ' série' + plural(added) + ' ajoutée' + plural(added) + '.'
      : 'Rien à ajouter : ces séries sont déjà là.', false);
    commit();
  }

  function applyReplace() {
    if (!pendingImport) return;
    var count = pendingImport.sets.length;
    state.sets = pendingImport.sets;
    state.goal = pendingImport.goal;
    resetImport();
    showBackupNote('Historique remplacé : ' + count + ' série' + plural(count) + '.', false);
    commit();
  }

  /* ------------------------------------------------- navigation à 3 vues */

  function activateView(i, focus) {
    el.navTabs.forEach(function (t, k) {
      var on = k === i;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
    });

    view = el.navTabs[i].dataset.view;
    for (var name in el.views) el.views[name].hidden = name !== view;
    if (focus) el.navTabs[i].focus();
    window.scrollTo(0, 0);
  }

  /* ----------------------------- page dédiée : une journée du journal */

  /* L'adresse porte la date : le retour du navigateur referme l'éditeur. */
  function dayFromHash() {
    var m = /^#jour=(\d{4}-\d{2}-\d{2})$/.exec(location.hash);
    return m && isValidISO(m[1]) ? m[1] : null;
  }

  function syncRoute() {
    openDay = dayFromHash();
    var open = openDay !== null && setsFor(openDay).length > 0;

    el.dayPage.hidden = !open;
    document.body.classList.toggle('is-locked', open);

    if (open) {
      renderDay();
      el.dayBack.focus();
      window.scrollTo(0, 0);
    } else {
      openDay = null;
    }
  }

  function openDayPage(date) {
    history.pushState({ day: date }, '', '#jour=' + date);
    syncRoute();
  }

  function closeDayPage() {
    if (dayFromHash()) history.back();
  }

  /* ------------------------------------------------------------ écouteurs */

  el.reps.addEventListener('input', function () {
    var cleaned = el.reps.value.replace(/\D/g, '').slice(0, 3);
    if (cleaned !== el.reps.value) el.reps.value = cleaned;
    renderEntry();
  });
  el.reps.addEventListener('blur', function () { setReps(readReps() || 1); });
  el.reps.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); addSet(); }
  });

  $('decBtn').addEventListener('click', function () { setReps(readReps() - 1); });
  $('incBtn').addEventListener('click', function () { setReps(readReps() + 1); });

  el.shortcuts.addEventListener('click', function (e) {
    var chip = e.target.closest('.chip');
    if (chip) setReps(Number(chip.dataset.reps));
  });

  el.loadChips.addEventListener('click', function (e) {
    var chip = e.target.closest('.chip');
    if (!chip) return;
    loadKg = clamp(Number(chip.dataset.kg) || 0, 0, MAX_KG);
    renderEntry();
  });

  $('saveBtn').addEventListener('click', addSet);

  el.plot.addEventListener('click', function (e) {
    var bar = e.target.closest('.bar');
    if (!bar) return;
    selected = bar.dataset.key;
    renderChart();
  });

  el.navTabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { activateView(i); });
    tab.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      var step = e.key === 'ArrowRight' ? 1 : -1;
      activateView((i + step + el.navTabs.length) % el.navTabs.length, true);
    });
  });

  function activateTab(i, focus) {
    el.tabs.forEach(function (t, k) {
      var on = k === i;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
    });
    scope = el.tabs[i].dataset.scope;
    selected = null;
    el.panel.setAttribute('aria-labelledby', el.tabs[i].id);
    if (focus) el.tabs[i].focus();
    renderChart();
  }

  el.tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { activateTab(i); });
    tab.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      var step = e.key === 'ArrowRight' ? 1 : -1;
      activateTab((i + step + el.tabs.length) % el.tabs.length, true);
    });
  });

  el.journal.addEventListener('click', function (e) {
    var day = e.target.closest('[data-day]');
    if (day) openDayPage(day.dataset.day);
  });

  el.dayBack.addEventListener('click', closeDayPage);
  window.addEventListener('popstate', syncRoute);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !el.dayPage.hidden) closeDayPage();
  });

  /* Modification directe dans les champs de la journée. */
  el.dayRows.addEventListener('input', function (e) {
    var input = e.target;
    if (!input.dataset || !input.dataset.edit) return;
    var cleaned = input.value.replace(/\D/g, '').slice(0, 3);
    if (cleaned !== input.value) input.value = cleaned;
  });

  el.dayRows.addEventListener('change', function (e) {
    var input = e.target;
    if (input.dataset && input.dataset.edit) editSet(input.dataset.id, input.dataset.edit, input.value);
  });

  el.dayRows.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-del]');
    if (!btn) return;
    removeSet(btn.dataset.del);
    if (setsFor(openDay).length === 0) closeDayPage();
    else renderDay();
  });

  el.deleteDay.addEventListener('click', function () {
    var sets = setsFor(openDay);
    if (!sets.length) return;

    if (!dayArmed) {
      dayArmed = true;
      el.deleteDay.classList.add('is-armed');
      el.deleteDay.textContent = 'Confirmer : effacer ' + sets.length + ' série' + plural(sets.length);
      return;
    }

    var gone = openDay;
    state.sets = state.sets.filter(function (s) { return s.date !== gone; });
    disarmDay();
    commit();
    closeDayPage();
    toast('Journée supprimée.');
  });

  el.goalInput.addEventListener('input', function () {
    var cleaned = el.goalInput.value.replace(/\D/g, '').slice(0, 4);
    if (cleaned !== el.goalInput.value) el.goalInput.value = cleaned;
    var n = parseInt(cleaned, 10);
    if (isFinite(n) && n >= 1) setGoal(n);
  });
  el.goalInput.addEventListener('blur', function () { el.goalInput.value = String(state.goal); });

  $('goalDec').addEventListener('click', function () { setGoal(state.goal - 5); });
  $('goalInc').addEventListener('click', function () { setGoal(state.goal + 5); });

  el.resetBtn.addEventListener('click', function () {
    if (!state.sets.length) return;
    if (!resetArmed) {
      resetArmed = true;
      el.resetBtn.classList.add('is-armed');
      el.resetBtn.textContent = 'Confirmer : effacer ' + state.sets.length +
        ' série' + plural(state.sets.length);
      return;
    }
    state.sets = [];
    disarmReset();
    commit();
    toast('Historique effacé.');
  });

  el.exportBtn.addEventListener('click', function () {
    download('tractions-' + todayISO() + '.json', serialize());
    showBackupNote('Export téléchargé : tractions-' + todayISO() + '.json', false);
  });

  el.importBtn.addEventListener('click', function () { el.importFile.click(); });

  el.importFile.addEventListener('change', function () {
    var file = el.importFile.files && el.importFile.files[0];
    if (file) readImport(file);
  });

  el.mergeBtn.addEventListener('click', applyMerge);
  el.replaceBtn.addEventListener('click', applyReplace);
  el.cancelImport.addEventListener('click', function () {
    resetImport();
    showBackupNote('Import annulé.', false);
  });

  /* ------------------------------------------------------------ démarrage */

  /* Un lancement part toujours de l'écran d'ajout, jamais d'une page profonde. */
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);

  var dayStamp = todayISO();
  el.goalInput.value = String(state.goal);
  render();

  /* Le jour peut changer pendant que l'app reste ouverte. */
  setInterval(function () {
    var now = todayISO();
    if (now === dayStamp) return;
    dayStamp = now;
    render();
  }, 60000);

  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().catch(function () { /* refus silencieux : rien à faire */ });
  }

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js', { scope: './' })
        .catch(function () { /* hors ligne dès le premier chargement : sans effet */ });
    });
  }
})();
