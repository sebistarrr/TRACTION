/* Tractions — logique applicative.
   Stockage local, agrégations jour/mois/année, journal, rendu, administration. */

(function () {
  'use strict';

  var KEY = 'tractions:v1';
  var SCHEMA = 4;              /* v1 : sans charge · v2 : sans programme · v3 : sans origine */
  var DEFAULT_GOAL = 50;
  var MAX_REPS = 999;
  var MAX_GOAL = 9999;
  var MAX_KG = 200;

  /* « nav » : la fenêtre se remonte à la flèche, une période à la fois.
     La semaine est une vraie semaine calendaire, du lundi au dimanche ; les
     30 jours sont une fenêtre glissante qui recule d'un bloc de 30. */
  var SCOPES = {
    d7:    { count: 7,  trend: 'vs semaine précédente',  daily: true, week: true, nav: true },
    d30:   { count: 30, trend: 'vs 30 jours précédents', daily: true, dense: true, nav: true },
    month: { count: 12, trend: 'vs mois dernier',        dense: true },
    year:  { count: 5,  trend: 'vs an dernier' }
  };

  var MONTH_INITIALS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

  /* ------------------------------------------------- programme 50 tractions

     Cycles repris de 50tractions.com : un niveau par palier de test, six ou
     neuf journées par cycle, cinq séries par journée, 120 secondes de repos.
     Un nombre est un objectif ferme ; « 10+ » est une série à l'épuisement
     dont le minimum à valider est 10.                                        */

  var LEVELS = [
    { name: 'Moins de 4 tractions', min: 0, max: 3, rest: 120, neg: true, days: [
      { sets: [2, 7, 5, 5, 7], pause: 1 },
      { sets: [3, 8, 6, 6, 8], pause: 1 },
      { sets: [4, 9, 6, 6, 8], pause: 2 },
      { sets: [5, 8, 7, 7, 9], pause: 1 },
      { sets: [5, 10, 8, 8, 10], pause: 1 },
      { sets: [6, 10, 8, 8, 11], pause: 2 }
    ] },
    { name: '4-5 tractions', min: 4, max: 5, rest: 120, neg: true, days: [
      { sets: [4, 9, 6, 6, 9], pause: 1 },
      { sets: [5, 9, 7, 7, 9], pause: 1 },
      { sets: [6, 10, 8, 8, 10], pause: 2 },
      { sets: [6, 11, 8, 8, 11], pause: 1 },
      { sets: [7, 12, 10, 10, 12], pause: 1 },
      { sets: [8, 14, 11, 11, 14], pause: 2 }
    ] },
    { name: '6-8 tractions', min: 6, max: 8, rest: 120, days: [
      { sets: [2, 3, 2, 2, '3+'], pause: 1 },
      { sets: [2, 3, 2, 2, '4+'], pause: 1 },
      { sets: [3, 4, 2, 2, '4+'], pause: 2 },
      { sets: [3, 4, 3, 3, '4+'], pause: 1 },
      { sets: [3, 4, 3, 3, '5+'], pause: 1 },
      { sets: [4, 5, 4, 4, '6+'], pause: 2 }
    ] },
    { name: '9-11 tractions', min: 9, max: 11, rest: 120, days: [
      { sets: [3, 5, 3, 3, '5+'], pause: 1 },
      { sets: [4, 6, 4, 4, '6+'], pause: 1 },
      { sets: [5, 7, 5, 5, '6+'], pause: 2 },
      { sets: [5, 8, 5, 5, '8+'], pause: 1 },
      { sets: [6, 9, 6, 6, '8+'], pause: 1 },
      { sets: [6, 9, 6, 6, '10+'], pause: 2 }
    ] },
    { name: '12-15 tractions', min: 12, max: 15, rest: 120, days: [
      { sets: [6, 8, 6, 6, '8+'], pause: 1 },
      { sets: [6, 9, 6, 6, '9+'], pause: 1 },
      { sets: [7, 10, 6, 6, '9+'], pause: 2 },
      { sets: [7, 10, 7, 7, '10+'], pause: 1 },
      { sets: [8, 11, 8, 8, '10+'], pause: 1 },
      { sets: [9, 11, 9, 9, '11+'], pause: 2 }
    ] },
    { name: '16-20 tractions', min: 16, max: 20, rest: 120, days: [
      { sets: [8, 11, 8, 8, '10+'], pause: 1 },
      { sets: [9, 12, 9, 9, '11+'], pause: 1 },
      { sets: [9, 13, 9, 9, '12+'], pause: 2 },
      { sets: [10, 14, 10, 10, '13+'], pause: 1 },
      { sets: [11, 15, 10, 10, '13+'], pause: 1 },
      { sets: [11, 15, 11, 11, '13+'], pause: 2 },
      { sets: [12, 16, 11, 11, '15+'], pause: 1 },
      { sets: [12, 16, 12, 12, '16+'], pause: 1 },
      { sets: [13, 17, 13, 13, '16+'], pause: 2 }
    ] },
    { name: '21-25 tractions', min: 21, max: 25, rest: 120, days: [
      { sets: [12, 16, 12, 12, '15+'], pause: 1 },
      { sets: [13, 16, 12, 12, '16+'], pause: 1 },
      { sets: [13, 17, 13, 13, '16+'], pause: 2 },
      { sets: [14, 19, 13, 13, '18+'], pause: 1 },
      { sets: [14, 19, 14, 14, '19+'], pause: 1 },
      { sets: [15, 20, 14, 14, '20+'], pause: 2 },
      { sets: [16, 20, 16, 16, '20+'], pause: 1 },
      { sets: [16, 21, 16, 16, '20+'], pause: 1 },
      { sets: [17, 22, 16, 16, '21+'], pause: 2 }
    ] },
    { name: '26-30 tractions', min: 26, max: 30, rest: 120, days: [
      { sets: [16, 18, 15, 15, '17+'], pause: 1 },
      { sets: [16, 20, 16, 16, '19+'], pause: 1 },
      { sets: [17, 21, 16, 16, '20+'], pause: 2 },
      { sets: [17, 22, 17, 17, '22+'], pause: 1 },
      { sets: [18, 23, 18, 18, '22+'], pause: 1 },
      { sets: [19, 25, 18, 18, '24+'], pause: 2 },
      { sets: [19, 26, 18, 18, '25+'], pause: 1 },
      { sets: [19, 27, 19, 19, '26+'], pause: 1 },
      { sets: [20, 28, 20, 20, '28+'], pause: 2 }
    ] },
    { name: '31-35 tractions', min: 31, max: 35, rest: 120, days: [
      { sets: [20, 25, 19, 19, '23+'], pause: 1 },
      { sets: [22, 25, 21, 21, '25+'], pause: 1 },
      { sets: [23, 26, 23, 23, '25+'], pause: 2 },
      { sets: [24, 27, 24, 24, '26+'], pause: 1 },
      { sets: [25, 28, 24, 24, '27+'], pause: 1 },
      { sets: [25, 29, 25, 25, '28+'], pause: 2 },
      { sets: [26, 29, 25, 25, '29+'], pause: 1 },
      { sets: [26, 30, 26, 26, '30+'], pause: 1 },
      { sets: [26, 32, 26, 26, '32+'], pause: 2 }
    ] },
    { name: '36-40 tractions', min: 36, max: 40, rest: 120, days: [
      { sets: [23, 27, 22, 22, '26+'], pause: 1 },
      { sets: [24, 28, 24, 24, '28+'], pause: 1 },
      { sets: [25, 29, 24, 24, '29+'], pause: 2 },
      { sets: [26, 30, 25, 25, '30+'], pause: 1 },
      { sets: [26, 31, 25, 25, '31+'], pause: 1 },
      { sets: [26, 31, 26, 26, '31+'], pause: 2 },
      { sets: [27, 31, 26, 26, '32+'], pause: 1 },
      { sets: [28, 32, 26, 26, '32+'], pause: 1 },
      { sets: [28, 34, 27, 27, '34+'], pause: 2 }
    ] },
    { name: 'Plus de 40 tractions', min: 41, max: 999, rest: 120, days: [
      { sets: [25, 28, 24, 24, '26+'], pause: 1 },
      { sets: [25, 29, 25, 25, '28+'], pause: 1 },
      { sets: [25, 30, 25, 25, '29+'], pause: 2 },
      { sets: [26, 31, 25, 25, '31+'], pause: 1 },
      { sets: [26, 32, 26, 26, '31+'], pause: 1 },
      { sets: [27, 32, 26, 26, '32+'], pause: 2 },
      { sets: [27, 34, 26, 26, '33+'], pause: 1 },
      { sets: [28, 34, 26, 26, '34+'], pause: 1 },
      { sets: [29, 35, 27, 27, '35+'], pause: 2 }
    ] }
  ];

  var LAST_LEVEL = LEVELS.length - 1;

  /* Les deux premiers cycles se font en négatives : on ne se hisse pas, on
     part menton à la barre et on descend. À dire partout où le cycle est nommé. */
  var NEG_TAG = 'Tractions négatives';

  function pauseLabel(day) {
    return day.pause + ' jour' + plural(day.pause) + ' de repos';
  }

  /* Le test dit le cycle : on prend le premier palier qui contient le score. */
  function levelForScore(n) {
    for (var i = 0; i < LEVELS.length; i++) {
      if (n <= LEVELS[i].max) return i;
    }
    return LAST_LEVEL;
  }

  /* Un objectif de série : « 8 » est ferme, « 10+ » va à l'épuisement
     et se valide à partir de 10. */
  function target(v) {
    return typeof v === 'number'
      ? { min: v, open: false }
      : { min: parseInt(v, 10), open: true };
  }

  function targetLabel(v) {
    var t = target(v);
    return t.open ? t.min + '+' : String(t.min);
  }

  function levelOf(p) { return LEVELS[clamp(p.level, 0, LAST_LEVEL)]; }

  function dayOf(p) {
    var lvl = levelOf(p);
    return lvl.days[clamp(p.day, 0, lvl.days.length - 1)];
  }

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

  /* Le lundi de la semaine d'une date : la semaine française commence là. */
  function weekStart(d) {
    var back = (d.getDay() + 6) % 7;
    return addDays(new Date(d.getFullYear(), d.getMonth(), d.getDate()), -back);
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

  function shortDate(iso) {
    return fromISO(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }

  /* « 10 – 16 août », « 28 juil. – 3 août », l'année en plus si ce n'est pas
     celle qui court. */
  function rangeLabel(from, to) {
    var a = fromISO(from);
    var b = fromISO(to);
    var sameMonth = a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
    var year = b.getFullYear() !== new Date().getFullYear() ? ' ' + b.getFullYear() : '';
    return (sameMonth ? String(a.getDate()) : shortDate(from)) + ' – ' + shortDate(to) + year;
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

  /* Une pastille de série : le nombre, la charge, et l'origine par la couleur.
     Le libellé d'origine reste lisible au survol et pour les lecteurs d'écran. */
  function fillPill(node, set, extra) {
    var src = SOURCES[set.src];
    node.className = 'pill pill--' + src.cls + (extra ? ' ' + extra : '');
    node.textContent = fmt(set.reps);
    node.title = setLabel(set) + ' · ' + src.tag;

    if (set.kg > 0) {
      var kg = document.createElement('span');
      kg.className = 'pill-kg';
      kg.textContent = '+' + set.kg;
      node.appendChild(kg);
    }
  }

  /* Les origines présentes dans une journée, dans l'ordre où elles arrivent. */
  function daySources(sets) {
    var tags = [];
    for (var i = 0; i < sets.length; i++) {
      var tag = SOURCES[sets[i].src].tag;
      if (tags.indexOf(tag) === -1) tags.push(tag);
    }
    return tags;
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

      out.push({ id: id, date: raw.date, reps: reps, kg: kg, ts: ts, src: normalizeSource(raw.src) });
    }

    out.sort(function (a, b) {
      if (a.ts !== b.ts) return a.ts - b.ts;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });

    return { sets: out, rejected: rejected };
  }

  /* Trois façons de s'entraîner. Une série sans origine — fichier d'avant la
     version 4 — est une série libre. */
  var SOURCES = {
    libre:     { tag: 'Libre',        short: 'Libre',  cls: 'libre' },
    programme: { tag: '50 tractions', short: '50 tr.', cls: 'prog' },
    emom:      { tag: 'EMOM',         short: 'EMOM',   cls: 'emom' }
  };

  function normalizeSource(v) {
    return SOURCES[v] ? v : 'libre';
  }

  function normalizeGoal(v) {
    var g = Math.floor(Number(v));
    return isFinite(g) && g >= 1 && g <= MAX_GOAL ? g : DEFAULT_GOAL;
  }

  function emptyProg() {
    /* mode null : le mode n'a jamais été choisi, l'app demande le niveau. */
    return { mode: null, level: 0, day: 0, test: null, done: null, last: null, session: null };
  }

  function int(v, lo, hi, fallback) {
    var n = Math.floor(Number(v));
    return isFinite(n) ? clamp(n, lo, hi) : fallback;
  }

  /* Un programme relu doit toujours désigner un jour qui existe : le nombre de
     journées change d'un cycle à l'autre. */
  function normalizeProg(raw) {
    var p = emptyProg();
    if (!raw || typeof raw !== 'object') return p;

    p.mode = SOURCES[raw.mode] ? raw.mode : null;
    p.level = int(raw.level, 0, LAST_LEVEL, 0);
    p.day = int(raw.day, 0, LEVELS[p.level].days.length - 1, 0);
    p.test = raw.test === null || raw.test === undefined ? null : int(raw.test, 0, MAX_REPS, null);
    p.done = isValidISO(raw.done) ? raw.done : null;

    if (raw.last && typeof raw.last === 'object' && isValidISO(raw.last.date)) {
      var lastLevel = int(raw.last.level, 0, LAST_LEVEL, 0);
      p.last = {
        date: raw.last.date,
        level: lastLevel,
        day: int(raw.last.day, 0, LEVELS[lastLevel].days.length - 1, 0),
        ok: raw.last.ok === true
      };
    }

    var s = raw.session;
    if (s && typeof s === 'object' && Array.isArray(s.reps)) {
      var level = int(s.level, 0, LAST_LEVEL, 0);
      var day = int(s.day, 0, LEVELS[level].days.length - 1, 0);
      var reps = [];
      for (var i = 0; i < s.reps.length && i < 5; i++) {
        reps.push(int(s.reps[i], 0, MAX_REPS, 0));
      }
      /* Un repos déjà écoulé, ou une échéance absurde, se règle à zéro. */
      var until = int(s.until, 0, 8640000000000000, 0);
      p.session = {
        level: level,
        day: day,
        reps: reps,
        until: until > Date.now() ? until : 0
      };
    }

    return p;
  }

  /* ------------------------------------------------------------------ EMOM

     Every Minute On the Minute : une série au début de chaque minute, le
     reste de la minute sert de repos. Le chrono ne s'arrête jamais.        */

  var EMOM_MINUTE = 60000;
  var MAX_ROUNDS = 60;

  function emptyEmom() {
    return { reps: 5, rounds: 10, session: null };
  }

  function normalizeEmom(raw) {
    var e = emptyEmom();
    if (!raw || typeof raw !== 'object') return e;

    e.reps = int(raw.reps, 1, MAX_REPS, e.reps);
    e.rounds = int(raw.rounds, 1, MAX_ROUNDS, e.rounds);

    var s = raw.session;
    if (s && typeof s === 'object' && Array.isArray(s.done)) {
      var rounds = int(s.rounds, 1, MAX_ROUNDS, e.rounds);
      var start = int(s.start, 1, 8640000000000000, 0);
      var done = [];
      for (var i = 0; i < s.done.length && i < rounds; i++) {
        done.push(int(s.done[i], 0, MAX_REPS, 0));
      }
      /* Sans départ lisible, la séance n'a plus de chrono : elle est perdue. */
      if (start > 0) {
        e.session = {
          reps: int(s.reps, 1, MAX_REPS, e.reps),
          rounds: rounds,
          start: start,
          done: done
        };
      }
    }

    return e;
  }

  /* Lecture défensive : rien, JSON cassé ou schéma faux ⇒ état vide. */
  function load() {
    var empty = {
      version: SCHEMA, goal: DEFAULT_GOAL, sets: [], prog: emptyProg(), emom: emptyEmom()
    };
    var raw;
    try { raw = localStorage.getItem(KEY); } catch (e) { return empty; }
    if (!raw) return empty;

    var parsed;
    try { parsed = JSON.parse(raw); } catch (e) { return empty; }
    if (!parsed || typeof parsed !== 'object') return empty;

    return {
      version: SCHEMA,
      goal: normalizeGoal(parsed.goal),
      sets: normalizeSets(parsed.sets).sets,
      prog: normalizeProg(parsed.prog),
      emom: normalizeEmom(parsed.emom)
    };
  }

  var state = load();

  function serialize() {
    return JSON.stringify({
      version: SCHEMA,
      goal: state.goal,
      prog: state.prog,
      emom: { reps: state.emom.reps, rounds: state.emom.rounds, session: state.emom.session },
      sets: state.sets.map(function (s) {
        return { id: s.id, date: s.date, reps: s.reps, kg: s.kg, ts: s.ts, src: s.src };
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

  /* Le dernier jour de la fenêtre affichée. En hebdomadaire c'est le dimanche
     de la semaine visée, sinon le jour d'arrivée de la fenêtre glissante.
     offset 0 : la période en cours ; 1 : la précédente, et ainsi de suite. */
  function windowEnd(name, offset) {
    var today = new Date();
    if (SCOPES[name].week) return addDays(weekStart(today), 6 - 7 * offset);
    return addDays(today, -SCOPES[name].count * offset);
  }

  function sumBetween(from, to) {
    var total = 0;
    for (var i = 0; i < state.sets.length; i++) {
      var d = state.sets[i].date;
      if (d >= from && d <= to) total += state.sets[i].reps;
    }
    return total;
  }

  /* Combien de jours de la fenêtre sont déjà passés : une semaine en cours
     n'est comparable qu'à la même portion de la précédente. */
  function elapsedSpan(buckets) {
    var today = todayISO();
    var span = 0;
    for (var i = 0; i < buckets.length; i++) {
      if (buckets[i].key <= today) span++;
    }
    return clamp(span, 1, buckets.length);
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
      var end = windowEnd(name, periodOffset);
      for (i = n - 1; i >= 0; i--) {
        var d = addDays(end, -i);
        var iso = isoOf(d);
        list.push({
          key: iso,
          axis: n <= 7
            ? d.toLocaleDateString('fr-FR', { weekday: 'narrow' }) + ' ' + d.getDate()
            : String(d.getDate()),
          title: capitalize(longDate(iso)),
          /* La semaine en cours porte des jours qui ne sont pas encore venus :
             ils n'ont pas fait zéro, ils n'ont rien fait du tout. */
          future: iso > todayISO(),
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

    /* En journalier, l'objectif du jour est toujours tracé : c'est le repère. */
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
    period: document.querySelector('.period'),
    periodPrev: $('periodPrev'),
    periodNext: $('periodNext'),
    periodLabel: $('periodLabel'),
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
    flash: $('flash'),
    flashTitle: $('flashTitle'),
    flashSub: $('flashSub'),
    flashSay: $('flashSay'),
    goalInput: $('goalInput'),
    backDate: $('backDate'),
    backReps: $('backReps'),
    backKg: $('backKg'),
    backAdd: $('backAdd'),
    backMsg: $('backMsg'),
    dayPage: $('dayPage'),
    dayBack: $('dayBack'),
    dayTitle: $('dayTitle'),
    daySub: $('daySub'),
    dayRows: $('dayRows'),
    deleteDay: $('deleteDay'),
    modeBtns: Array.prototype.slice.call(document.querySelectorAll('.modebtn')),
    freeTraining: $('freeTraining'),
    progTraining: $('progTraining'),
    progLevel: $('progLevel'),
    progDay: $('progDay'),
    progNeg: $('progNeg'),
    progTargets: $('progTargets'),
    progNote: $('progNote'),
    progRest: $('progRest'),
    startBtn: $('startSession'),
    sessionPage: $('sessionPage'),
    sessionBack: $('sessionBack'),
    sessionTitle: $('sessionTitle'),
    sessionSub: $('sessionSub'),
    stepSet: $('stepSet'),
    stepRest: $('stepRest'),
    stepDone: $('stepDone'),
    sessStep: $('sessStep'),
    sessTarget: $('sessTarget'),
    sessHint: $('sessHint'),
    sessReps: $('sessReps'),
    validateSet: $('validateSet'),
    restClock: $('restClock'),
    restRing: $('restRing'),
    restNext: $('restNext'),
    skipRest: $('skipRest'),
    sessVerdict: $('sessVerdict'),
    sessRecap: $('sessRecap'),
    sessAfter: $('sessAfter'),
    finishSession: $('finishSession'),
    quitSession: $('quitSession'),
    emomTraining: $('emomTraining'),
    emomReps: $('emomRepsCfg'),
    emomRounds: $('emomRoundsCfg'),
    emomTotal: $('emomTotal'),
    startEmom: $('startEmom'),
    emomPage: $('emomPage'),
    emomBack: $('emomBack'),
    emomTitle: $('emomTitle'),
    emomSub: $('emomSub'),
    emomRun: $('emomRun'),
    emomEnd: $('emomEnd'),
    emomStep: $('emomStep'),
    emomRing: $('emomRing'),
    emomClock: $('emomClock'),
    emomEntry: $('emomEntry'),
    emomWait: $('emomWait'),
    emomHint: $('emomHint'),
    emomWaitHint: $('emomWaitHint'),
    emomInput: $('emomInput'),
    emomLog: $('emomLog'),
    emomDone: $('emomDone'),
    emomQuit: $('emomQuit'),
    emomVerdict: $('emomVerdict'),
    emomRecapText: $('emomRecapText'),
    emomRecap: $('emomRecap'),
    emomFinish: $('emomFinish'),
    setupPage: $('setupPage'),
    setupScore: $('setupScore'),
    setupGo: $('setupGo'),
    progAdmin: $('progAdmin'),
    pickDays: $('pickDays'),
    daysPage: $('daysPage'),
    daysBack: $('daysBack'),
    daysSub: $('daysSub'),
    levelPrev: $('levelPrev'),
    levelNext: $('levelNext'),
    levelName: $('levelName'),
    levelNeg: $('levelNeg'),
    dayList: $('dayList'),
    daysApply: $('daysApply'),
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
  var periodOffset = 0;      // 0 : période en cours, 1 : la précédente…
  var selected = null;       // clé du seau sélectionné dans le graphique
  var toastTimer = null;
  var flashTimer = null;
  var emomFlashed = -1;      // dernière minute d'EMOM annoncée
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

  /* L'annonce de reprise : le repos est fini, ou une minute d'EMOM s'ouvre.
     Elle se voit à bout de bras, s'efface seule au bout de quatre secondes, et
     part en même temps dans une région live — le panneau apparaît puis
     disparaît, les lecteurs d'écran sont mieux servis par un texte stable. */
  function flash(title, sub) {
    el.flashTitle.textContent = title;
    el.flashSub.textContent = sub || '';
    el.flash.hidden = false;
    el.flashSay.textContent = title + (sub ? '. ' + sub : '');
    if (flashTimer) clearTimeout(flashTimer);
    flashTimer = setTimeout(hideFlash, 4000);
  }

  function hideFlash() {
    if (flashTimer) { clearTimeout(flashTimer); flashTimer = null; }
    el.flash.hidden = true;
    el.flashSay.textContent = '';
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

    /* Toutes les séries de la journée, dans l'ordre, sur autant de lignes
       qu'il en faut. */
    el.todaySets.textContent = '';
    var list = setsFor(iso);

    for (var i = 0; i < list.length; i++) {
      var li = document.createElement('li');
      fillPill(li, list[i], list[i].id === freshPillId ? 'pill--new' : '');
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
    var label = SCOPES[scope].trend;
    var cur, prev;

    if (SCOPES[scope].daily) {
      /* Fenêtre contre fenêtre, à portion égale : une semaine entamée le mardi
         se compare aux deux premiers jours de la semaine d'avant, pas à sept. */
      var span = elapsedSpan(buckets);
      var from = fromISO(buckets[0].key);
      var back = isoOf(addDays(from, -SCOPES[scope].count));
      cur = sumBetween(buckets[0].key, buckets[span - 1].key);
      prev = sumBetween(back, isoOf(addDays(fromISO(back), span - 1)));
    } else {
      cur = buckets[n - 1].value;
      prev = buckets[n - 2].value;
    }

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

  /* Mois et années gardent leur fenêtre glissante : l'étiquette dit ce qu'on
     regarde, sans flèches. */
  function spanLabel(buckets) {
    var first = buckets[0];
    var last = buckets[buckets.length - 1];
    if (SCOPES[scope].daily) return rangeLabel(first.key, last.key);
    if (scope === 'year') return first.axis + ' – ' + last.axis;
    return monthLabel(first.key) + ' – ' + monthLabel(last.key);
  }

  function monthLabel(key) {
    var p = key.split('-');
    return new Date(Number(p[0]), Number(p[1]) - 1, 1)
      .toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
  }

  /* Les flèches ne mènent nulle part au-delà des données : on ne remonte pas
     avant la première série, et on ne dépasse pas la période en cours. */
  function renderPeriod(buckets) {
    var nav = !!SCOPES[scope].nav;
    var first = firstDate();

    el.period.classList.toggle('is-past', periodOffset > 0);
    el.periodLabel.textContent = spanLabel(buckets);
    el.periodPrev.hidden = !nav;
    el.periodNext.hidden = !nav;
    el.periodNext.disabled = periodOffset === 0;
    el.periodPrev.disabled = !first || buckets[0].key <= first;
  }

  function stepPeriod(n) {
    if (!SCOPES[scope].nav) return;
    var next = Math.max(0, periodOffset + n);
    if (next === periodOffset) return;
    periodOffset = next;
    selected = null;                 /* la sélection suit la fenêtre affichée */
    renderChart();
  }

  /* Ce qu'on regarde en arrivant sur une fenêtre : la dernière journée qui a
     quelque chose à dire, sans jamais dépasser aujourd'hui. */
  function defaultKey(buckets) {
    var today = todayISO();
    var fallback = null;
    for (var i = buckets.length - 1; i >= 0; i--) {
      var b = buckets[i];
      if (b.future) continue;
      if (fallback === null) fallback = b.key;
      if (b.value > 0) return b.key;
    }
    return fallback === null ? buckets[buckets.length - 1].key : fallback;
  }

  function renderChart() {
    var buckets = buildBuckets(scope);
    var scale = scaleFor(scope, buckets);
    var dense = !!SCOPES[scope].dense;
    var n = buckets.length;
    var i;

    el.chart.classList.toggle('is-dense', dense);

    if (!selected || !buckets.some(function (b) { return b.key === selected; })) {
      selected = defaultKey(buckets);
    }

    renderPeriod(buckets);
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

      if (b.future) btn.className += ' is-future';

      /* Le nombre de tractions, au-dessus de sa barre. Les journées vides des
         échelles denses restent muettes : un « 0 » répété n'apprend rien, et
         une journée qui n'est pas arrivée n'a pas fait zéro. */
      if (b.value > 0 || (!dense && !b.future)) {
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
      btn.setAttribute('aria-label', 'Modifier le ' + longDate(day.date) + ' : ' +
        fmt(day.total) + ' tractions en ' + day.sets.length + ' série' + plural(day.sets.length));

      var head = document.createElement('span');
      head.className = 'journal-head';

      var left = document.createElement('span');
      left.className = 'journal-left';

      var date = document.createElement('span');
      date.className = 'journal-date';
      date.textContent = capitalize(longDate(day.date));

      /* L'origine des séries, sous la date : libre, programme, EMOM, ou
         plusieurs si la journée a mélangé. */
      var src = document.createElement('span');
      src.className = 'journal-src';
      src.textContent = daySources(day.sets).join(' · ');

      left.appendChild(date);
      left.appendChild(src);

      var total = document.createElement('span');
      total.className = 'journal-total';
      total.textContent = fmt(day.total);

      head.appendChild(left);
      head.appendChild(total);

      /* Mêmes étiquettes que dans Training : une pastille par série,
         la charge accolée. (Des <span> : un <ul> serait invalide dans un bouton.) */
      var pills = document.createElement('span');
      pills.className = 'pills journal-pills';

      for (var k = 0; k < day.sets.length; k++) {
        var pill = document.createElement('span');
        fillPill(pill, day.sets[k], '');
        pills.appendChild(pill);
      }

      btn.appendChild(head);
      btn.appendChild(pills);
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

      var meta = document.createElement('span');
      meta.className = 'day-meta';

      var time = document.createElement('span');
      time.className = 'day-time';
      time.textContent = new Date(s.ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

      var src = document.createElement('span');
      src.className = 'day-src day-src--' + SOURCES[s.src].cls;
      src.textContent = SOURCES[s.src].short;

      meta.appendChild(time);
      meta.appendChild(src);
      row.appendChild(meta);

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

  /* --------------------------------------------------- programme : rendu */

  /* Jours de repos encore conseillés avant la prochaine séance. */
  function restLeft() {
    var p = state.prog;
    if (!p.done || !p.last) return 0;
    var pause = LEVELS[p.last.level].days[p.last.day].pause;
    var next = addDays(fromISO(p.done), pause);
    var days = Math.round((next - fromISO(todayISO())) / 86400000);
    return Math.max(0, days);
  }

  function renderProgram() {
    var p = state.prog;
    var lvl = levelOf(p);
    var day = dayOf(p);
    var i;

    /* Tant que le mode n'est pas choisi, c'est le compteur libre qui tient
       l'écran derrière la page du test. */
    var mode = p.mode || 'libre';

    el.modeBtns.forEach(function (b) {
      var on = b.dataset.mode === mode;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      b.tabIndex = on ? 0 : -1;
    });

    el.freeTraining.hidden = mode !== 'libre';
    el.progTraining.hidden = mode !== 'programme';
    el.emomTraining.hidden = mode !== 'emom';
    if (mode !== 'programme') return;

    el.progLevel.textContent = 'Niveau ' + (p.level + 1) + ' · ' + lvl.name;
    el.progDay.textContent = 'Jour ' + (p.day + 1) + ' sur ' + lvl.days.length;
    el.progNeg.textContent = NEG_TAG;
    el.progNeg.hidden = !lvl.neg;

    el.progTargets.textContent = '';
    for (i = 0; i < day.sets.length; i++) {
      var li = document.createElement('li');
      li.className = 'prog-target';
      var rank = document.createElement('span');
      rank.className = 'prog-rank';
      rank.textContent = 'S' + (i + 1);
      var value = document.createElement('b');
      value.textContent = targetLabel(day.sets[i]);
      li.appendChild(rank);
      li.appendChild(value);
      el.progTargets.appendChild(li);
    }

    el.progNote.textContent = lvl.rest + ' s de repos entre les séries.';

    /* Le repos conseillé et le sort de la dernière séance, dans la même ligne :
       c'est ce qui explique pourquoi le jour affiché a bougé — ou pas. */
    var left = restLeft();
    var parts = [];
    if (p.last && p.last.ok) {
      parts.push('Dernière séance validée.');
    } else if (p.last) {
      /* « À refaire » ne vaut que si le jour affiché est bien celui qui a été
         manqué : le choix manuel des jours peut avoir déplacé le curseur. */
      parts.push(p.last.level === p.level && p.last.day === p.day
        ? 'Dernière séance manquée : ce jour est à refaire.'
        : 'Dernière séance manquée.');
    }
    if (left > 0) {
      parts.push('Repos conseillé : encore ' + left + ' jour' + plural(left) + '.');
    }
    el.progRest.textContent = parts.join(' ');
    el.progRest.hidden = parts.length === 0;

    el.startBtn.textContent = p.session
      ? 'Reprendre la séance'
      : 'Démarrer un entraînement';
  }

  function clockText(ms) {
    var s = Math.ceil(ms / 1000);
    return Math.floor(s / 60) + ':' + pad2(s % 60);
  }

  /* ------------------------------------------------------- EMOM : rendu */

  function renderEmomCard() {
    var e = state.emom;
    el.emomReps.value = String(e.reps);
    el.emomRounds.value = String(e.rounds);
    el.emomTotal.textContent = 'Séance prévue : ' + fmt(e.reps * e.rounds) +
      ' tractions en ' + e.rounds + ' minute' + plural(e.rounds) + '.';
    el.startEmom.textContent = e.session ? 'Reprendre l’EMOM' : 'Démarrer l’EMOM';
  }

  /* La minute en cours, d'après le chrono : c'est lui qui mène la séance. */
  function emomMinute(s) {
    return Math.floor((Date.now() - s.start) / EMOM_MINUTE);
  }

  function renderEmomSession() {
    var s = state.emom.session;
    if (!s) return;

    var minute = emomMinute(s);
    var over = s.done.length >= s.rounds;
    /* Série validée avant la fin de la minute : on attend la suivante. */
    var waiting = !over && s.done.length > minute;

    el.emomTitle.textContent = 'EMOM · ' + s.reps + ' × ' + s.rounds;
    el.emomSub.textContent = over
      ? 'Séance terminée'
      : 'Minute ' + Math.min(s.done.length + 1, s.rounds) + ' sur ' + s.rounds;

    el.emomRun.hidden = over;
    el.emomEnd.hidden = !over;

    if (over) {
      renderEmomEnd(s);
      stopEmomTick();
      return;
    }

    el.emomStep.textContent = waiting
      ? 'Prochaine série dans'
      : 'Minute ' + (s.done.length + 1) + ' / ' + s.rounds;
    el.emomEntry.hidden = waiting;
    el.emomWait.hidden = !waiting;

    /* Une minute vient de s'ouvrir : on l'annonce une fois, et une seule.
       Rien pendant l'attente — la reprise, c'est le moment qui compte. */
    if (!waiting && s.done.length > 0 && emomFlashed !== s.done.length) {
      emomFlashed = s.done.length;
      flash('Minute ' + (s.done.length + 1) + ' sur ' + s.rounds,
        'Objectif : ' + fmt(s.reps) + ' traction' + plural(s.reps));
    }

    if (waiting) {
      var last = s.done[s.done.length - 1];
      el.emomWaitHint.textContent = fmt(last) + ' traction' + plural(last) +
        ' enregistrée' + plural(last) + '. Souffle.';
    } else {
      el.emomHint.textContent = 'Objectif : ' + fmt(s.reps) + ' traction' + plural(s.reps) +
        '. La minute se referme seule sur le nombre affiché.';
    }

    if (document.activeElement !== el.emomInput && !waiting) {
      el.emomInput.value = String(s.reps);
    }

    fillRounds(el.emomDone, s);
    tickEmom();
    startEmomTick();
  }

  /* Les minutes déjà faites, en pastilles : ambre si l'objectif est tenu. */
  function fillRounds(node, s) {
    node.textContent = '';
    for (var i = 0; i < s.done.length; i++) {
      var li = document.createElement('li');
      li.className = s.done[i] >= s.reps ? 'pill pill--emom is-hit' : 'pill pill--emom';
      li.textContent = fmt(s.done[i]);
      node.appendChild(li);
    }
  }

  function renderEmomEnd(s) {
    var total = 0;
    var hits = 0;
    for (var i = 0; i < s.done.length; i++) {
      total += s.done[i];
      if (s.done[i] >= s.reps) hits++;
    }
    var full = hits === s.rounds;

    el.emomVerdict.textContent = full ? 'EMOM tenu' : 'EMOM terminé';
    el.emomVerdict.classList.toggle('is-ok', full);
    el.emomRecapText.textContent = fmt(total) + ' tractions en ' + s.rounds +
      ' minute' + plural(s.rounds) + ' · ' + hits + ' minute' + plural(hits) +
      ' sur ' + s.rounds + ' à l’objectif de ' + fmt(s.reps) + '.';
    fillRounds(el.emomRecap, s);
  }

  function renderSession() {
    var s = state.prog.session;
    if (!s) return;

    var lvl = LEVELS[s.level];
    var day = lvl.days[s.day];
    var i = s.reps.length;                 /* série en cours, 0 à 5 */
    var over = i >= day.sets.length;
    /* Un repos échu n'est plus un repos : à la reprise d'une séance laissée
       de côté, la saisie doit revenir tout de suite, sans attendre le
       prochain battement d'horloge. */
    var resting = !over && s.until > Date.now();

    /* Le sous-titre donne la séance entière d'un coup d'œil ; l'étape en cours
       est dite par le corps de la page. */
    el.sessionTitle.textContent = 'Jour ' + (s.day + 1) + ' · ' + lvl.name;
    el.sessionSub.textContent = over
      ? 'Séance terminée'
      : day.sets.map(targetLabel).join(' · ');

    el.stepSet.hidden = over || resting;
    el.stepRest.hidden = over || !resting;
    el.stepDone.hidden = !over;
    /* Une séance achevée ne s'abandonne plus : ses séries sont enregistrées,
       il ne reste qu'à en tirer le bilan. */
    el.quitSession.hidden = over;

    /* Toujours réécrit, même masqué : aucun libellé d'une série précédente ne
       doit pouvoir réapparaître. */
    if (!over) el.sessStep.textContent = 'Série ' + (i + 1) + ' / ' + day.sets.length;

    if (!over && !resting) {
      var t = target(day.sets[i]);
      el.sessTarget.textContent = targetLabel(day.sets[i]);
      el.sessHint.textContent = t.open
        ? 'Série à l’épuisement : au moins ' + t.min + ' pour valider.'
        : 'Objectif de la série.';
      if (document.activeElement !== el.sessReps) el.sessReps.value = String(t.min);
    }

    if (resting) {
      el.restNext.textContent = 'Prochaine série : ' + targetLabel(day.sets[i]);
      tickRest();
      startRestTick();
    } else {
      stopRestTick();
    }

    if (over) renderVerdict(s, lvl, day);
  }

  function sessionOk(s, day) {
    for (var i = 0; i < day.sets.length; i++) {
      if (s.reps[i] < target(day.sets[i]).min) return false;
    }
    return true;
  }

  function renderVerdict(s, lvl, day) {
    var ok = sessionOk(s, day);
    var lastDay = s.day >= lvl.days.length - 1;

    el.sessVerdict.textContent = ok ? 'Objectif rempli' : 'Objectif manqué';
    el.sessVerdict.classList.toggle('is-ok', ok);

    el.sessRecap.textContent = '';
    for (var i = 0; i < day.sets.length; i++) {
      var t = target(day.sets[i]);
      var hit = s.reps[i] >= t.min;

      var li = document.createElement('li');
      li.className = hit ? 'recap-row is-hit' : 'recap-row';

      var rank = document.createElement('span');
      rank.className = 'prog-rank';
      rank.textContent = 'S' + (i + 1);

      var got = document.createElement('b');
      got.textContent = fmt(s.reps[i]);

      var goal = document.createElement('span');
      goal.className = 'recap-goal';
      goal.textContent = '/ ' + targetLabel(day.sets[i]);

      li.appendChild(rank);
      li.appendChild(got);
      li.appendChild(goal);
      el.sessRecap.appendChild(li);
    }

    if (!ok) {
      el.sessAfter.textContent = 'Le jour ' + (s.day + 1) + ' sera à refaire ' +
        'à la prochaine séance.';
    } else if (!lastDay) {
      el.sessAfter.textContent = 'Prochaine séance : jour ' + (s.day + 2) +
        ' du niveau ' + (s.level + 1) + '.';
    } else if (s.level < LAST_LEVEL) {
      el.sessAfter.textContent = 'Cycle terminé : passage au niveau ' + (s.level + 2) +
        ' · ' + LEVELS[s.level + 1].name + '.';
    } else {
      el.sessAfter.textContent = 'Dernier cycle terminé. Refais le test pour ' +
        'te resituer.';
    }
  }

  /* -------------------------------------------- programme : choix du jour

     Le niveau se feuillette à la flèche, le jour se désigne à la touche.
     Rien n'est écrit tant que « Valider » n'est pas pressé.               */

  var browseLevel = 0;
  var browseDay = 0;

  function renderDays() {
    var lvl = LEVELS[browseLevel];
    var p = state.prog;

    el.daysSub.textContent = 'Niveau ' + (browseLevel + 1) + ' sur ' + LEVELS.length;
    el.levelName.textContent = lvl.name;
    el.levelNeg.textContent = NEG_TAG;
    el.levelNeg.hidden = !lvl.neg;
    el.levelPrev.disabled = browseLevel === 0;
    el.levelNext.disabled = browseLevel === LAST_LEVEL;

    el.dayList.textContent = '';

    for (var i = 0; i < lvl.days.length; i++) {
      var li = document.createElement('li');

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = i === browseDay ? 'day-pick is-picked' : 'day-pick';
      btn.dataset.day = String(i);
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', i === browseDay ? 'true' : 'false');

      var head = document.createElement('span');
      head.className = 'day-pick-head';

      var name = document.createElement('span');
      name.className = 'day-pick-name';
      name.textContent = 'Jour ' + (i + 1);
      head.appendChild(name);

      /* Le jour où en est le programme, pour se repérer en feuilletant. */
      if (browseLevel === p.level && i === p.day) {
        var here = document.createElement('span');
        here.className = 'day-pick-here';
        here.textContent = 'en cours';
        head.appendChild(here);
      }

      var line = document.createElement('span');
      line.className = 'day-pick-sets';
      for (var k = 0; k < lvl.days[i].sets.length; k++) {
        var cell = document.createElement('b');
        cell.textContent = targetLabel(lvl.days[i].sets[k]);
        line.appendChild(cell);
      }

      /* Les deux repos de la journée : entre les séries, puis avant la suivante. */
      var rest = document.createElement('span');
      rest.className = 'day-pick-rest';
      rest.textContent = lvl.rest + ' s entre les séries · puis ' + pauseLabel(lvl.days[i]);

      btn.appendChild(head);
      btn.appendChild(line);
      btn.appendChild(rest);
      li.appendChild(btn);
      el.dayList.appendChild(li);
    }
  }

  function stepLevel(n) {
    var next = clamp(browseLevel + n, 0, LAST_LEVEL);
    if (next === browseLevel) return;
    browseLevel = next;
    /* Les cycles n'ont pas tous le même nombre de jours. */
    browseDay = clamp(browseDay, 0, LEVELS[browseLevel].days.length - 1);
    renderDays();
  }

  /* Le choix manuel fait autorité : une séance en cours ailleurs n'a plus
     lieu d'être, elle imposerait sa propre suite au moment du bilan. */
  function applyDays() {
    var p = state.prog;
    var moved = p.level !== browseLevel || p.day !== browseDay;

    p.level = browseLevel;
    p.day = browseDay;
    if (moved && p.session) {
      p.session = null;
      stopRestTick();
    }

    commit();
    closeDays();
    toast('Prochaine séance : jour ' + (browseDay + 1) + ' · ' + LEVELS[browseLevel].name + '.');
  }

  function renderProgAdmin() {
    var p = state.prog;
    if (p.mode === null) {
      el.progAdmin.textContent = 'Aucun niveau défini pour l’instant.';
      return;
    }
    el.progAdmin.textContent = 'Niveau ' + (p.level + 1) + ' · ' + levelOf(p).name +
      ' · jour ' + (p.day + 1) + ' sur ' + levelOf(p).days.length +
      (p.test === null ? '' : ' · test : ' + fmt(p.test) + ' traction' + plural(p.test));
  }

  function renderAdmin() {
    if (document.activeElement !== el.goalInput) el.goalInput.value = String(state.goal);
    disarmReset();
    el.resetBtn.disabled = state.sets.length === 0;

    /* La date déjà choisie ne bouge pas : on rattrape souvent deux séries de
       suite sur la même journée. */
    el.backDate.max = todayISO();
    if (!el.backDate.value) el.backDate.value = todayISO();
  }

  function render() {
    renderToday();
    renderRecords();
    renderJournal();
    renderChart();
    renderEntry();
    renderProgram();
    renderEmomCard();
    renderProgAdmin();
    renderAdmin();
    if (!el.dayPage.hidden) renderDay();
    if (!el.sessionPage.hidden) renderSession();
    if (!el.emomPage.hidden) renderEmomSession();
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
    var set = { id: uid(), date: iso, reps: reps, kg: loadKg, ts: Date.now(), src: 'libre' };

    state.sets.push(set);
    freshPillId = set.id;
    commit();

    var crossed = state.goal > 0 && before < state.goal && before + reps >= state.goal;
    celebrate(reps, crossed);
    toast(crossed
      ? 'Série enregistrée, objectif franchi !'
      : 'Série enregistrée' + (loadKg > 0 ? ' à +' + loadKg + ' kg.' : '.'));
  }

  /* ------------------------------------------------ programme : actions */

  var restTimer = null;

  /* Le compte à rebours n'est qu'un affichage. L'état n'est réécrit qu'au
     moment précis où le repos s'achève, dans watchRest. */
  function tickRest() {
    var s = state.prog.session;
    if (!s || !s.until) return;
    var total = LEVELS[s.level].rest * 1000;
    var left = Math.max(0, s.until - Date.now());
    el.restClock.textContent = clockText(left);
    el.restRing.style.setProperty('--rest', clamp(1 - left / total, 0, 1).toFixed(3));
  }

  function watchRest() {
    var s = state.prog.session;
    if (!s || !s.until) { stopRestTick(); return; }
    if (s.until > Date.now()) { tickRest(); return; }

    s.until = 0;
    stopRestTick();
    commit();
    ready();
    announceSet(s);
  }

  /* Le repos vient de se terminer tout seul : dire laquelle vient, et son
     objectif. Passer le repos à la main n'annonce rien, on sait ce qu'on fait. */
  function announceSet(s) {
    var day = LEVELS[s.level].days[s.day];
    var i = s.reps.length;
    if (i >= day.sets.length) return;
    flash('Repos terminé', 'Série ' + (i + 1) + ' sur ' + day.sets.length +
      ' · objectif ' + targetLabel(day.sets[i]));
  }

  function startRestTick() { if (!restTimer) restTimer = setInterval(watchRest, 250); }
  function stopRestTick() { if (restTimer) { clearInterval(restTimer); restTimer = null; } }

  /* Le repos vient de finir : un signal visuel, l'écran n'est pas forcément
     sous les yeux. */
  function ready() {
    if (calm || el.stepSet.hidden) return;
    el.stepSet.classList.remove('is-ready');
    void el.stepSet.offsetWidth;
    el.stepSet.classList.add('is-ready');
    setTimeout(function () { el.stepSet.classList.remove('is-ready'); }, 1400);
  }

  function setMode(mode) {
    state.prog.mode = mode;
    commit();
  }

  function startSession() {
    var p = state.prog;
    if (!p.session) {
      p.session = { level: p.level, day: p.day, reps: [], until: 0 };
      commit();
    }
    openSession();
  }

  /* Une série du programme est une série comme une autre : elle nourrit le
     journal, les records et l'évolution. */
  function validateSet() {
    var s = state.prog.session;
    if (!s) return;

    var day = LEVELS[s.level].days[s.day];
    if (s.reps.length >= day.sets.length) return;

    var reps = int(el.sessReps.value, 0, MAX_REPS, 0);
    if (reps < 1) {
      toast('Indique au moins 1 traction.');
      el.sessReps.focus();
      return;
    }

    var iso = todayISO();
    var before = totalFor(iso);
    state.sets.push({ id: uid(), date: iso, reps: reps, kg: 0, ts: Date.now(), src: 'programme' });

    s.reps.push(reps);
    /* Pas de repos après la dernière série : la séance est finie. */
    s.until = s.reps.length < day.sets.length
      ? Date.now() + LEVELS[s.level].rest * 1000
      : 0;

    commit();

    if (state.goal > 0 && before < state.goal && before + reps >= state.goal) {
      toast('Série enregistrée, objectif du jour franchi !');
    }
  }

  function skipRest() {
    var s = state.prog.session;
    if (!s || !s.until) return;
    s.until = 0;
    stopRestTick();
    commit();
  }

  /* Fin de séance : objectif rempli, on avance d'un jour — et de niveau au
     bout du cycle. Objectif manqué, le même jour revient. */
  function finishSession() {
    var p = state.prog;
    var s = p.session;
    if (!s) return;

    var lvl = LEVELS[s.level];
    var day = lvl.days[s.day];
    var ok = sessionOk(s, day);

    p.last = { date: todayISO(), level: s.level, day: s.day, ok: ok };
    p.done = todayISO();
    p.session = null;

    var levelled = false;
    if (ok) {
      if (s.day < lvl.days.length - 1) {
        p.level = s.level;
        p.day = s.day + 1;
      } else if (s.level < LAST_LEVEL) {
        p.level = s.level + 1;
        p.day = 0;
        levelled = true;
      } else {
        p.level = s.level;
        p.day = s.day;                 /* dernier cycle : on reste sur place */
      }
    } else {
      p.level = s.level;
      p.day = s.day;
    }

    commit();
    closeSession();
    toast(levelled
      ? 'Cycle terminé : niveau ' + (p.level + 1) + ' · ' + LEVELS[p.level].name + ' !'
      : ok ? 'Séance validée.' : 'Séance manquée : ce jour est à refaire.');
  }

  function quitSession() {
    state.prog.session = null;
    stopRestTick();
    commit();
    closeSession();
    toast('Séance abandonnée.');
  }

  /* ------------------------------------------------------ EMOM : actions */

  var emomTimer = null;

  function readEmomReps() { return int(el.emomInput.value, 0, MAX_REPS, 0); }

  /* Le chrono n'est qu'un affichage : il compte le temps qui reste sur la
     minute en cours, que l'on soit en train de tirer ou de souffler. */
  function tickEmom() {
    var s = state.emom.session;
    if (!s) return;
    var left = EMOM_MINUTE - ((Date.now() - s.start) % EMOM_MINUTE);
    el.emomClock.textContent = clockText(left);
    el.emomRing.style.setProperty('--rest', (1 - left / EMOM_MINUTE).toFixed(3));
  }

  /* Le chrono mène : chaque minute écoulée ferme sa série, validée ou non.
     Celle qui vient de s'achever prend le nombre affiché, les minutes
     entièrement passées à côté prennent l'objectif. */
  function watchEmom() {
    var s = state.emom.session;
    if (!s) { stopEmomTick(); return; }

    var minute = emomMinute(s);
    var upto = Math.min(minute, s.rounds);
    var changed = false;

    while (s.done.length < upto) {
      var justEnded = s.done.length === upto - 1 && upto === minute;
      logRound(justEnded ? readEmomReps() : s.reps);
      changed = true;
    }

    if (changed) { commit(); return; }

    /* La minute peut tourner sans rien fermer : une série validée en avance
       attend la suivante. Le chrono seul ne rend pas la main à la saisie,
       c'est ici que l'écran doit changer. */
    var waiting = s.done.length > minute && s.done.length < s.rounds;
    if (waiting === el.emomWait.hidden) { renderEmomSession(); return; }

    tickEmom();
  }

  function startEmomTick() { if (!emomTimer) emomTimer = setInterval(watchEmom, 250); }
  function stopEmomTick() { if (emomTimer) { clearInterval(emomTimer); emomTimer = null; } }

  /* Une minute d'EMOM est une série comme une autre : elle part au journal. */
  function logRound(reps) {
    var s = state.emom.session;
    s.done.push(clamp(reps, 0, MAX_REPS));
    if (reps < 1) return;
    state.sets.push({
      id: uid(), date: todayISO(), reps: clamp(reps, 1, MAX_REPS),
      kg: 0, ts: Date.now(), src: 'emom'
    });
  }

  function startEmom() {
    var e = state.emom;
    if (!e.session) {
      e.session = { reps: e.reps, rounds: e.rounds, start: Date.now(), done: [] };
      commit();
    }
    openEmom();
  }

  function validateRound() {
    var s = state.emom.session;
    if (!s || s.done.length >= s.rounds) return;
    /* Série déjà validée pour cette minute : on ne la compte pas deux fois. */
    if (s.done.length > emomMinute(s)) return;

    logRound(readEmomReps());
    commit();
  }

  function finishEmom() {
    state.emom.session = null;
    stopEmomTick();
    commit();
    closeEmom();
    toast('EMOM terminé.');
  }

  /* Arrêt en cours de route : les séries déjà faites restent au journal. */
  function quitEmom() {
    state.emom.session = null;
    stopEmomTick();
    commit();
    closeEmom();
    toast('EMOM arrêté.');
  }

  function setEmom(key, value) {
    state.emom[key] = clamp(value, 1, key === 'rounds' ? MAX_ROUNDS : MAX_REPS);
    commit();
  }

  /* Le record de départ fixe le cycle et pose la progression à son premier
     jour. L'app s'ouvre sur le programme, qui découle directement du chiffre
     qui vient d'être donné ; la bascule de Training mène au reste. */
  function applyTest() {
    var score = int(el.setupScore.value, 0, MAX_REPS, 0);
    var p = state.prog;
    p.test = score;
    p.level = levelForScore(score);
    p.day = 0;
    p.done = null;
    p.last = null;
    p.session = null;
    p.mode = 'programme';
    stopRestTick();
    closeSetup();
    commit();
    toast('Cycle ' + (p.level + 1) + ' · ' + LEVELS[p.level].name + '. À toi de jouer.');
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

  /* ------------------------------------------------- la série rattrapée

     Une séance oubliée se rattrape depuis l'administration : la date, le
     nombre, la charge. Elle entre au journal comme une série libre.        */

  function backNote(text, isError) {
    el.backMsg.textContent = text;
    el.backMsg.classList.toggle('is-error', !!isError);
    el.backMsg.hidden = false;
  }

  /* Une série rattrapée se range à la fin de sa journée : midi, ou juste après
     la dernière déjà enregistrée ce jour-là. */
  function pastStamp(iso) {
    if (iso === todayISO()) return Date.now();
    var stamp = fromISO(iso).getTime() + 12 * 3600000;
    var sets = setsFor(iso);
    for (var i = 0; i < sets.length; i++) {
      if (sets[i].ts >= stamp) stamp = sets[i].ts + 60000;
    }
    return stamp;
  }

  function addPastSet() {
    var iso = el.backDate.value;

    if (!isValidISO(iso)) {
      backNote('Choisis une date pour la série.', true);
      el.backDate.focus();
      return;
    }
    if (iso > todayISO()) {
      backNote('Cette date n’est pas encore arrivée.', true);
      el.backDate.focus();
      return;
    }

    var reps = int(el.backReps.value, 0, MAX_REPS, 0);
    if (reps < 1) {
      backNote('Indique au moins 1 traction.', true);
      el.backReps.focus();
      return;
    }

    var kg = int(el.backKg.value, 0, MAX_KG, 0);
    state.sets.push({ id: uid(), date: iso, reps: reps, kg: kg, ts: pastStamp(iso), src: 'libre' });
    commit();

    var count = setsFor(iso).length;
    backNote(fmt(reps) + ' traction' + plural(reps) + (kg > 0 ? ' à +' + kg + ' kg' : '') +
      ' ajoutée' + plural(reps) + ' au ' + longDate(iso) + ' · ' +
      count + ' série' + plural(count) + ' ce jour-là.', false);
    toast('Série ajoutée au ' + longDate(iso) + '.');
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
      /* Les fichiers d'avant la charge (version 1) et d'avant le programme
         (version 2) restent lisibles. */
      var fileVersion = parsed.version === undefined ? SCHEMA : Number(parsed.version);
      if (!(fileVersion >= 1 && fileVersion <= SCHEMA && fileVersion === Math.floor(fileVersion))) {
        resetImport();
        showBackupNote('Fichier invalide : version « ' + parsed.version + ' » inconnue, ' +
          'versions 1 à ' + SCHEMA + ' acceptées.', true);
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

      pendingImport = {
        sets: result.sets,
        goal: normalizeGoal(parsed.goal),
        /* Un fichier d'avant le programme n'en porte pas : le remplacement
           laissera alors la progression en place. */
        prog: parsed.prog ? normalizeProg(parsed.prog) : null,
        emom: parsed.emom ? normalizeEmom(parsed.emom) : null
      };
      var msg = result.sets.length + ' série' + plural(result.sets.length) + ' lue' +
        plural(result.sets.length) + ', objectif ' + pendingImport.goal + '.';
      if (fileVersion === 1) msg += ' Fichier sans charge : les séries sont reprises à 0 kg.';
      if (pendingImport.prog) msg += ' Le fichier porte une progression de programme.';
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
    if (pendingImport.prog) {
      state.prog = pendingImport.prog;
      stopRestTick();
    }
    if (pendingImport.emom) {
      state.emom = pendingImport.emom;
      stopEmomTick();
    }
    resetImport();
    showBackupNote('Historique remplacé : ' + count + ' série' + plural(count) + '.', false);
    commit();
    if (state.prog.mode === null) openSetup();
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
    var dayOpen = openDay !== null && setsFor(openDay).length > 0;
    /* Une séance ne s'ouvre que si elle existe : une adresse copiée-collée
       ne fabrique pas d'entraînement. */
    var sessionOpen = location.hash === '#seance' && state.prog.session !== null;
    var emomOpen = location.hash === '#emom' && state.emom.session !== null;
    var daysOpen = location.hash === '#jours';

    el.dayPage.hidden = !dayOpen;
    el.sessionPage.hidden = !sessionOpen;
    el.emomPage.hidden = !emomOpen;
    el.daysPage.hidden = !daysOpen;
    lockBody();

    /* L'annonce n'a de sens que sur la séance qui l'a déclenchée. */
    if (!sessionOpen && !emomOpen) hideFlash();

    if (daysOpen) {
      renderDays();
      window.scrollTo(0, 0);
    }

    if (dayOpen) {
      renderDay();
      el.dayBack.focus();
      window.scrollTo(0, 0);
    } else {
      openDay = null;
    }

    if (sessionOpen) {
      renderSession();
      window.scrollTo(0, 0);
    } else {
      stopRestTick();
    }

    if (emomOpen) {
      renderEmomSession();
      window.scrollTo(0, 0);
    } else {
      stopEmomTick();
    }
  }

  function lockBody() {
    document.body.classList.toggle('is-locked',
      !el.dayPage.hidden || !el.sessionPage.hidden || !el.emomPage.hidden ||
      !el.daysPage.hidden || !el.setupPage.hidden);
  }

  function openDayPage(date) {
    history.pushState({ day: date }, '', '#jour=' + date);
    syncRoute();
  }

  function closeDayPage() {
    if (dayFromHash()) history.back();
  }

  function openSession() {
    history.pushState({ session: true }, '', '#seance');
    syncRoute();
  }

  function closeSession() {
    hideFlash();
    if (location.hash === '#seance') history.back();
    else syncRoute();
  }

  function openEmom() {
    /* Reprendre une séance déjà entamée ne doit pas annoncer une minute que
       l'on est en train de vivre : on part de là où elle en est. */
    emomFlashed = state.emom.session ? state.emom.session.done.length : -1;
    history.pushState({ emom: true }, '', '#emom');
    syncRoute();
  }

  function closeEmom() {
    hideFlash();
    emomFlashed = -1;
    if (location.hash === '#emom') history.back();
    else syncRoute();
  }

  function openDays() {
    /* On ouvre là où en est le programme. */
    browseLevel = clamp(state.prog.level, 0, LAST_LEVEL);
    browseDay = clamp(state.prog.day, 0, LEVELS[browseLevel].days.length - 1);
    history.pushState({ days: true }, '', '#jours');
    syncRoute();
    el.daysBack.focus();
  }

  function closeDays() {
    if (location.hash === '#jours') history.back();
    else syncRoute();
  }

  /* L'accueil ne passe pas par l'adresse : c'est un passage obligé au premier
     lancement, le bouton retour ne doit pas pouvoir l'esquiver. */
  function openSetup() {
    el.setupScore.value = String(state.prog.test === null ? 8 : state.prog.test);
    el.setupPage.hidden = false;
    lockBody();
    window.scrollTo(0, 0);
  }

  function closeSetup() {
    el.setupPage.hidden = true;
    lockBody();
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
    periodOffset = 0;              /* changer d'échelle ramène au présent */
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

  el.periodPrev.addEventListener('click', function () { stepPeriod(1); });
  el.periodNext.addEventListener('click', function () { stepPeriod(-1); });

  el.flash.addEventListener('click', hideFlash);

  el.journal.addEventListener('click', function (e) {
    var day = e.target.closest('[data-day]');
    if (day) openDayPage(day.dataset.day);
  });

  el.dayBack.addEventListener('click', closeDayPage);
  window.addEventListener('popstate', syncRoute);

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!el.dayPage.hidden) closeDayPage();
    else if (!el.sessionPage.hidden) closeSession();
    else if (!el.emomPage.hidden) closeEmom();
    else if (!el.daysPage.hidden) closeDays();
  });

  /* ---------------------------------------------- programme : écouteurs */

  el.modeBtns.forEach(function (btn, i) {
    btn.addEventListener('click', function () { setMode(btn.dataset.mode); });
    btn.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      var next = el.modeBtns[(i + (e.key === 'ArrowRight' ? 1 : -1) + el.modeBtns.length) %
        el.modeBtns.length];
      setMode(next.dataset.mode);
      next.focus();
    });
  });

  el.startBtn.addEventListener('click', startSession);
  el.sessionBack.addEventListener('click', closeSession);
  el.validateSet.addEventListener('click', validateSet);
  el.skipRest.addEventListener('click', skipRest);
  el.finishSession.addEventListener('click', finishSession);
  el.quitSession.addEventListener('click', quitSession);

  el.sessReps.addEventListener('input', function () {
    var cleaned = el.sessReps.value.replace(/\D/g, '').slice(0, 3);
    if (cleaned !== el.sessReps.value) el.sessReps.value = cleaned;
  });
  el.sessReps.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); validateSet(); }
  });

  $('sessDec').addEventListener('click', function () {
    el.sessReps.value = String(clamp(int(el.sessReps.value, 0, MAX_REPS, 0) - 1, 0, MAX_REPS));
  });
  $('sessInc').addEventListener('click', function () {
    el.sessReps.value = String(clamp(int(el.sessReps.value, 0, MAX_REPS, 0) + 1, 0, MAX_REPS));
  });

  /* --------------------------------------------------- EMOM : écouteurs */

  el.startEmom.addEventListener('click', startEmom);
  el.emomBack.addEventListener('click', closeEmom);
  el.emomLog.addEventListener('click', validateRound);
  el.emomFinish.addEventListener('click', finishEmom);
  el.emomQuit.addEventListener('click', quitEmom);

  el.emomInput.addEventListener('input', function () {
    var cleaned = el.emomInput.value.replace(/\D/g, '').slice(0, 3);
    if (cleaned !== el.emomInput.value) el.emomInput.value = cleaned;
  });
  el.emomInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); validateRound(); }
  });

  $('emomDec').addEventListener('click', function () {
    el.emomInput.value = String(clamp(readEmomReps() - 1, 0, MAX_REPS));
  });
  $('emomInc').addEventListener('click', function () {
    el.emomInput.value = String(clamp(readEmomReps() + 1, 0, MAX_REPS));
  });

  el.emomReps.addEventListener('input', function () {
    var cleaned = el.emomReps.value.replace(/\D/g, '').slice(0, 3);
    if (cleaned !== el.emomReps.value) el.emomReps.value = cleaned;
    var n = parseInt(cleaned, 10);
    if (isFinite(n) && n >= 1) setEmom('reps', n);
  });
  el.emomReps.addEventListener('blur', function () { el.emomReps.value = String(state.emom.reps); });

  el.emomRounds.addEventListener('input', function () {
    var cleaned = el.emomRounds.value.replace(/\D/g, '').slice(0, 2);
    if (cleaned !== el.emomRounds.value) el.emomRounds.value = cleaned;
    var n = parseInt(cleaned, 10);
    if (isFinite(n) && n >= 1) setEmom('rounds', n);
  });
  el.emomRounds.addEventListener('blur', function () { el.emomRounds.value = String(state.emom.rounds); });

  $('emomRepsDec').addEventListener('click', function () { setEmom('reps', state.emom.reps - 1); });
  $('emomRepsInc').addEventListener('click', function () { setEmom('reps', state.emom.reps + 1); });
  $('emomRoundsDec').addEventListener('click', function () { setEmom('rounds', state.emom.rounds - 1); });
  $('emomRoundsInc').addEventListener('click', function () { setEmom('rounds', state.emom.rounds + 1); });

  el.setupScore.addEventListener('input', function () {
    var cleaned = el.setupScore.value.replace(/\D/g, '').slice(0, 3);
    if (cleaned !== el.setupScore.value) el.setupScore.value = cleaned;
  });
  el.setupScore.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); applyTest(); }
  });

  $('setupDec').addEventListener('click', function () {
    el.setupScore.value = String(clamp(int(el.setupScore.value, 0, MAX_REPS, 0) - 1, 0, MAX_REPS));
  });
  $('setupInc').addEventListener('click', function () {
    el.setupScore.value = String(clamp(int(el.setupScore.value, 0, MAX_REPS, 0) + 1, 0, MAX_REPS));
  });

  el.setupGo.addEventListener('click', applyTest);

  /* ------------------------------- programme : écran des jours */

  el.pickDays.addEventListener('click', openDays);
  el.daysBack.addEventListener('click', closeDays);
  el.daysApply.addEventListener('click', applyDays);
  el.levelPrev.addEventListener('click', function () { stepLevel(-1); });
  el.levelNext.addEventListener('click', function () { stepLevel(1); });

  el.dayList.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-day]');
    if (!btn) return;
    browseDay = int(btn.dataset.day, 0, LEVELS[browseLevel].days.length - 1, 0);
    renderDays();
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

  /* ------------------------------------- administration : série rattrapée */

  function stepBack(input, n, hi) {
    input.value = String(clamp(int(input.value, 0, hi, 0) + n, 0, hi));
  }

  el.backReps.addEventListener('input', function () {
    var cleaned = el.backReps.value.replace(/\D/g, '').slice(0, 3);
    if (cleaned !== el.backReps.value) el.backReps.value = cleaned;
  });
  el.backKg.addEventListener('input', function () {
    var cleaned = el.backKg.value.replace(/\D/g, '').slice(0, 3);
    if (cleaned !== el.backKg.value) el.backKg.value = cleaned;
  });
  el.backReps.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); addPastSet(); }
  });

  $('backRepsDec').addEventListener('click', function () { stepBack(el.backReps, -1, MAX_REPS); });
  $('backRepsInc').addEventListener('click', function () { stepBack(el.backReps, 1, MAX_REPS); });
  $('backKgDec').addEventListener('click', function () { stepBack(el.backKg, -5, MAX_KG); });
  $('backKgInc').addEventListener('click', function () { stepBack(el.backKg, 5, MAX_KG); });

  el.backAdd.addEventListener('click', addPastSet);

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

  /* La hauteur de la coque colle à celle que le navigateur déclare. innerHeight
     ne bouge pas quand le clavier s'ouvre sur iOS, contrairement au viewport
     visuel : l'app ne saute donc pas pendant la saisie. */
  function fitApp() {
    var h = window.innerHeight;
    if (h > 0) document.documentElement.style.setProperty('--app-h', h + 'px');
  }

  fitApp();
  window.addEventListener('resize', fitApp);
  window.addEventListener('orientationchange', fitApp);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', fitApp);

  /* ------------------------------------------------------------ démarrage */

  /* Un lancement part toujours de l'écran d'ajout, jamais d'une page profonde. */
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);

  var dayStamp = todayISO();
  el.goalInput.value = String(state.goal);
  render();

  /* Première connexion : le niveau se choisit avant toute chose. */
  if (state.prog.mode === null) openSetup();

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
