---
title: Virtual Try-On
description: Real-time clothing overlay using pose landmark detection, running live from a webcam feed in the browser.
order: 3
tech: [Python, Flask, MediaPipe, OpenCV, Node.js, Express]
url: https://github.com/prathameshrp/virtual-tryon
url_live: ""
---

Captures a webcam frame every 500ms, detects shoulder and hip landmarks with
MediaPipe Pose, resizes a clothing PNG to fit your torso, and alpha-composites
it onto the live feed — all in under a second per frame.

## Why I built it

Most try-on demos are either pre-recorded or involve a slow upload cycle. I
wanted the overlay to feel instant and run entirely on localhost with no external
APIs.

## Highlights

- MediaPipe Pose extracts four landmarks (shoulders + hips) to derive shirt width, height, and anchor position per frame.
- Alpha compositing blends a transparent clothing PNG onto the webcam feed with per-pixel accuracy.
- Split Node.js/Flask architecture keeps the CV pipeline independent from the browser layer.
- Bounding box clamping prevents the overlay from bleeding outside the frame at close range.