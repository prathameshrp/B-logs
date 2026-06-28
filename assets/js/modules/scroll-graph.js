(function(){
  var section = document.querySelector('[data-graph-section]');
  if (!section) return;
  var wrapper = document.getElementById('timeline-wrapper');
  function onScroll(){
    var progress = 0;
    if (wrapper) {
      var scrollTop = window.scrollY || document.documentElement.scrollTop;
      var trackHeight = wrapper.offsetHeight - window.innerHeight;
      progress = trackHeight > 0 ? scrollTop / trackHeight : 0;
      progress = Math.max(0, Math.min(1, progress));
    }
    if (window.graph && typeof window.graph.setCameraFromScroll === 'function') {
        window.graph.setCameraFromScroll(progress);
        var intro = document.querySelector('.constellation__intro');
        if (intro) {
            var fadeProgress = Math.min(1, progress / 0.08);
            var scale = 1 - (fadeProgress * 0.12);
            var tz = fadeProgress * -600;
            var opacity = 1 - fadeProgress;
            intro.style.setProperty('--intro-scale', scale);
            intro.style.setProperty('--intro-translate-z', tz + 'px');
            intro.style.opacity = opacity;
            // Prevent pointer events once text is faded out
            intro.style.pointerEvents = opacity > 0.05 ? 'auto' : 'none';
        }
    }
  }
  window.addEventListener('scroll', onScroll);
  onScroll();
})();
