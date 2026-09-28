/* Production keeps the deployed Worker; localhost is intentionally isolated. */
(function(){
  const local=/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  window.CRPG_ONLINE_CONFIG={
    apiBase:local?'http://127.0.0.1:8787':'https://genshin-crpg-online.jungsan765.workers.dev'
  };
})();
