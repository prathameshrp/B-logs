(function(){
  var section = document.querySelector('[data-graph-section]');
  if (!section) return;
  var wrapper = document.getElementById('timeline-wrapper');
  function onScroll(){
    var progress = 0;
    if (wrapper) {
      var rect = wrapper.getBoundingClientRect();
      var trackHeight = wrapper.offsetHeight - window.innerHeight;
      progress = trackHeight > 0 ? -rect.top / trackHeight : 0;
      progress = Math.max(0, Math.min(1, progress));
    }
    if (window.graph && typeof window.graph.setCameraFromScroll === 'function') {
        window.graph.setCameraFromScroll(progress);
        var intro = document.querySelector('.constellation__intro');
        if (intro) {
            var scale = Math.max(0, 1 - (progress * 1.5));
            var tz = progress * -500;
            var opacity = Math.max(0, 1 - (progress * 2.2));
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
