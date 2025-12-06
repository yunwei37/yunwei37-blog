---
theme: academic
title: 'Towards Agentic OS: An LLM Agent Framework for Linux Schedulers'
info: |
  ## Towards Agentic OS: An LLM Agent Framework for Linux Schedulers
  MLforSystem 2025 Workshop @ NeurIPS
class: text-center
coverDate: MLforSystem 2025 Workshop @ NeurIPS
drawings:
  persist: false
transition: fade
mdc: true
layout: cover
colorSchema: light
---

<div class="text-center">

<div class="text-5xl leading-relaxed">Towards Agentic OS: An LLM Agent Framework for Linux Schedulers</div>

<div class="mt-8 text-xl">
Yusheng Zheng¹, Yanpeng Hu², Wei Zhang³, Andi Quinn¹
</div>

<div class="text-sm opacity-80 mt-2">
¹UC Santa Cruz · ²ShanghaiTech University · ³University of Connecticut
</div>

</div>

<div class="abs-br m-4 mb-8 flex flex-col items-end gap-3">
  <div class="flex items-center gap-4">
    <img src="/ucsc-logo.png" class="h-10" alt="UC Santa Cruz" />
    <img src="/shanghaitech-logo.png" class="h-10" alt="ShanghaiTech University" />
    <img src="/uconn-logo.png" class="h-10" alt="University of Connecticut" />
  </div>
  <div class="flex items-center gap-3">
    <img src="/eunomia-logo.png" class="h-8" alt="eunomia-bpf" />
    <a href="https://github.com/eunomia-bpf/schedcp" class="text-sm opacity-70">github.com/eunomia-bpf/schedcp</a>
  </div>
  <div class="text-sm opacity-70">
    https://arxiv.org/abs/2509.01245
  </div>
</div>

---

# Can LLM Agent auto optimize OS schedulers?

<div class="text-lg opacity-70 mb-4">(Starting from sched_ext, the BPF-based extensible scheduler class in mainline Linux.)</div>

<div class="grid grid-cols-2 gap-8 text-lg">

<div class="border-l-4 border-blue-500 pl-4">

### Semantic Gap

OS Schedulers fail to understand application needs:
- Latency vs throughput
- Batch vs interactive
- Different SLOs

</div>

<div class="border-l-4 border-orange-500 pl-4">

### Human Knowledge Gap

We have knobs and extensible interface, but:
- Workload developer does not understand kernel internals;
- Sysadmins lack workload insight;
- End users lack both kernel and workload expertise;

</div>

</div>

---

# Current Solutions & Their Limitations

<div class="grid grid-cols-2 gap-6 text-lg">

<div class="border-2 border-blue-400 rounded-lg p-4">

<div class="font-semibold text-blue-600 mb-2 flex items-center gap-2"><mdi-chart-line class="text-xl" /> Traditional RL-based</div>

- Operate in **human-designed** state/action/reward spaces
- May need **per-workload retraining** to transfer
- Typically **tune parameters**, cannot synthesize new algorithms
- May include **inference overhead** in hot path

</div>

<div class="border-2 border-orange-400 rounded-lg p-4">

<div class="font-semibold text-orange-600 mb-2 flex items-center gap-2"><mdi-robot class="text-xl" /> Naïve LLM or Agents</div>

- **Fixed pipeline** that need human guide: e.g. Goal -> Config
- **Unsafe**: may crash system, needs root
- May **degrade performance**, not improve it

<div class="mt-3 p-2 rounded border-2 border-dashed border-orange-300 text-base">
Claude Code + "write a FIFO scheduler for sched_ext": <strong>33 min</strong>, <strong>$6</strong>, <strong>221 calls</strong>, <strong>1/3 success</strong>
</div>

</div>

</div>

---

# Our Insight: Goal-Inference vs Policy-Synthesis

<div class="flex flex-col gap-4">

<div class="flex gap-4 items-center">
<span class="text-base font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded w-24 text-center shrink-0">AI Agent</span>
<div class="flex items-center justify-center gap-4 flex-1">
<div class="flex flex-col items-center flex-1">
<div class="border-2 border-blue-400 rounded-lg p-2 text-center">
<div class="font-semibold text-blue-600 mb-1">Goal-Inference</div>
<div class="text-base">uses tools to analyze workload intent and structure, and system environments.</div>
</div>
<div class="text-base text-gray-500 mt-1">Stage 1</div>
</div>
<div class="text-2xl">→</div>
<div class="border border-gray-400 rounded px-3 py-1 text-base italic shrink-0">Workload Profile</div>
<div class="text-2xl">→</div>
<div class="flex flex-col items-center flex-1">
<div class="border-2 border-green-500 rounded-lg p-2 text-center">
<div class="font-semibold text-green-600 mb-1">Policy-Synthesis</div>
<div class="text-base">LLM config or generate safe, efficient eBPF schedulers from its analysis.</div>
</div>
<div class="text-base text-gray-500 mt-1">Stage 2</div>
</div>
</div>
</div>

<div class="border-t border-gray-300"></div>

<div class="flex gap-4 items-start">
<span class="text-base font-semibold text-green-600 bg-green-100 px-2 py-1 rounded w-24 text-center shrink-0 mt-2">System</span>
<div class="grid grid-cols-2 gap-4 flex-1">
<div class="border-2 border-purple-400 rounded-lg p-3">

**Goal**: System remains **safe and useful** as AI gets better

**Approach**: Separate AI **reasoning** from system **execution**

</div>
<div class="border-2 border-teal-400 rounded-lg p-3">

**Goal**: Manage OS like a **human SRE**

**Approach**: Work in **userspace control plane**, not kernel data plane

</div>
</div>
</div>

</div>

---

# System Architecture: SchedCP & Multi-Agent

<div class="grid grid-cols-2 gap-8">

<div>

<img src="/arch-schedcp.png" class="rounded shadow-lg" style="max-height: 400px;" alt="SchedCP Architecture Diagram" />

</div>

<div class="text-lg">

### Control Plane: a MCP server

- Workload Analysis Engine
- Policy Repository (eBPF templates for code generation and reference)
- Execution Verifier (safety checks)

### sched-agent

- **Observation** → Monitoring
- **Planning** → Goal inference with Reasoning
- **Execution** → Policy deployment
- **Learning** → Refinement

</div>

</div>

---

# Preliminary Evaluations (POC)

<div class="text-lg mb-2">
Setup: Claude Code + Opus 4 · Baseline: EEVDF · Repository: <a href="https://github.com/sched-ext/scx">sched-ext/scx</a> (~20 algorithms, each has many configs)
</div>

<div class="flex gap-6">

<div class="flex flex-col flex-1">
  <div class="text-lg font-semibold text-blue-600 mb-2">Scheduler Select & Config</div>
  <figure class="flex-1 min-h-0">
    <img src="/linux-build-results.png" class="rounded shadow-lg max-w-full max-h-full object-contain" />
    <figcaption class="text-lg text-center">Kernel Build: <strong>1.79× faster</strong></figcaption>
  </figure>
  <figure class="flex-1 min-h-0">
    <img src="/schbench-results.png" class="rounded shadow-lg max-w-full max-h-full object-contain" />
    <figcaption class="text-lg text-center">Schbench: <strong>2.11× lower P99</strong>, <strong>1.60× throughput</strong></figcaption>
  </figure>
</div>

<div class="border-l border-gray-300"></div>

<div class="flex flex-col flex-1">
  <div class="text-lg font-semibold text-green-600 mb-2">New Scheduler Synthesis</div>
  <figure class="min-h-0">
    <img src="/scheduler-comparison.png" class="rounded shadow-lg object-contain" style="max-width: 80%;" />
    <figcaption class="text-lg text-center">LJF for batch workloads: <strong>20% latency reduction</strong>, <strong>13× cost reduction ($6→$0.5)</strong></figcaption>
  </figure>
</div>

</div>

---

# Limitations & Future Work

<div class="flex gap-6 text-lg">

<div class="flex-1">

**Limitations**

Current evaluation is narrow as POCs:

- Need standardized agentic OS benchmarks: clearly defined tasks (goal inference, safety, adaptation), long-running, multi-service workloads

**Open Questions**

Is MCP the best interface for OS optimization? Or bash?


</div>

<div class="border-l border-gray-300"></div>

<div class="flex-1">

**More extensible OS Interfaces?**

Linux Mainline:

- sched_ext
- Network (e.g. XDP...)

Community solution:

- cache_ext (SOSP'25)
- cpufreq_ext (mailing list, Huawei)

We are also working on:

- gpu_ext ([LPC'25](https://lpc.events/event/19/contributions/2168/)): GPU memory management and schedule in Linux driver

</div>

</div>

---
layout: center
class: text-center
---

# Thank You

Questions?
