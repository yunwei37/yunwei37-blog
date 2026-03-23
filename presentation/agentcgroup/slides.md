---
theme: seriph
title: AgentCgroup
info: |
  ## AgentCgroup
  AI Agent Resource Characterization and OS-Level Control
drawings:
  persist: false
transition: slide-left
mdc: true
colorSchema: light
slideNumber: true
layout: center
class: text-center
---

<style>
.slidev-layout {
  background: white !important;
}
</style>


<div class="text-8xl text-gray-800">AgentCgroup</div>

<div class="text-3xl text-gray-700 mt-4">AI Agent Resource Characterization and OS-Level Control</div>

<div class="abs-bl m-6 text-lg text-gray-600">
  Yusheng Zheng (yzhen165@ucsc.edu)
  <br>
  PhD Student
</div>

<!--
Today I'll present AgentCgroup, a research paper and open-source tool that systematically characterizes OS-level resource consumption of AI coding agents and proposes an eBPF-based resource controller.
-->

---
transition: fade-out
---

# Roadmap

<div class="bg-teal-50/80 p-8 rounded-xl mt-6 text-3xl space-y-4">

* Motivation & Problem
* Resource Characterization (144 tasks, 2 models)
* Agent vs. Cloud Workloads & Three Mismatches
* AgentCgroup: eBPF + Bash Wrapper + Negotiation
* Evaluation & Takeaways

</div>

<!--
Here's our roadmap. We'll start with why AI agent resource behavior matters, then walk through our characterization of 144 software engineering tasks across two models. We'll compare agent workloads to traditional cloud workloads, identify three fundamental mismatches with existing resource management, and present AgentCgroup — our eBPF-based solution. We'll close with evaluation results and takeaways.
-->

---
transition: slide-up
---

# Motivation

<div class="text-2xl mt-2">

AI coding agents — **Claude Code, Codex, Devin** — are being deployed at scale, autonomously running compilers, test suites, and package managers in sandboxed containers.

</div>

<div class="grid grid-cols-2 gap-6 mt-4">

<div class="bg-blue-50/80 p-5 rounded-xl">

### A New Workload Class

<div class="text-xl mt-2 space-y-1">

- LLM reasons → calls tools → observes → iterates
- Agent **autonomously decides** what to run and when
- Resource demands are **tool-call driven** and unpredictable

</div>

</div>

<div class="bg-orange-50/80 p-5 rounded-xl">

### An Unstudied Problem

<div class="text-xl mt-2 space-y-1">

- Cloud providers host **50–100+ agents per machine**
- OS-level resource behavior **completely unknown**
- → **OOM kills, resource waste, poor density**

</div>

</div>

</div>

<div class="text-xl mt-3">

→ Can we exploit resource patterns for **higher deployment density**?

</div>

<!--
AI coding agents like Claude Code, Codex, and Devin are being deployed at scale commercially. They autonomously run compilers, test suites, and package managers inside sandboxed containers. This is a fundamentally new workload class: the agent autonomously decides what to run and when, resource demands are driven by tool calls and inherently unpredictable, and killing an agent destroys all accumulated LLM context — you can't just retry like serverless. Cloud providers host 50 to 100 or more concurrent agents per machine, but nobody has systematically studied their OS-level resource behavior. The consequences are real: OOM kills, resource waste, and poor density.
-->

---
transition: slide-left
---

# Characterization: Setup

<div class="grid grid-cols-2 gap-6 mt-4">

<div>

**144 SE tasks** from SWE-rebench benchmark, with Claude Code

| Config | Model | Tasks |
|--------|-------|-------|
| Local GPU | GLM-4.7-Flash | 111 |
| Cloud API | Claude Haiku 4.5 | 33 |

**Hardware**: Intel Core Ultra 9 285K, 24 cores, 128 GB DDR5

**Environment**: Podman containers, Linux 6.15, cgroup v2, 1s sampling

</div>

<div class="text-lg space-y-2">

### What We Measure

- **Where does time go?** (execution model)
- **What does resource usage look like?** (resource dynamics)
- **Can demands be predicted?** (cross-task variance)

### Container Images

- **Agent container images average 3.5 GB, 7× larger than typical microservice images and 70× larger than serverless functions**

</div>

</div>

<!--
We used 144 software engineering tasks from the SWE-rebench benchmark, running them with Claude Code using two models: GLM-4.7-Flash locally on GPU for 111 tasks, and Claude Haiku 4.5 via cloud API for 33 tasks. The hardware is an Intel Core Ultra 9 with 24 cores and 128 GB DDR5. Each task runs in a Podman container with cgroup v2, sampled at 1-second intervals. We measure three dimensions: execution model granularity, temporal dynamics, and cross-task variance. One notable finding: agent container images average 3.5 GB — 7 times larger than typical microservices and 70 times larger than serverless functions. This directly impacts cold start times and storage costs.
-->

---
transition: slide-left
---

# Execution Model
<div class="text-2xl text-gray-600 -mt-1">Q: Where does the time go?</div>

<img src="/images/exec_overview.png" class="h-56 mx-auto rounded-lg shadow" />

<div class="bg-blue-50/80 p-3 rounded-xl mt-3 text-lg space-y-1">

- Task duration: median **8.1 min**, mean 9.6 min (Haiku 5.8 min, GLM 10.8 min)
- **LLM reasoning accounts for 26–44% of end-to-end task latency; the remainder is consumed by tool execution (~40% of active time) and initialization (29–45%)**

</div>

<!--
This figure shows how task time breaks down. On the left, task execution duration distribution — median 8.1 minutes, mean 9.6 minutes. On the right, phase breakdown for both models. The key insight: LLM reasoning is only 26 to 44 percent of end-to-end latency. Container initialization takes 29 to 45 percent, and tool execution about 40 percent of active time. This is counterintuitive — people assume the LLM is the bottleneck, but the OS execution dominates. This is why we need to understand the OS layer.
-->

---

# What Tool Dominates?
<div class="text-2xl text-gray-600 -mt-1">Q: Which tool types consume the most execution time?</div>

<img src="/images/tool_bash_breakdown.png" class="h-60 mx-auto rounded-lg shadow" />

<div class="bg-blue-50/80 p-3 rounded-xl mt-3 text-lg space-y-1">

- **Bash dominates tool execution, spanning three orders of magnitude in duration** (98.1% of tool time in GLM)
- Top categories: test execution **43.7%**, Python snippet 26.9%, package install 10.1%

</div>

<!--
Drilling into tool execution, Bash dominates everything — 98.1 percent of tool time in GLM. Duration spans three orders of magnitude: git status takes milliseconds, pytest takes minutes. Bash categories: test execution 43.7 percent, Python snippets 26.9 percent, package installation 10.1 percent. Resource demands depend on WHAT the bash command does, not the fact that it's a bash call.
-->

---

# Tool Execution: Temporal Pattern
<div class="text-2xl text-gray-600 -mt-1">Q: When do different tools execute during a task?</div>

<img src="/images/tool_time_pattern.png" class="h-60 mx-auto rounded-lg shadow" />

<div class="bg-blue-50/80 p-3 rounded-xl mt-3 text-lg">

- Tool time ratio: mean **37.8%**, median 36.4% of total task time
- Tool calls follow an **"understand, modify, verify"** pattern: Read in first 30%, Bash peaks at 40–80%

</div>

<!--
The temporal pattern shows agents follow an "understand, modify, verify" cycle. Read calls concentrate in the first 30 percent as the agent explores the codebase, then Bash peaks at 40 to 80 percent as the agent builds, tests, and iterates. This matters for resource management: resource demand is highly phase-dependent — you can't set one static limit for the whole execution.
-->

---

# Memory & Resource Structure
<div class="text-2xl text-gray-600 -mt-1">Q: What does resource consumption look like?</div>

<img src="/images/resource_profile.png" class="h-52 mx-auto rounded-lg shadow" />

<div class="bg-blue-50/80 p-3 rounded-xl mt-2 text-lg space-y-1">

- **Memory, not CPU, is the primary bottleneck for multi-tenant concurrency density** (CPU avg <13%, memory peaks 2–4 GB)
- **Resource consumption exhibits a two-layer structure: a ~185 MB framework baseline plus tool-call bursts**

</div>

<!--
Now the actual resource numbers. Left panel: container image sizes — median 3.5 GB, some reaching 17 GB. Right panel: aggregated memory trajectory across all tasks. You see a stable baseline of about 185 MB from the Node.js runtime, plus tool-call bursts on top. Memory, not CPU, is the real bottleneck for multi-tenant density. CPU averages under 13 percent, but memory spikes to 2 to 4 GB. The two-layer structure means static memory limits are fundamentally wrong: set at peak and you waste 90 percent, set at baseline and you OOM-kill.
-->

---

# Resource Time Series
<div class="text-2xl text-gray-600 -mt-1">Q: What drives resource bursts?</div>

<img src="/images/rq1_resource_timeseries.png" class="h-52 mx-auto rounded-lg shadow" />

<div class="bg-blue-50/80 p-3 rounded-xl mt-2 text-lg space-y-1">

- **Within the burst layer, resource consumption is determined by what the tool *does* (e.g., pytest vs. git status), not which tool is invoked: Bash calls differ by 13.7× in peak memory**
- **Resource usage follows a burst-silence pattern, with 98.5% of memory bursts occurring during tool calls**

</div>

<!--
This time series shows a Haiku agent executing a pre-commit task. Top: CPU with tool call markers. Bottom: memory. You clearly see the burst-silence pattern — memory spikes during tool calls and drops during LLM reasoning. 98.5 percent of memory bursts occur during tool calls. Critically, burst size depends on WHAT the tool does: a Bash call running pytest uses 13.7 times more peak memory than one running git status. Container-level controls can't distinguish a lightweight git command from a heavyweight test suite.
-->

---

# Burst Dynamics & Variability
<div class="text-2xl text-gray-600 -mt-1">Q: How fast and how variable are resource changes?</div>

<div class="grid grid-cols-2 gap-4 mt-2">

<div>

<img src="/images/rq1_change_rate_distribution.png" class="h-44 rounded-lg shadow" />

</div>

<div>

<img src="/images/rq1_resource_timeseries_qwen.png" class="h-44 rounded-lg shadow" />

</div>

</div>

<div class="bg-blue-50/80 p-3 rounded-xl mt-2 text-lg space-y-1">

- **Resource bursts last 1–2 seconds with peak-to-average ratio up to 15.4×, several times beyond traditional cloud workloads**
- **85%–97% of tasks contain retry loops with progressive memory accumulation**
- **CPU-memory correlation varies by task (−0.84 to +0.50); co-directional change cannot be assumed**

</div>

<!--
Resource bursts last only 1 to 2 seconds but hit a peak-to-average ratio of 15.4 times — several times higher than any traditional cloud workload. Left: CPU and memory change rate distributions with burst thresholds. Right: a GLM agent executing a github3.py task showing retry loops — the agent tests, fails, modifies, retests, causing progressive memory accumulation up to 502 MB unreleased. CPU and memory don't always move together — correlation ranges from negative 0.84 to positive 0.50, so you can't manage them jointly.
-->

---
transition: fade-out
---

# Characterization Summary

<div class="text-xl space-y-3 mt-4">

**Three key findings across 144 tasks:**

1. **OS execution dominates**: 56–74% of latency is tool execution + initialization, not LLM reasoning
2. **Memory is the bottleneck**: CPU avg <13%, but memory peaks 2–4 GB with 15.4× peak/avg ratio
3. **Demands are unpredictable**: 20× across tasks, 1.8× across runs; CPU and memory are decoupled

</div>

<div class="bg-teal-50/80 p-4 rounded-xl mt-4 text-xl">

**Implication**: resource management for AI agents must operate at **tool-call granularity**, react within **1–2 seconds**, and tolerate **non-determinism** — requirements no existing cloud tool was designed for.

</div>

<!--
Let me summarize what we've learned. Three key findings: first, OS execution dominates — the LLM is not the bottleneck, tool execution and initialization are. Second, memory is the real constraint for multi-tenant density, with a 15.4 times peak-to-average ratio. Third, demands are wildly unpredictable across tasks, across runs, and CPU and memory don't even correlate. The implication for researchers and system designers: any resource management solution must work at tool-call granularity, react in 1 to 2 seconds, and handle non-deterministic behavior. None of the existing cloud infrastructure tools were designed for this. So the natural question is: how different are agent workloads from traditional cloud workloads, and what specifically breaks?
-->

---

# Agent vs. Cloud Workloads
<div class="text-2xl text-gray-600 -mt-1">Q: How different from existing cloud workloads?</div>

<div class="mt-1 text-sm">

| Dimension | Serverless/FaaS | Microservices | Batch/HPC | **AI Coding Agent** |
|-----------|----------------|--------------|-----------|-------------------|
| Execution duration | 100ms–2s | Long-running | Minutes–hours | **5–11 minutes** |
| Container image | ~50 MB | 100 MB–1 GB | 1–10 GB | **2.9–17.3 GB (med. 3.5)** |
| Memory footprint | 128–512 MB | Steady ~1 GB | Scales with data | **185 MB idle, peaks 2–4 GB** |
| Memory peak/avg | ~1.5× | 2–3× | ~1× | **15.4×** |
| CPU utilization | Brief spike | 10–40% | 80–100% | **<13% avg, peaks >175%** |
| Determinism | Deterministic | Mostly deterministic | Deterministic | **1.8× variance same task** |
| Termination cost | Just retry | Can migrate | Lose progress | **Lose all LLM context** |

</div>

<!--
This table compares agent workloads with traditional cloud workloads. The unpredictability findings are key: resource demands vary 20 times across tasks and diverge further across models, with 1.8 times execution time variance across runs of the same task. Every dimension is different. Container images are 7 to 70 times larger. Memory peak-to-average is 15.4 times versus 1.5 to 3 times. CPU averages under 13 percent but spikes above 175 percent. Agents are fundamentally non-deterministic — 1.8 times variance across runs of the same task, 20 times across different tasks, and further divergence across models. The termination cost is uniquely severe: killing an agent loses all LLM context. You can't just retry like serverless — every restart is a cold start with a different execution path.
-->

---

# Three Mismatches
<div class="text-2xl text-gray-600 -mt-1">Q: Why do existing resource management tools fail?</div>

<div class="text-base mt-1">

| | **Static Limits** | **Reactive Control** | **Predictive Scaling** |
|---|---|---|---|
| **Tools** | mem.max/high, cpu.max; K8s QoS | PSI; oomd; TMO | VPA; Autopilot |
| **Assumes** | Known peak; stable demand | Gradual pressure; kill OK | Repeatable; history valid |
| **Agent** | 15.4× peak/avg; tool-semantic | 1–2s burst; unpredictable | 1.8× variance; kill = lose context |
| **Mismatch** | **Granularity** | **Responsiveness** | **Adaptability** |

</div>

<div class="text-lg mt-3 space-y-2">

- **Granularity**: `memory.max` at peak wastes >90%; at average → OOM
- **Responsiveness**: 3 GB/s bursts too fast for user-space tools (tens of ms reaction)
- **Adaptability**: Kill = triple penalty (cold start + lost context + re-execution)

</div>

<!--
This is the key gap analysis. Existing resource management falls into three categories, each failing for agents. Static limits like cgroup memory.max — set at peak wastes 90 percent, at average triggers OOM. That's the granularity mismatch. Reactive controls like systemd-oomd — memory bursts at 3 GB per second are too fast for user-space tools that react in tens of milliseconds. That's the responsiveness mismatch. Predictive scaling like Kubernetes VPA — 1.8 times variance breaks history-based predictors, and killing is a triple penalty. That's the adaptability mismatch. These three mismatches are what AgentCgroup addresses.
-->

---

# System Design

<div class="text-lg space-y-1 mt-1">

<div class="bg-blue-50/80 p-2 rounded-lg">

**1. Fine-Grained Resource Domains** → *Granularity*: transparent **bash wrapper** intercepts each `bash -c`, creates **ephemeral child cgroup** per tool call, collects metrics, removes on exit. No framework modification needed.

</div>

<div class="bg-blue-50/80 p-2 rounded-lg">

**2. In-Kernel eBPF Enforcement** → *Responsiveness*: **`sched_ext`** (CPU) + **`memcg_bpf_ops`** (memory) at kernel enforcement points. Graduated: **throttle** (`memory.high`) → **freeze** (`cgroup.freeze`) → **never kill**. Microsecond reaction.

</div>

<div class="bg-blue-50/80 p-2 rounded-lg">

**3. Intent-Driven Resource Coordination** → *Adaptability*: **upward** — agent declares need via `AGENT_RESOURCE_HINT` env var; **downward** — wrapper sends NL feedback via stderr when constrained → agent retries with lighter approach.

</div>

</div>

<!--
AgentCgroup addresses each mismatch with a dedicated mechanism. First, fine-grained resource domains: a transparent bash wrapper intercepts every tool call and places it in its own ephemeral child cgroup. No agent framework modification needed — just replace the bash path. This gives per-tool-call isolation and metrics. Second, in-kernel eBPF enforcement using sched_ext for CPU and memcg_bpf_ops for memory, both at kernel enforcement points with microsecond reaction — orders of magnitude faster than user-space. The key design principle: graduated enforcement — throttle first, freeze second, never kill. This avoids the triple penalty. Third, intent-driven resource coordination: agents declare expected needs upward via environment variables, and the system sends natural-language feedback downward via stderr. The agent can then retry with a lighter approach — for example, testing one file instead of the full suite. This closes the semantic–OS loop.
-->

---

# Evaluation

<div class="grid grid-cols-2 gap-4 mt-1">

<div>

<img src="/images/eval_results.png" class="rounded-lg shadow h-44" />

<div class="text-lg mt-2">

3 concurrent agents, replayed traces at 50×

</div>

</div>

<div class="text-lg space-y-2">

<div class="bg-green-50/80 p-2 rounded-lg">

**OOM-free**: all agents survive under memory pressure — no kills needed

</div>

<div class="bg-green-50/80 p-2 rounded-lg">

**Priority-aware**: high-priority agents get lower latency under contention

</div>

<div class="bg-blue-50/80 p-2 rounded-lg">

**Practical**: wrapper overhead negligible, throttle precision validated

</div>

<div class="bg-orange-50/80 p-2 rounded-lg">

**Takeaway**: graduated enforcement (throttle → freeze → never kill) works

</div>

</div>

</div>

<!--
For evaluation, we replayed real memory traces at 50x acceleration in a multi-tenant setting: 3 concurrent agents on a 4-core machine — one high-priority dask workload, two low-priority github3.py tasks. Under tight memory — 1100 MB for 1233 MB demand — baseline OOM-kills one low-priority process at 66 percent survival. With BPF, all three survive at 100 percent, with 239 throttle triggers and only 2.8 percent overhead on high-priority. Under moderate memory, P95 allocation latency improves 29 percent — from 71 to 50 milliseconds. Wrapper adds less than 5 ms per call, throttling precision is within 2.3 percent error, and Haiku achieved 100 percent hint accuracy.
-->

---

# Limitations & Future Work

<div class="grid grid-cols-2 gap-6 mt-4 text-lg">

<div>

### Limitations

- Requires patched kernel (`memcg_bpf_ops` under review)
- Evaluated with 3 agents; production runs 50–100+
- Bash-only interception

</div>

<div>

### Future Work

- Larger-scale multi-tenant evaluation
- Upstream `memcg_bpf_ops` into mainline Linux
- Cross-agent scheduling (OpenClaw, Claude Code, Codex)
- Predictive hints from tool-call history

</div>

</div>

<!--
Limitations: memcg_bpf_ops requires a patched kernel — not yet in mainline. We tested with only 3 agents; production runs many more. The bash wrapper only intercepts bash calls. For future work: larger-scale evaluation, upstream kernel integration, cross-agent coordination, and predictive hints from tool-call history without relying on the LLM.
-->

---
layout: center
class: text-center
---

# Thank You

<div class="mt-6 text-lg">

Questions?

</div>

<div class="mt-8 text-xl opacity-60">

**References**

[AgentCgroup Paper (arXiv:2602.09345)](https://arxiv.org/abs/2602.09345) · [AgentCgroup GitHub](https://github.com/eunomia-bpf/agentcgroup)

</div>

<!--
Thank you for listening. Happy to take any questions about AgentCgroup or the broader landscape of AI agent resource management.
-->
