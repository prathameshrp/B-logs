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
      tags: n.tags || [], weight: n.weight || 1,
      // Random coordinates inside a 3D sphere
      x: (Math.random() - 0.5) * 450,
      y: (Math.random() - 0.5) * 350,
      z: (Math.random() - 0.5) * 450,
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

  // ── Three.js Scene Setup ─────────────────────────────────────
  var W = section.clientWidth, H = section.clientHeight;
  var scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2('#0a0a12', 0.0014);

  var camera = new THREE.PerspectiveCamera(60, W / H, 1, 2000);
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W, H);
// Shadows and lights removed per design request
// Enable shadows
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
// Lights
const ambient = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambient);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(300, 400, 200);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 1024;
dirLight.shadow.mapSize.height = 1024;
scene.add(dirLight);

  // Group to contain all graph elements
  var graphGroup = new THREE.Group();
  scene.add(graphGroup);

  // ── Create Node Meshes ───────────────────────────────────────
  nodes.forEach(function (n) {
    // Generate spheres for tag hubs and post stars
    var segs = n.type === 'tag' ? 24 : 16;
    var geom = new THREE.SphereGeometry(n.r, segs, segs);
    var colorHex = n.type === 'tag' ? COL.accent3 : COL.accent2;
    
    var mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(colorHex),
      transparent: true,
      opacity: 0.90,
      metalness: 0.2,
      roughness: 0.6
    });
    
    var mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(n.x, n.y, n.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { node: n };
    n.mesh = mesh;
    graphGroup.add(mesh);

    // Planet-like orbiting rings for blog post stars
    if (n.type === 'post') {
      var ringGeom = new THREE.RingGeometry(n.r * 1.4, n.r * 2.2, 32);
      var ringMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(COL.accent),
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide
      });
      var ringMesh = new THREE.Mesh(ringGeom, ringMat);
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
    opacity: 0.45
  });
  var lineSegments = new THREE.LineSegments(lineGeometry, lineMat);
  graphGroup.add(lineSegments);

  // ── Space Dust Background Particle System ─────────────────────
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
  var dustMaterial = new THREE.PointsMaterial({
    color: new THREE.Color(COL.mute),
    size: 2.0,
    transparent: true,
    opacity: 0.55,
    sizeAttenuation: true
  });
  var spaceDust = new THREE.Points(dustGeometry, dustMaterial);
  scene.add(spaceDust);

  // Initialize colors dynamically
  refreshColors();

  // ── 3D Physics Engine (Verlet force integrator) ──────────────
  var alpha = 1.0;
  var REPULSION = 14000, SPRING = 0.016, SPRING_LEN = 110, GRAVITY = 0.002, DAMP = 0.85;
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
        // Continuous wave drift forces
        a.vx += Math.sin(time + a.y * 0.015) * 0.035;
        a.vy += Math.cos(time + a.z * 0.015) * 0.035;
        a.vz += Math.sin(time + a.x * 0.015) * 0.035;
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

  window.graph = {
    setCameraFromScroll: function(progress) {
      targetTheta = progress * Math.PI * 2;
      targetPhi = 0.2 + (progress * 0.5);
      targetRadius = 420 - (progress * 150);
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

    camera.position.x = cameraTarget.x + radius * Math.sin(theta) * Math.cos(phi);
    camera.position.y = cameraTarget.y + radius * Math.sin(phi);
    camera.position.z = cameraTarget.z + radius * Math.cos(theta) * Math.cos(phi);
    camera.lookAt(cameraTarget);
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
        : '<span class="tt-kind">post · ' + esc(hoverNode.date || '') + '</span><strong>' + esc(hoverNode.label) + '</strong><span class="tt-meta">' + (hoverNode.tags || []).map(function (t) { return '#' + t; }).join(' ') + '</span><span class="tt-go">Click to fly in &rarr;</span>';

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
      // Clicked on a node!
      if (hoverNode.type === 'post') {
        flightNode = hoverNode;
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
  function animate() {
    if (!running) return;
    
    // Physics update
    if (!reduce) tick();
    
    // Slowly rotate planetary rings + space dust
    nodes.forEach(function (n) {
      if (n.ring) {
        n.ring.rotation.z += n === hoverNode ? 0.025 : 0.006;
      }
    });
    
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
