---
theme: seriph
title: OpenClaw
info: |
  ## OpenClaw
  Open-Source AI Agents: Personal Assistants, Security, and Open Research Questions
class: text-center
drawings:
  persist: false
transition: slide-left
mdc: true
colorSchema: light
---

# OpenClaw

**Open-Source AI Agents: Personal Assistants, Security, and Open Research Questions**

<div class="abs-bl m-6 text-sm opacity-50">
  Yusheng Zheng (yzhen165@ucsc.edu)
  <br>
  PhD Student
</div>

<!--
Today I'll present OpenClaw, the fastest-growing open-source AI assistant that crossed 100k GitHub stars in under a week, including its architecture, innovations, and a critical security vulnerability.
-->

---
transition: fade-out
---

# Roadmap

<div class="bg-blue-50/80  p-6 rounded-xl mt-6">

### OpenClaw

* What is OpenClaw?
* Architecture & Core Design
* Use Cases & Innovation
* Security Overview & CVEs

</div>

<!--
Here's our roadmap. We'll cover OpenClaw: understanding what it is, how it's built, its use cases, innovations, and the security crisis including multiple CVEs and a supply chain attack.
-->

---

# What is OpenClaw?

<div class="grid grid-cols-5 gap-6 mt-4">

<div class="col-span-3">

**OpenClaw** (formerly Clawdbot → Moltbot → OpenClaw) is a free, open-source, autonomous AI agent developed by Peter Steinberger.

<div class="mt-4 space-y-2 text-sm">

- **MIT licensed**, fully open-source
- **Local-first**: memory stored as Markdown/YAML on your machine
- **Autonomous**: heartbeat daemon acts without prompting
- **Model-agnostic**: Claude, GPT, Gemini, Ollama, etc.
- **100k+ GitHub stars** in < 1 week (Jan 2026)
- Creator joined OpenAI; project moving to open-source foundation

</div>

</div>

<div class="col-span-2 flex flex-col justify-center">

<img src="/images/00-github-star-history.webp" class="rounded-lg shadow" />

</div>

</div>

<!--
OpenClaw is a free, open-source, autonomous AI assistant. Originally called Clawdbot, it was renamed twice due to trademark issues. It's developed by Peter Steinberger, who recently announced he's joining OpenAI and moving the project to an open-source foundation. What sets it apart: fully open-source under MIT, local-first with all memory stored as Markdown files, and an autonomous heartbeat daemon that can act without being prompted. 100k GitHub stars in under a week.
-->

---

# OpenClaw: Use Cases & Innovation

<div class="grid grid-cols-3 gap-3 mt-2 text-sm">

<div class="bg-gray-50/80 p-3 rounded-xl">

### Personal Assistant

- Calendar & task management
- Email drafting & replies
- Smart home control
- Cross-app orchestration

</div>

<div class="bg-gray-50/80 p-3 rounded-xl">

### Developer Workflows

- Automated debugging & DevOps
- GitHub integration & PR management
- Cron-scheduled jobs & webhooks

</div>

<div class="bg-gray-50/80 p-3 rounded-xl">

### Autonomous Tasks

- Web scraping & form filling
- Browser automation
- Price negotiation (car buying!)

</div>

</div>

<div class="bg-blue-50/80 p-3 rounded-xl mt-3 text-sm">

### My Setup: 3 Agents, 3 Models

Initially used Claude, but account got banned. Switched to **Kimi, MiniMax, GLM** at **1/5~1/10 the cost**.

- Email handling
- Development tasks
- Open-source community maintenance
- Daily work
- Info search

</div>

<!--
OpenClaw's use cases span personal assistant, developer workflows, and fully autonomous tasks. I personally run 3 OpenClaw instances with different models after my Claude account got banned. Kimi, MiniMax, and GLM at 1/5 to 1/10 the cost.
-->

---
layout: center
---

# OpenClaw: System Architecture

<img src="/images/01-system-architecture.png" class="h-110 mx-auto" />

---
layout: center
---

# OpenClaw: Prompt Composition

<img src="/images/03-prompt-composition.png" class="w-full mx-auto" />

---

# What Makes OpenClaw Different

<div class="grid grid-cols-3 gap-2 mt-2 text-xs leading-tight">

<div class="bg-blue-50/80 p-2 rounded-lg">

**Heartbeat**
<br>Always-on background daemon; agent proactively monitors, responds, and acts without prompting
<br>- continue do task without stop (unlike claude code, codex...)

</div>

<div class="bg-blue-50/80 p-2 rounded-lg">

**Markdown = Memory & Persona**
<br>Personality, preferences, long-term memory all stored as Markdown; agent reads and edits them to evolve in the long run.
<br>- local first, every memory is editable

</div>

<div class="bg-blue-50/80 p-2 rounded-lg">

**Descriptive Skills, Not Code**
<br>Give permissions, describe the goal; agent builds its own tools and writes one-time code to complete tasks
<br>- workflow is dead

</div>

<div class="bg-blue-50/80 p-2 rounded-lg">

**Everything is CLI + Computer Use**
<br>Interactions through command line; naturally composable, scriptable; use Computer Use tools to do things like a human
<br>- Orchestrate other agents (Gemini, Claude, Codex, etc.) via CLI
<br>- Make tools with cli

</div>

<div class="bg-blue-50/80 p-2 rounded-lg">

**Skills Ecosystem**
<br>ClawHub marketplace for modular, shareable skills; community-driven extensibility
<br>- lots of risks

</div>

</div>

---

# OpenClaw: Security Overview

<div class="mt-2">

</div>

<div class="grid grid-cols-2 gap-6 mt-3">

<div>

### The Threat Landscape

<div class="space-y-2 text-sm">

<div class="bg-red-50/80  p-3 rounded-lg">

**Self-hosted agents** execute code with durable credentials and process untrusted input, creating dual supply chain risk

</div>

<div class="bg-red-50/80  p-3 rounded-lg">

**21,000+ → 42,665** exposed instances (Censys/Dayan); 5,194 actively vulnerable; 93.4% with auth bypass

</div>

<div class="bg-red-50/80  p-3 rounded-lg">

**ClawHub supply chain**: 341 malicious skills (ClawHavoc campaign), grew to **824+** by Feb 16; ~20% of ecosystem compromised

</div>

</div>

</div>

<div>

### Three Critical Dimensions

<div class="space-y-3 text-sm mt-1">

<div class="bg-blue-50/80  p-3 rounded-lg">

**1. Identity**: Gateway tokens = persistent credentials; token theft → full system access; no origin validation on WebSocket

</div>

<div class="bg-blue-50/80  p-3 rounded-lg">

**2. Isolation**: Skills & external instructions converge in same runtime; sandbox bypass trivial once auth compromised

</div>

<div class="bg-blue-50/80  p-3 rounded-lg">

**3. Runtime Risk**: Prompt injection = new SQL injection; agents execute arbitrary shell commands; governance lags adoption

</div>

</div>

</div>

</div>

<!--
OpenClaw's security situation is severe across three dimensions identified by Microsoft's security blog. Identity: gateway tokens act as persistent credentials with no origin validation. Isolation: skills and external instructions converge in the same runtime, so sandbox bypass is trivial. Runtime risk: prompt injection is the new SQL injection. Over 42,000 instances were exposed, with 93.4% exhibiting auth bypass. The ClawHub supply chain attack compromised 341 skills initially, growing to over 824, distributing Atomic Stealer malware targeting macOS machines.
-->

---

# OpenClaw: CVE Timeline (Jan–Feb 2026)

<div class="mt-4 text-sm">

| CVE / Advisory | Type | CVSS | Summary |
|----------------|------|------|---------|
| **CVE-2026-25253** | RCE | 8.8 | 1-Click auth token exfiltration via WebSocket hijacking |
| **CVE-2026-25157** | Command Injection | 7.8 | Unescaped SSH project path → arbitrary command execution |
| **CVE-2026-26322** | SSRF | 7.6 | Gateway tool endpoint allows internal network probing |
| **CVE-2026-26319** | Auth Bypass | 7.5 | Missing Telnyx webhook authentication |
| **CVE-2026-26329** | Path Traversal | High | Browser upload writes outside intended directory |
| **GHSA-56f2** | SSRF | 7.6 | Image tool endpoint allows internal requests |
| **GHSA-pg2v** | SSRF | 6.5 | Urbit auth endpoint allows internal requests |
| **GHSA-c37p** | Auth Bypass | 6.5 | Twilio webhook signature validation bypass |

</div>


<!--
Here's the full CVE timeline. CVE-2026-25253 is the headline: a one-click RCE with CVSS 8.8 via auth token exfiltration and cross-site WebSocket hijacking. CVE-2026-25157 is SSH command injection via unescaped project paths, CVSS 7.8. Then Endor Labs disclosed six more: SSRF in the Gateway tool and Image tool, missing webhook authentication for Telnyx and Twilio, path traversal in browser upload, and SSRF in Urbit authentication. The pattern is clear: validation was missing at every layer. Eight vulnerabilities in under a month, affecting identity, isolation, and runtime.
-->

---

# OpenClaw: Open Research Questions

<div class="mt-3 space-y-2 text-sm">

- **How do we secure autonomous agents** that hold persistent personal credentials and execute arbitrary code? What's the threat model?
- **Is current OS resource management sufficient** for always-on agents running 24/7 via heartbeat daemons, and can create their own tools? Cgroups, schedulers, isolation...?
- **How do we build trust in skill ecosystems** when skills are descriptive, not code, and traditional code review doesn't apply? (341+ malicious skills)
- **What identity and access models** do we need for agents that act on behalf of users across multiple systems?
- **How do we balance autonomy and safety** as agents gain more capabilities (CLI, tool-building, computer use)? (People got their email deleted, password or personal info leaked by agent; but if not automatic, it's slow and inconvenient)

</div>

---
layout: center
class: text-center
---

# Thank You

<div class="mt-6 text-lg">

Questions?

</div>

<div class="mt-8 text-sm opacity-60">

**References**

[OpenClaw GitHub](https://github.com/openclaw/openclaw) · [OpenClaw Blog](https://openclaw.ai/blog/introducing-openclaw) · [CVE-2026-25253 (NVD)](https://nvd.nist.gov/vuln/detail/CVE-2026-25253)

</div>

<!--
Thank you for listening. I'm happy to take any questions about OpenClaw or the broader landscape of AI agent security.
-->
