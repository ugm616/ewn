// ============================================================
// HASH ROUTER + PAGE TEMPLATES
// Renders pages into #app with a dramatic "curtain" transition
// between routes. Fights are 1v1 (one member per company) and
// results come from data/results.json.
// ============================================================

const Router = {
  routes: {},
  current: null,

  add(path, handler) {
    this.routes[path] = handler;
  },

  init() {
    window.addEventListener("hashchange", () => this.handle());
    this.handle();
  },

  async handle() {
    const hash = window.location.hash.replace(/^#/, "") || "/";
    const [pathPart, ...rest] = hash.split("?");
    const segments = pathPart.split("/").filter(Boolean); // e.g. ["fight","qf1"]

    let route = segments.length ? "/" + segments[0] : "/";
    let params = { id: segments[1] || null };

    // Try exact match first, then wildcard "fight/:id" style.
    let handler = this.routes[route];
    if (!handler && segments.length > 1) {
      const dynamic = Object.keys(this.routes).find((r) => r.startsWith(route + "/"));
      if (dynamic) {
        handler = this.routes[dynamic];
        route = dynamic;
      }
    }
    if (!handler) handler = this.routes["/404"] || this.routes["/"];

    await DataStore.load().catch(() => {});

    // Animated transition: exit -> swap -> enter
    this._transitionOut().then(() => {
      const app = document.getElementById("app");
      const html = handler.call(this, params);
      app.innerHTML = html;
      app.scrollTop = 0;
      window.scrollTo(0, 0);
      this.current = route;
      this._markActive(route);
      this._bootPage(route, params);
      this._transitionIn();
      if (app.focus) app.focus();
    });
  },

  navigate(path) {
    window.location.hash = path;
  },

  _markActive(route) {
    document.querySelectorAll(".nav-link").forEach((a) => {
      const r = a.getAttribute("data-route");
      a.classList.toggle("is-active", route === r || (route.startsWith("/fight") && r === "/schedule"));
    });
  },

  _bootPage(route, params) {
    if (route === "/live") {
      this._bootLive();
    } else if (route === "/fight/:id" && params.id) {
      this._bootFight(params.id);
    }
  },

  // ---- Transition machinery -----------------------------------

  _transitionOut() {
    const t = document.getElementById("transition");
    return new Promise((resolve) => {
      t.classList.add("is-closing");
      setTimeout(() => {
        t.classList.remove("is-closing");
        resolve();
      }, 320);
    });
  },

  _transitionIn() {
    const t = document.getElementById("transition");
    t.classList.add("is-flash");
    setTimeout(() => t.classList.remove("is-flash"), 260);
  },

  // ---- Shared helpers -----------------------------------------

  _statusBadge(fight) {
    const map = {
      live: `<span class="badge badge--live"><span class="badge-pulse"></span>LIVE NOW</span>`,
      scheduled: `<span class="badge badge--scheduled">UPCOMING</span>`,
      completed: `<span class="badge badge--completed">COMPLETED</span>`
    };
    // A fight with a recorded result is completed even if the JSON says scheduled.
    const status = DataStore.resultFor(fight && fight.id) && fight.status !== "live" ? "completed" : fight.status;
    return (fight && map[status]) || map.scheduled;
  },

  // ---- PAGES --------------------------------------------------

  home() {
    const t = DataStore.tournament();
    const teams = DataStore.teams();
    const fights = DataStore.fights();
    const next = DataStore.nextFight();

    const teamA = next ? DataStore.team(next.teamA) : null;
    const teamB = next ? DataStore.team(next.teamB) : null;
    const fighterA = next ? DataStore.member(next.teamA, next.fighterA) : null;
    const fighterB = next ? DataStore.member(next.teamB, next.fighterB) : null;

    return `
      <section class="hero">
        <div class="hero-beams"></div>
        <div class="hero-inner">
          <p class="hero-kick">${this._esc(t.hero.kick)}</p>
          <h1 class="hero-title">${this._esc(t.hero.title)}</h1>
          <p class="hero-sub">${this._esc(t.hero.subtitle)}</p>
          <div class="hero-actions">
            <a href="#/live" class="btn btn--gold btn--lg">WATCH LIVE</a>
            <a href="#/schedule" class="btn btn--ghost btn--lg">FULL SCHEDULE</a>
          </div>
        </div>
      </section>

      ${this._eliminatedAlerts()}

      ${next && teamA && teamB && fighterA && fighterB ? `
      <section class="next-fight">
        <div class="section-head">
          <h2 class="section-title">NEXT BOUT</h2>
          <a href="#/fight/${next.id}" class="btn btn--ghost btn--sm">VIEW FIGHT CARD →</a>
        </div>
        <a href="#/fight/${next.id}" class="next-card">
          <div class="next-team next-team--a" style="--tc:${teamA.color}">
            <span class="next-flag">${teamA.flag}</span>
            <span class="next-name">${this._esc(fighterA.name)}</span>
            <span class="next-team-label">${this._esc(teamA.short)}</span>
          </div>
          <div class="next-vs"><span>VS</span></div>
          <div class="next-team next-team--b" style="--tc:${teamB.color}">
            <span class="next-team-label">${this._esc(teamB.short)}</span>
            <span class="next-name">${this._esc(fighterB.name)}</span>
            <span class="next-flag">${teamB.flag}</span>
          </div>
        </a>
        <div class="next-meta">
          <span>${this._esc(next.round)}</span>
          ${this._statusBadge(next)}
        </div>
      </section>` : ""}

      <section class="companies">
        <div class="section-head">
          <h2 class="section-title">THE COMPANIES</h2>
          <a href="#/teams" class="btn btn--ghost btn--sm">ALL TEAMS →</a>
        </div>
        <div class="companies-grid">
          ${teams.slice(0, 4).map((team) => this._companyCard(team)).join("")}
        </div>
      </section>

      <section class="lineup">
        <div class="section-head">
          <h2 class="section-title">TOURNAMENT LINEUP</h2>
          <a href="#/schedule" class="btn btn--ghost btn--sm">FULL SCHEDULE →</a>
        </div>
        <div class="lineup-grid">
          ${fights.slice(0, 3).map((f) => this._fightMini(f)).join("")}
        </div>
      </section>
    `;
  },

  tournament() {
    const t = DataStore.tournament();
    return `
      <section class="page-hero">
        <p class="hero-kick">THE TOURNAMENT</p>
        <h1 class="page-title">${this._esc(t.name)} ${this._esc(t.year)}</h1>
        <p class="page-sub">${this._esc(t.info.rules)}</p>
      </section>

      ${this._eliminatedAlerts()}

      <section class="info-grid">
        <div class="info-card">
          <span class="info-card__label">DATE</span>
          <span class="info-card__value">${this._esc(t.info.date)}</span>
        </div>
        <div class="info-card">
          <span class="info-card__label">VENUE</span>
          <span class="info-card__value">${this._esc(t.info.venue)}</span>
        </div>
        <div class="info-card">
          <span class="info-card__label">FORMAT</span>
          <span class="info-card__value">1v1 SINGLE ELIMINATION</span>
        </div>
        <div class="info-card">
          <span class="info-card__label">ELIMINATED</span>
          <span class="info-card__value">${DataStore.teams().reduce((n, t) => n + DataStore.teamEliminatedCount(t.id), 0)} ATHLETES</span>
        </div>
      </section>

      <section class="bracket">
        <h2 class="section-title">THE BRACKET</h2>
        <div class="bracket-grid">
          ${DataStore.fights()
            .slice()
            .sort((a, b) => (a.roundIndex || 0) - (b.roundIndex || 0))
            .map((f) => this._bracketCell(f))
            .join("")}
        </div>
      </section>
    `;
  },

  teams() {
    return `
      <section class="page-hero">
        <p class="hero-kick">THE COMPANIES</p>
        <h1 class="page-title">TEAMS</h1>
        <p class="page-sub">Four athletes from each company. Lose and you're eliminated — grey out.</p>
      </section>
      <section class="teams-list">
        ${DataStore.teams()
          .map(
            (team) => `${this._teamAlert(team)}
          <article class="team-card${DataStore.isTeamEliminated(team.id) ? " team-card--eliminated" : ""}" style="--tc:${team.color}">
            <header class="team-card__head">
              <span class="team-flag team-flag--lg">${team.flag}</span>
              <div>
                <h3 class="team-card__name">${this._esc(team.name)}</h3>
                <p class="team-card__motto">${this._esc(team.motto)}</p>
              </div>
              <span class="team-card__status">${this._teamStatusLabel(team)}</span>
            </header>
            <div class="roster">
              ${team.members
                .map(
                  (m) => `
                <div class="roster-item${DataStore.isMemberEliminated(m.id) ? " roster-item--eliminated" : ""}">
                  <span class="roster-item__avatar${DataStore.isMemberEliminated(m.id) ? " is-eliminated" : ""}">${this._esc(m.name.charAt(0))}</span>
                  <div class="roster-item__info">
                    <span class="roster-item__name">${this._esc(m.name)}</span>
                    <span class="roster-item__nick">"${this._esc(m.nickname)}"</span>
                    <span class="roster-item__meta">${this._esc(m.role)} · ${this._esc(m.record)}</span>
                  </div>
                  ${DataStore.isMemberEliminated(m.id) ? `<span class="elim-tag">ELIMINATED</span>` : ""}
                </div>`
                )
                .join("")}
            </div>
          </article>`
          )
          .join("")}
      </section>
    `;
  },

  schedule() {
    const fights = DataStore.fights().slice().sort((a, b) => (a.roundIndex || 0) - (b.roundIndex || 0));
    return `
      <section class="page-hero">
        <p class="hero-kick">ALL EVENTS</p>
        <h1 class="page-title">SCHEDULE</h1>
        <p class="page-sub">Every bout of the Grand Slaam tournament.</p>
      </section>
      ${this._eliminatedAlerts()}
      <section class="schedule-list">
        ${fights.map((f) => this._fightRow(f)).join("")}
      </section>
    `;
  },

  fight({ id }) {
    const fight = DataStore.fight(id);
    if (!fight) return this._notFound("Fight not found.");

    const teamA = DataStore.team(fight.teamA);
    const teamB = DataStore.team(fight.teamB);
    const fighterA = DataStore.member(fight.teamA, fight.fighterA);
    const fighterB = DataStore.member(fight.teamB, fight.fighterB);
    if (!teamA || !teamB || !fighterA || !fighterB) return this._notFound("Fight data incomplete.");

    const result = DataStore.resultFor(fight.id);
    const winnerFighter = result ? (result.winner === fighterA.id ? fighterA : fighterB) : null;
    const winnerTeam = result ? (result.winner === fighterA.id ? teamA : teamB) : null;

    return `
      <section class="vs" id="vsCard">
        <div class="vs-glow"></div>
        <div class="vs-round">${this._esc(fight.round)}</div>
        <div class="vs-teams">
          <div class="vs-team vs-team--a" style="--tc:${teamA.color}">
            <span class="vs-flag">${teamA.flag}</span>
            <span class="vs-name">${this._esc(fighterA.name)}</span>
            <span class="vs-full">"${this._esc(fighterA.nickname)}" · ${this._esc(teamA.short)}</span>
            ${DataStore.isMemberEliminated(fighterA.id) ? `<span class="elim-tag">ELIMINATED</span>` : ""}
          </div>
          <div class="vs-center">
            <span class="vs-logo"><img src="assets/logo.svg" alt="" /></span>
            <span class="vs-word">VS</span>
          </div>
          <div class="vs-team vs-team--b" style="--tc:${teamB.color}">
            <span class="vs-full">${this._esc(teamB.short)} · "${this._esc(fighterB.nickname)}"</span>
            <span class="vs-name">${this._esc(fighterB.name)}</span>
            <span class="vs-flag">${teamB.flag}</span>
            ${DataStore.isMemberEliminated(fighterB.id) ? `<span class="elim-tag">ELIMINATED</span>` : ""}
          </div>
        </div>
        <div class="vs-meta">
          ${this._statusBadge(fight)}
          <span>${this._esc(fight.date)}</span>
          <span>${this._esc(fight.venue)}</span>
        </div>
        ${fight.status === "live" ? `<a href="#/live" class="btn btn--gold">WATCH LIVE →</a>` : ""}
        ${result && winnerFighter && winnerTeam ? `
          <div class="vs-result">
            <span class="vs-result__winner" style="--tc:${winnerTeam.color}">
              WINNER — ${this._esc(winnerFighter.name)} (${this._esc(winnerTeam.short)})
            </span>
            <span class="vs-result__method">${this._esc(result.method)} · ${this._esc(result.time)} · ${this._esc(result.date)}</span>
          </div>` : ""}
      </section>

      ${this._teamAlert(teamA)}
      ${this._teamAlert(teamB)}

      <section class="lineups">
        <div class="lineup-side">
          <div class="lineup-side__head" style="--tc:${teamA.color}">
            <span class="team-flag team-flag--lg">${teamA.flag}</span>
            <h3>${this._esc(teamA.name)}</h3>
          </div>
          <div class="lineup-side__list">
            ${teamA.members.map((m) => this._memberCard(m)).join("")}
          </div>
        </div>
        <div class="lineup-vs">VS</div>
        <div class="lineup-side">
          <div class="lineup-side__head" style="--tc:${teamB.color}">
            <span class="team-flag team-flag--lg">${teamB.flag}</span>
            <h3>${this._esc(teamB.name)}</h3>
          </div>
          <div class="lineup-side__list">
            ${teamB.members.map((m) => this._memberCard(m)).join("")}
          </div>
        </div>
      </section>

      <div class="fight-nav">
        <button class="btn btn--ghost" data-back>← BACK</button>
        <a href="#/schedule" class="btn btn--ghost">SCHEDULE</a>
      </div>
    `;
  },

  live() {
    const t = DataStore.tournament();
    return `
      <section class="live-page">
        <div class="live-main">
          <div class="player-wrap">
            <div class="player" id="livePlayer" data-video="${this._esc(DataStore.liveVideoId())}"></div>
            <div class="live-titlebar">
              <span class="badge badge--live"><span class="badge-pulse"></span>LIVE</span>
              <h1 class="live-title">${this._esc(t.live.label)}</h1>
            </div>
          </div>
        </div>
        <aside class="chat-panel">
          <div class="chat-panel__head">
            <span class="badge badge--live"><span class="badge-pulse"></span>LIVE CHAT</span>
          </div>
          <div class="chat-messages" id="chatMessages" aria-live="polite"></div>
          <div class="chat-panel__foot">COMMENTS VIA STREAMYARD / YOUTUBE</div>
        </aside>
      </section>
    `;
  },

  contact() {
    return `
      <section class="page-hero">
        <p class="hero-kick">GET IN TOUCH</p>
        <h1 class="page-title">CONTACT</h1>
        <p class="page-sub">Questions, bookings, or media enquiries.</p>
      </section>
      <section class="contact-grid">
        <form class="contact-form" onsubmit="return false">
          <label>Name<input type="text" name="name" required /></label>
          <label>Email<input type="email" name="email" required /></label>
          <label>Message<textarea name="message" rows="5" required></textarea></label>
          <button type="submit" class="btn btn--gold">SEND</button>
          <p class="form-note">Demo form — wire up your email/backend as needed.</p>
        </form>
        <div class="contact-info">
          <div class="info-card"><span class="info-card__label">EMAIL</span><span class="info-card__value">hello@grandslaam.com</span></div>
          <div class="info-card"><span class="info-card__label">TWITTER / X</span><span class="info-card__value">@GrandSlaam</span></div>
          <div class="info-card"><span class="info-card__label">PROMOTION</span><span class="info-card__value">StreamYard Events</span></div>
        </div>
      </section>
    `;
  },

  notFound() {
    return this._notFound("Page not found.");
  },

  _notFound(msg) {
    return `
      <section class="page-hero">
        <p class="hero-kick">404</p>
        <h1 class="page-title">NOT FOUND</h1>
        <p class="page-sub">${this._esc(msg)}</p>
        <div class="hero-actions">
          <a href="#/" class="btn btn--gold">GO HOME</a>
        </div>
      </section>
    `;
  },

  // ---- Elimination / alert helpers ----------------------------

  _teamAlert(team) {
    if (!team || !DataStore.isTeamEliminated(team.id)) return "";
    return `
      <div class="elim-alert" style="--tc:${team.color}">
        <span class="team-flag">${team.flag}</span>
        <span class="elim-alert__title">${this._esc(team.short)} — ELIMINATED</span>
        <span class="elim-alert__sub">All ${team.members.length} members eliminated from the tournament.</span>
      </div>
    `;
  },

  _eliminatedAlerts() {
    return DataStore.eliminatedTeams().map((t) => this._teamAlert(t)).join("");
  },

  _teamStatusLabel(team) {
    const total = team.members.length;
    const elim = DataStore.teamEliminatedCount(team.id);
    const standing = total - elim;
    if (DataStore.isTeamEliminated(team.id)) return `<span class="status-pill status-pill--out">OUT</span>`;
    return `<span class="status-pill status-pill--in">${standing}/${total} STANDING</span>`;
  },

  // ---- Partial templates --------------------------------------

  _companyCard(team) {
    return `
      <a class="company-card${DataStore.isTeamEliminated(team.id) ? " company-card--elim" : ""}" href="#/teams" style="--tc:${team.color}">
        ${DataStore.isTeamEliminated(team.id) ? `<span class="company-card__elim">ELIMINATED</span>` : ""}
        <span class="company-card__flag">${team.flag}</span>
        <span class="company-card__name">${this._esc(team.short)}</span>
        <span class="company-card__full">${this._esc(team.name)}</span>
        <span class="company-card__country">${this._esc(team.country)}</span>
      </a>
    `;
  },

  _fightMini(f) {
    const a = DataStore.team(f.teamA);
    const b = DataStore.team(f.teamB);
    const fa = DataStore.member(f.teamA, f.fighterA);
    const fb = DataStore.member(f.teamB, f.fighterB);
    if (!a || !b || !fa || !fb) return "";
    return `
      <a class="fight-mini" href="#/fight/${f.id}">
        <div class="fight-mini__row">
          <span class="team-flag">${a.flag}</span>
          <span class="fight-mini__name">${this._esc(fa.name)}</span>
          <span class="fight-mini__vs">VS</span>
          <span class="fight-mini__name">${this._esc(fb.name)}</span>
          <span class="team-flag">${b.flag}</span>
        </div>
        <div class="fight-mini__sub">${this._esc(a.short)} · ${this._esc(b.short)}</div>
        <div class="fight-mini__foot">
          <span>${this._esc(f.round)}</span>
          ${this._statusBadge(f)}
        </div>
      </a>
    `;
  },

  _fightRow(f) {
    const a = DataStore.team(f.teamA);
    const b = DataStore.team(f.teamB);
    const fa = DataStore.member(f.teamA, f.fighterA);
    const fb = DataStore.member(f.teamB, f.fighterB);
    if (!a || !b || !fa || !fb) return "";
    const result = DataStore.resultFor(f.id);
    return `
      <a class="fight-row" href="#/fight/${f.id}">
        <span class="fight-row__round">${this._esc(f.round)}</span>
        <span class="fight-row__teams">
          <span class="team-flag">${a.flag}</span>
          <span class="fight-row__name">${this._esc(fa.name)}</span>
          <span class="fight-row__team">${this._esc(a.short)}</span>
          <span class="fight-row__vs">VS</span>
          <span class="fight-row__team">${this._esc(b.short)}</span>
          <span class="fight-row__name">${this._esc(fb.name)}</span>
          <span class="team-flag">${b.flag}</span>
        </span>
        <span class="fight-row__meta">${this._esc(f.date)} · ${this._esc(f.venue)}</span>
        ${result ? `<span class="fight-row__result">${this._esc(result.method)}</span>` : this._statusBadge(f)}
      </a>
    `;
  },

  _bracketCell(f) {
    const a = DataStore.team(f.teamA);
    const b = DataStore.team(f.teamB);
    const fa = DataStore.member(f.teamA, f.fighterA);
    const fb = DataStore.member(f.teamB, f.fighterB);
    if (!a || !b || !fa || !fb) return "";
    const result = DataStore.resultFor(f.id);
    return `
      <a class="bracket-cell" href="#/fight/${f.id}">
        <span class="bracket-cell__round">${this._esc(f.round)}</span>
        <span class="bracket-cell__team${result && result.winner === fa.id ? " is-winner" : ""}">${a.flag}${this._esc(fa.name)}</span>
        <span class="bracket-cell__team${result && result.winner === fb.id ? " is-winner" : ""}">${b.flag}${this._esc(fb.name)}</span>
      </a>
    `;
  },

  _memberCard(m) {
    const eliminated = DataStore.isMemberEliminated(m.id);
    return `
      <div class="member${eliminated ? " member--eliminated" : ""}">
        <span class="member__avatar${eliminated ? " is-eliminated" : ""}">${this._esc(m.name.charAt(0))}</span>
        <div class="member__info">
          <span class="member__name">${this._esc(m.name)}</span>
          <span class="member__nick">"${this._esc(m.nickname)}"</span>
          <span class="member__meta">${this._esc(m.height)} · ${this._esc(m.weight)}</span>
          <span class="member__meta">${this._esc(m.hometown)}</span>
        </div>
        <span class="member__role">${this._esc(m.role)}</span>
      </div>
    `;
  },

  // ---- Page boot logic ----------------------------------------

  _bootFight(id) {
    const card = document.getElementById("vsCard");
    if (card) card.classList.add("vs--reveal");
    const back = document.querySelector("[data-back]");
    if (back) back.addEventListener("click", () => window.history.back());
  },

  async _bootLive() {
    const videoId = DataStore.liveVideoId();
    const playerEl = document.getElementById("livePlayer");
    const chatEl = document.getElementById("chatMessages");
    if (playerEl && videoId) {
      await CustomPlayer.mount(playerEl, videoId, { isLive: true, autoplay: true });
    } else if (playerEl) {
      playerEl.innerHTML =
        `<div class="cp-error">NO VIDEO CONFIGURED<br/><small>Add a video ID in js/config.js or data/fights.json.</small></div>`;
    }
    if (chatEl) LiveChat.mount(chatEl, videoId);
  },

  _esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
};