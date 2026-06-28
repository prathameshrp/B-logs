---
title: "Building a Real-Time Virtual Try-On with MediaPipe and a Webcam"
date: 2025-04-08 10:00:00 +0530
tags: [Python, Computer Vision, MediaPipe, Flask, Node.js]
excerpt: "How I built a real-time clothing overlay that detects your pose landmarks and drapes a shirt over you, live from a webcam feed."
---

Most virtual try-on demos you see online are either pre-recorded, server-heavy,
or involve a 30-second upload cycle. I wanted something that felt instant —
point a webcam at yourself, and a shirt just appears on you, live.

Here's how it works and what I learned building it.

## The architecture

The pipeline is split across two servers deliberately:

- A **Node.js/Express** frontend server handles the webcam stream and serves
  the UI. Every 500ms it captures a frame from the browser, POSTs it as a JPEG,
  and replaces the output image with whatever comes back.
- A **Flask/Python** backend does the actual computer vision — pose detection,
  clothing resize and placement, alpha compositing — and returns a processed JPEG.

Keeping them separate meant I could iterate on the CV logic without touching the
frontend, and swap out the pose model without breaking the web layer.

## Pose detection with MediaPipe

MediaPipe's Pose solution gives you 33 body landmarks per frame. For draping a
shirt, you only really need four of them: left shoulder, right shoulder, left hip,
and right hip.

From those four points you can derive everything you need:

```python
shoulder_distance = np.linalg.norm(np.array(left_shoulder) - np.array(right_shoulder))
shirt_width  = int(shoulder_distance * 1.5)
shirt_height = int(shoulder_hip_distance * 1.2)
```

The multipliers (`1.5`, `1.2`) were tuned by feel — the shirt needs to be a bit
wider than the shoulder span and slightly taller than the torso to look natural.

## Alpha compositing

The clothing PNG has a transparency channel, so the overlay is a standard
alpha blend per pixel:

```python
alpha = resized_clothing[:, :, 3] / 255.0
frame[y1:y2, x1:x2, c] = (
    clothing[:, :, c] * alpha + frame[y1:y2, x1:x2, c] * (1.0 - alpha)
)
```

The trickier part is clamping the bounding box so the shirt doesn't bleed outside
the frame when you're close to the camera edge — that's what the `crop_x1/y1`
offset math handles.

## What surprised me

**MediaPipe is fast.** Running pose detection on every frame at 500ms intervals
felt seamless on a mid-range laptop. The bottleneck turned out to be the Node →
Python round-trip over localhost HTTP, not the CV itself.

**PNG alpha quality matters a lot.** A clothing image with a clean, well-cut
alpha channel looks convincing. A sloppy one with fringing makes the whole thing
look broken regardless of how accurate your landmark math is.

## What's next

Right now it only supports one hardcoded shirt. The obvious next step is a
clothing selector — a small gallery where you pick a PNG and the backend swaps
the overlay. The pose pipeline doesn't need to change at all for that.

The repo is open if you want to drop in your own clothing images and play with
the multipliers.

👉 **[github.com/prathameshrp](https://github.com/prathameshrp)**