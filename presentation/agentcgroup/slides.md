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
Today I'll present AgentCgroup, a research paper and open-source tool that characterizes OS-level resource consumption of AI agents and proposes an eBPF-based resource controller.
-->

---
transition: fade-out
---

# Roadmap

<div class="bg-teal-50/80  p-6 rounded-xl mt-6">

* Motivation & Key Findings
* Resource Characterization (144 tasks)
* Agent vs. Cloud & Three Mismatches
* System Design: eBPF + Bash Wrapper + Negotiation
* Evaluation & Takeaways

</div>

<!--
Here's our roadmap. We'll cover AgentCgroup, a research paper from arXiv that characterizes how AI agents consume OS resources across 144 software engineering tasks and proposes an eBPF-based controller using sched_ext and memcg_bpf_ops. We'll close with evaluation and takeaways.
-->

---
transition: slide-up
---

# Motivation

<div class="mt-4">

### Why study OS resources of AI agents?

AI coding agents execute in **multi-tenant cloud sandboxes** — but their OS-level resource behavior is **poorly understood**.

### What we found (144 SWE-bench tasks)

<div class="text-lg space-y-1 mt-2">

- **OS-level overhead = 56~74%** of end-to-end latency; LLM reasoning only 26~44%
- **Memory, not CPU**, limits multi-tenant concurrency density
- Demands vary **20x across tasks**, **1.8x across runs** of the same task

</div>

</div>

<!--
The core problem is that AI coding agents like Claude Code run inside containers in multi-tenant cloud sandboxes, but nobody has systematically studied their OS-level resource behavior. We ran 144 software engineering tasks from SWE-bench and found three surprising results: first, the OS-level overhead — tool execution plus container initialization — dominates end-to-end latency at 56 to 74 percent, meaning LLM reasoning is actually the minority of wall-clock time. Second, memory is the real bottleneck for how many agents you can pack onto a machine, not CPU. Third, resource demands are wildly unpredictable — varying 20x across different tasks and 1.8x even across repeated runs of the same task.
-->

---
transition: slide-left
---

# Characterization: Setup

<div class="grid grid-cols-2 gap-6 mt-4">

<div>

**144 SE tasks** from SWE-rebench benchmark, with claude code

| Config | Model | Tasks |
|--------|-------|-------|
| Local GPU | GLM-4.7-Flash | 111 |
| Cloud API | Claude Haiku 4.5 | 33 |

**Hardware**: Intel Core Ultra 9 285K, 24 cores, 128GB DDR5

**Environment**: Podman containers, Linux 6.15, cgroup v2, 1s sampling

</div>

<div class="text-lg space-y-2">

### What We Measure

- **Execution model**: granularity at which resources vary
- **Temporal dynamics**: how fast controls must react
- **Cross-task variance**: whether demands can be predicted

### Container Images

- **Average 3.5 GB** (range 2.9~17.3 GB)
- 7x larger than microservices, 70x larger than serverless

</div>

</div>

<!--
We used 144 software engineering tasks from the SWE-rebench benchmark, running them with two models: GLM-4.7-Flash locally on GPU for 111 tasks, and Claude Haiku 4.5 via cloud API for 33 tasks. The hardware is an Intel Core Ultra 9 with 24 cores and 128GB DDR5. Each task runs in a Podman container with cgroup v2, sampled at 1-second intervals. We measure three dimensions: execution model granularity, temporal dynamics, and cross-task variance. One notable finding already: container images average 3.5 GB — 7x larger than typical microservices and 70x larger than serverless functions.
-->

---
transition: slide-left
---

# Execution Model

<img src="/images/exec_overview.png" class="h-56 mx-auto rounded-lg shadow" />

<div class="bg-orange-50/80 p-3 rounded-xl mt-3 text-lg">

- **LLM reasoning accounts for 26~44% of end-to-end task latency; the remainder is consumed by tool execution (~40% of active time) and initialization (29~45%)**

</div>

<!--
This figure shows how task time breaks down. The key insight is that LLM reasoning — the time the model spends thinking — is only 26 to 44 percent of end-to-end latency. The rest is OS-level: container initialization takes 29 to 45 percent, and tool execution takes about 40 percent of active time. This is counterintuitive — people assume the LLM is the bottleneck, but actually the OS execution dominates. This is why we need to understand and optimize the OS layer.
-->

---

# Tool Execution: What Dominates?

<img src="/images/tool_bash_breakdown.png" class="h-72 mx-auto rounded-lg shadow" />

<div class="bg-orange-50/80 p-3 rounded-xl mt-3 text-lg">

- **Bash dominates tool execution, spanning three orders of magnitude in duration** (98.1% of tool time in GLM)

</div>

<!--
Drilling into tool execution, Bash dominates everything — 98.1 percent of tool time in GLM. But the duration spans three orders of magnitude: a git status takes milliseconds while a pytest run takes minutes. Test execution alone accounts for 43.7 percent of Bash time, followed by package installation at 10.1 percent.
-->

---

# Tool Execution: Temporal Pattern

<img src="/images/tool_time_pattern.png" class="h-72 mx-auto rounded-lg shadow" />

<div class="bg-orange-50/80 p-3 rounded-xl mt-3 text-lg">

- Tool calls follow a **"understand, modify, verify"** pattern: Read in first 30%, Bash peaks at 40~80%

</div>

<!--
The temporal pattern shows agents follow a "understand, modify, verify" cycle. Read calls concentrate in the first 30 percent of a task as the agent explores the codebase, then Bash peaks at 40 to 80 percent as the agent builds, tests, and iterates. This matters for resource management because it means resource demand is highly phase-dependent.
-->

---

# Resource Dynamics

<div class="grid grid-cols-2 gap-4 mt-2">

<div>

<img src="/images/resource_profile.png" class="h-52 rounded-lg shadow" />

</div>

<div>

<img src="/images/rq1_resource_timeseries.png" class="h-52 rounded-lg shadow" />

</div>

</div>

<div class="bg-orange-50/80 p-3 rounded-xl mt-3 text-lg">

- **Resource consumption exhibits a two-layer structure: a ~185 MB framework baseline plus tool-call bursts**
- **What the tool *does* matters, not which tool** (e.g., Bash vs. Read): 13.7x peak memory difference
- **98.5% of memory bursts occur during tool calls**

</div>

<!--
Resource consumption has a two-layer structure. There's a stable baseline of about 185 MB from the Node.js runtime, and then on top of that you get tool-call bursts. The critical insight is that what matters is not which tool is called, but what the tool does: a Bash call running pytest uses 13.7x more peak memory than a Bash call running git status. 98.5 percent of memory bursts happen during tool calls, so the burst-silence pattern is directly tied to the agent's tool-call cycle. This is why container-level resource controls fail — they can't see inside the burst structure.
-->

---

# Burst Dynamics & Variability

<div class="grid grid-cols-2 gap-4 mt-2">

<div>

<img src="/images/rq1_change_rate_distribution.png" class="h-52 rounded-lg shadow" />

</div>

<div>

<img src="/images/rq1_resource_timeseries_qwen.png" class="h-52 rounded-lg shadow" />

</div>

</div>

<div class="bg-orange-50/80 p-3 rounded-xl mt-3 text-lg">

- **Resource bursts last 1~2 seconds with peak-to-average ratio up to 15.4x**
- **85%~97% of tasks contain retry loops with progressive memory accumulation**
- **CPU-memory correlation varies by task (−0.84 to +0.50); co-directional change cannot be assumed**

</div>

<!--
Resource bursts last only 1 to 2 seconds but hit a peak-to-average ratio of 15.4x — several times higher than any traditional cloud workload. 85 to 97 percent of tasks contain retry loops where the agent runs tests, sees failures, modifies code, and retests, causing progressive memory accumulation — up to 502 MB unreleased across retries. And here's a tricky one: CPU and memory don't always move together. The correlation ranges from negative 0.84 to positive 0.50 across tasks, so you can't assume that high CPU means high memory or vice versa.
-->

---

# Agent vs. Cloud Workloads

<div class="mt-1 text-sm">

| Dimension | Serverless/FaaS | Microservices | Batch/HPC | **AI Coding Agent** |
|-----------|----------------|--------------|-----------|-------------------|
| Execution duration | 100ms–2s | Long-running | Minutes–hours | **5–11 minutes** |
| Container image | ~50 MB | 100 MB–1 GB | 1–10 GB | **2.9–17.3 GB (med. 3.5)** |
| Memory footprint | 128–512 MB | Steady ~1 GB | Scales with data | **185 MB idle, peaks 2–4 GB** |
| Memory peak/avg | ~1.5× | 2–3× | ~1× | **15.4×** |
| CPU utilization | Brief spike | 10–40% | 80–100% | **<13% avg, peaks >175%** |
| Determinism | Deterministic | Mostly deterministic | Deterministic | **1.8× variance same task** |
| Resource pattern | Flat | Steady + daily cycle | Stable rise | **Burst-silence alternating** |
| Termination cost | Just retry | Can migrate | Lose progress | **Lose all LLM context** |

</div>

<!--
This table puts agent workloads side-by-side with traditional cloud workloads. Every dimension is different. Container images are 7 to 70x larger. Memory peak-to-average is 15.4x versus 1.5 to 3x. CPU utilization averages under 13 percent but spikes above 175 percent — the opposite of steady-state microservices. And the termination cost is uniquely severe: killing an agent means losing all accumulated LLM context, conversation history, and partial progress. You can't just retry like serverless — every restart is a cold start with a different non-deterministic execution path.
-->

---

# Three Mismatches

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
- **Responsiveness**: 3 GB/s bursts too fast for user-space tools
- **Adaptability**: Kill = triple penalty (cold start + lost context + re-execution)

</div>

<!--
This is the key gap analysis slide. Existing resource management falls into three categories, and each one fails for agents. Static limits like cgroup memory.max: if you set it at peak, you waste over 90 percent of capacity; at average, you OOM-kill the agent. Reactive controls like systemd-oomd: memory bursts at 3 GB per second are too fast for user-space tools that take tens of milliseconds to react. Predictive scaling like Kubernetes VPA: 1.8x variance across runs of the same task breaks any history-based predictor. And killing is uniquely expensive — it's a triple penalty of cold start, lost context, and non-deterministic re-execution. These three mismatches — granularity, responsiveness, and adaptability — are what AgentCgroup is designed to address.
-->

---

# System Design

<div class="text-lg space-y-3 mt-1">

<div class="bg-blue-50/80 p-2 rounded-lg">

**1. Fine-Grained Resource Domains** → *Granularity*: bash wrapper → per-tool-call child cgroups

</div>

<div class="bg-blue-50/80 p-2 rounded-lg">

**2. In-Kernel eBPF** → *Responsiveness*: `sched_ext` + `memcg_bpf_ops`, **throttle → freeze → never kill**

</div>

<div class="bg-blue-50/80 p-2 rounded-lg">

**3. Bidirectional Negotiation** → *Adaptability*: agent hints upward, NL feedback downward

</div>

</div>

<!--
AgentCgroup addresses each mismatch with a dedicated mechanism. First, fine-grained resource domains: a transparent bash wrapper intercepts every tool call and places it in its own ephemeral child cgroup. No agent framework modification needed — it just replaces the bash binary path. Second, in-kernel eBPF enforcement: we use sched_ext for CPU scheduling and memcg_bpf_ops for memory control, both running in kernel space at microsecond-level reaction time. The key design choice is graduated enforcement — throttle first, freeze second, never kill. This avoids the triple penalty of kill-and-restart. Third, bidirectional negotiation: agents can declare resource needs upward via environment variables, and the system sends natural-language feedback downward via stderr when resources are constrained. The agent can then retry with a less resource-intensive approach. This closes the loop between the agent's semantic understanding and the OS's resource state.
-->

---

# Evaluation

<div class="grid grid-cols-2 gap-4 mt-1">

<div>

<img src="/images/eval_results.png" class="rounded-lg shadow h-44" />

<div class="text-lg mt-2">

3 concurrent agents, replayed traces at 50x

</div>

</div>

<div class="text-lg space-y-2">

<div class="bg-green-50/80 p-2 rounded-lg">

**Tight memory**: OOM survival 66% → **100%**; HIGH overhead only +2.8%

</div>

<div class="bg-green-50/80 p-2 rounded-lg">

**Moderate memory**: P95 latency **29% better** (71ms → 50ms)

</div>

<div class="bg-blue-50/80 p-2 rounded-lg">

Wrapper < 5ms/call · Throttle precision 2.3% · Hint accuracy 100%

</div>

<div class="bg-orange-50/80 p-2 rounded-lg">

**Throttle-don't-kill** eliminates OOM deaths with < 3% overhead

</div>

</div>

</div>

<!--
For evaluation, we replayed real memory traces from our characterization at 50x acceleration in a multi-tenant setting: 3 concurrent agents, one high-priority running a dask workload and two low-priority running github3.py tasks. Under tight memory — 1100 MB for a total demand of 1233 MB — baseline Linux OOM-kills one of the low-priority processes, giving only 66 percent survival. With our BPF controller, all three survive at 100 percent — the controller throttles low-priority processes with 239 throttle triggers while adding only 2.8 percent overhead to the high-priority agent. Under moderate memory at 1300 MB, the high-priority agent's P95 allocation latency improves by 29 percent. The bash wrapper adds less than 5 milliseconds per tool call, and throttling precision is within 2.3 percent relative error. Claude Haiku achieved 100 percent accuracy in generating valid resource hints.
-->

---

# Limitations & Future Work

<div class="grid grid-cols-2 gap-6 mt-4 text-lg">

<div>

### Limitations

- Requires patched kernel (`memcg_bpf_ops` under review)
- Evaluated with 3 agents; production runs 50-100+
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
A few limitations to acknowledge. First, memcg_bpf_ops is still under upstream review, so this requires a patched kernel — not yet ready for production. Second, we only tested with 3 concurrent agents; real cloud platforms run many more. Third, the bash wrapper only intercepts bash tool calls — direct API calls or file I/O bypass it. For future work, we want larger-scale evaluation, upstream kernel integration, cross-agent coordination for heterogeneous agent workloads, and predictive resource hints that don't depend on the LLM generating them.
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
Thank you for listening. I'm happy to take any questions about AgentCgroup or the broader landscape of AI agent resource management.
-->
