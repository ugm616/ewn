// ============================================================
// APP BOOTSTRAP
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("year").textContent = new Date().getFullYear();

  // Register routes
  Router.add("/", Router.home);
  Router.add("/tournament", Router.tournament);
  Router.add("/teams", Router.teams);
  Router.add("/schedule", Router.schedule);
  Router.add("/fight/:id", Router.fight);
  Router.add("/live", Router.live);
  Router.add("/contact", Router.contact);
  Router.add("/404", Router.notFound);

  Router.init();

  // Mobile nav toggle
  const toggle = document.getElementById("navToggle");
  const menu = document.getElementById("mobileMenu");
  if (toggle && menu) {
    toggle.addEventListener("click", () => {
      const open = menu.classList.toggle("is-open");
      toggle.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      if (open) {
        const data = DataStore.tournament();
        menu.innerHTML = `
          <a href="#/" data-route="/" class="nav-link">Home</a>
          <a href="#/tournament" data-route="/tournament" class="nav-link">Tournament</a>
          <a href="#/teams" data-route="/teams" class="nav-link">Teams</a>
          <a href="#/schedule" data-route="/schedule" class="nav-link">Schedule</a>
          <a href="#/live" data-route="/live" class="nav-link">Live Stream</a>
          <a href="#/contact" data-route="/contact" class="nav-link">Contact</a>
        `;
        menu.querySelectorAll("a").forEach((a) =>
          a.addEventListener("click", () => {
            menu.classList.remove("is-open");
            toggle.classList.remove("is-open");
            toggle.setAttribute("aria-expanded", "false");
          })
        );
      }
    });
  }
});
