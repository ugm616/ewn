// ============================================================
// DATA LAYER — loads data/fights.json + data/results.json at
// runtime so the site updates whenever either JSON is refreshed,
// no rebuild needed.
// ============================================================

const DataStore = {
  _data: null,
  _results: null,
  _listeners: [],

  async load() {
    if (this._data) return this._data;
    const [fightsRes, resultsRes] = await Promise.all([
      fetch("data/fights.json", { cache: "no-cache" }),
      fetch("data/results.json", { cache: "no-cache" })
    ]);
    if (!fightsRes.ok) throw new Error(`Failed to load fights.json (${fightsRes.status})`);
    this._data = await fightsRes.json();
    this._results = resultsRes.ok ? await resultsRes.json() : { results: [] };
    if (!Array.isArray(this._results.results)) this._results.results = [];
    this._notify();
    return this._data;
  },

  // Force re-fetch (used when the JSON is updated on the server).
  async reload() {
    this._data = null;
    this._results = null;
    return this.load();
  },

  tournament() {
    return this._data?.tournament || null;
  },

  teams() {
    return this._data?.teams || [];
  },

  team(id) {
    return this.teams().find((t) => t.id === id) || null;
  },

  // Get a specific member of a team.
  member(teamId, memberId) {
    const t = this.team(teamId);
    return t ? t.members.find((m) => m.id === memberId) || null : null;
  },

  fights() {
    return this._data?.fights || [];
  },

  fight(id) {
    return this.fights().find((f) => f.id === id) || null;
  },

  // The next upcoming / in-progress fight, or null.
  nextFight() {
    const live = this.fights().find((f) => f.status === "live");
    if (live) return live;
    const upcoming = this.fights().filter((f) => f.status === "scheduled");
    return upcoming.length ? upcoming[0] : null;
  },

  liveVideoId() {
    const cfg = window.SITE_CONFIG || {};
    if (cfg.liveVideoId) return cfg.liveVideoId;
    return this.tournament()?.live?.videoId || "";
  },

  // ------------------------------------------------------------
  // RESULTS / ELIMINATION
  // ------------------------------------------------------------

  results() {
    return this._results?.results || [];
  },

  // Result (or null) for a fight, keyed by fight id.
  resultFor(fightId) {
    return this.results().find((r) => r.fightId === fightId) || null;
  },

  // A set of member ids wrapped per-team: "teamId::memberId"
  _eliminatedMap() {
    if (this._elimCache) return this._elimCache;
    const map = new Set();
    for (const r of this.results()) {
      if (r.loser) map.add(`${r.loser}`);
    }
    this._elimCache = map;
    return map;
  },

  // The member ids who have LOST a fight (eliminated from tournament).
  // Returns a Set of member ids.
  eliminatedMemberIds() {
    return this._eliminatedMap();
  },

  // True when a member has lost = eliminated (picture shown greyscale).
  isMemberEliminated(memberId) {
    return !!memberId && this._eliminatedMap().has(memberId);
  },

  // Number of eliminated members within a team.
  teamEliminatedCount(teamId) {
    const t = this.team(teamId);
    if (!t) return 0;
    return t.members.filter((m) => this.isMemberEliminated(m.id)).length;
  },

  // True when ALL members of a team have been eliminated.
  isTeamEliminated(teamId) {
    const t = this.team(teamId);
    if (!t || !t.members.length) return false;
    return t.members.every((m) => this.isMemberEliminated(m.id));
  },

  // All fully-eliminated teams.
  eliminatedTeams() {
    return this.teams().filter((t) => this.isTeamEliminated(t.id));
  },

  onChange(fn) {
    this._listeners.push(fn);
  },

  _notify() {
    this._listeners.forEach((fn) => fn(this._data));
  }
};