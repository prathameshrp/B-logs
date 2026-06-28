// Constellation 3D: An immersive Three.js WebGL Constellation Universe.
// Nodes are stars, tags are hub nebulae, links are pulsing lasers.
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
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Palette (Read from CSS theme tokens) ─────────────────────
  function cssVar(n, fb) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    return v || fb;
  }
  
  var COL = {};
  function refreshColors() {
    COL.accent = cssVar('--accent', '#7c5cff');
    COL.accent2 = cssVar('--accent-2', '#22d3ee');
    COL.accent3 = cssVar('--accent-3', '#f472b6');
    COL.text = cssVar('--text', '#ecedf6');
    COL.mute = cssVar('--text-mute', '#7a7d96');
    COL.line = document.documentElement.getAttribute('data-theme') === 'light'
      ? 'rgba(92,60,211,0.18)' : 'rgba(34,211,238,0.22)';
    
    if (scene) {
      scene.fog.color.set(cssVar('--bg', '#0a0a12'));
      spaceDust.material.color.set(COL.mute);
      lineSegments.material.color.set(COL.line);
      nodes.forEach(function (n) {
        var colorHex = n.type === 'tag' ? COL.accent3 : COL.accent2;
        n.mesh.material.color.set(colorHex);
        if (n.ring) n.ring.material.color.set(COL.accent);
      });
    }
  }

  // ── Build 3D Node & Link Model ──────────────────────────────
  var nodeById = {};
  var nodes = data.nodes.map(function (n) {
    var node = {
      id: n.id, type: n.type, label: n.label, url: n.url, date: n.date,
      tags: n.tags || [], weight: n.weight || 1, excerpt: n.excerpt || '',
      x: 0, y: 0, z: 0,
      vx: 0, vy: 0, vz: 0, neighbors: []
    };
    node.r = n.type === 'tag' ? 8 + Math.min(n.weight, 6) * 1.5 : 5 + Math.min(n.weight, 4) * 1.0;
    nodeById[n.id] = node;
    return node;
  });

  var links = (data.links || []).filter(function (l) {
    return nodeById[l.source] && nodeById[l.target];
  }).map(function (l) {
    var s = nodeById[l.source], t = nodeById[l.target];
    s.neighbors.push(t); t.neighbors.push(s);
    return { source: s, target: t };
  });

  // Distribute posts (stars) along a helical chronological timeline
  var posts = nodes.filter(function (n) { return n.type === 'post'; });
  posts.forEach(function (p, index) {
    var ratio = index / (posts.length - 1 || 1);
    p.timelineY = 140 - ratio * 280;
    p.timelineAngle = ratio * Math.PI * 1.6;
    p.timelineRadius = 140;
    p.x = Math.sin(p.timelineAngle) * p.timelineRadius;
    p.y = p.timelineY;
    p.z = Math.cos(p.timelineAngle) * p.timelineRadius;
  });

  // Put tag hubs (nebulae) near the average position of their connected posts
  nodes.forEach(function (n) {
    if (n.type === 'tag') {
      var connectedPosts = links.filter(function (l) { return l.target.id === n.id || l.source.id === n.id; }).map(function (l) {
        return l.target.id === n.id ? l.source : l.target;
      });
      if (connectedPosts.length > 0) {
        var sx = 0, sy = 0, sz = 0;
        connectedPosts.forEach(function (p) { sx += p.x; sy += p.y; sz += p.z; });
        n.x = sx / connectedPosts.length + (Math.random() - 0.5) * 60;
        n.y = sy / connectedPosts.length + (Math.random() - 0.5) * 60;
        n.z = sz / connectedPosts.length + (Math.random() - 0.5) * 60;
      } else {
        n.x = (Math.random() - 0.5) * 200;
        n.y = (Math.random() - 0.5) * 200;
        n.z = (Math.random() - 0.5) * 200;
      }
    }
  });

  // ── Three.js Scene Setup ─────────────────────────────────────
  var W = section.clientWidth, H = section.clientHeight;
  var scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2('#0a0a12', 0.0014);

  var camera = new THREE.PerspectiveCamera(60, W / H, 1, 2000);
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W, H);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  
  // Lights
  var ambient = new THREE.AmbientLight(0xffffff, 0.45);
  scene.add(ambient);
  var dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
  dirLight.position.set(200, 350, 150);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  dirLight.shadow.bias = -0.001;
  scene.add(dirLight);
 
  // Group to contain all graph elements
  var graphGroup = new THREE.Group();
  scene.add(graphGroup);

  // Helper to generate beautiful sci-fi grid planet textures
  function createPlanetTexture(type) {
    var canvasObj = document.createElement('canvas');
    canvasObj.width = 128;
    canvasObj.height = 128;
    var ctx = canvasObj.getContext('2d');
    
    // Gradient fill
    var grad = ctx.createLinearGradient(0, 0, 128, 128);
    if (type === 'post') {
      grad.addColorStop(0, '#1e1b4b');
      grad.addColorStop(0.5, '#7c5cff');
      grad.addColorStop(1, '#030712');
    } else {
      grad.addColorStop(0, '#4c0519');
      grad.addColorStop(0.5, '#f472b6');
      grad.addColorStop(1, '#030712');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    
    // Draw sci-fi grids/lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (var x = 16; x < 128; x += 24) {
      ctx.moveTo(x, 0); ctx.lineTo(x, 128);
      ctx.moveTo(0, x); ctx.lineTo(128, x);
    }
    ctx.stroke();
    
    // Glowing intersections
    ctx.fillStyle = '#ffffff';
    for (var gx = 16; gx < 128; gx += 24) {
      for (var gy = 16; gy < 128; gy += 24) {
        if (Math.random() > 0.4) {
          ctx.beginPath();
          ctx.arc(gx, gy, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    
    var tex = new THREE.CanvasTexture(canvasObj);
    return tex;
  }

  // ── Create Node Meshes ───────────────────────────────────────
  nodes.forEach(function (n) {
    // Generate spheres for tag hubs and post stars
    var segs = n.type === 'tag' ? 24 : 16;
    var geom = new THREE.SphereGeometry(n.r, segs, segs);
    var colorHex = n.type === 'tag' ? COL.accent3 : COL.accent2;
    var planetTex = createPlanetTexture(n.type);
    
    var mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(colorHex),
      map: planetTex,
      transparent: true,
      opacity: 0.90,
      metalness: 0.45,
      roughness: 0.35
    });
    
    var mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(n.x, n.y, n.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { node: n };
    n.mesh = mesh;
    graphGroup.add(mesh);

    // Planet-like orbiting rings for blog post stars (use standard material to show shadows/lights)
    if (n.type === 'post') {
      var ringGeom = new THREE.RingGeometry(n.r * 1.4, n.r * 2.2, 32);
      var ringMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(COL.accent),
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        roughness: 0.8,
        metalness: 0.2
      });
      var ringMesh = new THREE.Mesh(ringGeom, ringMat);
      ringMesh.receiveShadow = true;
      ringMesh.castShadow = true;
      // Give each planet ring a unique orientation
      ringMesh.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.5;
      ringMesh.rotation.y = (Math.random() - 0.5) * 0.4;
      mesh.add(ringMesh);
      n.ring = ringMesh;
    }
  });

  // ── Create Connection Lines ──────────────────────────────────
  var linePositions = new Float32Array(links.length * 2 * 3);
  var lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
  
  var lineMat = new THREE.LineBasicMaterial({
    color: new THREE.Color(COL.line),
    transparent: true,
    opacity: 0.18
  });
  var lineSegments = new THREE.LineSegments(lineGeometry, lineMat);
  graphGroup.add(lineSegments);

  // ── Space Dust Background Particle System (Glowing Stars) ─────────────────────
  function createStarTexture() {
    var canvasObj = document.createElement('canvas');
    canvasObj.width = 16;
    canvasObj.height = 16;
    var ctx = canvasObj.getContext('2d');
    var gradient = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.6, 'rgba(124, 92, 255, 0.25)'); // subtle glowing halo
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 16, 16);
    return new THREE.CanvasTexture(canvasObj);
  }

  var dustCount = reduce ? 400 : 1600;
  var dustGeometry = new THREE.BufferGeometry();
  var dustPositions = new Float32Array(dustCount * 3);
  for (var i = 0; i < dustCount * 3; i += 3) {
    var radiusVal = 350 + Math.random() * 550;
    var u = Math.random(), v = Math.random();
    var thetaVal = u * 2.0 * Math.PI;
    var phiVal = Math.acos(2.0 * v - 1.0);
    dustPositions[i] = radiusVal * Math.sin(phiVal) * Math.cos(thetaVal);
    dustPositions[i + 1] = radiusVal * Math.sin(phiVal) * Math.sin(thetaVal);
    dustPositions[i + 2] = radiusVal * Math.cos(phiVal);
  }
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  var starTexture = createStarTexture();
  var dustMaterial = new THREE.PointsMaterial({
    color: new THREE.Color(COL.mute),
    size: 4.5,
    map: starTexture,
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 0.85,
    sizeAttenuation: true,
    depthWrite: false
  });
  var spaceDust = new THREE.Points(dustGeometry, dustMaterial);
  scene.add(spaceDust);

  // Initialize colors dynamically
  refreshColors();

  // ── 3D Physics Engine (Verlet force integrator) ──────────────
  var alpha = 1.0;
  var REPULSION = 12000, SPRING = 0.006, SPRING_LEN = 110, GRAVITY = 0.0018, DAMP = 0.88;
  var dragNode = null;

  function tick() {
    var i, j, a, b, dx, dy, dz, d2, d, f;

    // 1. Particle repulsion force (3D push)
    for (i = 0; i < nodes.length; i++) {
      a = nodes[i];
      for (j = i + 1; j < nodes.length; j++) {
        b = nodes[j];
        dx = a.x - b.x; dy = a.y - b.y; dz = a.z - b.z;
        d2 = dx * dx + dy * dy + dz * dz || 0.01;
        if (d2 > 200000) continue;
        d = Math.sqrt(d2);
        f = (REPULSION / d2) * alpha;
        var ux = dx / d, uy = dy / d, uz = dz / d;
        a.vx += ux * f; a.vy += uy * f; a.vz += uz * f;
        b.vx -= ux * f; b.vy -= uy * f; b.vz -= uz * f;
      }
    }

    // 2. Spring force (3D pull)
    for (i = 0; i < links.length; i++) {
      a = links[i].source; b = links[i].target;
      dx = b.x - a.x; dy = b.y - a.y; dz = b.z - a.z;
      d2 = dx * dx + dy * dy + dz * dz || 0.01;
      d = Math.sqrt(d2);
      f = (d - SPRING_LEN) * SPRING * alpha;
      var lx = (dx / d) * f, ly = (dy / d) * f, lz = (dz / d) * f;
      a.vx += lx; a.vy += ly; a.vz += lz;
      b.vx -= lx; b.vy -= ly; b.vz -= lz;
    }

    // 3. Gravity pulling to center + organic wave movements
    var time = Date.now() * 0.0006;
    for (i = 0; i < nodes.length; i++) {
      a = nodes[i];
      a.vx -= a.x * GRAVITY * alpha;
      a.vy -= a.y * GRAVITY * alpha;
      a.vz -= a.z * GRAVITY * alpha;

      if (a !== dragNode) {
        // Continuous wave drift forces (made larger and slower for flowy motion)
        a.vx += Math.sin(time + a.y * 0.012) * 0.095;
        a.vy += Math.cos(time + a.z * 0.012) * 0.095;
        a.vz += Math.sin(time + a.x * 0.012) * 0.095;
      }

      if (a === dragNode) continue;
      a.vx *= DAMP; a.vy *= DAMP; a.vz *= DAMP;
      a.x += a.vx; a.y += a.vy; a.z += a.vz;

      // Sync position to Three.js meshes
      a.mesh.position.set(a.x, a.y, a.z);
    }

    alpha *= 0.994;
    if (alpha < 0.02) alpha = 0.02;
  }

  // ── Camera Controller (Inertia controls & click flight) ────────
  var theta = 0, phi = 0.2, radius = W < 700 ? 550 : 420;
  var targetTheta = theta, targetPhi = phi, targetRadius = radius;
  var cameraTarget = new THREE.Vector3(0, 0, 0);
  var targetCameraTarget = new THREE.Vector3(0, 0, 0);

  var dragging = false, moved = false, flightNode = null;
  var lastMousePos = { x: 0, y: 0 };

  // Pointer-based parallax offsets
  var pointerParallax = { x: 0, y: 0, targetX: 0, targetY: 0 };

  // DOM elements for details overlay
  var detailsPanel = document.querySelector('[data-graph-details]');
  var detailsTitle = detailsPanel ? detailsPanel.querySelector('.details-title') : null;
  var detailsDate = detailsPanel ? detailsPanel.querySelector('.details-date') : null;
  var detailsExcerpt = detailsPanel ? detailsPanel.querySelector('.details-excerpt') : null;
  var detailsTags = detailsPanel ? detailsPanel.querySelector('.details-tags') : null;
  var detailsLink = detailsPanel ? detailsPanel.querySelector('.details-link') : null;
  var detailsNext = detailsPanel ? detailsPanel.querySelector('.details-next') : null;
  var detailsCoords = detailsPanel ? detailsPanel.querySelector('[data-details-coords]') : null;

  var currentActivePost = null;

  function showDetailsForPost(post) {
    if (!post) {
      if (detailsPanel) detailsPanel.classList.remove('is-visible');
      currentActivePost = null;
      return;
    }
    if (currentActivePost === post) return;
    currentActivePost = post;

    if (detailsPanel) {
      detailsPanel.classList.add('is-visible');
      if (detailsTitle) detailsTitle.textContent = post.label;
      if (detailsDate) detailsDate.textContent = post.date || '';
      if (detailsExcerpt) detailsExcerpt.textContent = post.excerpt || '';
      if (detailsLink) detailsLink.href = post.url;
      if (detailsCoords) {
        detailsCoords.textContent = 'COORD: [' + Math.round(post.x) + ', ' + Math.round(post.y) + ', ' + Math.round(post.z) + ']';
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

  // Next Milestone button handler
  if (detailsNext) {
    detailsNext.addEventListener('click', function () {
      if (!currentActivePost) return;
      var postsList = nodes.filter(function (n) { return n.type === 'post'; });
      var idx = postsList.indexOf(currentActivePost);
      var nextIdx = (idx + 1) % postsList.length;
      var nextPost = postsList[nextIdx];
      if (nextPost) {
        var progress = 0.12 + (nextIdx / postsList.length) * 0.76;
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
    });
  }

  window.graph = {
    setCameraFromScroll: function(progress) {
      var postsList = nodes.filter(function (n) { return n.type === 'post'; });
      var aboutEl = document.querySelector('[data-graph-about]');
      
      if (progress < 0.12) {
        // Intro state - center map
        targetCameraTarget.set(0, 0, 0);
        targetTheta = 0;
        targetPhi = 0.2;
        targetRadius = W < 700 ? 550 : 420;
        showDetailsForPost(null);
        
        if (aboutEl) {
          aboutEl.classList.remove('is-visible');
          aboutEl.style.opacity = 0;
          aboutEl.style.transform = 'translate(-50%, calc(-50% + 40px))';
        }
      } else if (progress > 0.88) {
        // About state - pan camera out, hide details card, show About card
        targetCameraTarget.set(0, 0, 0);
        targetTheta = (progress - 0.88) * Math.PI * 0.4; // slowly rotate the galaxy
        targetPhi = 0.22;
        targetRadius = W < 700 ? 600 : 480; // zoom out slightly
        showDetailsForPost(null);
        
        if (aboutEl) {
          aboutEl.classList.add('is-visible');
          var aboutFade = (progress - 0.88) / 0.12;
          aboutFade = Math.max(0, Math.min(1, aboutFade));
          aboutEl.style.opacity = aboutFade;
          var ty = (1 - aboutFade) * 45;
          aboutEl.style.transform = 'translate(-50%, calc(-50% + ' + ty + 'px))';
          aboutEl.style.pointerEvents = aboutFade > 0.05 ? 'auto' : 'none';
        }
      } else {
        // Active timeline state - focus on the current node
        if (aboutEl) {
          aboutEl.classList.remove('is-visible');
          aboutEl.style.opacity = 0;
          aboutEl.style.transform = 'translate(-50%, calc(-50% + 40px))';
          aboutEl.style.pointerEvents = 'none';
        }
        
        var subProgress = (progress - 0.12) / 0.76; // map 0.12 -> 0.88 to 0.0 -> 1.0
        subProgress = Math.max(0, Math.min(1, subProgress));
        var idx = Math.min(Math.floor(subProgress * postsList.length), postsList.length - 1);
        var post = postsList[idx];
        if (post) {
          showDetailsForPost(post);
          
          var targetPos = post.mesh.position.clone();
          // Offset node further to the right side of the screen
          var rightX = Math.cos(targetTheta);
          var rightZ = -Math.sin(targetTheta);
          targetPos.x -= rightX * 90;
          targetPos.z -= rightZ * 90;
 
          targetCameraTarget.copy(targetPos);
          targetRadius = 140; // Zoom in closer
          targetTheta = post.timelineAngle + Math.PI / 4;
          targetPhi = 0.15;
        }
      }
    }
  };

  function updateCamera() {
    if (flightNode) {
      // Cinematic LERP zoom flight transition
      var targetPos = flightNode.mesh.position;
      targetCameraTarget.copy(targetPos);
      targetRadius = 140;
      targetTheta = Math.atan2(targetPos.x, targetPos.z);
      targetPhi = 0.15;
      
      var dist = camera.position.distanceTo(targetPos);
      if (dist < 155 && flightNode.url) {
        // Morph to page link
        window.location.href = flightNode.url;
        flightNode = null;
      }
    }

    // Smooth inertia interpolation
    theta += (targetTheta - theta) * 0.07;
    phi += (targetPhi - phi) * 0.07;
    radius += (targetRadius - radius) * 0.07;
    cameraTarget.lerp(targetCameraTarget, 0.07);

    // Smooth pointer parallax interpolation
    pointerParallax.x += (pointerParallax.targetX - pointerParallax.x) * 0.05;
    pointerParallax.y += (pointerParallax.targetY - pointerParallax.y) * 0.05;

    // Apply parallax to camera angle
    var currentTheta = theta + pointerParallax.x;
    var currentPhi = phi + pointerParallax.y;

    camera.position.x = cameraTarget.x + radius * Math.sin(currentTheta) * Math.cos(currentPhi);
    camera.position.y = cameraTarget.y + radius * Math.sin(currentPhi);
    camera.position.z = cameraTarget.z + radius * Math.cos(currentTheta) * Math.cos(currentPhi);
    camera.lookAt(cameraTarget);

    // Apply parallax to centered intro text
    var intro = document.querySelector('.constellation__intro');
    if (intro) {
      var rx = -pointerParallax.y * 22; // degrees
      var ry = pointerParallax.x * 22;
      intro.style.setProperty('--intro-rotate-x', rx + 'deg');
      intro.style.setProperty('--intro-rotate-y', ry + 'deg');
    }
  }

  // ── Mouse/Touch Interactions & Tooltip HUD ───────────────────
  var mouse = new THREE.Vector2(-999, -999);
  var raycaster = new THREE.Raycaster();
  var hoverNode = null;

  function updateHover() {
    raycaster.setFromCamera(mouse, camera);
    var intersects = raycaster.intersectObjects(nodes.map(function (n) { return n.mesh; }));

    var nextHover = null;
    if (intersects.length > 0 && !flightNode) {
      nextHover = intersects[0].object.userData.node;
    }

    if (nextHover !== hoverNode) {
      if (hoverNode) {
        // Reset scale
        hoverNode.mesh.scale.set(1, 1, 1);
      }
      hoverNode = nextHover;
      if (hoverNode) {
        // Pop-out animation
        hoverNode.mesh.scale.set(1.35, 1.35, 1.35);
        if (hint) hint.style.opacity = '0';
      }
    }

    // Interactive tooltip overlay tracking 3D node coordinates
    if (hoverNode && tooltip) {
      tooltip.hidden = false;
      tooltip.innerHTML = hoverNode.type === 'tag'
        ? '<span class="tt-kind">topic</span><strong>#' + esc(hoverNode.label) + '</strong><span class="tt-meta">' + hoverNode.weight + ' post' + (hoverNode.weight !== 1 ? 's' : '') + '</span>'
        : '<span class="tt-kind">post · ' + esc(hoverNode.date || '') + '</span><strong>' + esc(hoverNode.label) + '</strong><span class="tt-meta">' + (hoverNode.tags || []).map(function (t) { return '#' + t; }).join(' ') + '</span><span class="tt-go">Click to expand details &rarr;</span>';

      // Project 3D vector to screen-space coordinates
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

  // ── Event listeners ──────────────────────────────────────────
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

    // Normal mouse position for raycasting
    mouse.x = ((clientX - rect.left) / W) * 2 - 1;
    mouse.y = -((clientY - rect.top) / H) * 2 + 1;

    // Update parallax target
    pointerParallax.targetX = (clientX / window.innerWidth - 0.5) * 0.35;
    pointerParallax.targetY = (clientY / window.innerHeight - 0.5) * 0.35;

    if (dragging) {
      moved = true;
      var dx = clientX - lastMousePos.x;
      var dy = clientY - lastMousePos.y;
      targetTheta -= dx * 0.005;
      targetPhi = Math.max(-Math.PI / 2.6, Math.min(Math.PI / 2.6, targetPhi + dy * 0.005));
      lastMousePos = { x: clientX, y: clientY };
    }
  }

  function onUp() {
    dragging = false;
    if (!moved && hoverNode) {
      if (hoverNode.type === 'post') {
        var postsList = nodes.filter(function (n) { return n.type === 'post'; });
        var idx = postsList.indexOf(hoverNode);
        if (idx !== -1) {
          if (currentActivePost === hoverNode) {
            // Already active, click again to fly in / go to page
            flightNode = hoverNode;
          } else {
            // Scroll to the post's progress index to focus it
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
      } else if (hoverNode.type === 'tag') {
        // Recenter on tag cluster
        targetCameraTarget.copy(hoverNode.mesh.position);
        targetRadius = 250;
        alpha = 0.5;
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
    targetRadius = Math.max(120, Math.min(1000, targetRadius + e.deltaY * 0.6));
  }, { passive: true });

  var resetBtn = document.querySelector('[data-graph-reset]');
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      flightNode = null;
      targetCameraTarget.set(0, 0, 0);
      targetRadius = W < 700 ? 550 : 420;
      targetTheta = 0; targetPhi = 0.2;
      alpha = 0.6;
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

  // ── Render and Simulation loops ──────────────────────────────
  var running = true;
  var warmUpFrames = 60;
  function animate() {
    if (!running) return;
    
    // Slowly spin graph to the right when a post is active to keep scene alive
    if (!dragging && !flightNode && currentActivePost) {
      targetTheta += 0.0012;
    }
    
    // Hide the beautiful cosmic loader after warmup frames are done (settled physics)
    if (warmUpFrames > 0) {
      warmUpFrames--;
      if (warmUpFrames === 0) {
        var loaderEl = document.querySelector('[data-graph-loader]');
        if (loaderEl) {
          loaderEl.classList.add('fade-out');
          setTimeout(function() { loaderEl.style.display = 'none'; }, 800);
        }
      }
    }
    
    // Physics update
    if (!reduce) tick();
    
    // Rotate and scale nodes dynamically
    nodes.forEach(function (n) {
      // Axial rotation
      if (n === currentActivePost) {
        n.mesh.rotation.y += 0.024;
      } else {
        n.mesh.rotation.y += 0.003;
      }

      // Dynamic scale interpolation
      var targetScale = 1.0;
      if (n === currentActivePost) {
        targetScale = 3.0; // Make active post sphere huge!
      } else if (n === hoverNode) {
        targetScale = 1.35; // Hover feedback
      }
      n.mesh.scale.x += (targetScale - n.mesh.scale.x) * 0.08;
      n.mesh.scale.y += (targetScale - n.mesh.scale.y) * 0.08;
      n.mesh.scale.z += (targetScale - n.mesh.scale.z) * 0.08;

      if (n.ring) {
        n.ring.rotation.z += n === hoverNode ? 0.025 : 0.006;
      }
    });
    
    // Pulse connections opacity for flowy, organic breathing feel
    var lineTime = Date.now() * 0.0012;
    lineSegments.material.opacity = 0.12 + Math.sin(lineTime) * 0.05;
    
    // Update links position attribute dynamically in WebGL
    var posAttr = lineSegments.geometry.attributes.position;
    var idx = 0;
    for (var j = 0; j < links.length; j++) {
      var s = links[j].source;
      var t = links[j].target;
      posAttr.setXYZ(idx++, s.x, s.y, s.z);
      posAttr.setXYZ(idx++, t.x, t.y, t.z);
    }
    posAttr.needsUpdate = true;
    
    spaceDust.rotation.y += 0.00015;
    spaceDust.rotation.x += 0.00008;

    updateCamera();
    updateHover();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  // ── Helpers ──────────────────────────────────────────────────
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  
  // Kickstart animation loop
  animate();
})();
