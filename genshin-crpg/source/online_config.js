/* Production stays the default. The fixed-region API is opt-in for an explicit staging URL only. */
(function(){
  const staging=new URLSearchParams(location.search).get('server')==='seoul-staging';
  window.CRPG_ONLINE_CONFIG={
    apiBase:staging?'https://api-staging.clannad.shop/live':'https://genshin-crpg-online.jungsan765.workers.dev',
    environment:staging?'seoul-staging':'production'
  };
})();
