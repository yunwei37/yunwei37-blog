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
Today I'll present two projects at the frontier of open-source AI agents. First, OpenClaw, the fastest-growing open-source AI assistant that crossed 100k GitHub stars in under a week, including its architecture, innovations, and a critical security vulnerability. Then, AgentCgroup, a research paper and open-source tool that characterizes OS-level resource consumption of AI agents and proposes an eBPF-based resource controller. Together they illustrate the promise and the peril of autonomous AI agents, and how the OS must evolve to support them.
-->

---
transition: fade-out
---

# Roadmap

<div class="grid grid-cols-2 gap-8 mt-6">

<div class="bg-blue-50/80  p-6 rounded-xl">

### Part I: OpenClaw

* What is OpenClaw?
* Architecture & Core Design
* Use Cases & Innovation
* Security Overview & CVEs

</div>

<div class="bg-teal-50/80  p-6 rounded-xl">

### Part II: AgentCgroup

* Motivation: Why Study Agent Resources?
* Resource Characterization (144 tasks)
* Three Critical Mismatches
* eBPF Architecture & Bash Wrapper
* Bidirectional Resource Negotiation
* Evaluation & Takeaways

</div>

</div>

<!--
Here's our roadmap. We'll spend the first half on OpenClaw: understanding what it is, how it's built, its use cases, innovations, and the security crisis including multiple CVEs and a supply chain attack. Then we'll shift to AgentCgroup, a research paper from arXiv that characterizes how AI agents consume OS resources across 144 software engineering tasks and proposes an eBPF-based controller using sched_ext and memcg_bpf_ops. We'll close with lessons from both.
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

<div class="grid grid-cols-3 gap-3 mt-2 text-xs">

<div class="bg-gray-50/80 p-3 rounded-xl">

### Personal Assistant

- Calendar & task management
- Email drafting & replies
- Smart home control
- Cross-app orchestration (Notion, Trello, etc.)

</div>

<div class="bg-gray-50/80 p-3 rounded-xl">

### Developer Workflows

- Automated debugging & DevOps
- GitHub integration & PR management
- Cron-scheduled jobs & webhooks
- Codebase management

</div>

<div class="bg-gray-50/80 p-3 rounded-xl">

### Autonomous Tasks

- Web scraping & form filling
- Browser automation
- Price negotiation (car buying!)
- Proactive monitoring & alerts

</div>

</div>

<div class="mt-2">

### What Makes OpenClaw Different

<div class="grid grid-cols-5 gap-3 mt-1 text-xs">

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
OpenClaw's use cases span personal assistant, developer workflows, and fully autonomous tasks, including a famous case where it negotiated a car purchase 4,200 dollars below sticker. Five innovations stand out: local-first data ownership, a proactive heartbeat daemon, chat-as-UI across 15+ messaging platforms, a modular skill system via ClawHub, and complete model-agnosticism. 60k stars in 72 hours, 100k in a week.
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

# OpenClaw: Security Overview

<div class="mt-2">

### Identity, Isolation & Runtime Risk (Microsoft Security Blog, Feb 2026)

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

<div class="bg-red-50/80  p-3 rounded-lg">

**Atomic Stealer (AMOS)** distributed via malicious skills targeting macOS always-on machines

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

<div class="bg-teal-50/80  p-3 rounded-lg mt-3 text-xs">

**Key insight**: Self-hosted ≠ secure. Governance and runtime isolation are critical as agent systems enter enterprise environments.

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
Here's the full CVE timeline. CVE-2026-25253 is the headline: a one-click RCE with CVSS 8.8 via auth token exfiltration and cross-site WebSocket hijacking. CVE-2026-25157 is SSH command injection via unescaped project paths, CVSS 7.8. Then Endor Labs disclosed six more: SSRF in the Gateway tool and Image tool, missing webhook authentication for Telnyx and Twilio, path traversal in browser upload, and SSRF in Urbit authentication. The pattern is clear: validation was missing at every layer. Eight vulnerabilities in under a month, affecting identity, isolation, and runtime. This directly motivates why agents need OS-level resource control.
-->

---
transition: slide-up
---

# AgentCgroup: Overview & Setup

<div class="grid grid-cols-2 gap-6 mt-4">

<div>

### Problem

AI coding agents execute in **multi-tenant cloud sandboxes** but their OS-level resource behavior is **poorly understood**.

### Study Setup

**144 SE tasks** from SWE-rebench benchmark

| Config | Model | Tasks |
|--------|-------|-------|
| Local GPU | GLM-4.7-Flash | 111 |
| Cloud API | Claude Haiku 4.5 | 33 |

**Hardware**: Intel Core Ultra 9 285K, 24 cores, 128GB DDR5

**Environment**: Podman containers, Linux 6.15, cgroup v2, 1s sampling

</div>

<div>

### Execution Model

<img src="/images/exec_overview.png" class="rounded-lg shadow" />

**Takeaway: OS-level execution = 56–74% of end-to-end latency**

</div>

</div>

---

# 3.2 Tool Execution Breakdown

<div class="grid grid-cols-2 gap-4 mt-2">

<div>

<img src="/images/tool_bash_breakdown.png" class="rounded-lg shadow" />

</div>

<div>

<img src="/images/tool_time_pattern.png" class="rounded-lg shadow" />

</div>

</div>

<div class="bg-orange-50/80 p-3 rounded-xl mt-3 text-sm text-center">

**Bash commands dominate 98.1% of tool time; execution follows "understand → modify → verify" pattern**

</div>

---

# 3.3 Resource Dynamics

<div class="grid grid-cols-2 gap-4 mt-2">

<div>

<img src="/images/resource_profile.png" class="rounded-lg shadow" />

</div>

<div>

<img src="/images/rq1_resource_timeseries.png" class="rounded-lg shadow" />

</div>

</div>

<div class="bg-orange-50/80 p-3 rounded-xl mt-3 text-sm text-center">

**Two-layer memory: stable ~185 MB baseline + tool-call bursts reaching 2–4 GB (15.4× peak/avg)**

</div>

---

# 3.3 Change Rate & Cross-Model

<div class="grid grid-cols-2 gap-4 mt-2">

<div>

<img src="/images/rq1_change_rate_distribution.png" class="rounded-lg shadow" />

</div>

<div>

<img src="/images/rq1_resource_timeseries_qwen.png" class="rounded-lg shadow" />

</div>

</div>

<div class="bg-orange-50/80 p-3 rounded-xl mt-3 text-sm text-center">

**Memory bursts at up to 3 GB/s in 1–2 sec windows; pattern consistent across models**

</div>

---

# Table 1: Agent vs. Cloud Workloads

<div class="mt-4 text-sm">

| Dimension | Serverless/FaaS | Microservices | Batch/HPC | **AI Coding Agent** |
|-----------|----------------|--------------|-----------|-------------------|
| Execution duration | 100ms–2s | Long-running | Minutes–hours | **5–11 minutes** |
| Container image | ~50 MB | 100 MB–1 GB | 1–10 GB | **2.9–17.3 GB (med. 3.5)** |
| Statefulness | Stateless | External state | Stateful | **In-process stateful** |
| Memory footprint | 128–512 MB | Steady ~1 GB | Scales with data | **185 MB idle, peaks 2–4 GB** |
| Memory peak/avg | ~1.5× | 2–3× | ~1× | **15.4×** |
| CPU utilization | Brief spike | 10–40% | 80–100% | **<13% avg, peaks >175%** |
| Determinism | Deterministic | Mostly deterministic | Deterministic | **1.8× variance same task** |
| Resource pattern | Flat | Steady + daily cycle | Stable rise | **Burst-silence alternating** |
| Termination cost | Just retry | Can migrate | Lose progress | **Lose all LLM context** |

</div>

---

# Table 2: Resource Management Mismatches

<div class="grid grid-cols-5 gap-4 mt-4">

<div class="col-span-3">

<div class="text-sm">

| | **Static Limits** | **Reactive Control** | **Predictive Scaling** |
|---|---|---|---|
| **Tools** | mem.max/high, cpu.max; K8s QoS | PSI; oomd; TMO | VPA; Autopilot |
| **Assumes** | Known peak; stable demand | Gradual pressure; kill OK | Repeatable; history valid |
| **Agent Reality** | 15.4× peak/avg; tool-semantic variation | 1–2s burst; unpredictable | 1.8× variance; kill = lose context |
| **Mismatch** | **Granularity** | **Responsiveness** | **Adaptability** |

</div>

</div>

<div class="col-span-2 space-y-2 text-xs">

<div class="bg-red-50/80 p-2 rounded-lg">

**Granularity**: Container-level policies cannot track tool-call-level dynamics. Setting `memory.max` at peak wastes >90%; at average triggers OOM kills.

</div>

<div class="bg-red-50/80 p-2 rounded-lg">

**Responsiveness**: Memory bursts at 3 GB/s are too fast for user-space tools (systemd-oomd, K8s VPA). Need in-kernel μs-level enforcement.

</div>

<div class="bg-red-50/80 p-2 rounded-lg">

**Adaptability**: 1.8× variance + non-determinism breaks history-based prediction. Kill-and-restart = triple penalty (cold start + lost context + non-deterministic re-execution).

</div>

</div>

</div>

---

# AgentCgroup: Design & Evaluation

<div class="grid grid-cols-2 gap-6 mt-2">

<div class="text-sm">

### Three Mechanisms

**1. Fine-Grained Resource Domains**
- Hierarchical cgroup v2: per-tool-call ephemeral child cgroups
- Transparent bash wrapper creates `tool_<pid>_<ts>/`

**2. In-Kernel eBPF Enforcement**
- `sched_ext` for CPU, `memcg_bpf_ops` for memory
- Graduated: **throttle → freeze → (never kill)**

**3. Intent-Driven Coordination**
- Agents declare: `AGENT_RESOURCE_HINT="memory:high"`
- Natural-language feedback on stderr when throttled

</div>

<div>

### Evaluation Results

<img src="/images/eval_results.png" class="rounded-lg shadow h-48" />

<div class="text-xs mt-2">

- **OOM survival**: 66% → **100%** (tight memory)
- **P95 latency**: **29% reduction** (moderate memory)
- **Wrapper overhead**: < 5ms per tool call
- **Hint accuracy**: 100% (Claude Haiku)

</div>

</div>

</div>

---

# Lessons & Takeaways

<div class="grid grid-cols-2 gap-6 mt-4">

<div>

### From OpenClaw

<div class="space-y-2 mt-2 text-sm">

- **Local-first AI** is viable, users want data control
- **Chat-as-UI** meets users where they are
- **100k stars in a week** when solving real problems
- **8+ CVEs in one month**: RCE, SSRF, command injection, path traversal
- **42k+ exposed instances**, 341→824+ malicious ClawHub skills
- Self-hosted ≠ secure; **defense in depth** essential

</div>

</div>

<div>

### From AgentCgroup

<div class="space-y-2 mt-2 text-sm">

- **OS execution = 56–74%** of agent latency; the bottleneck is not LLM
- Agent resources are a **new workload class** unlike anything before
- **Container-level controls** fundamentally too coarse-grained
- **eBPF in-kernel enforcement** enables μs-level reaction
- **Throttle/freeze >> kill** for agents with accumulated state
- **Intent-driven negotiation** between agent and OS is the future

</div>

</div>

</div>

<div class="bg-gradient-to-r from-blue-50 to-teal-50 p-4 rounded-xl mt-4 text-center">

**OpenClaw shows why agents need OS-level control. AgentCgroup shows how to build it.**

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

[AgentCgroup Paper (arXiv:2602.09345)](https://arxiv.org/abs/2602.09345) · [AgentCgroup GitHub](https://github.com/eunomia-bpf/agentcgroup)

</div>

<!--
Thank you for listening. I'm happy to take any questions about OpenClaw, AgentCgroup, or the broader landscape of AI agent resource management and security.
-->
