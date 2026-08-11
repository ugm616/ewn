// ============================================================
// RESKINNED YOUTUBE LIVE CHAT
// Polls the YouTube Data API v3 liveChat/messages endpoint and
// renders a gold/black "flash-era" chat panel. The same messages
// StreamYard shows appear here, fully reskinned.
// ============================================================

const LiveChat = {
  _container: null,
  _videoId: null,
  _liveChatId: null,
  _timer: null,
  _nextPageToken: null,
  _seen: new Set(),
  _startedAt: 0,

  mount(container, videoId) {
    this.destroy();
    this._container = container;
    this._videoId = videoId;
    this._seen.clear();
    this._startedAt = 0;

    const cfg = window.SITE_CONFIG || {};
    if (!cfg.youTubeApiKey) {
      this._renderSetupNotice();
      return;
    }
    if (!videoId) {
      this._renderStatus("NO LIVE VIDEO CONFIGURED");
      return;
    }
    this._renderStatus("CONNECTING TO LIVE CHAT...");
    this._resolveChat().then((ok) => {
      if (ok) this._poll();
      else this._renderStatus("LIVE CHAT UNAVAILABLE");
    });
  },

  async _resolveChat() {
    const cfg = window.SITE_CONFIG;
    try {
      const url =
        `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails` +
        `&id=${encodeURIComponent(this._videoId)}&key=${encodeURIComponent(cfg.youTubeApiKey)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`API ${res.status}`);
      const json = await res.json();
      const details = json.items?.[0]?.liveStreamingDetails;
      if (!details || !details.liveChatId) return false;
      this._liveChatId = details.liveChatId;
      return true;
    } catch (err) {
      console.error("LiveChat resolve failed:", err);
      return false;
    }
  },

  async _poll() {
    const cfg = window.SITE_CONFIG;
    const base =
      `https://www.googleapis.com/youtube/v3/liveChat/messages?part=snippet,authorDetails` +
      `&liveChatId=${encodeURIComponent(this._liveChatId)}` +
      `&key=${encodeURIComponent(cfg.youTubeApiKey)}`;
    const first = this._nextPageToken ? `&pageToken=${encodeURIComponent(this._nextPageToken)}` : "";
    const url = base + first;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`API ${res.status}`);
      const json = await res.json();

      const messages = json.items || [];
      messages.forEach((m) => this._append(m));
      this._nextPageToken = json.nextPageToken || null;

      if (!this._startedAt) {
        this._startedAt = Date.now();
        this._renderStatus(null);
      }

      const interval = (json.pollingIntervalMillis && json.pollingIntervalMillis >= 5000)
        ? json.pollingIntervalMillis
        : cfg.chatPollInterval;
      this._timer = setTimeout(() => this._poll(), interval);
    } catch (err) {
      console.error("LiveChat poll failed:", err);
      this._timer = setTimeout(() => this._poll(), 15000);
    }
  },

  _append(msg) {
    const id = msg.id || `${msg.snippet?.publishedAt}-${Math.random()}`;
    if (this._seen.has(id)) return;
    this._seen.add(id);
    if (this._seen.size > 5000) {
      const first = this._seen.values().next().value;
      this._seen.delete(first);
    }

    const snippet = msg.snippet || {};
    const author = msg.authorDetails || {};
    const displayName = author.displayName || "Unknown";
    const text = (snippet.displayMessage || snippet.textMessageDetails?.messageText || "").trim();
    if (!text) return;

    const el = document.createElement("div");
    el.className = "chat-msg" + (author.isChatOwner ? " is-owner" : "") + (author.isChatModerator ? " is-mod" : "");
    el.innerHTML =
      `<span class="chat-msg__name" style="${this._badgeColor(displayName)}">${this._esc(displayName)}</span>` +
      `<span class="chat-msg__text">${this._esc(text)}</span>`;
    this._container.appendChild(el);
    this._prune();
    this._autoScroll();
  },

  _badgeColor(name) {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
    return `color:hsl(${h}, 70%, 62%);border-color:hsl(${h}, 70%, 62%)`;
  },

  _autoScroll() {
    const c = this._container;
    const nearBottom = c.scrollHeight - c.scrollTop - c.clientHeight < 180;
    if (nearBottom) c.scrollTop = c.scrollHeight;
  },

  _prune() {
    const max = (window.SITE_CONFIG || {}).chatMaxMessages || 200;
    while (this._container.children.length > max) {
      this._container.removeChild(this._container.firstChild);
    }
  },

  _renderStatus(text) {
    if (!this._container) return;
    this._container.innerHTML =
      `<div class="chat-status">${text ? `<span>${this._esc(text)}</span>` : ""}` +
      `<div class="chat-scanline"></div></div>`;
  },

  _renderSetupNotice() {
    if (!this._container) return;
    this._container.innerHTML = `
      <div class="chat-setup">
        <div class="chat-setup__title">LIVE CHAT OFFLINE</div>
        <div class="chat-setup__body">
          Add a <strong>YouTube Data API v3</strong> key to
          <code>js/config.js</code> (<code>youTubeApiKey</code>) to enable the
          reskinned live comments feed.<br/><br/>
          The broadcast must be live on YouTube via StreamYard for chat to appear.
        </div>
        <div class="chat-scanline"></div>
      </div>
    `;
  },

  destroy() {
    clearTimeout(this._timer);
    this._container = null;
    this._liveChatId = null;
    this._nextPageToken = null;
    this._seen.clear();
  },

  _esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
};
