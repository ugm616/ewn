// ============================================================
// GRAND SLAAM TOURNAMENT — SITE CONFIG
// ============================================================
// Edit this file to point the live stream / live chat at your
// StreamYard-backed YouTube broadcast.
// ============================================================

window.SITE_CONFIG = {
  // The YouTube video ID of the live broadcast.
  // (If empty, the site tries to read "tournament.live.videoId"
  // from data/fights.json instead.)
  liveVideoId: "",

  // YouTube Data API v3 key — REQUIRED for the live chat reader.
  // 1. Go to https://console.cloud.google.com/apis/
  // 2. Enable "YouTube Data API v3"
  // 3. Create an API key, paste it below.
  // Leave empty to hide the live chat until the key is added.
  youTubeApiKey: "",

  // How often (ms) to poll YouTube for new chat messages.
  // YouTube enforces a minimum of ~5 seconds.
  chatPollInterval: 6000,

  // Max chat messages kept on screen.
  chatMaxMessages: 200
};
