(function(){
  var section = document.querySelector('[data-graph-section]');
  if (!section) return;
  function onScroll(){
    var maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    var progress = maxScroll > 0 ? window.scrollY / maxScroll : 0;
    if (window.graph && typeof window.graph.setCameraFromScroll === 'function') {
        window.graph.setCameraFromScroll(progress);
        var intro = document.querySelector('.constellation__intro');
        if (intro) {
            var scale = 1 - (progress * 0.5);
            intro.style.setProperty('--intro-scale', scale);
        }
    }
  }
  window.addEventListener('scroll', onScroll);
  onScroll();
})();
