---
title: cgPaint
description: A browser-based CG lab implementing DDA, Bresenham lines and circles, scan-line polygon fill, polygon clipping, and 2D transformations — all pixel by pixel on a raw HTML canvas.
order: 4
tech: [JavaScript, Canvas API, Computer Graphics]
url: https://github.com/prathameshrp/CG_MINI_PROJECT_PAINT_APP
url_live: ""
---

cgPaint is a paint app built as a computer graphics mini project. Every
primitive is written from scratch — no `ctx.lineTo` for lines, no `ctx.arc`
for circles. A configurable step delay lets you slow any algorithm down to
watch it plot pixels one at a time, which makes the theory considerably
easier to follow than pseudocode.

## Why I built it

The algorithms made more sense once I could see them run. Watching Bresenham's
error term flip the step direction is clearer than reading about it.

## Highlights

- DDA and Bresenham line algorithms with visible per-pixel error term tracking.
- Bresenham circle using 8-fold symmetry — one octant computed, seven mirrored.
- Scan-line polygon fill: click to place vertices, finish to sweep and fill row by row.
- Canvas polygon clipping via `ctx.clip()` on a user-drawn region.
- Per-object translate, rotate, and scale with `ctx.save`/`ctx.restore` isolation.
- Speed slider (0–100ms per pixel) turns every algorithm into a live step visualizer.