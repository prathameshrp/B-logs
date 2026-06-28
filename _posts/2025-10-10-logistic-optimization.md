---
title: "Set Cover Meets Ant Colony: How We Optimized Multi-Store Delivery Routes"
date: 2026-06-29 10:00:00 +0530
tags: [Algorithms, Optimization, Research, Python]
excerpt: "A breakdown of our published paper comparing a classical set cover + TSP formulation against Ant Colony Optimization for last-mile delivery — what we built, what we found, and why the answer isn't one or the other."
cover: /assets/img/aco-delivery.png
---

Last semester I co-authored a paper on delivery route optimization that got
published in the Journal of Robotics and Control. The core question: if a user's
cart has items spread across five different nearby stores, what's the cheapest,
fastest way to collect everything and deliver it?

This post is a deeper walkthrough of what we actually built and why we made the
choices we did — more than what fits in a paper's page limit.

---

## The problem nobody talks about

Most delivery optimization research assumes a single warehouse. Real
quick-commerce is messier: a user orders pasta, medicine, and phone cable. Those
three items might be in three different stores within 2km. The system has to
decide *which stores to visit* and *in what order* — and those are two
fundamentally different problems stacked on top of each other.

We formalized this as two stages:

1. **Store selection** — find the minimal subset of stores that collectively
   stock every item in the cart
2. **Route optimization** — find the cheapest path through those stores to the
   delivery address

Stage 1 is a **Set Cover Problem**. Stage 2 is a **Traveling Salesman Problem**.
Both are NP-hard. Great.

---

## Stage 1: Modeling store selection as Set Cover

Given a set of required items `I = {i₁, i₂, ..., iₘ}` and nearby stores
`S = {s₁, s₂, ..., sₙ}`, we build an availability matrix `A` where `A[s][i] = 1`
if store `s` stocks item `i`.

The goal is to find the smallest subset `S* ⊆ S` such that every item in `I` is
covered by at least one store in `S*`, while also minimizing total travel cost.

We use a greedy set cover approach: start with an empty `S*`, iteratively add
whichever store covers the most currently uncovered items, break ties by
proximity to the delivery address.

Here's the core of that logic:

{% capture demo_setcover %}
// Greedy Set Cover
// items: array of item names
// stores: array of {name, stocks: Set of items, cost}

function greedySetCover(items, stores) {
  const required = new Set(items);
  const selected = [];
  let uncovered = new Set(items);

  while (uncovered.size > 0) {
    // Pick store with best coverage/cost ratio
    let best = null, bestScore = -1;

    for (const store of stores) {
      if (selected.includes(store)) continue;
      const covers = [...store.stocks].filter(i => uncovered.has(i)).length;
      if (covers === 0) continue;
      // Score: items covered per unit cost
      const score = covers / store.cost;
      if (score > bestScore) { bestScore = score; best = store; }
    }

    if (!best) break; // shouldn't happen if stores cover all items
    selected.push(best);
    best.stocks.forEach(i => uncovered.delete(i));
    console.log(`Selected: ${best.name} → covers [${[...best.stocks].join(', ')}]`);
    console.log(`  Remaining uncovered: [${[...uncovered].join(', ')}]`);
  }

  return selected;
}

const items = ['pasta', 'medicine', 'cable'];
const stores = [
  { name: 'QuickMart',   stocks: new Set(['pasta', 'cable']),    cost: 2 },
  { name: 'HealthPlus',  stocks: new Set(['medicine']),          cost: 3 },
  { name: 'MegaStore',   stocks: new Set(['pasta', 'medicine', 'cable']), cost: 8 },
  { name: 'LocalShop',   stocks: new Set(['pasta']),             cost: 1 },
];

const result = greedySetCover(items, stores);
console.log(`\nFinal stores to visit: ${result.map(s => s.name).join(' → ')}`);
console.log(`MegaStore covers everything but costs 8. Greedy picks the cheaper combination.`);
{% endcapture %}
{% include playground.html title="Greedy Set Cover — store selection" code=demo_setcover %}

Notice how the greedy approach skips MegaStore (which covers everything, cost 8)
in favor of QuickMart + HealthPlus (covers everything, cost 5). This is the
classical approximation — it's guaranteed to be within `O(log n)` of optimal,
which is the best we can do for NP-hard problems with a polynomial algorithm.

---

## Stage 2: Route optimization as TSP

Once we have `S*`, we need the shortest path through those stores to the delivery
address. This is a Traveling Salesman Problem on a small graph (usually 2-5
nodes), so even brute force is fast.

The cost matrix captures inter-store distances plus the distance from each store
to the delivery location `d`. We want to minimize:

```
minimize Σ Cost(sᵢ, sⱼ) for (sᵢ,sⱼ) ∈ route
```

For small `|S*|`, nearest-neighbor heuristic gets us close to optimal:

{% capture demo_tsp %}
// Nearest-Neighbor TSP heuristic
// nodes: array of {name, x, y}
// Returns visit order

function dist(a, b) {
  return Math.sqrt((a.x-b.x)**2 + (a.y-b.y)**2);
}

function nearestNeighborTSP(nodes, startName) {
  const unvisited = new Set(nodes.map(n => n.name));
  let current = nodes.find(n => n.name === startName);
  unvisited.delete(current.name);
  
  const route = [current];
  let totalCost = 0;

  while (unvisited.size > 0) {
    let nearest = null, nearestDist = Infinity;
    for (const name of unvisited) {
      const node = nodes.find(n => n.name === name);
      const d = dist(current, node);
      if (d < nearestDist) { nearestDist = d; nearest = node; }
    }
    totalCost += nearestDist;
    route.push(nearest);
    unvisited.delete(nearest.name);
    current = nearest;
  }

  // Return to depot
  totalCost += dist(current, nodes.find(n => n.name === startName));

  console.log("Route: " + route.map(n => n.name).join(" → ") + " → depot");
  console.log(`Total cost: ${totalCost.toFixed(2)} units`);
  return { route, totalCost };
}

// Depot at origin, stores at various coordinates
const nodes = [
  { name: 'depot',      x: 0,  y: 0  },
  { name: 'QuickMart',  x: 3,  y: 4  },
  { name: 'HealthPlus', x: 7,  y: 2  },
  { name: 'Customer',   x: 5,  y: 7  },
];

nearestNeighborTSP(nodes, 'depot');
{% endcapture %}
{% include playground.html title="Nearest-Neighbor TSP — route optimization" code=demo_tsp %}

---

## The Ant Colony Optimization approach

The classical two-stage method gives us a deterministic, predictable answer. But
as the number of deliveries grows, it struggles — the greedy set cover can
miss better combinations, and the TSP heuristic doesn't adapt to constraints
like traffic congestion or time windows.

ACO takes a completely different approach. It simulates a colony of ants, each
building a route probabilistically. Ants that find better routes deposit more
pheromone, biasing future ants toward those paths. Over hundreds of iterations,
the colony converges on a near-optimal solution.

The key formula is the transition probability — how likely ant `k` is to move
from city `i` to city `j`:

```
p_ij^k(t) = [τ_ij(t)]^α · [η_ij]^β  /  Σ [τ_ij(t)]^α · [η_ij]^β
```

Where `τ_ij` is pheromone on edge (i,j), `η_ij = 1/distance` is visibility,
and `α`, `β` control the tradeoff between following pheromone vs. picking
nearby nodes.

Pheromone evaporates over time (controlled by `ρ`) so bad paths don't get
permanently reinforced:

```
τ_ij(t+n) = ρ · τ_ij(t) + Δτ_ij(t)
```

Here's a stripped-down simulation to show how pheromone reinforcement works:

{% capture demo_pheromone %}
// Pheromone update simulation — watch good paths get reinforced

function simulateACO(edges, iterations = 5) {
  // Initialize pheromone equally on all edges
  const pheromone = {};
  edges.forEach(e => { pheromone[e.id] = 1.0; });

  const rho = 0.5;   // evaporation rate
  const Q   = 10;    // pheromone deposit constant

  console.log("Initial pheromone:", JSON.stringify(pheromone));
  console.log("---");

  for (let t = 1; t <= iterations; t++) {
    // Simulate: ants prefer shorter edges, deposit more pheromone there
    edges.forEach(e => {
      // Evaporate
      pheromone[e.id] *= (1 - rho);
      // Deposit: shorter distance → more ants use it → more pheromone
      const deposit = Q / e.distance;
      pheromone[e.id] += deposit;
    });

    console.log(`Iteration ${t}:`);
    edges.forEach(e => {
      const bar = "█".repeat(Math.round(pheromone[e.id]));
      console.log(`  ${e.id.padEnd(20)} τ=${pheromone[e.id].toFixed(2)}  ${bar}`);
    });
    console.log("---");
  }

  const best = edges.reduce((a,b) => pheromone[a.id] > pheromone[b.id] ? a : b);
  console.log(`Strongest pheromone trail: ${best.id} (distance ${best.distance})`);
}

const edges = [
  { id: "depot→QuickMart",  distance: 5  },
  { id: "depot→HealthPlus", distance: 10 },
  { id: "depot→Customer",   distance: 8  },
];

simulateACO(edges, 4);
{% endcapture %}
{% include playground.html title="ACO pheromone reinforcement — watch short paths win" code=demo_pheromone %}

Run this and watch: the shorter `depot→QuickMart` edge accumulates pheromone
faster than the longer routes, even though all edges start equal. This emergent
bias is what guides the colony toward good solutions without anyone explicitly
programming "prefer short edges."

---

## Adding congestion as an independent parameter

One of the more interesting things we did was introduce traffic congestion as
a weighted parameter on each node. We generated a synthetic heatmap where
certain areas have high congestion levels, then ran both algorithms on it.

The result was surprising: **in congested scenarios, the classical model
actually beat ACO on cost**. The classical model follows a fixed, mathematically
computed path that sidesteps congested nodes by construction. ACO's pheromone
trails, built before congestion data is fully incorporated, can get "stuck"
reinforcing paths that happen to run through congested zones.

This gave us the main practical finding of the paper:

{% capture demo_congestion %}
// Simplified congestion-aware cost model
// Shows why algorithm choice depends on environment

function routeCost(route, congestionMap, baseDistances) {
  let total = 0;
  for (let i = 0; i < route.length - 1; i++) {
    const from = route[i], to = route[i+1];
    const baseDist = baseDistances[`${from}-${to}`] || baseDistances[`${to}-${from}`] || 0;
    const congestion = congestionMap[to] || 0;
    // Congestion multiplies effective travel time
    const effectiveCost = baseDist * (1 + congestion);
    total += effectiveCost;
    console.log(`  ${from} → ${to}: base=${baseDist}, congestion=${congestion}, cost=${effectiveCost.toFixed(1)}`);
  }
  return total;
}

const baseDistances = {
  'depot-A': 3, 'depot-B': 5, 'A-C': 4, 'B-C': 2, 'C-customer': 3
};

// High-congestion scenario: node B is in a traffic hotspot
const congestionMap = { A: 0.1, B: 0.9, C: 0.2, customer: 0.0 };

console.log("=== Classical route (avoids B): depot → A → C → customer ===");
const classicalCost = routeCost(
  ['depot','A','C','customer'], congestionMap, baseDistances
);

console.log(`\n=== ACO route (reinforced B as 'short'): depot → B → C → customer ===`);
const acoCost = routeCost(
  ['depot','B','C','customer'], congestionMap, baseDistances
);

console.log(`\nClassical cost: ${classicalCost.toFixed(1)}`);
console.log(`ACO cost:       ${acoCost.toFixed(1)}`);
console.log(classicalCost < acoCost
  ? "→ Classical wins here (congestion punishes ACO's pheromone trail)"
  : "→ ACO still wins despite congestion");
{% endcapture %}
{% include playground.html title="Congestion-aware cost — why environment matters" code=demo_congestion %}

---

## What the simulations showed

We ran both approaches on 100 simulated deliveries in Python and measured
average delivery time and total cost at different scales.

The findings:

**Classical (Set Cover + TSP)**
- Fast and exact for small delivery counts
- Average delivery time increases steeply as volume grows
- Wins on cost in high-congestion environments
- No real-time adaptability

**ACO**
- Consistently better average delivery time at high volumes
- Cost scales more gracefully
- Adapts dynamically via pheromone updates
- Struggles above ~80 nodes when time window constraints are strict (ACO2 variant)

Neither approach dominates across all conditions. The paper concludes with a
proposal for a **hybrid model** controlled by a parameter `θ` that selects the
algorithm based on detected delivery environment — use classical for
low-volume or high-congestion scenarios, ACO for large-scale or dynamic ones.

---

## What I'd do differently

The congestion parameter was static — we baked it into the cost matrix before
running either algorithm. A real system would need live traffic data updating
the weights mid-route. That's the natural next step: integrating a real-time
traffic API and testing how ACO's pheromone evaporation rate responds to sudden
congestion spikes vs. how quickly a classical re-plan can compute a new optimal.

The paper's code and simulation data are available if you want to dig into the
Python implementation.

<!-- 👉 **[Published paper — Journal of Robotics and Control](https://journal.umy.ac.id/index.php/jrc)** -->