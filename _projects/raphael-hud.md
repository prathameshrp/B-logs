---
title: Raphael
description: A cockpit-style KDE Plasma HUD that uses an LLM pipeline to monitor focus and call out distractions in real time.
order: 2
tech: [Python, Flask, QML, Groq, Chart.js]
url: https://github.com/prathameshrp/Raphael
url_live: ""
---

Raphael sits on top of your desktop as a frosted-glass overlay, watches your
active window context, and tells you — with surgical sarcasm — when you've drifted
off task. When you linger too long on an unapproved window, it locks your screen
and makes you justify the context switch before you can continue.

## Why I built it

Browser blockers are too blunt. They block all of Chrome or none of it, with no
awareness of whether you're reading docs or scrolling a feed. I wanted something
that understood *what* I was looking at, not just *where*.

## Highlights

- Parses the exact browser tab title or file path via XWayland window properties — not just the process name.
- Groq-backed LLM classifier categorizes activity in real time and generates context-aware advisor commentary.
- Distraction challenge forces a typed justification before session metrics resume.
- Mid-session rules via a Chat Console — no config file edits required.
- Local Chart.js dashboard at `localhost:5757` showing focus timeline, window breakdown, and session goals.