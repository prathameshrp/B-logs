// Animations: scroll-reveal, word rotator, terminal typing, count-up, TOC, tilt
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Scroll reveal ───────────────────────────────────────────
  var reveals = document.querySelectorAll('.reveal');
  if (reduce || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e, i) {
        if (e.isIntersecting) {
          var el = e.target;
          setTimeout(function () { el.classList.add('is-visible'); }, (i % 4) * 70);
          io.unobserve(el);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  }

  // ── Word rotator ────────────────────────────────────────────
  var rotator = document.querySelector('[data-rotator]');
  if (rotator && !reduce) {
    var words = [];
    try { words = JSON.parse(rotator.getAttribute('data-words')); } catch (e) {}
    var textEl = rotator.querySelector('.hero__rotator-text');
    if (words.length > 1 && textEl) {
      var wi = 0, ci = 0, deleting = false;
      function tick() {
        var word = words[wi];
        textEl.textContent = word.substring(0, ci);
        if (!deleting && ci < word.length) { ci++; }
        else if (!deleting && ci === word.length) { deleting = true; return setTimeout(tick, 1500); }
        else if (deleting && ci > 0) { ci--; }
        else { deleting = false; wi = (wi + 1) % words.length; }
        setTimeout(tick, deleting ? 45 : 95);
      }
      setTimeout(tick, 900);
    }
  }

  // ── Terminal typing ─────────────────────────────────────────
  var term = document.querySelector('[data-terminal]');
  if (term) {
    var lines = [];
    try { lines = JSON.parse(term.getAttribute('data-lines')); } catch (e) {}
    function isCmd(l) { return l.indexOf('$') === 0; }
    if (reduce) {
      term.innerHTML = lines.map(function (l) {
        return '<span class="' + (isCmd(l) ? 't-prompt' : 't-out') + '">' + escapeHtml(l) + '</span>';
      }).join('\n');
    } else {
      var li = 0, pos = 0;
      var cursor = document.createElement('span');
      cursor.className = 'terminal__cursor';
      function typeLine() {
        if (li >= lines.length) { return; }
        var line = lines[li];
        var span = term.querySelector('.t-current');
        if (!span) {
          span = document.createElement('span');
          span.className = 't-current ' + (isCmd(line) ? 't-prompt' : 't-out');
          term.appendChild(span);
          term.appendChild(cursor);
        }
        if (pos <= line.length) {
          span.textContent = line.substring(0, pos);
          pos++;
          setTimeout(typeLine, isCmd(line) ? 55 : 18);
        } else {
          span.classList.remove('t-current');
          term.insertBefore(document.createTextNode('\n'), cursor);
          li++; pos = 0;
          setTimeout(typeLine, 360);
        }
      }
      setTimeout(typeLine, 700);
    }
  }

  // ── Count-up stats ──────────────────────────────────────────
  var counters = document.querySelectorAll('[data-countup]');
  if (counters.length) {
    var cObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        var target = parseInt(el.getAttribute('data-target'), 10) || 0;
        var suffix = el.getAttribute('data-suffix') || '';
        if (reduce) { el.textContent = target + suffix; cObserver.unobserve(el); return; }
        var start = performance.now(), dur = 1400;
        function step(now) {
          var p = Math.min((now - start) / dur, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(target * eased) + suffix;
          if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
        cObserver.unobserve(el);
      });
    }, { threshold: 0.5 });
    counters.forEach(function (c) { cObserver.observe(c); });
  }

  // ── TOC build + scrollspy ───────────────────────────────────
  var tocList = document.querySelector('[data-toc-list]');
  var content = document.querySelector('[data-post-content]');
  if (tocList && content) {
    var headings = content.querySelectorAll('h2, h3');
    if (headings.length < 2) {
      var toc = document.querySelector('[data-toc]');
      if (toc) toc.style.display = 'none';
    } else {
      headings.forEach(function (h) {
        if (!h.id) h.id = h.textContent.toLowerCase().replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '');
        var a = document.createElement('a');
        a.href = '#' + h.id;
        a.textContent = h.textContent;
        if (h.tagName === 'H3') a.classList.add('toc--h3');
        tocList.appendChild(a);
      });
      var links = tocList.querySelectorAll('a');
      function updateActiveTOC() {
        var scrollPos = window.scrollY + 120;
        var activeHeading = null;
        for (var i = 0; i < headings.length; i++) {
          var h = headings[i];
          if (h.offsetTop <= scrollPos) {
            activeHeading = h;
          } else {
            break;
          }
        }
        if (!activeHeading && headings.length > 0) {
          activeHeading = headings[0];
        }
        if (activeHeading) {
          links.forEach(function (l) {
            l.classList.toggle('is-active', l.getAttribute('href') === '#' + activeHeading.id);
          });
        }
      }
      window.addEventListener('scroll', updateActiveTOC, { passive: true });
      updateActiveTOC();
    }
  }

  // ── Subtle tilt on hero terminal ────────────────────────────
  var tilt = document.querySelector('[data-tilt]');
  if (tilt && !reduce && window.matchMedia('(pointer:fine)').matches) {
    var card = tilt.querySelector('.terminal');
    tilt.addEventListener('mousemove', function (ev) {
      var r = tilt.getBoundingClientRect();
      var rx = ((ev.clientY - r.top) / r.height - 0.5) * -6;
      var ry = ((ev.clientX - r.left) / r.width - 0.5) * 8;
      card.style.transform = 'rotateX(' + rx + 'deg) rotateY(' + ry + 'deg)';
    });
    tilt.addEventListener('mouseleave', function () { card.style.transform = ''; });
  }

  // ── Self-drawing SVG diagrams ───────────────────────────────
  var diagrams = document.querySelectorAll('[data-draw]');
  if (diagrams.length) {
    diagrams.forEach(function (svg) {
      var strokes = svg.querySelectorAll('path, line, polyline, circle, rect, ellipse');
      strokes.forEach(function (el) {
        var len;
        try { len = el.getTotalLength ? el.getTotalLength() : 0; } catch (e) { len = 0; }
        if (!len) { len = 400; }
        el.style.strokeDasharray = len;
        el.style.strokeDashoffset = reduce ? 0 : len;
        el.dataset.len = len;
      });
      var fills = svg.querySelectorAll('[data-fade]');
      fills.forEach(function (el) { el.style.opacity = reduce ? 1 : 0; });
    });

    if (reduce || !('IntersectionObserver' in window)) {
      diagrams.forEach(playDiagram);
    } else {
      var dObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { playDiagram(e.target); dObs.unobserve(e.target); } });
      }, { threshold: 0.3 });
      diagrams.forEach(function (s) { dObs.observe(s); });
    }
  }
  function playDiagram(svg) {
    var strokes = svg.querySelectorAll('path, line, polyline, circle, rect, ellipse');
    strokes.forEach(function (el, i) {
      el.style.transition = 'stroke-dashoffset 1s var(--ease) ' + (i * 0.12) + 's';
      requestAnimationFrame(function () { el.style.strokeDashoffset = '0'; });
    });
    svg.querySelectorAll('[data-fade]').forEach(function (el, i) {
      el.style.transition = 'opacity .6s var(--ease) ' + (0.3 + i * 0.12) + 's';
      requestAnimationFrame(function () { el.style.opacity = '1'; });
    });
  }

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
})();
