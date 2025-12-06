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
- Latency vs throughputs
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

<div class="flex items-center gap-2 mb-2">
<span class="text-2xl">🎯</span>
<span class="font-semibold text-blue-600">Traditional RL-based</span>
</div>

- Operate in **human-designed** state/action/reward spaces
- May need **per-workload retraining** to transfer
- Typically **tune parameters**, cannot synthesize new algorithms
- May include **inference overhead** in hot path

</div>

<div class="border-2 border-orange-400 rounded-lg p-4">

<div class="flex items-center gap-2 mb-2">
<span class="text-2xl">🤖</span>
<span class="font-semibold text-orange-600">Naïve LLM or Agents</span>
</div>

- **Fixed pipeline** that need human guide: e.g. Goal -> Config
- **Unsafe**: may crash system, needs root
- May **degrade performance**, not improve it

<div class="mt-3 p-2 rounded border-2 border-dashed border-orange-300 text-base">
📊 Claude Code + "write a FIFO scheduler for sched_ext": <strong>33 min</strong>, <strong>$6</strong>, <strong>221 calls</strong>, <strong>1/3 success</strong>
</div>

</div>

</div>

---

# Our Insight: Goal-Inference vs Policy-Synthesis

<div class="text-base font-semibold text-blue-600 mb-2">Algorithm</div>

<div class="flex items-center justify-center gap-4">

<div class="flex flex-col items-center">
<div class="border-2 border-blue-400 rounded-lg p-3 w-52 text-center">
<div class="font-semibold text-blue-600 text-lg mb-1">Goal-Inference</div>
<div class="text-base">uses tools to analyze workload intent and structure, and system environments.</div>
</div>
<div class="text-sm text-gray-500 mt-1">Stage 1</div>
</div>

<div class="text-3xl">→</div>

<div class="bg-gray-200 rounded px-3 py-1 text-sm italic">
Workload Profile
</div>

<div class="text-3xl">→</div>

<div class="flex flex-col items-center">
<div class="border-2 border-green-500 rounded-lg p-3 w-52 text-center">
<div class="font-semibold text-green-600 text-lg mb-1">Policy-Synthesis</div>
<div class="text-base">LLM config or generate safe, efficient eBPF schedulers from its analysis.</div>
</div>
<div class="text-sm text-gray-500 mt-1">Stage 2</div>
</div>

</div>

<div class="text-base font-semibold text-green-600 mt-4 mb-2">System</div>

<div class="grid grid-cols-2 gap-6 text-base">

<div class="border-l-4 border-purple-400 pl-3">

**Goal**: The system remains safe and useful when AI Agent gets better.

**Approach**: Separate the AI's role of reasoning ("what and how to optimize") from the system's role of execution ("how to observe and act").

</div>

<div class="border-l-4 border-teal-400 pl-3">

**Goal**: LLM Agent should manage OS like a human SRE.

**Approach**: Work in userspace control plane, not the kernel data plane.

</div>

</div>

---

# System Architecture: SchedCP & Multi-Agent

<div class="grid grid-cols-2 gap-8 mt-6">

<div>

<img src="/arch-schedcp.png" class="rounded shadow-lg" style="max-height: 500px;" alt="SchedCP Architecture Diagram" />

</div>

<div>

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

- Agent: Claude code + Claude opus 4
- Baseline: default EEVDF
- Policy Repository: https://github.com/sched-ext/scx (~20 different algorithms, each has many configs)
- Scheduler algorithm select and config: 1.79× faster, 2.11× lower P99 latency, 1.60× higher throughput, 13× cost reduction ($6 → $0.45)
- New scheduler synthesis: LJF for batch workloads achieves 20% latency reduction

<div class="grid grid-cols-2 gap-6 mt-4">

<div class="flex flex-col gap-4">
  <div>
    <img src="/linux-build-results.png" class="rounded shadow-lg" alt="Linux Build Benchmark Results" />
    <div class="text-xs mt-1 opacity-70 text-center">Select and config scheduler for Kernel Build: <strong>1.79× faster</strong></div>
  </div>
  <div>
    <img src="/schbench-results.png" class="rounded shadow-lg" alt="Schbench Performance Comparison" />
    <div class="text-xs mt-1 opacity-70 text-center">Schbench: <strong>2.11× lower P99</strong></div>
  </div>
</div>

<div>
  <img src="/scheduler-comparison.png" class="rounded shadow-lg h-full object-contain" alt="Scheduler Performance Comparison" />
  <div class="text-xs mt-1 opacity-70 text-center">Scheduler Comparison</div>
</div>

</div>

---

# Limitations & Future Work

Current evaluation is narrow as POCs:

- Need standardized agentic OS benchmarks:
  - clearly defined tasks (goal inference, safety, adaptation)
  - long-running, multi-service workloads

Is MCP the best interface for OS optimization ? Sometimes bash is more efficent?

How can we tune and extend the algorithms in OS kernel?
-> need runtimes and more safe ways to allow agents experiments
-> What else can people do?

Linux Mainline: 

- sched_ext
- Network (e.g. XDP...)

Community solution: 

- cache_ext (SOSP'25)
- cpufreq_ext (mailing list, Huawei)

We are also working on:

- gpu_ext: (Linux plumbers 25, https://lpc.events/event/19/contributions/2168/)
  - GPU memory management and schedule in Linux driver

---
layout: center
class: text-center
---

# Thank You

Questions?
