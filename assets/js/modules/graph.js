// Assassin's Creed 2 Database Menu & Helical Timeline stack in Three.js.
// Resolves physical drifting bugs by implementing a deterministic architectural timeline.
(function () {
  var section = document.querySelector('[data-graph-section]');
  var canvas = document.querySelector('[data-graph-canvas]');
  var dataEl = document.getElementById('graph-data');
  if (!section || !canvas || !dataEl || typeof THREE === 'undefined') return;

  var data;
  try { data = JSON.parse(dataEl.textContent); } catch (e) { return; }
  if (!data.nodes || !data.nodes.length) return;

  var tooltip = document.querySelector('[data-graph-tooltip]');
  var hint = document.querySelector('[data-graph-hint]');
  var linesSvg = document.querySelector('[data-graph-lines]');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Colors
  var COL = {};
  function cssVar(n, fb) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    return v || fb;
  }

  // Build model
  var nodes = data.nodes.map(function (n) {
    return {
      id: n.id, type: n.type, label: n.label, url: n.url, date: n.date,
      tags: n.tags || [], weight: n.weight || 1, excerpt: n.excerpt || '',
      x: 0, y: 0, z: 0
    };
  });
  
  var postsList = nodes.filter(function (n) { return n.type === 'post'; });
  
  // Arrange posts helical staircase
  postsList.forEach(function (p, index) {
    var ratio = index / (postsList.length - 1 || 1);
    p.timelineY = 85 - ratio * 170;
    p.timelineAngle = ratio * Math.PI * 0.85; // 3D spiral twist
    p.timelineRadius = 55;
    p.x = Math.sin(p.timelineAngle) * p.timelineRadius;
    p.y = p.timelineY;
    p.z = Math.cos(p.timelineAngle) * p.timelineRadius;
  });

  // Scene Setup
  var W = section.clientWidth, H = section.clientHeight;
  var scene = new THREE.Scene();
  var bgHex = cssVar('--bg', '#f5f2eb');
  scene.fog = new THREE.FogExp2(bgHex, 0.0022);

  var camera = new THREE.PerspectiveCamera(50, W / H, 1, 1500);
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W, H);
  renderer.shadowMap.enabled = true;

  var ambient = new THREE.AmbientLight(0xffffff, 0.65);
  scene.add(ambient);
  var dirLight = new THREE.DirectionalLight(0xffffff, 0.75);
  dirLight.position.set(100, 200, 50);
  dirLight.castShadow = true;
  scene.add(dirLight);

  var graphGroup = new THREE.Group();
  scene.add(graphGroup);

  // Background Guide Grid (Assassin's Creed scanner style)
  var gridGeom = new THREE.BufferGeometry();
  var gridPos = [];
  for (var gy = -250; gy <= 250; gy += 50) {
    gridPos.push(-300, gy, -100, 300, gy, -100);
  }
  for (var gx = -300; gx <= 300; gx += 60) {
    gridPos.push(gx, -250, -100, gx, 250, -100);
  }
  gridGeom.setAttribute('position', new THREE.Float32BufferAttribute(gridPos, 3));
  var gridMat = new THREE.LineBasicMaterial({
    color: new THREE.Color(cssVar('--text-mute', '#8c826c')),
    transparent: true,
    opacity: 0.12
  });
  var guideGrid = new THREE.LineSegments(gridGeom, gridMat);
  scene.add(guideGrid);

  // ── AC2 Background: Chand Bibi Mahal Silhouette + Stack Database Columns ──────
  var backgroundGroup = new THREE.Group();
  scene.add(backgroundGroup);

  var baseUrl = section.getAttribute('data-baseurl') || '/';
  if (!baseUrl.endsWith('/')) baseUrl += '/';

  // ── Chand Bibi Mahal silhouette (transparent PNG) ──────────────────────────
  var textureLoader = new THREE.TextureLoader();
  textureLoader.load(baseUrl + 'assets/img/mahal-silhouette.png', function(texture) {
    texture.colorSpace = THREE.SRGBColorSpace;
    // Wide panoramic plane matching the silhouette aspect ratio (~2:1)
    var mahalGeom = new THREE.PlaneGeometry(1000, 500);
    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    var mahalMat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: isDark ? 0.18 : 0.28,
      depthWrite: false,
      // Use NormalBlending so the transparent PNG alpha actually works
      blending: THREE.NormalBlending
    });
    var mahalMesh = new THREE.Mesh(mahalGeom, mahalMat);
    // Position at the bottom-center of the scene, deep in background
    mahalMesh.position.set(0, -30, -280);
    backgroundGroup.add(mahalMesh);
  });

  // ── 35 Database Stack Slat Columns (restored) ─────────────────────────────
  var bgSlatGeom = new THREE.BoxGeometry(45, 1.4, 8);
  var colConfigs = [];
  for (var c = 0; c < 35; c++) {
    colConfigs.push({
      x: (Math.random() - 0.5) * 650,
      z: -100 - Math.random() * 280,
      yOffset: (Math.random() - 0.5) * 140,
      count: Math.floor(Math.random() * 12) + 20 // 20 to 32 slats tall
    });
  }

  var isDarkTheme = document.documentElement.getAttribute('data-theme') === 'dark';
  var initialBgColor = isDarkTheme ? 0xffffff : 0x8c826c;

  colConfigs.forEach(function(cfg) {
    var colGroup = new THREE.Group();
    colGroup.position.set(cfg.x, cfg.yOffset, cfg.z);

    var dy = 13.5;
    var colAngle = Math.random() * Math.PI;
    for (var i = 0; i < cfg.count; i++) {
      var bgMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(initialBgColor),
        transparent: true,
        opacity: 0.28,
        roughness: 0.5,
        metalness: 0.1
      });
      var bgMesh = new THREE.Mesh(bgSlatGeom, bgMat);

      // Boundary chaos for off-screen drift
      var distFromCenter = Math.abs(i - cfg.count / 2);
      var factor = Math.pow(distFromCenter / (cfg.count / 2), 1.6);
      var chaosX = Math.sin(i * 0.6) * factor * 26;
      var chaosZ = Math.cos(i * 0.6) * factor * 26;

      bgMesh.position.set(chaosX, (i - cfg.count / 2) * dy, chaosZ);
      bgMesh.rotation.set(0.12, colAngle + i * 0.03 + Math.PI / 2 + factor * 0.55, 0.04);
      colGroup.add(bgMesh);
    }
    backgroundGroup.add(colGroup);
  });

  // ── Floating Stack / Stats Text Sprites ───────────────────────────────────
  var homeDataEl = document.getElementById('home-data');
  var homeData = null;
  if (homeDataEl) {
    try { homeData = JSON.parse(homeDataEl.textContent); } catch (e) {}
  }

  var floatingTexts = [];
  if (homeData) {
    if (homeData.stack) {
      homeData.stack.forEach(function(skill) { floatingTexts.push(skill); });
    }
    if (homeData.stats) {
      homeData.stats.forEach(function(s) { floatingTexts.push(s.value + s.suffix + ' ' + s.label); });
    }
  }

  var dataSprites = [];
  function createTextSprite(text, fontSize) {
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    ctx.font = fontSize + "px 'JetBrains Mono', monospace";
    var textWidth = ctx.measureText(text).width;
    canvas.width = textWidth + 40;
    canvas.height = fontSize * 1.5;
    ctx.font = fontSize + "px 'JetBrains Mono', monospace";
    ctx.fillStyle = cssVar('--text-mute', '#8c826c');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    var tex = new THREE.CanvasTexture(canvas);
    var spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.75 });
    var sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(canvas.width / 4, canvas.height / 4, 1);
    return sprite;
  }

  floatingTexts.forEach(function(txt, i) {
    var sprite = createTextSprite(txt, 32);
    var angle = (i / floatingTexts.length) * Math.PI * 2;
    var radius = 200 + Math.random() * 80;
    var yOffset = (Math.random() - 0.5) * 180;
    sprite.position.set(Math.cos(angle) * radius, yOffset, -200 + Math.sin(angle) * radius);
    sprite.userData = { angle: angle, radius: radius, speed: 0.0004 + Math.random() * 0.0008, yOffset: yOffset };
    backgroundGroup.add(sprite);
    dataSprites.push(sprite);
  });

  // Create 3D Box Slats for foreground active posts
  var slatGeom = new THREE.BoxGeometry(65, 2.0, 11);
  postsList.forEach(function (p) {
    var mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0xd8d4cb),
      roughness: 0.3,
      metalness: 0.4,
      transparent: true,
      opacity: 0.95
    });
    var mesh = new THREE.Mesh(slatGeom, mat);
    mesh.position.set(p.x, p.y, p.z);
    mesh.rotation.y = p.timelineAngle + Math.PI / 2;
    mesh.rotation.x = 0.12; // tilted
    mesh.rotation.z = 0.04;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { node: p };
    p.mesh = mesh;
    graphGroup.add(mesh);
  });

  function refreshColors() {
    COL.accent = cssVar('--accent', '#9a1823');
    COL.mute = cssVar('--text-mute', '#8c826c');
    COL.bg = cssVar('--bg', '#f5f2eb');
    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    COL.inactiveSlat = isDark ? '#363330' : '#d8d4cb';

    if (scene) {
      scene.fog.color.set(COL.bg);
      if (guideGrid) guideGrid.material.color.set(COL.mute);
      
      var bgVal = isDark ? 0xffffff : 0x8c826c;
      backgroundGroup.children.forEach(function (colGroup) {
        colGroup.children.forEach(function (mesh) {
          mesh.material.color.set(bgVal);
        });
      });

      postsList.forEach(function (p) {
        if (p === currentActivePost) {
          p.mesh.material.color.set(COL.accent);
          p.mesh.material.emissive.set(isDark ? '#4d080d' : '#3a0408');
        } else {
          p.mesh.material.color.set(COL.inactiveSlat);
          p.mesh.material.emissive.set('#000000');
        }
      });
    }
  }

  // Camera settings
  var theta = 0, phi = 0.15, radius = W < 700 ? 550 : 380;
  var targetTheta = theta, targetPhi = phi, targetRadius = radius;
  var cameraTarget = new THREE.Vector3(0, 0, 0);
  var targetCameraTarget = new THREE.Vector3(0, 0, 0);

  var dragging = false, moved = false, flightNode = null;
  var lastMousePos = { x: 0, y: 0 };
  var pointerParallax = { x: 0, y: 0, targetX: 0, targetY: 0 };

  // DOM Elements
  var detailsPanel = document.querySelector('[data-graph-details]');
  var detailsTitle = detailsPanel ? detailsPanel.querySelector('.details-title') : null;
  var detailsDate = detailsPanel ? detailsPanel.querySelector('.details-date') : null;
  var detailsExcerpt = detailsPanel ? detailsPanel.querySelector('.details-excerpt') : null;
  var detailsTags = detailsPanel ? detailsPanel.querySelector('.details-tags') : null;
  var detailsLink = detailsPanel ? detailsPanel.querySelector('.details-link') : null;
  var detailsCoords = detailsPanel ? detailsPanel.querySelector('[data-details-coords]') : null;
  var detailsImageContainer = detailsPanel ? detailsPanel.querySelector('[data-details-image-container]') : null;

  var menuEl = document.querySelector('[data-graph-menu]');
  var menuButtons = menuEl ? menuEl.querySelectorAll('.menu-item') : [];

  var currentActivePost = null;

  // Generate a deterministic placeholder SVG based on the post title
  function generatePlaceholderSVG(title) {
    var hash = 0;
    for (var i = 0; i < title.length; i++) {
      hash = ((hash << 5) - hash) + title.charCodeAt(i);
      hash |= 0;
    }
    var hue = Math.abs(hash % 40) + 340; // warm red-brown range
    var sat = 25 + Math.abs((hash >> 8) % 20);
    var shapes = '';
    for (var s = 0; s < 6; s++) {
      var sx = Math.abs((hash >> (s * 4)) % 420);
      var sy = Math.abs((hash >> (s * 3 + 2)) % 140);
      var sr = 15 + Math.abs((hash >> (s * 2 + 1)) % 30);
      shapes += '<circle cx="' + sx + '" cy="' + sy + '" r="' + sr + '" fill="hsl(' + ((hue + s * 25) % 360) + ',' + sat + '%,70%)" opacity="0.25"/>';
    }
    // Add a grid pattern overlay
    for (var g = 0; g < 420; g += 60) {
      shapes += '<line x1="' + g + '" y1="0" x2="' + g + '" y2="140" stroke="currentColor" stroke-width="0.5" opacity="0.08"/>';
    }
    for (var h = 0; h < 140; h += 35) {
      shapes += '<line x1="0" y1="' + h + '" x2="420" y2="' + h + '" stroke="currentColor" stroke-width="0.5" opacity="0.08"/>';
    }
    // Add title text
    shapes += '<text x="210" y="80" text-anchor="middle" font-family="var(--font-mono)" font-size="10" fill="currentColor" opacity="0.35" letter-spacing="0.15em">' + esc(title.toUpperCase().substring(0, 30)) + '</text>';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 140" style="color:var(--text-mute);background:var(--surface)">' + shapes + '</svg>';
  }

  function showDetailsForPost(post) {
    if (!post) {
      if (detailsPanel) detailsPanel.classList.remove('is-visible');
      currentActivePost = null;
      menuButtons.forEach(function (btn) { btn.classList.remove('is-active'); });
      refreshColors();
      return;
    }
    if (currentActivePost === post) return;
    currentActivePost = post;

    refreshColors(); // update slat colors immediately

    var activeIdx = postsList.indexOf(post);
    menuButtons.forEach(function (btn, bIdx) {
      btn.classList.toggle('is-active', bIdx === activeIdx);
    });

    if (detailsPanel) {
      detailsPanel.classList.add('is-visible');
      if (detailsTitle) detailsTitle.textContent = post.label;
      if (detailsDate) detailsDate.textContent = post.date || '';
      if (detailsExcerpt) detailsExcerpt.textContent = post.excerpt || '';
      if (detailsLink) detailsLink.href = post.url;
      if (detailsCoords) {
        detailsCoords.textContent = 'COORD: [' + Math.round(post.x) + ', ' + Math.round(post.y) + ', ' + Math.round(post.z) + ']';
      }
      // Populate image or placeholder
      if (detailsImageContainer) {
        if (post.image) {
          detailsImageContainer.innerHTML = '<img src="' + esc(post.image) + '" alt="' + esc(post.label) + '">';
        } else {
          detailsImageContainer.innerHTML = generatePlaceholderSVG(post.label);
        }
      }
      if (detailsTags) {
        detailsTags.innerHTML = '';
        (post.tags || []).forEach(function (tag) {
          var span = document.createElement('span');
          span.className = 'tag-pill';
          span.textContent = '#' + tag;
          detailsTags.appendChild(span);
        });
      }
    }
  }



  // Attach menu click handlers
  menuButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var idx = parseInt(this.getAttribute('data-menu-index'), 10);
      var progress = 0.12 + (idx / postsList.length) * 0.76;
      var wrapper = document.getElementById('timeline-wrapper');
      if (wrapper) {
        var trackHeight = wrapper.offsetHeight - window.innerHeight;
        var wrapperTop = window.scrollY + wrapper.getBoundingClientRect().top;
        window.scrollTo({
          top: wrapperTop + progress * trackHeight,
          behavior: 'smooth'
        });
      }
    });
  });

  window.graph = {
    setCameraFromScroll: function(progress) {
      // Show/hide menu based on progress to avoid initial overlap
      if (menuEl) {
        if (progress < 0.10) {
          menuEl.style.opacity = '0';
          menuEl.style.pointerEvents = 'none';
        } else {
          menuEl.style.opacity = '1';
          menuEl.style.pointerEvents = 'auto';
        }
      }

      if (progress < 0.12) {
        // Intro state
        targetCameraTarget.set(0, 0, 0);
        targetTheta = 0;
        targetPhi = 0.15;
        targetRadius = W < 700 ? 550 : 380;
        showDetailsForPost(null);
      } else if (progress > 0.88) {
        // Scroll limit state
        targetCameraTarget.set(0, 0, 0);
        targetTheta = (progress - 0.88) * Math.PI * 0.15; // minimal rotation
        targetPhi = 0.20;
        targetRadius = W < 700 ? 580 : 440;
        showDetailsForPost(null);
      } else {
        // Active posts timeline
        var subProgress = (progress - 0.12) / 0.76;
        subProgress = Math.max(0, Math.min(1, subProgress));
        var idx = Math.min(Math.floor(subProgress * postsList.length), postsList.length - 1);
        var post = postsList[idx];
        if (post) {
          showDetailsForPost(post);
          
          var targetPos = post.mesh.position.clone();
          // Offset camera to the right so slats appear on the left-center viewport next to index titles
          var rightX = Math.cos(targetTheta);
          var rightZ = -Math.sin(targetTheta);
          targetPos.x += rightX * 32;
          targetPos.z += rightZ * 32;
 
          targetCameraTarget.copy(targetPos);
          targetRadius = 135; // zoom in on slat
          targetTheta = post.timelineAngle + Math.PI / 3.5;
          targetPhi = 0.18;
        }
      }
    }
  };

  refreshColors();

  function updateConnectingLine() {
    if (!linesSvg) return;
    linesSvg.innerHTML = '';

    if (currentActivePost && detailsPanel && detailsPanel.classList.contains('is-visible')) {
      var vector = currentActivePost.mesh.position.clone();
      vector.project(camera);

      var x1 = (vector.x * 0.5 + 0.5) * W;
      var y1 = (-(vector.y * 0.5) + 0.5) * H;

      var activeBtn = menuEl ? menuEl.querySelector('.menu-item.is-active') : null;
      var menuAnchor = activeBtn ? activeBtn.querySelector('.menu-item-decor') : null;
      var detailsAnchor = detailsPanel ? detailsPanel.querySelector('.details-title') : null;

      if (menuAnchor && detailsAnchor) {
        var rectM = menuAnchor.getBoundingClientRect();
        var rectD = detailsAnchor.getBoundingClientRect();
        var parentRect = linesSvg.getBoundingClientRect();
        
        var xm = rectM.left - parentRect.left + rectM.width / 2;
        var ym = rectM.top - parentRect.top + rectM.height / 2;

        var xd = rectD.left - parentRect.left - 8;
        var yd = rectD.top - parentRect.top + rectD.height / 2;

        // Unified HUD Path: Left Menu -> 3D Slat -> Right Details Card
        var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 
          'M ' + xm + ' ' + ym + 
          ' L ' + (xm + 25) + ' ' + ym + 
          ' L ' + x1 + ' ' + y1 + 
          ' L ' + (xd - 25) + ' ' + yd + 
          ' L ' + xd + ' ' + yd
        );
        path.setAttribute('stroke', COL.accent);
        path.setAttribute('stroke-width', '1.5');
        path.setAttribute('fill', 'none');
        path.setAttribute('opacity', '0.75');
        linesSvg.appendChild(path);

        // Diamond at menu
        var diamondM = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        var dSize = 4.5;
        diamondM.setAttribute('points', 
          (xm - dSize) + ',' + ym + ' ' + xm + ',' + (ym - dSize) + ' ' + (xm + dSize) + ',' + ym + ' ' + xm + ',' + (ym + dSize)
        );
        diamondM.setAttribute('fill', COL.accent);
        linesSvg.appendChild(diamondM);

        // Diamond at details
        var diamondD = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        diamondD.setAttribute('points', 
          (xd - dSize) + ',' + yd + ' ' + xd + ',' + (yd - dSize) + ' ' + (xd + dSize) + ',' + yd + ' ' + xd + ',' + (yd + dSize)
        );
        diamondD.setAttribute('fill', COL.accent);
        linesSvg.appendChild(diamondD);
        
        // Pulsing dot at slat center
        var circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', x1);
        circle.setAttribute('cy', y1);
        circle.setAttribute('r', '4');
        circle.setAttribute('fill', COL.accent);
        linesSvg.appendChild(circle);
      }
    }
  }

  function updateCamera() {
    if (flightNode) {
      var targetPos = flightNode.mesh.position;
      targetCameraTarget.copy(targetPos);
      targetRadius = 135;
      targetTheta = Math.atan2(targetPos.x, targetPos.z);
      targetPhi = 0.18;
      
      var dist = camera.position.distanceTo(targetPos);
      if (dist < 150 && flightNode.url) {
        window.location.href = flightNode.url;
        flightNode = null;
      }
    }

    theta += (targetTheta - theta) * 0.07;
    phi += (targetPhi - phi) * 0.07;
    radius += (targetRadius - radius) * 0.07;
    cameraTarget.lerp(targetCameraTarget, 0.07);

    pointerParallax.x += (pointerParallax.targetX - pointerParallax.x) * 0.05;
    pointerParallax.y += (pointerParallax.targetY - pointerParallax.y) * 0.05;

    var currentTheta = theta + pointerParallax.x;
    var currentPhi = phi + pointerParallax.y;

    camera.position.x = cameraTarget.x + radius * Math.sin(currentTheta) * Math.cos(currentPhi);
    camera.position.y = cameraTarget.y + radius * Math.sin(currentPhi);
    camera.position.z = cameraTarget.z + radius * Math.cos(currentTheta) * Math.cos(currentPhi);
    camera.lookAt(cameraTarget);

    var intro = document.querySelector('.constellation__intro');
    if (intro) {
      var rx = -pointerParallax.y * 18;
      var ry = pointerParallax.x * 18;
      intro.style.setProperty('--intro-rotate-x', rx + 'deg');
      intro.style.setProperty('--intro-rotate-y', ry + 'deg');
    }
  }

  // Hover/Click events
  var mouse = new THREE.Vector2(-999, -999);
  var raycaster = new THREE.Raycaster();
  var hoverNode = null;

  function updateHover() {
    raycaster.setFromCamera(mouse, camera);
    var intersects = raycaster.intersectObjects(postsList.map(function (p) { return p.mesh; }));

    var nextHover = null;
    if (intersects.length > 0 && !flightNode) {
      nextHover = intersects[0].object.userData.node;
    }

    if (nextHover !== hoverNode) {
      hoverNode = nextHover;
      if (hoverNode && hint) hint.style.opacity = '0';
    }

    if (hoverNode && tooltip) {
      tooltip.hidden = false;
      tooltip.innerHTML = '<span class="tt-kind">STAR MODULE ACTIVE</span><strong>' + esc(hoverNode.label) + '</strong><span class="tt-meta">' + (hoverNode.tags || []).map(function (t) { return '#' + t; }).join(' ') + '</span><span class="tt-go">Expand database file &rarr;</span>';

      var vector = hoverNode.mesh.position.clone();
      vector.project(camera);
      var tx = (vector.x * 0.5 + 0.5) * W + 12;
      var ty = (-(vector.y * 0.5) + 0.5) * H + 12;
      
      var tw = tooltip.offsetWidth, th = tooltip.offsetHeight;
      if (tx + tw > W) tx -= tw + 24;
      if (ty + th > H) ty -= th + 24;
      tooltip.style.transform = 'translate(' + tx + 'px,' + ty + 'px)';
    } else if (tooltip) {
      tooltip.hidden = true;
    }
  }

  function onDown(e) {
    if (flightNode) return;
    var clientX = e.touches ? e.touches[0].clientX : e.clientX;
    var clientY = e.touches ? e.touches[0].clientY : e.clientY;
    dragging = true; moved = false;
    lastMousePos = { x: clientX, y: clientY };
  }

  function onMove(e) {
    var rect = canvas.getBoundingClientRect();
    var clientX = e.touches ? e.touches[0].clientX : e.clientX;
    var clientY = e.touches ? e.touches[0].clientY : e.clientY;

    mouse.x = ((clientX - rect.left) / W) * 2 - 1;
    mouse.y = -((clientY - rect.top) / H) * 2 + 1;

    pointerParallax.targetX = (clientX / window.innerWidth - 0.5) * 0.25;
    pointerParallax.targetY = (clientY / window.innerHeight - 0.5) * 0.25;

    if (dragging) {
      moved = true;
      var dx = clientX - lastMousePos.x;
      var dy = clientY - lastMousePos.y;
      targetTheta -= dx * 0.004;
      targetPhi = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, targetPhi + dy * 0.004));
      lastMousePos = { x: clientX, y: clientY };
    }
  }

  function onUp() {
    dragging = false;
    if (!moved && hoverNode) {
      if (currentActivePost === hoverNode) {
        flightNode = hoverNode;
      } else {
        var idx = postsList.indexOf(hoverNode);
        if (idx !== -1) {
          var progress = 0.12 + (idx / postsList.length) * 0.76;
          var wrapper = document.getElementById('timeline-wrapper');
          if (wrapper) {
            var trackHeight = wrapper.offsetHeight - window.innerHeight;
            var wrapperTop = window.scrollY + wrapper.getBoundingClientRect().top;
            window.scrollTo({
              top: wrapperTop + progress * trackHeight,
              behavior: 'smooth'
            });
          }
        }
      }
    }
  }

  canvas.addEventListener('mousedown', onDown);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  canvas.addEventListener('mouseleave', function () { dragging = false; mouse.set(-999, -999); });
  canvas.addEventListener('touchstart', onDown, { passive: true });
  canvas.addEventListener('touchmove', onMove, { passive: true });
  canvas.addEventListener('touchend', onUp);
  canvas.addEventListener('wheel', function (e) {
    if (flightNode) return;
    targetRadius = Math.max(100, Math.min(800, targetRadius + e.deltaY * 0.5));
  }, { passive: true });

  var resetBtn = document.querySelector('[data-graph-reset]');
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      flightNode = null;
      targetCameraTarget.set(0, 0, 0);
      targetRadius = W < 700 ? 550 : 380;
      targetTheta = 0; targetPhi = 0.15;
      showDetailsForPost(null);
    });
  }

  new MutationObserver(refreshColors).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  window.addEventListener('resize', function () {
    W = section.clientWidth; H = section.clientHeight;
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    renderer.setSize(W, H);
  });

  // ── Glitch Text Effect ──────────────────────────────────────
  var glitchTarget = document.querySelector('[data-glitch-target]');
  if (glitchTarget) {
    var phrases = [
      "a renaissance engineer",
      "an artist in code",
      "a design architect",
      "a history explorer",
      "a builder of worlds"
    ];
    var phraseIdx = 0;
    var chars = "$#@%&01ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    function triggerGlitch() {
      var nextPhrase = phrases[(phraseIdx + 1) % phrases.length];
      var length = Math.max(glitchTarget.textContent.length, nextPhrase.length);
      var current = glitchTarget.textContent;
      
      var frame = 0;
      var maxFrames = 10;
      var interval = setInterval(function () {
        var scrambled = "";
        for (var i = 0; i < length; i++) {
          if (Math.random() < frame / maxFrames) {
            scrambled += nextPhrase[i] || "";
          } else {
            scrambled += chars[Math.floor(Math.random() * chars.length)];
          }
        }
        glitchTarget.textContent = scrambled;
        frame++;
        if (frame > maxFrames) {
          clearInterval(interval);
          glitchTarget.textContent = nextPhrase;
          phraseIdx = (phraseIdx + 1) % phrases.length;
        }
      }, 45);
    }

    setInterval(triggerGlitch, 3500);
  }

  // ── Animus Loading Progress Driver ──────────────────────────
  var loaderEl = document.querySelector('[data-graph-loader]');
  var loaderBar = document.querySelector('[data-loader-bar]');
  var loaderPct = document.querySelector('[data-loader-pct]');
  var loaderStatus = document.querySelector('[data-loader-status]');
  
  if (loaderEl && loaderBar && loaderPct) {
    document.documentElement.classList.add('animus-loading');
    var pct = 0;
    var statusPhrases = [
      "ACCESSING MEMORY CORE...",
      "RETRIEVING DATA STRANDS...",
      "SYNCHRONIZING SIMULATION...",
      "COMPILING SHARD GRAPH...",
      "SYSTEM DECRYPTION SYNCED"
    ];
    
    var progressInterval = setInterval(function () {
      pct += Math.floor(Math.random() * 4) + 3; // increments by 3-6%
      if (pct >= 100) {
        pct = 100;
        clearInterval(progressInterval);
        if (loaderStatus) loaderStatus.textContent = statusPhrases[statusPhrases.length - 1];
        
        setTimeout(function () {
          loaderEl.classList.add('fade-out');
          document.documentElement.classList.remove('animus-loading');
          setTimeout(function() { loaderEl.style.display = 'none'; }, 600);
        }, 300);
      } else {
        loaderBar.style.width = pct + "%";
        loaderPct.textContent = pct + "%";
        if (loaderStatus) {
          var phraseIdx = Math.min(Math.floor((pct / 100) * (statusPhrases.length - 1)), statusPhrases.length - 2);
          loaderStatus.textContent = statusPhrases[phraseIdx];
        }
      }
    }, 38);
  }

  // Render Loop
  var running = true;
  function animate() {
    if (!running) return;

    // Slowly rotate/swivel inactive slats to keep universe breathing
    var time = Date.now() * 0.0004;
    postsList.forEach(function (p) {
      var targetScale = 1.0;
      var targetOffsetX = 0;
      var targetOffsetZ = 0;
      if (p === currentActivePost) {
        targetScale = 1.30; // highlight scale
        targetOffsetX = Math.sin(p.timelineAngle) * 16;
        targetOffsetZ = Math.cos(p.timelineAngle) * 16;
      }

      // Follow cursor parallax swivels and remain static (like a database rack) without auto-spinning
      p.mesh.rotation.y = p.timelineAngle + Math.PI / 2 + pointerParallax.x * 0.18;
      p.mesh.rotation.x = 0.12 + pointerParallax.y * 0.18;

      // Smooth slide interpolation
      p.mesh.position.x += ((p.x + targetOffsetX) - p.mesh.position.x) * 0.08;
      p.mesh.position.z += ((p.z + targetOffsetZ) - p.mesh.position.z) * 0.08;

      p.mesh.scale.x += (targetScale - p.mesh.scale.x) * 0.08;
      p.mesh.scale.y += (targetScale - p.mesh.scale.y) * 0.08;
      p.mesh.scale.z += (targetScale - p.mesh.scale.z) * 0.08;
    });

    if (typeof dataSprites !== 'undefined') {
      dataSprites.forEach(function(sprite) {
        sprite.userData.angle += sprite.userData.speed;
        sprite.position.x = Math.cos(sprite.userData.angle) * sprite.userData.radius;
        sprite.position.z = -350 + Math.sin(sprite.userData.angle) * sprite.userData.radius;
        // add slight bobbing effect
        sprite.position.y = sprite.userData.yOffset + Math.sin(time * 2 + sprite.userData.angle) * 15;
      });
    }

    // Animus background columns movable with respect to cursor hover
    backgroundGroup.rotation.y = pointerParallax.x * 0.42;
    backgroundGroup.rotation.x = pointerParallax.y * 0.42;

    updateCamera();
    updateHover();
    updateConnectingLine();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  animate();
})();
