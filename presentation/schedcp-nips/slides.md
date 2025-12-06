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

# Can LLM Agents fully automatically optimize OS?

(Start from schedulers in mainline Linux kernel, thanks sched_ext)

### Problem

- **Semantic Gap**: Schedulers fail to understand application needs (latency vs throughputs, different SLOs)
- **Knowledge Gap**: 
  - Developers lack workload insight; 
  - users lack kernel expertise;
  - Kernel programming is hard, limiting innovation;

### Current solutions:

- **Traditional RL-based**: Require per-workload training and human specific SLOs
- **Naïve LLM or Agents**: 
  - Fix pipeline that need human guide, 
  - A small experiment: Unsafe (can crash system), inefficient ($6, 33 min/run for a single generation), may reduce performance.

---

# Our Insight: Decouple Reasoning from Execution in 2 stages

Separate the AI's role of reasoning ("what and how to optimize") from the system's role of execution ("how to observe and act"). The system remains safe and useful when AI Agent gets better.

Model the process as 2 stages:

- **Goal-Inference**: uses tools to analyze workload intent and structure, and system environments.
- **Policy-Synthesis**: LLM config or generate safe, efficient eBPF schedulers from its analysis.

LLM Agent should manage OS like a human SRE:

- work in in userspace control plane, not the kernel data plane (scheduler hot path)


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
- Policy Repository: https://github.com/sched-ext/scx (~20 different algorithms, each has many configs)
- Improvement: 1.79× faster, 2.11× lower P99 latency, 1.60× higher throughput, 13× cost reduction

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

What we further need to evalution?

- Standardized benchmark framework for Agentic tasks

How can we tune and extend the algorithms in OS kernel?
-> need runtimes and more safe ways to allow agents experiments

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
