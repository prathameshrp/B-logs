## The Blog Post (`_posts/2026-06-29-introducing-raphael-the-sardonic-adhd-hud.md`)

```markdown
---
title: "Introducing Raphael: The Sardonic ADHD Advisor Inside Your Desktop HUD"
date: 2026-06-29 10:00:00 +0530
tags: [KDE, Plasma, Python, AI, Productivity]
excerpt: "Meet Raphael: a cockpit-style HUD widget for KDE Plasma that acts as an aggressive, sardonically supportive ADHD cognitive advisor."
cover: /assets/img/raphael-hud.png
---

We've all been there. You sit down to update code or write a technical doc. You open a browser tab to check a reference, and twenty minutes later, you find yourself deep in a Wikipedia rabbit hole reading about the engineering of medieval trebuchets. 

Standard website blockers don’t work for engineers or power users. They are too easy to turn off, too rigid, and completely lack context. If you use a browser blocker, it blocks all of Chrome or none of it—incapable of separating a critical documentation page from a social media feed.

That is why I built **Raphael**. 

Raphael is a sardonically supportive **ADHD cognitive advisor** that integrates directly into your Linux desktop environment as a high-tech, cockpit-style HUD. It watches your active workspace context, dynamically categorizes your behavior using an LLM pipeline, calls out your focus slippages with ruthless surgical wit, and locks your screen with interactive psychological challenges when you drift too far off track.

---

## The Core Concept: A Hardware-Informed Focus Matrix

Raphael splits its footprint between a lightweight desktop presentation layer and an analytics core daemon:

1. **The QML HUD Frontend:** A set of custom, frosted-glass overlay panels (`leftQuotePanel`, `rightInsightPanel`) pinned above your windows using **KDE Plasma 6 (Qt Quick/QML)**. It streams live advisor observations, active telemetry data, and your real-time **Focus Efficiency Rating**.
2. **The Flask Core Daemon:** A zero-overhead background engine that polls system states every few seconds. It parses active window properties, handles tracking triggers, serves a local analytical telemetry hub, and runs real-time classification requests against a blazing-fast **Groq AI pipeline**.

---

## Key Performance Features

### 🔍 Deep Window & Tab Dissection
Most focus trackers simply read standard process strings like `google-chrome` or `vscodium`. Raphael uses direct active window parsing (optimized for XWayland environments) to extract the **exact browser tab title** or current file pathway, discarding the underlying application wrap entirely. Raphael knows whether you're browsing `github.com/pulls` or reading an article on an entertainment blog.

### ⚡ The Distraction Challenge
When the polling module detects you've lingered on an unapproved window for longer than your defined threshold (e.g., 30 seconds), it overrides your layout with an intense focus interruption. Instead of a basic warning banner, Raphael fires a pop-up and an alert mechanism that forces you to textually justify your action:

> *"Explain exactly how this tab aids your immediate deployment target, or return to work."*

You don't get a free pass; your session logging metrics don't resume until you justify your shift or exit the window.

### 🧠 Dynamic Mid-Session Context Shifting
You don't have to rebuild configuration files to tweak your environment. Raphael listens to dynamic natural language updates. Using the integrated **Chat Console**, you can alter rules mid-session on the fly:
* *"Remind me to stretch every 20 minutes."*
* *"From now on, ignore my Spotify track changes."*
* *"Escalate the aggression matrix; I'm drifting."*

---

## Architecture Blueprint

The framework maps cleanly to modern Linux system architectures, relying on a robust pipeline across data storage, backend monitoring, and Qt-native presentation bindings:


```

raphael/
├── run.sh                 # Environment setup and daemon launch controller
├── daemon.log             # Main background log output
├── contents/
│   ├── ui/
│   │   ├── main.qml       # Core Plasma widget and control surface
│   │   ├── ChatPanel.qml  # Interactivity shell for rule overrides
│   │   └── daemon/
│   │       ├── raphael_core_daemon.py  # Active parser, Flask app, Groq wrapper
│   │       └── dashboard.html          # Local analytics telemetry asset
│   └── config/
│       └── main.xml       # Preserved state schemas for the desktop layer

```

The underlying pipeline relies on telemetry loops that continuously report system statistics, which look like this under the hood:

```liquid
{% capture demo %}
// A look inside the QML telemetry parsing engine
function syncNetworkPayload() {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "[http://127.0.0.1:5757/telemetry_v3?caring=](http://127.0.0.1:5757/telemetry_v3?caring=)" + caringLevel + "&ai_track=" + aiWindowTracking);
    xhr.onreadystatechange = function() {
        if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
            var res = JSON.parse(xhr.responseText);
            
            // Push direct streaming attributes to HUD variables
            sharedState.currentQuote = res.quote.text;
            sharedState.focusEfficiencyText = (res.efficiency * 100) + "% FOCUS";
            
            console.log("HUD Matrix Sync Complete // Status: " + res.status);
        }
    }
    xhr.send();
}
{% endcapture %}
{% include playground.html title="QML Network Protocol Sync" code=demo %}

```

---

## The Web Telemetry Dashboard

If you want to view longer-term behavioral patterns, the local Flask daemon hosts a full tracking dashboard natively at `http://127.0.0.1:5757/dashboard`.

Using **Chart.js**, the cockpit aggregates session statistics into visible pipelines:

* **Focus Timeline:** A minute-by-minute historical view charting active focus against structural distractions.
* **Window Breakdown:** A clean, structural doughnut graph showing time distribution by file pathways, browser tabs, and applications.
* **Session Goals:** Dynamic, checkable item metrics generated on session creation.

---

## Deployment Mechanics

To deploy the workspace to your local environment, ensure you are running **KDE Plasma 6.0+** and your terminal environment has a valid API token set up:

```bash
# 1. Clone the core layout
git clone [https://github.com/prathameshrp/Raphael.git](https://github.com/prathameshrp/Raphael.git)
cd Raphael

# 2. Bind your execution token
export GROQ_API_KEY="your_secure_api_key_here"

# 3. Fire up the orchestration runner
chmod +x run.sh
./run.sh

```

The setup script checks running port constraints, terminates old instances safely, sets up file structures, and activates the background python process. From there, simply add the **Raphael Widget** straight from your system's desktop panel tool picker.

If you make modifications to layout files or want to check raw data behaviors, you can hard-reload your Plasma window components without breaking the backend data logs:

```bash
killall plasmashell && kstart plasmashell

```

---

## Open Source Blueprint

Raphael was built for those of us who need more than a simple stopwatch to stay on track. If you want to configure custom modules, tweak the AI cognitive persona rules, or optimize the Wayland window reading extensions, come check out the open-source repository!

👉 **[GitHub - prathameshrp/Raphael](https://github.com/prathameshrp/Raphael)**

*Got feature ideas or tailored rulesets? Open an issue or drop a PR! If Raphael has successfully guilted you back into finishing your codebase today, consider dropping a ⭐️ on the project.*

```

```