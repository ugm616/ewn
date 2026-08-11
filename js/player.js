// ============================================================
// CUSTOM YOUTUBE PLAYER
// Wraps the YouTube IFrame API in a fully skinned, Flash-style
// player: no visible YouTube chrome, custom play/pause, progress,
// volume, fullscreen and LIVE badge.
// ============================================================

const CustomPlayer = {
  _player: null,
  _el: null,
  _videoId: null,
  _isLive: false,
  _hideTimer: null,
  _progressTimer: null,

  // Load the YouTube IFrame API once.
  loadAPI() {
    if (window.YT && window.YT.Player) return Promise.resolve();
    return new Promise((resolve) => {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.async = true;
      const holder = document.getElementById("yt-api");
      (holder || document.body).appendChild(tag);
      window.onYouTubeIframeAPIReady = () => resolve();
    });
  },

  // Mount a custom player into containerEl.
  // containerEl should contain: .cp-stage (holds iframe) and the skin markup.
  async mount(containerEl, videoId, opts = {}) {
    if (!containerEl || !videoId) return null;
    await this.loadAPI();
    this._el = containerEl;
    this._videoId = videoId;
    this._isLive = !!opts.isLive;

    this._buildSkin();

    const stage = containerEl.querySelector(".cp-stage");
    this._player = new YT.Player(stage, {
      videoId,
      playerVars: {
        autoplay: opts.autoplay ? 1 : 0,
        playsinline: 1,
        rel: 0,
        controls: 0,
        disablekb: 1,
        iv_load_policy: 3,
        modestbranding: 1,
        showinfo: 0,
        origin: window.location.origin
      },
      events: {
        onReady: () => this._onReady(),
        onStateChange: (e) => this._onState(e.data),
        onError: () => this._onError()
      }
    });

    this._bindControls();
    return this;
  },

  _buildSkin() {
    this._el.classList.add("cp-mounted");
    this._el.innerHTML = `
      <div class="cp-stage"></div>
      <div class="cp-overlay">
        <button class="cp-big-play" type="button" aria-label="Play">
          <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>
        </button>
        <span class="cp-live-badge ${this._isLive ? "is-live" : ""}">${this._isLive ? "● LIVE" : ""}</span>
      </div>
      <div class="cp-controls">
        <div class="cp-progress">
          <div class="cp-progress-buffer"></div>
          <div class="cp-progress-fill"></div>
          <div class="cp-progress-thumb"></div>
        </div>
        <div class="cp-controls-row">
          <button class="cp-btn cp-play" type="button" aria-label="Play/Pause">
            <svg class="cp-ic-play" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>
            <svg class="cp-ic-pause" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" fill="currentColor"/></svg>
          </button>
          <span class="cp-time">
            <span class="cp-time-current">0:00</span><span class="cp-time-sep">/</span><span class="cp-time-total">0:00</span>
          </span>
          <span class="cp-status">${this._isLive ? "LIVE" : ""}</span>
          <div class="cp-spacer"></div>
          <div class="cp-volume">
            <button class="cp-btn cp-mute" type="button" aria-label="Mute">
              <svg class="cp-ic-vol" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05A4.5 4.5 0 0 0 16.5 12z" fill="currentColor"/></svg>
              <svg class="cp-ic-muted" viewBox="0 0 24 24"><path d="M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.9 8.9 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z" fill="currentColor"/></svg>
            </button>
            <div class="cp-volume-slider"><div class="cp-volume-fill"></div></div>
          </div>
          <button class="cp-btn cp-fullscreen" type="button" aria-label="Fullscreen">
            <svg class="cp-ic-fs" viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" fill="currentColor"/></svg>
            <svg class="cp-ic-fsx" viewBox="0 0 24 24"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" fill="currentColor"/></svg>
          </button>
        </div>
      </div>
    `;
  },

  _bindControls() {
    const el = this._el;

    el.querySelector(".cp-big-play").addEventListener("click", () => this.togglePlay());
    el.querySelector(".cp-play").addEventListener("click", () => this.togglePlay());
    el.querySelector(".cp-mute").addEventListener("click", () => this.toggleMute());

    // Click on the video itself toggles play.
    el.querySelector(".cp-stage").addEventListener("click", () => this.togglePlay());
    // Prevent double-toggle when clicking the big play overlay.
    el.querySelector(".cp-overlay").addEventListener("click", (e) => {
      if (e.target.closest(".cp-big-play")) e.stopPropagation();
    });

    // Progress scrubbing
    const bar = el.querySelector(".cp-progress");
    let dragging = false;
    const seekFromEvent = (e) => {
      const rect = bar.getBoundingClientRect();
      const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
      const dur = this._player.getDuration() || 1;
      this._player.seekTo(ratio * dur, true);
    };
    bar.addEventListener("mousedown", (e) => { dragging = true; seekFromEvent(e); });
    window.addEventListener("mousemove", (e) => { if (dragging) seekFromEvent(e); });
    window.addEventListener("mouseup", () => { dragging = false; });

    // Volume slider
    const vol = el.querySelector(".cp-volume-slider");
    vol.addEventListener("click", (e) => {
      const rect = vol.getBoundingClientRect();
      const v = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
      this.setVolume(v);
    });

    // Fullscreen
    const fsBtn = el.querySelector(".cp-fullscreen");
    fsBtn.addEventListener("click", () => this.toggleFullscreen());

    // Auto-hide controls
    const skin = el;
    const show = () => skin.classList.add("cp-idle") || skin.classList.remove("cp-hide");
    const scheduleHide = () => {
      clearTimeout(this._hideTimer);
      skin.classList.remove("cp-hide");
      if (!this._isLive) {
        this._hideTimer = setTimeout(() => skin.classList.add("cp-hide"), 2600);
      }
    };
    skin.addEventListener("mousemove", scheduleHide);
    skin.addEventListener("mouseleave", () => skin.classList.add("cp-hide"));
    scheduleHide();
  },

  _onReady() {
    this.setVolume(1);
    this._startProgress();
  },

  _onState(state) {
    const el = this._el;
    if (!el) return;
    if (state === YT.PlayerState.PLAYING) {
      el.classList.add("cp-playing");
      el.classList.remove("cp-paused");
      el.querySelector(".cp-big-play")?.classList.add("cp-hidden");
    } else {
      el.classList.remove("cp-playing");
      el.classList.add("cp-paused");
      if (state === YT.PlayerState.PAUSED) {
        el.querySelector(".cp-big-play")?.classList.remove("cp-hidden");
      }
    }
  },

  _onError() {
    const el = this._el;
    if (!el) return;
    el.querySelector(".cp-overlay").innerHTML = `
      <div class="cp-error">STREAM OFFLINE<br/><small>The live broadcast has not started or is unavailable.</small></div>
    `;
  },

  _startProgress() {
    clearInterval(this._progressTimer);
    this._progressTimer = setInterval(() => {
      if (!this._player || !this._el) return;
      const dur = this._player.getDuration() || 0;
      const cur = this._player.getCurrentTime() || 0;
      const pct = dur ? (cur / dur) * 100 : 0;
      this._el.querySelector(".cp-progress-fill").style.width = `${pct}%`;
      this._el.querySelector(".cp-progress-thumb").style.left = `${pct}%`;
      this._el.querySelector(".cp-time-current").textContent = this._fmt(cur);
      if (dur) this._el.querySelector(".cp-time-total").textContent = this._fmt(dur);
    }, 500);
  },

  togglePlay() {
    if (!this._player) return;
    const st = this._player.getPlayerState();
    if (st === YT.PlayerState.PLAYING) this._player.pauseVideo();
    else this._player.playVideo();
  },

  toggleMute() {
    if (!this._player) return;
    const muted = this._player.isMuted();
    this._player.setVolume(muted ? 100 : 0);
    this._el.classList.toggle("cp-muted", !muted);
  },

  setVolume(v) {
    if (!this._player) return;
    const clamped = Math.round(v * 100);
    this._player.setVolume(clamped);
    this._el.querySelector(".cp-volume-fill").style.width = `${clamped}%`;
    this._el.classList.toggle("cp-muted", clamped === 0);
  },

  toggleFullscreen() {
    const el = this._el;
    if (document.fullscreenElement) document.exitFullscreen();
    else if (el.requestFullscreen) el.requestFullscreen();
  },

  destroy() {
    clearInterval(this._progressTimer);
    clearTimeout(this._hideTimer);
    if (this._player) {
      this._player.destroy();
      this._player = null;
    }
    this._el = null;
  },

  _fmt(sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }
};
