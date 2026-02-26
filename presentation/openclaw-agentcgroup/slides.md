---
theme: seriph
title: OpenClaw & AgentCgroup
info: |
  ## OpenClaw & AgentCgroup
  Open-Source AI Agents: Personal Assistants, Resource Characterization, and OS-Level Control
class: text-center
drawings:
  persist: false
transition: slide-left
mdc: true
colorSchema: light
---

# OpenClaw & AgentCgroup

**Open-Source AI Agents: Personal Assistants, Resource Characterization, and OS-Level Control**

<div class="abs-bl m-6 text-sm opacity-50">
  Yusheng Zheng (yzhen165@ucsc.edu)
  <br>
  PhD Student
</div>

<!--
Today I'll present two projects at the frontier of open-source AI agents. First, OpenClaw — the fastest-growing open-source AI assistant that crossed 100k GitHub stars in under a week, including its architecture, innovations, and a critical security vulnerability. Then, AgentCgroup — a research paper and open-source tool that characterizes OS-level resource consumption of AI agents and proposes an eBPF-based resource controller. Together they illustrate the promise and the peril of autonomous AI agents, and how the OS must evolve to support them.
-->

---
transition: fade-out
---

# Roadmap

<div class="grid grid-cols-2 gap-8 mt-6">

<div class="bg-blue-50/80  p-6 rounded-xl">

### Part I — OpenClaw

* What is OpenClaw?
* Architecture & Core Design
* Use Cases & Innovation
* Security Overview & CVEs

</div>

<div class="bg-teal-50/80  p-6 rounded-xl">

### Part II — AgentCgroup

* Motivation: Why Study Agent Resources?
* Resource Characterization (144 tasks)
* Three Critical Mismatches
* eBPF Architecture & Bash Wrapper
* Bidirectional Resource Negotiation
* Evaluation & Takeaways

</div>

</div>

<!--
Here's our roadmap. We'll spend the first half on OpenClaw — understanding what it is, how it's built, its use cases, innovations, and the security crisis including multiple CVEs and a supply chain attack. Then we'll shift to AgentCgroup — a research paper from arXiv that characterizes how AI agents consume OS resources across 144 software engineering tasks and proposes an eBPF-based controller using sched_ext and memcg_bpf_ops. We'll close with lessons from both.
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

# OpenClaw — Use Cases & Innovation

<div class="grid grid-cols-3 gap-4 mt-4">

<div class="bg-gray-50/80  p-4 rounded-xl">

### Personal Assistant

- Calendar & task management
- Email drafting & replies
- Smart home control
- Cross-app orchestration (Notion, Trello, etc.)

</div>

<div class="bg-gray-50/80  p-4 rounded-xl">

### Developer Workflows

- Automated debugging & DevOps
- GitHub integration & PR management
- Cron-scheduled jobs & webhooks
- Codebase management

</div>

<div class="bg-gray-50/80  p-4 rounded-xl">

### Autonomous Tasks

- Web scraping & form filling
- Browser automation
- Price negotiation (car buying!)
- Proactive monitoring & alerts

</div>

</div>

<div class="mt-4">

### What Makes OpenClaw Different

<div class="grid grid-cols-5 gap-3 mt-2 text-sm">

<div class="bg-blue-50/80  p-2 rounded-lg text-center">

**Local-first**<br>Data stays on your machine

</div>

<div class="bg-blue-50/80  p-2 rounded-lg text-center">

**Heartbeat**<br>Acts without prompting

</div>

<div class="bg-blue-50/80  p-2 rounded-lg text-center">

**Chat-as-UI**<br>15+ messaging platforms

</div>

<div class="bg-blue-50/80  p-2 rounded-lg text-center">

**Modular Skills**<br>ClawHub ecosystem

</div>

<div class="bg-blue-50/80  p-2 rounded-lg text-center">

**Model-agnostic**<br>Any LLM provider

</div>

</div>

</div>

<!--
OpenClaw's use cases span personal assistant, developer workflows, and fully autonomous tasks — including a famous case where it negotiated a car purchase 4,200 dollars below sticker. Five innovations stand out: local-first data ownership, a proactive heartbeat daemon, chat-as-UI across 15+ messaging platforms, a modular skill system via ClawHub, and complete model-agnosticism. 60k stars in 72 hours, 100k in a week.
-->

---
layout: center
---

# OpenClaw — System Architecture

<img src="/images/01-system-architecture.png" class="h-110 mx-auto" />

---
layout: center
---

# OpenClaw — Prompt Composition

<img src="/images/03-prompt-composition.png" class="w-full mx-auto" />

---

# OpenClaw — Security Overview

<div class="mt-2">

### Identity, Isolation & Runtime Risk (Microsoft Security Blog, Feb 2026)

</div>

<div class="grid grid-cols-2 gap-6 mt-3">

<div>

### The Threat Landscape

<div class="space-y-2 text-sm">

<div class="bg-red-50/80  p-3 rounded-lg">

**Self-hosted agents** execute code with durable credentials and process untrusted input — dual supply chain risk

</div>

<div class="bg-red-50/80  p-3 rounded-lg">

**21,000+ → 42,665** exposed instances (Censys/Dayan); 5,194 actively vulnerable; 93.4% with auth bypass

</div>

<div class="bg-red-50/80  p-3 rounded-lg">

**ClawHub supply chain**: 341 malicious skills (ClawHavoc campaign), grew to **824+** by Feb 16; ~20% of ecosystem compromised

</div>

<div class="bg-red-50/80  p-3 rounded-lg">

**Atomic Stealer (AMOS)** distributed via malicious skills targeting macOS always-on machines

</div>

</div>

</div>

<div>

### Three Critical Dimensions

<div class="space-y-3 text-sm mt-1">

<div class="bg-blue-50/80  p-3 rounded-lg">

**1. Identity** — Gateway tokens = persistent credentials; token theft → full system access; no origin validation on WebSocket

</div>

<div class="bg-blue-50/80  p-3 rounded-lg">

**2. Isolation** — Skills & external instructions converge in same runtime; sandbox bypass trivial once auth compromised

</div>

<div class="bg-blue-50/80  p-3 rounded-lg">

**3. Runtime Risk** — Prompt injection = new SQL injection; agents execute arbitrary shell commands; governance lags adoption

</div>

</div>

<div class="bg-teal-50/80  p-3 rounded-lg mt-3 text-xs">

**Key insight**: Self-hosted ≠ secure. Governance and runtime isolation are critical as agent systems enter enterprise environments.

</div>

</div>

</div>

<!--
OpenClaw's security situation is severe across three dimensions identified by Microsoft's security blog. Identity: gateway tokens act as persistent credentials with no origin validation. Isolation: skills and external instructions converge in the same runtime, so sandbox bypass is trivial. Runtime risk: prompt injection is the new SQL injection. Over 42,000 instances were exposed, with 93.4% exhibiting auth bypass. The ClawHub supply chain attack compromised 341 skills initially, growing to over 824, distributing Atomic Stealer malware targeting macOS machines.
-->

---

# OpenClaw — CVE Timeline

<div class="mt-2">

### Known Vulnerabilities (Jan–Feb 2026)

</div>

<div class="space-y-2 mt-3">

<div class="grid grid-cols-5 gap-3 text-sm">

<div class="col-span-5 bg-red-50/80  p-3 rounded-xl">

**CVE-2026-25253** — 1-Click RCE via Auth Token Exfiltration &nbsp; `CVSS 8.8` &nbsp; CWE-669

Malicious link → browser redirects to OpenClaw UI with attacker-controlled `gatewayUrl` → client auto-connects WebSocket to attacker → auth token stolen → Cross-Site WebSocket Hijacking to `ws://localhost:18789` → disables sandbox → **arbitrary RCE**. Discovered by DepthFirst, Jan 2026. Fixed in v2026.1.29.

</div>

<div class="col-span-5 bg-orange-50/80  p-3 rounded-xl">

**CVE-2026-25157** — OS Command Injection via SSH Project Path &nbsp; `CVSS 7.8` &nbsp; CWE-78

`sshNodeCommand` constructs shell script without escaping user-supplied project path. When `cd` fails, unescaped path is interpolated into `echo` → **arbitrary command execution on remote SSH host**. Affects macOS menubar app (Remote/SSH mode). Fixed in v2026.1.29.

</div>

<div class="col-span-5 bg-orange-50/80  p-3 rounded-xl grid grid-cols-3 gap-3">

<div>

**CVE-2026-26322** — SSRF in Gateway Tool &nbsp; `CVSS 7.6`

Server-Side Request Forgery allows internal network probing via Gateway tool endpoint.

</div>

<div>

**CVE-2026-26319** — Missing Telnyx Webhook Auth &nbsp; `CVSS 7.5`

No authentication on Telnyx webhook → spoofed messages injected into agent conversations.

</div>

<div>

**CVE-2026-26329** — Path Traversal in Browser Upload &nbsp; `High`

File upload endpoint allows writing outside intended directory via `../` traversal.

</div>

</div>

<div class="col-span-5 bg-yellow-50/80  p-3 rounded-xl grid grid-cols-3 gap-3">

<div>

**GHSA-56f2** — SSRF in Image Tool &nbsp; `CVSS 7.6`

</div>

<div>

**GHSA-pg2v** — SSRF in Urbit Auth &nbsp; `CVSS 6.5`

</div>

<div>

**GHSA-c37p** — Twilio Webhook Bypass &nbsp; `CVSS 6.5`

</div>

</div>

</div>

</div>

<div class="text-xs mt-2 opacity-60">

Sources: Endor Labs (6 new vulns, Feb 2026) · DepthFirst · NVD · GitHub Advisory Database

</div>

<!--
Here's the full CVE timeline. CVE-2026-25253 is the headline: a one-click RCE with CVSS 8.8 via auth token exfiltration and cross-site WebSocket hijacking. CVE-2026-25157 is SSH command injection via unescaped project paths, CVSS 7.8. Then Endor Labs disclosed six more: SSRF in the Gateway tool and Image tool, missing webhook authentication for Telnyx and Twilio, path traversal in browser upload, and SSRF in Urbit authentication. The pattern is clear — validation was missing at every layer. Eight vulnerabilities in under a month, affecting identity, isolation, and runtime. This directly motivates why agents need OS-level resource control.
-->

---
transition: slide-up
---

# AgentCgroup — Motivation

<div class="grid grid-cols-2 gap-6 mt-4">

<div>

### The Problem

AI coding agents (SWE-agent, OpenHands, Claude Code, Codex, Devin...) execute in **multi-tenant cloud sandboxes** but their OS-level resource behavior is **poorly understood**.

<div class="bg-red-50/80  p-4 rounded-xl mt-4 text-sm">

**Example: Tool call resource variance**

| Command | Memory |
|---------|--------|
| `git status` | 13.5 MB |
| `pytest tests/` | 518 MB |
| `make build` | 2+ GB |

Same agent, same task — resource demands vary **20×** across tool calls!

</div>

</div>

<div>

### Study Setup

**144 SE tasks** from SWE-rebench benchmark

| Config | Model | Tasks |
|--------|-------|-------|
| Local GPU | GLM-4.7-Flash | 111 |
| Cloud API | Claude Haiku 4.5 | 33 |
| Cross-model | Both | 33 |

**Hardware**: Intel Core Ultra 9 285K, 24 cores, 128GB DDR5

**Environment**: Podman containers (2.9–17.3 GB images), Linux 6.15, cgroup v2, 1-second sampling

<div class="text-xs mt-3 opacity-70">

Zheng et al., "AgentCgroup: Understanding and Controlling OS Resources of AI Agents", arXiv:2602.09345, Feb 2026

</div>

</div>

</div>

<!--
AgentCgroup's motivation: AI coding agents run in multi-tenant cloud sandboxes but their OS resource behavior is poorly understood. A simple git status uses 13.5 MB while pytest can spike to 518 MB — within the same agent session. The paper analyzed 144 software engineering tasks from SWE-rebench, using GLM-4.7-Flash on local GPU and Claude Haiku 4.5 via cloud API, inside Podman containers on Linux 6.15 with cgroup v2.
-->

---

# AgentCgroup — Resource Characterization

<div class="grid grid-cols-2 gap-6 mt-2">

<div>

### Where Does Time Go?

```
┌─────────────────────────────────┐
│        Task Execution           │
│         (5–11 min)              │
├─────────────────────────────────┤
│                                 │
│  Initialization   29–45%        │
│  ██████████████                 │
│                                 │
│  LLM Reasoning    26–44%        │
│  █████████████                  │
│                                 │
│  Tool Execution   ~40%          │
│  ████████████                   │
│    └─ Bash: 98.1% of tool time  │
│    └─ Tests: 43.7% of bash      │
│                                 │
└─────────────────────────────────┘

OS-level execution = 56–74%
of end-to-end latency!
```

**Execution pattern**: "understand → modify → verify"

</div>

<div>

### Key Findings

<div class="space-y-2 text-sm">

<div class="bg-orange-50/80  p-3 rounded-lg">

**Memory spikes 15.4× average** — peak-to-average far exceeds traditional workloads (1.5–2×)

</div>

<div class="bg-orange-50/80  p-3 rounded-lg">

**Bursts last 1–2 sec** at up to **3 GB/s** — too fast for user-space reaction

</div>

<div class="bg-orange-50/80  p-3 rounded-lg">

**Two-layer memory**: stable ~185 MB baseline (Node.js) + tool-call bursts reaching 2–4 GB

</div>

<div class="bg-orange-50/80  p-3 rounded-lg">

**Images avg 3.5 GB** — 7× microservices, 70× serverless

</div>

<div class="bg-orange-50/80  p-3 rounded-lg">

**Retry loops**: 85–97% of tasks, up to **56 consecutive retries**, 502 MB unreleased memory

</div>

<div class="bg-orange-50/80  p-3 rounded-lg">

**CPU-memory weakly correlated** (r = −0.39) — joint management fails

</div>

</div>

</div>

</div>

<!--
The characterization reveals surprises. OS-level execution dominates at 56 to 74 percent of latency — LLM reasoning is only 26 to 44 percent. Memory spikes reach 15.4 times the average with burst rates up to 3 GB/s. There's a two-layer structure: a stable 185 MB Node.js baseline plus explosive tool-call bursts. Container images average 3.5 GB. And 85 to 97 percent of tasks contain retry loops where agents accumulate unreleased memory. This is a fundamentally new workload class.
-->

---

# AgentCgroup — Three Critical Mismatches

<div class="grid grid-cols-3 gap-4 mt-4">

<div class="bg-red-50/80  p-4 rounded-xl text-sm">

### 1. Granularity Mismatch

**Container-level** policies vs **tool-call-level** dynamics

- `memory.max` at peak → wastes >90%
- `memory.max` at average → OOM kills destroy agent state
- CPU-memory weakly correlated (r = −0.39)
- Need **per-tool-call** cgroup granularity

</div>

<div class="bg-red-50/80  p-4 rounded-xl text-sm">

### 2. Responsiveness Mismatch

**User-space reaction** vs **sub-second bursts**

- Memory bursts: 1–2s, up to 3 GB/s
- systemd-oomd, K8s VPA: ms-to-min reaction
- PSI can't attribute to specific tool calls
- Need **in-kernel** enforcement (μs-level)

</div>

<div class="bg-red-50/80  p-4 rounded-xl text-sm">

### 3. Adaptability Mismatch

**History-based prediction** vs **non-deterministic execution**

- Demands vary **20×** across tasks
- Same task varies **1.8×** across runs
- Peak doesn't correlate with proxies (r < 0.11)
- Kill-and-restart = **triple penalty**:<br>
  31–48% cold start + lost context + non-deterministic re-execution

</div>

</div>

<div class="bg-teal-50/80  p-3 rounded-xl mt-4 text-center text-sm">

**Conclusion**: Existing OS controls (cgroup v2, systemd-oomd, K8s VPA/HPA, PSI) all fail for agent workloads → need a new approach

</div>

<!--
Three critical mismatches. Granularity: container-level policies can't track tool-call dynamics — setting memory.max to peak wastes 90%, setting to average triggers OOM kills. Responsiveness: memory bursts at 3 GB/s are too fast for user-space tools like systemd-oomd. Adaptability: resource demands vary 20x across tasks and 1.8x across runs due to LLM non-determinism, so history-based prediction fails. Kill-and-restart incurs a triple penalty: slow cold start, lost LLM context, and non-deterministic re-execution. None of the existing OS controls are adequate.
-->

---

# AgentCgroup — eBPF Architecture

<div class="grid grid-cols-2 gap-6 mt-2">

<div>

### System Architecture

```
agentcgroupd (Python daemon)
├── Creates cgroup hierarchy:
│   ├── session_high/
│   │   ├── tool_<pid>_<ts>/
│   │   ├── tool_<pid>_<ts>/
│   │   └── ...
│   └── session_low/
│
├── Starts eBPF programs:
│   ├── scx_flatcg
│   │   → CPU scheduling via
│   │     sched_ext + BPF maps
│   ├── memcg_priority
│   │   → Memory isolation via
│   │     memcg_bpf_ops hooks
│   └── process monitor
│       → Lifecycle tracking
│
└── bash_wrapper.sh:
    → Intercepts "bash -c ..."
    → Creates ephemeral child cgroup
    → Parses AGENT_RESOURCE_HINT
    → Executes command
    → Logs metrics (JSONL)
    → Cleans up cgroup
```

</div>

<div>

### Three Mechanisms

**1. Fine-Grained Resource Domains**
- Hierarchical cgroup v2: parent = task, children = tool calls
- Transparent bash wrapper creates ephemeral `tool_<pid>_<ts>/` cgroups
- Per-tool-call metrics: `memory.peak`, duration, exit code

**2. In-Kernel eBPF Enforcement**
- **`sched_ext`**: per-workload CPU scheduling via BPF maps
- **`memcg_bpf_ops`**: `get_high_delay_ms` hook for custom throttle delays
- Graduated: **throttle → freeze → (never kill)**
- μs-level reaction, no user-kernel round trips

**3. Intent-Driven Coordination**
- Agents declare: `AGENT_RESOURCE_HINT="memory:high"`
- System maps hints → `memory.high` limits
- Natural-language feedback on stderr when throttled
- Enables **graceful degradation**

<div class="text-xs mt-3 opacity-70">

C + libbpf + BPF CO-RE · Python 65% / Shell 20% / C 13% · Linux 6.12+ · GPL-2.0

</div>

</div>

</div>

<!--
AgentCgroup's architecture has three mechanisms. First, fine-grained resource domains: a hierarchical cgroup v2 structure where each task is a parent and each tool call gets an ephemeral child cgroup, created transparently by a bash wrapper. Second, in-kernel eBPF enforcement: sched_ext for CPU and memcg_bpf_ops for memory, with graduated enforcement — throttle, then freeze, but never kill. This gives microsecond reaction times without user-kernel round trips. Third, intent-driven coordination: agents declare expected resource needs via environment variables, and the system provides natural-language feedback when throttled. The implementation is C with libbpf plus a Python daemon, requiring Linux 6.12+.
-->

---

# AgentCgroup — Bash Wrapper & Resource Negotiation

<div class="grid grid-cols-2 gap-6 mt-2">

<div>

### Bash Wrapper Workflow

```bash
# bash_wrapper.sh (transparent bridge)

# 1. Intercept "bash -c ..." invocation
# 2. Create ephemeral child cgroup
mkdir $AGENTCG_ROOT/tool_${PID}_${TS}
echo $$ > .../cgroup.procs

# 3. Parse agent's resource hint
# AGENT_RESOURCE_HINT="memory:high"
#   → low:  memory.high = 256M
#   → high: memory.high = 2G
#   → 2g:   memory.high = 2G (explicit)

# 4. Execute the actual command
real-bash -c "$CMD"

# 5. On OOM (exit 137): inject feedback
# [Resource] Command killed (OOM).
# Peak memory: 1800MB. Suggestions:
# run targeted tests instead of
# full suite, or split into steps.

# 6. Log metrics to JSONL
# 7. Clean up ephemeral cgroup
```

</div>

<div>

### Bidirectional Protocol

<div class="bg-blue-50/80  p-3 rounded-lg mt-2 text-sm">

**Upward (Agent → System)**

```bash
# Agent declares resource needs
AGENT_RESOURCE_HINT="memory:low" \
  bash -c "git status"

AGENT_RESOURCE_HINT="memory:high" \
  bash -c "pytest tests/"

AGENT_RESOURCE_HINT="memory:2g" \
  bash -c "python train.py"
```

</div>

<div class="bg-teal-50/80  p-3 rounded-lg mt-3 text-sm">

**Downward (System → Agent)**

```
[Resource] Command killed (OOM, exit 137).
Peak memory: 1800MB.
[Resource] Suggestions: run more targeted
operations (e.g., specific test files
instead of full suite), reduce data size,
or split into smaller steps.
```

Agents understand natural language → **semantic-level strategy adjustment**

</div>

### Tool Call JSONL Log

```json
{"pid": 1278268, "cmd": "python3 -m unittest",
 "exit": 0, "duration_ms": 47,
 "peak_mem": "3801088", "hint": "memory:high"}
```

</div>

</div>

<!--
The bash wrapper is the key innovation for transparency. It intercepts every bash command, creates an ephemeral child cgroup, parses the agent's resource hint, executes the command, and logs metrics. The bidirectional protocol is elegant: upward, agents declare needs via environment variables — memory low for git status, memory high for pytest. Downward, when a command is killed by OOM, the system injects natural-language feedback on stderr suggesting the agent run more targeted operations or split into smaller steps. Since agents understand natural language, they can make semantic-level strategy adjustments — this is a fundamentally new kind of OS-application coordination.
-->

---

# AgentCgroup — Evaluation

<div class="grid grid-cols-2 gap-6 mt-4">

<div>

### Multi-Tenant Results

**Tight Memory (1100 MB for ~1233 MB demand)**

| Metric | Baseline | BPF |
|--------|----------|-----|
| OOM survival | 66% | **100%** |
| HIGH-priority overhead | — | +2.8% |
| Throttling triggers | — | 239 |

**Moderate Memory (1300 MB)**

| Metric | Value |
|--------|-------|
| HIGH P95 latency reduction | **29%** |
| P50 latency increase | 0.3% |
| Completion time | −1.1% |
| Throttling precision | **2.3%** error |

**Wrapper Overhead**: < 5ms per tool call

**Agent Hint Accuracy**: 5/5 = 100% (Claude Haiku correctly classified all operations)

</div>

<div>

### Agent Workloads vs. Others

| Property | Serverless | Microservices | **AI Agents** |
|----------|-----------|--------------|--------------|
| Duration | 100ms–2s | Long-running | **5–11 min** |
| Memory | Flat, <50MB | Steady ~1GB | **Burst 2–4GB** |
| Images | ~50 MB | ~500 MB | **3.5 GB avg** |
| Peak/Avg | 1.2× | 1.5–2× | **15.4×** |
| Determinism | High | High | **Non-deterministic** |
| Kill cost | Low | Medium | **Very high** |

<div class="bg-teal-50/80  p-4 rounded-xl mt-4 text-sm">

**Key insight**: AI agent workloads are a **new workload class**. Neither serverless platforms nor traditional container controls are adequate. The OS must evolve.

</div>

</div>

</div>

<!--
Evaluation results are compelling. Under tight memory, BPF enforcement achieves 100% survival versus 66% baseline, with only 2.8% overhead. P95 latency drops 29% under moderate memory. Wrapper overhead is under 5 milliseconds per tool call. Claude Haiku correctly classified all resource hints. The comparison table tells the story: agent workloads are fundamentally different — 5 to 11 minute tasks with extreme memory bursts at 15.4x average, non-deterministic profiles, and very high kill costs. This is a new workload class requiring OS evolution.
-->

---

# Lessons & Takeaways

<div class="grid grid-cols-2 gap-6 mt-4">

<div>

### From OpenClaw

<div class="space-y-2 mt-2 text-sm">

- **Local-first AI** is viable — users want data control
- **Chat-as-UI** meets users where they are
- **100k stars in a week** when solving real problems
- **8+ CVEs in one month** — RCE, SSRF, command injection, path traversal
- **42k+ exposed instances**, 341→824+ malicious ClawHub skills
- **Agentic AI** = new attack surfaces (prompt injection, skill poisoning)
- Self-hosted ≠ secure; **defense in depth** essential

</div>

</div>

<div>

### From AgentCgroup

<div class="space-y-2 mt-2 text-sm">

- **OS execution = 56–74%** of agent latency — the bottleneck is not LLM
- Agent resources are a **new workload class** unlike anything before
- **Container-level controls** fundamentally too coarse-grained
- **eBPF in-kernel enforcement** enables μs-level reaction
- **Throttle/freeze >> kill** for agents with accumulated state
- **Intent-driven negotiation** between agent and OS is the future
- **Bash wrapper** provides per-tool-call cgroup transparency

</div>

</div>

</div>

<div class="bg-gradient-to-r from-blue-50 to-teal-50  p-4 rounded-xl mt-4 text-center">

**OpenClaw shows why agents need OS-level control. AgentCgroup shows how to build it.**

The OS must evolve to treat AI agents as first-class workloads with tool-call-level granularity.

</div>

<!--
Takeaways. OpenClaw shows the power and peril of autonomous AI — 100k stars and 21k compromised instances. AgentCgroup reveals that the OS bottleneck is real — 56 to 74 percent of agent latency is OS execution, not LLM reasoning. Container-level controls are too coarse; eBPF enables microsecond in-kernel enforcement. The intent-driven negotiation protocol — where agents declare needs and receive natural-language feedback — is a fundamentally new kind of OS-application coordination. The connecting thread: OpenClaw shows why agents need OS-level resource control, and AgentCgroup shows how to build it.
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

[AgentCgroup Paper (arXiv:2602.09345)](https://arxiv.org/abs/2602.09345) · [AgentCgroup GitHub](https://github.com/eunomia-bpf/agentcgroup)

</div>

<!--
Thank you for listening. I'm happy to take any questions about OpenClaw, AgentCgroup, or the broader landscape of AI agent resource management and security.
-->
