---
theme: seriph
background: https://cover.sli.dev
title: OpenClaw & Agent Sandbox
info: |
  ## OpenClaw & Agent Sandbox
  Open-Source AI Agents: From Personal Assistant to Secure Execution
class: text-center
drawings:
  persist: false
transition: slide-left
mdc: true
---

# OpenClaw & Agent Sandbox

**Open-Source AI Agents: From Personal Assistant to Secure Execution**

<div class="abs-br m-6 text-sm opacity-50">
  CSE201 Paper Presentation
</div>

<div class="abs-bl m-6 text-sm opacity-50">
  Yusheng Zheng (yzhen165@ucsc.edu)
  <br>
  PhD Student
</div>

<!--
Today I'll present two projects at the frontier of open-source AI agents. First, OpenClaw — the fastest-growing open-source AI assistant that crossed 100k GitHub stars in under a week. Then, Agent Sandbox — the Kubernetes-native primitive for securely running AI agent workloads. Together they illustrate the promise and the peril of autonomous AI agents.
-->

---
transition: fade-out
---

# Roadmap

<div class="grid grid-cols-2 gap-8 mt-6">

<div class="bg-blue-50/80 dark:bg-blue-900/30 p-6 rounded-xl">

### Part I — OpenClaw

* What is OpenClaw?
* Architecture & Core Design
* Use Cases & Ecosystem
* Innovation Highlights
* Security Concerns (CVE-2026-25253)

</div>

<div class="bg-teal-50/80 dark:bg-teal-900/30 p-6 rounded-xl">

### Part II — Agent Sandbox

* Why Do AI Agents Need Sandboxing?
* Agent Sandbox Architecture
* Core APIs & Warm Pools
* Innovation & Design Choices
* Security Model & Isolation
* Lessons & Takeaways

</div>

</div>

<!--
Here's our roadmap. We'll spend the first half on OpenClaw — understanding what it is, how it's built, its use cases, innovations, and the critical security vulnerability that hit it. Then we'll shift to Agent Sandbox, a Kubernetes-native solution for running AI agents securely, covering its architecture, APIs, and security model. We'll close with lessons and takeaways from both projects.
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

```
User ←→ WhatsApp / Telegram / Slack
              ↕
        ┌───────────┐
        │  Gateway   │  (Node.js)
        │  Process   │
        ├───────────┤
        │ Sessions   │
        │ Routing    │
        │ Channels   │
        │ Memory     │
        │ Skills     │
        └───────────┘
              ↕
        LLM Provider
   (Claude / GPT / Ollama)
```

</div>

</div>

<!--
OpenClaw is a free, open-source, autonomous AI assistant. Originally called Clawdbot, it was renamed twice due to trademark issues — first to Moltbot, then to OpenClaw. It's developed by Peter Steinberger, who recently announced he's joining OpenAI and moving the project to an open-source foundation. What sets OpenClaw apart from ChatGPT or Claude's web interface is three things: it's fully open-source under MIT, it's local-first with all memory stored as Markdown files on your machine, and it has an autonomous heartbeat daemon that can act without being prompted. It hit 100k GitHub stars in under a week, making it one of the fastest-growing open-source projects ever.
-->

---

# OpenClaw — Architecture

<div class="mt-2">

The entire system runs as a **single persistent Node.js Gateway process** with five subsystems:

</div>

<div class="grid grid-cols-2 gap-6 mt-4">

<div>

### Gateway Components

| Subsystem | Role |
|-----------|------|
| **Session Manager** | Manages conversation state |
| **Channel Router** | Routes messages across 15+ platforms |
| **Memory Engine** | Semantic search via local SQLite vector index |
| **Skill Runtime** | Executes modular Markdown skill packages |
| **Heartbeat Daemon** | Proactive scheduling without prompts |

</div>

<div>

### Context Retrieval Flow

```
Message In
    ↓
Intent Recognition
    ↓
Semantic Search (SQLite vectors)
    ↓
Context Injection
  (JSONL / Markdown → prompt)
    ↓
LLM Inference
    ↓
Tool Execution
  (shell, browser, files, APIs)
    ↓
Response Out
```

</div>

</div>

<div class="text-xs mt-2 opacity-70">

WebSocket API at `ws://127.0.0.1:18789` · Agent configs = Markdown files · Skills from community ClawHub

</div>

<!--
Under the hood, OpenClaw is refreshingly simple — no microservices, no complex distributed architecture. Everything runs as a single Node.js Gateway process. It has five core subsystems: Session Manager for conversation state, Channel Router for multi-platform messaging, Memory Engine using a local SQLite vector index for semantic search, Skill Runtime for executing modular skill packages, and a Heartbeat Daemon for proactive scheduling. When a message comes in, OpenClaw identifies the intent, performs semantic search to retrieve relevant context from local Markdown and JSONL files, injects that context into the prompt, sends it to the LLM, and then executes any tool calls — shell commands, browser automation, file operations, and more.
-->

---

# OpenClaw — Use Cases & Ecosystem

<div class="grid grid-cols-3 gap-4 mt-4">

<div class="bg-gray-50/80 dark:bg-gray-800/60 p-4 rounded-xl">

### Personal Assistant

- Calendar & task management
- Email drafting & replies
- Smart home control
- Cross-app orchestration (Notes, Reminders, Notion, Trello)

</div>

<div class="bg-gray-50/80 dark:bg-gray-800/60 p-4 rounded-xl">

### Developer Workflows

- Automated debugging & DevOps
- GitHub integration & PR management
- Cron-scheduled jobs & webhooks
- Codebase management

</div>

<div class="bg-gray-50/80 dark:bg-gray-800/60 p-4 rounded-xl">

### Autonomous Tasks

- Web scraping & form filling
- Browser automation
- Price negotiation (car buying!)
- Proactive monitoring & alerts

</div>

</div>

<div class="mt-6">

### Multi-Channel Support (15+ Platforms)

`WhatsApp` · `Telegram` · `Slack` · `Discord` · `Signal` · `iMessage` · `Google Chat` · `MS Teams` · `Matrix` · `Zalo` · `WebChat` · `macOS` · `iOS` · `Android`

</div>

<!--
OpenClaw's use cases span three main categories. First, as a personal assistant — it manages your calendar, drafts emails, controls smart home devices, and orchestrates across apps like Notion and Trello, all from a single chat interface. Second, for developer workflows — it integrates directly with GitHub, automates DevOps tasks, runs cron jobs, and manages codebases. Third, and perhaps most impressively, it handles autonomous tasks. There's a famous case where a developer tasked OpenClaw with buying a car — the agent scraped dealer inventories, filled out forms, and negotiated a price 4,200 dollars below sticker over several days. All of this works across 15+ messaging platforms.
-->

---

# OpenClaw — Innovation Highlights

<div class="grid grid-cols-2 gap-6 mt-4">

<div>

### What Makes OpenClaw Different

<div class="space-y-3 mt-2">

<div class="flex items-start gap-2">
  <div class="text-xl">1.</div>
  <div><strong>Local-first AI</strong> — All memory, config, and skills stored as plain Markdown/YAML on your machine. No vendor lock-in.</div>
</div>

<div class="flex items-start gap-2">
  <div class="text-xl">2.</div>
  <div><strong>Proactive Heartbeat</strong> — Autonomous scheduling daemon that acts without being prompted. Enables monitoring, alerts, and recurring tasks.</div>
</div>

<div class="flex items-start gap-2">
  <div class="text-xl">3.</div>
  <div><strong>Chat-as-UI</strong> — Uses existing messaging apps as the interface. Zero new UIs to learn.</div>
</div>

<div class="flex items-start gap-2">
  <div class="text-xl">4.</div>
  <div><strong>Modular Skill System</strong> — Community-driven ClawHub with hundreds of Markdown-based skill packages. Skills are the "hands" of OpenClaw.</div>
</div>

<div class="flex items-start gap-2">
  <div class="text-xl">5.</div>
  <div><strong>Model-Agnostic</strong> — Swap between Claude, GPT, Gemini, or local models via Ollama without rearchitecting.</div>
</div>

</div>

</div>

<div class="flex flex-col justify-center">

### Growth & Impact

<div class="bg-gradient-to-br from-blue-50 to-teal-50 dark:from-blue-900/30 dark:to-teal-900/30 p-6 rounded-xl mt-2">

- **60k+** stars in first 72 hours
- **100k+** stars in first week
- **One of the fastest-growing** OSS repos in GitHub history
- **Community skills** ecosystem (ClawHub)
- **MCP integration** for standardized tool layer
- **Voice mode** with ElevenLabs (macOS/iOS/Android)

</div>

</div>

</div>

<!--
What makes OpenClaw truly innovative? Five things. First, it's local-first — all your data stays on your machine as plain files, no vendor lock-in. Second, the proactive heartbeat daemon — most AI assistants wait for you to talk to them, but OpenClaw can wake up on a schedule and act autonomously. Third, the chat-as-UI paradigm — instead of building yet another web interface, it lives in the messaging apps you already use. Fourth, the modular skill system — hundreds of community-contributed skill packages on ClawHub, all defined as simple Markdown files. Fifth, it's completely model-agnostic — you can swap your LLM provider without changing anything else. The community response has been extraordinary — 100k GitHub stars in under a week.
-->

---

# OpenClaw — Security Concerns

<div class="mt-2">

### CVE-2026-25253: 1-Click RCE via Auth Token Exfiltration (CVSS 8.8)

</div>

<div class="grid grid-cols-2 gap-6 mt-2">

<div>

### Attack Chain

```
1. Victim clicks malicious link
        ↓
2. Browser redirected to OpenClaw UI
   with attacker-controlled gatewayUrl
        ↓
3. Client auto-connects WebSocket
   to attacker's server
        ↓
4. Auth token sent to attacker
        ↓
5. Attacker connects to victim's
   local ws://localhost:18789
        ↓
6. Disables sandbox & approval:
   exec.approvals.set → off
   config.patch → host execution
        ↓
7. node.invoke → arbitrary RCE
```

</div>

<div>

### Key Findings

- **Root cause**: `gatewayUrl` accepted from query string without validation
- **No origin check** on WebSocket connections
- **21,000+** exposed instances found by Censys
- **Affects even local** instances via browser-to-localhost trust
- Discovered by DepthFirst (Mav Levin), Jan 2026
- **Fixed in** version 2026.1.29

### Lessons Learned

- Agentic AI = **expanded attack surface**
- Prompt injection is the new SQL injection
- Third-party skills can exfiltrate data (Cisco research)
- **Self-hosted ≠ secure** without proper hardening
- Browser-to-localhost trust is dangerous

</div>

</div>

<!--
Now for the critical security story. In January 2026, researchers at DepthFirst discovered CVE-2026-25253 — a one-click remote code execution vulnerability with a CVSS score of 8.8. The attack is elegant and terrifying. The victim clicks a malicious link. The browser is redirected to OpenClaw's web UI with a manipulated gatewayUrl parameter. Because the client automatically connects to whatever URL is in the query string, the victim's auth token is immediately sent to the attacker. The attacker then performs cross-site WebSocket hijacking — because OpenClaw doesn't validate the origin header, the attacker's JavaScript can connect to the victim's local instance. Using the stolen token, they disable the sandbox and approval mechanisms, then execute arbitrary commands. Censys found over 21,000 OpenClaw instances exposed on the public internet. The broader lesson: agentic AI agents represent an entirely new attack surface, and prompt injection is becoming the SQL injection of the AI era.
-->

---
transition: slide-up
---

# Why Do AI Agents Need Sandboxing?

<div class="grid grid-cols-2 gap-6 mt-4">

<div>

### The Problem

AI agents generate and execute **unpredictable code**. Standard containers share the host kernel — a kernel vulnerability or misconfiguration can allow **container escape**.

<div class="bg-red-50/80 dark:bg-red-900/20 p-4 rounded-xl mt-4">

**Risks without proper sandboxing:**

- Container escape via kernel exploits
- Data exfiltration from host filesystem
- Resource exhaustion (CPU/memory/PID bombs)
- Lateral movement to other workloads
- Supply chain attacks via malicious skills

</div>

</div>

<div>

### Isolation Technologies Spectrum

```
Strongest ─────────────────── Weakest

┌─────────────┐
│  MicroVMs   │  Firecracker, Kata
│  (own kernel)│  Containers
└──────┬──────┘
       │
┌──────┴──────┐
│   gVisor    │  User-space kernel
│ (syscall    │  intercept
│  filtering) │
└──────┬──────┘
       │
┌──────┴──────┐
│  Hardened   │  Namespaces +
│  Containers │  cgroups + seccomp
└──────┬──────┘
       │
┌──────┴──────┐
│  Standard   │  ⚠ Insufficient
│  Containers │  for AI agents
└─────────────┘
```

</div>

</div>

<!--
Before diving into Agent Sandbox, let's understand why AI agents need sandboxing in the first place. Unlike traditional software, AI agents generate and execute unpredictable code. Standard containers share the host kernel, and a single vulnerability can lead to container escape. Without proper sandboxing, you face risks like data exfiltration, resource exhaustion through CPU or memory bombs, lateral movement to other workloads, and supply chain attacks through malicious skills — exactly what we saw with OpenClaw. The isolation technology spectrum ranges from standard containers, which are insufficient for AI agents, through hardened containers with cgroups and seccomp, to gVisor which intercepts syscalls in user space, to full microVMs like Firecracker with dedicated kernels.
-->

---

# Agent Sandbox — Architecture

<div class="mt-2">

**Agent Sandbox** is a Kubernetes-native primitive from `kubernetes-sigs` for securely running AI agent workloads.

</div>

<div class="grid grid-cols-2 gap-6 mt-2">

<div>

### System Architecture

```
┌──────────────────────────────────┐
│         Kubernetes Cluster        │
│                                   │
│  ┌─────────────┐  ┌───────────┐  │
│  │  Sandbox    │  │ WarmPool  │  │
│  │  Controller │  │Orchestratr│  │
│  └──────┬──────┘  └─────┬─────┘  │
│         │               │         │
│  ┌──────┴───────────────┴──────┐  │
│  │      Sandbox Instances      │  │
│  │  ┌──────┐ ┌──────┐ ┌─────┐ │  │
│  │  │gVisor│ │gVisor│ │ Kata│ │  │
│  │  │ Pod  │ │ Pod  │ │ Pod │ │  │
│  │  └──────┘ └──────┘ └─────┘ │  │
│  └─────────────────────────────┘  │
│                                   │
│  ┌─────────────────────────────┐  │
│  │    AI Frameworks (ADK,      │  │
│  │    LangChain, etc.)         │  │
│  │    ↕ SandboxClaim API       │  │
│  └─────────────────────────────┘  │
└──────────────────────────────────┘
```

</div>

<div>

### Key Properties

| Property | Detail |
|----------|--------|
| **Isolation** | gVisor (user-space kernel) + Kata Containers |
| **Startup** | Sub-second via Warm Pools |
| **Identity** | Stable, VM-like per sandbox |
| **Storage** | Persistent state across restarts |
| **Scale** | 10,000s of parallel sandboxes |
| **Observability** | OpenTelemetry tracing built-in |
| **Networking** | NetworkPolicy support |
| **Open Source** | Kubernetes SIG Apps subproject |

### Announced at

KubeCon NA 2025, by Google — built as open-source, **not** a proprietary GKE feature.

</div>

</div>

<!--
Agent Sandbox is a Kubernetes-native primitive, a new CRD and controller from the kubernetes-sigs community, designed specifically for running AI agent workloads securely. It was announced at KubeCon NA 2025 and is intentionally open-source — not a proprietary GKE feature. The architecture introduces a Sandbox Controller that manages isolated pod instances, and a Warm Pool Orchestrator that pre-creates pods for sub-second startup. Each sandbox runs with gVisor — a user-space kernel that intercepts syscalls — or Kata Containers for even stronger VM-level isolation. AI frameworks like ADK or LangChain interact with sandboxes through the SandboxClaim API, abstracting away the provisioning complexity. It can scale to tens of thousands of parallel sandboxes with full OpenTelemetry observability.
-->

---

# Agent Sandbox — Core APIs & Warm Pools

<div class="grid grid-cols-2 gap-6 mt-4">

<div>

### Three Core CRDs

<div class="space-y-3">

<div class="bg-blue-50/80 dark:bg-blue-900/30 p-3 rounded-lg">

**Sandbox** — The core workload resource. Defines an isolated, stateful, single-container environment for agent execution.

</div>

<div class="bg-teal-50/80 dark:bg-teal-900/30 p-3 rounded-lg">

**SandboxTemplate** — A blueprint that specifies the base image, resource limits, and security policies. Reusable across many sandboxes.

</div>

<div class="bg-purple-50/80 dark:bg-purple-900/30 p-3 rounded-lg">

**SandboxClaim** — A transactional request from AI frameworks (ADK, LangChain) to provision an execution environment. Abstracts away infrastructure.

</div>

</div>

</div>

<div>

### Warm Pool Mechanism

```
SandboxWarmPool CRD
        │
        ↓
Pre-warm N pods (gVisor/Kata)
        │
        ↓
Pods in "Ready" state, idle
        │
        ↓
SandboxClaim arrives
        │
        ↓
Controller claims a warm pod
  (< 1 second startup!)
        │
        ↓
Pod transitions to active Sandbox
        │
        ↓
On release → recycle or terminate
  (configurable shutdown policy)
```

<div class="text-sm mt-4 bg-green-50/80 dark:bg-green-900/20 p-3 rounded-lg">

**90% improvement** over cold starts. Critical for interactive agent workloads where latency matters.

</div>

</div>

</div>

<!--
Agent Sandbox introduces three core Kubernetes Custom Resource Definitions. The Sandbox CRD is the core workload — it defines an isolated, stateful, single-container environment. The SandboxTemplate is a reusable blueprint specifying the base image, resource limits, and security policies. The SandboxClaim is the transactional API that AI frameworks use to request a sandbox — frameworks like ADK or LangChain simply create a claim and the controller handles all the provisioning. The key innovation is the Warm Pool mechanism. A SandboxWarmPool CRD maintains a pool of pre-warmed pods in a ready state. When a SandboxClaim arrives, the controller instantly claims a warm pod — achieving sub-second startup, a 90% improvement over cold starts. This is critical for interactive agent workloads where users expect instant responses.
-->

---

# Agent Sandbox — Innovation & Security Model

<div class="grid grid-cols-2 gap-6 mt-4">

<div>

### Innovation Highlights

<div class="space-y-2 mt-2 text-sm">

<div class="flex items-start gap-2">
  <div class="font-bold text-blue-500">1.</div>
  <div><strong>Kubernetes-native</strong> — Not a bolt-on; extends K8s with first-class CRDs for agent workloads.</div>
</div>

<div class="flex items-start gap-2">
  <div class="font-bold text-blue-500">2.</div>
  <div><strong>Warm Pools</strong> — Sub-second startup for pre-warmed sandboxes. Solves the cold-start problem.</div>
</div>

<div class="flex items-start gap-2">
  <div class="font-bold text-blue-500">3.</div>
  <div><strong>Declarative Security</strong> — Security policies defined in templates, not bolted on after deployment.</div>
</div>

<div class="flex items-start gap-2">
  <div class="font-bold text-blue-500">4.</div>
  <div><strong>Framework Agnostic</strong> — SandboxClaim API works with any AI framework (ADK, LangChain, etc.).</div>
</div>

<div class="flex items-start gap-2">
  <div class="font-bold text-blue-500">5.</div>
  <div><strong>Multi-tenant Ready</strong> — Strong isolation between sandboxes; designed for shared clusters.</div>
</div>

</div>

</div>

<div>

### Zero-Trust Security Model

<div class="bg-red-50/80 dark:bg-red-900/20 p-4 rounded-xl mt-2 text-sm">

**Principle**: All AI-generated code is treated as potentially malicious.

</div>

<div class="mt-3 text-sm space-y-2">

**Process Isolation**
- gVisor intercepts all syscalls in user-space
- Kata Containers provide full VM-level isolation

**Resource Isolation**
- CPU/memory cgroups per sandbox
- PID limits prevent fork bombs
- OOM kill settings protect the host

**Network Isolation**
- Kubernetes NetworkPolicy per sandbox
- No default egress to other pods

**Storage Isolation**
- Per-sandbox persistent volumes
- No shared filesystem access

</div>

</div>

</div>

<!--
What makes Agent Sandbox innovative? Five things stand out. First, it's truly Kubernetes-native — not a bolt-on tool but a first-class extension of the Kubernetes API with proper CRDs. Second, the warm pool mechanism solves the cold-start problem that plagues container-based sandboxes. Third, security is declarative — policies are defined in templates upfront, not added as an afterthought. Fourth, it's framework-agnostic through the SandboxClaim API. Fifth, it's designed for multi-tenancy from day one with strong inter-sandbox isolation. The security model follows zero-trust principles: all AI-generated code is treated as potentially malicious. It provides four layers of isolation — process isolation through gVisor or Kata, resource isolation through cgroups, network isolation through NetworkPolicy, and storage isolation through per-sandbox volumes.
-->

---

# Lessons & Takeaways

<div class="grid grid-cols-2 gap-6 mt-4">

<div>

### From OpenClaw

<div class="space-y-2 mt-2 text-sm">

- **Local-first AI** is viable and desirable — users want control over their data
- **Chat-as-UI** reduces friction dramatically — meet users where they already are
- **Rapid OSS growth** is possible when you solve a real pain point
- **Security is non-negotiable** — one CVE can compromise thousands of instances
- **Agentic AI** creates fundamentally new attack surfaces (prompt injection, skill poisoning)
- Self-hosted ≠ secure; **defense in depth** is essential

</div>

</div>

<div>

### From Agent Sandbox

<div class="space-y-2 mt-2 text-sm">

- **Standard containers** are insufficient for untrusted AI code execution
- **Warm pools** make secure isolation practical (sub-second startup)
- **Declarative security** is better than post-hoc hardening
- **Kubernetes-native** approach enables ecosystem integration
- **Zero-trust for AI** — treat all generated code as adversarial
- **cgroups + gVisor + network policies** = defense in depth for agents

</div>

</div>

</div>

<div class="bg-gradient-to-r from-blue-50 to-teal-50 dark:from-blue-900/20 dark:to-teal-900/20 p-4 rounded-xl mt-4 text-center">

**The future of AI agents requires both powerful autonomy (OpenClaw) and robust isolation (Agent Sandbox).**

Giving agents more capability without stronger security guarantees is a recipe for disaster.

</div>

<!--
Let me wrap up with key takeaways from both projects. From OpenClaw, we learn that local-first AI is not just viable but desirable, that chat-as-UI dramatically reduces friction, and that rapid open-source growth happens when you solve real problems. But the security story is sobering — one CVE affected tens of thousands of instances, and the broader lesson is that agentic AI creates fundamentally new attack surfaces. From Agent Sandbox, we learn that standard containers are simply not enough for running untrusted AI code, that warm pools make secure isolation practical by solving the cold-start problem, and that declarative security embedded in templates is far better than post-hoc hardening. The fundamental insight connecting both projects is this: the future of AI agents requires both powerful autonomy and robust isolation. Giving agents more capability without stronger security guarantees is a recipe for disaster.
-->

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

[Agent Sandbox GitHub](https://github.com/kubernetes-sigs/agent-sandbox) · [Agent Sandbox Docs](https://agent-sandbox.sigs.k8s.io/) · [Google OSS Blog](https://opensource.googleblog.com/2025/11/unleashing-autonomous-ai-agents-why-kubernetes-needs-a-new-standard-for-agent-execution.html)

</div>

<!--
Thank you for listening. I'm happy to take any questions about OpenClaw, Agent Sandbox, or the broader landscape of AI agent security.
-->
