---
theme: seriph
background: https://cover.sli.dev
title: 'SchedCP: Autonomous OS Optimization with LLM Agents'
info: |
  ## SchedCP: Autonomous OS Optimization with LLM Agents
  A framework for safe, efficient, and autonomous performance tuning.
class: text-center
drawings:
  persist: false
transition: slide-left
mdc: true
---

# SchedCP: Autonomous OS Optimization

**A Framework for LLM Agents to Safely Tune the Linux Scheduler**

Based on "Towards Agentic OS: An LLM Agent Framework for Linux Schedulers" to appear in MLforSystem 2025 workshop in NIPS as spotlight. https://arxiv.org/html/2509.01245v4

<div class="abs-br m-6 text-sm opacity-50">
  Class Project Presentation
</div>

---

# Can LLM Agents fully automatically optimize OS? Start from schedulers

<div class="grid grid-cols-2 gap-8">
<div>

### Problem

- **Semantic Gap**: Schedulers fail to understand application needs (latency vs throughputs, SLOs)
- **Knowledge Gap**: Developers lack workload insight; users lack kernel expertise. Kernel programming is hard, limiting innovation.

### Current solutions:

- **Traditional RL-based**: Require per-workload training and human specific SLOs
- **Naïve LLM or Agents**: Fix pipeline that need human guide, or Unsafe (can crash system), inefficient ($6, 33 min/run for a single generation), may reduce performance.

</div>
<div>

### Our Insight: Decouple Reasoning from Execution in 2 stages

Separate the AI's role of reasoning ("what and how to optimize") from the system's role of execution ("how to observe and act"). The system remains safe and useful when AI Agent gets better.

Model the process as 2 stages:

- **Goal-Inference**: uses tools to analyze workload intent and structure, and system environments.
- **Policy-Synthesis**: LLM config or generate safe, efficient eBPF schedulers from its analysis.

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
- Policy Repository (eBPF templates for code generation)
- Execution Verifier (safety checks)

### sched-agent

- **Observation** → Monitoring
- **Planning** → Goal inference with Reasoning
- **Execution** → Policy deployment
- **Learning** → Refinement

Key idea: LLM Agent in control plane, not the data plane, manage OS like a human SRE without overhead.

</div>

</div>

---

# Preliminary Evaluations

<div class="grid grid-cols-2 gap-8 mt-4">

<div>

### On Claude code + Claude opus 4

- 1.79× faster,  2.11× lower P99 latency, 1.60× higher throughput, 13× cost reduction vs. naïve agents

### Limitations & Next Steps

- Develop standardized benchmark framework for Agentic tasks
- Extend to I/O, memory, power subsystems

<div>
<img src="/linux-build-results.png" class="rounded shadow-lg" alt="Linux Build Benchmark Results" />
<div class="text-xs mt-1 opacity-70 text-center">Config: Kernel Build: <strong>1.79× faster</strong></div>
</div>

</div>

<div>

<div class="space-y-4">

<div>
<img src="/schbench-results.png" class="rounded shadow-lg" alt="Schbench Performance Comparison" />
<div class="text-xs mt-1 opacity-70 text-center">Config: Schbench: <strong>2.11× lower P99</strong>, <strong>1.60× throughput</strong></div>
</div>

<div>
<img src="/scheduler-comparison.png" class="rounded shadow-lg" alt="Scheduler Performance Comparison" />
<div class="text-xs mt-1 opacity-70 text-center">Overall Scheduler Comparison</div>
</div>

</div>

</div>

</div>

---

# Benchmark Framework Design

Goal: Evaluate LLM agent's ability to optimize OS behavior for diverse workloads under explicit **SLOs** and **budgets** (time, tokens, CPU/energy)

Build a RL-like environment for the agents, and allow agents to tune the OS configs and using code generation to alert OS behavior.

<div class="grid grid-cols-2 gap-4 text-sm">

<div>

## RQs

- Can agents infer optimization goals from telemetry, without being told the SLO?
- Can they hold SLOs under drift with controller‑grade stability (no thrash)?
- What improvement do we buy per token/second—what are the scaling laws?
- How does agents achieve optimizations? Do we need to design better system interface?


</div>

<div>

## Task Design (2-Phase Challenge)

1. **Goal Inference**: From traces/metrics/logs, infer bottlenecks & optimization targets
2. **Policy/Tool Synthesis**: Select/configure tools OR synthesize code (eBPF schedulers) to meet SLOs

Test with different models and agents (Claude code, codex)

</div>


</div>


---

# Benchmark Implementation

**Approach**: OSS software (Helm/Docker) with pre-defined SLOs from documentation

<div class="grid grid-cols-2 gap-8 text-sm mt-4">

<div>

### Workload Suite (20-30)

**CPU-bound**: kernel build, LLVM, xz/gzip, ffmpeg
**Latency-critical**: schbench, hackbench, context-switch
**Server**: nginx+wrk, Redis+memtier
**Data processing**: sort/join, SQLite queries
**Stress**: memory/CPU test suit
**GPU**: vllm, llama.cpp, pytorch

Each: **clear SLOs + repeatable harness**

### Baselines
- Linux defaults (CFS/EEVDF, tuned)
- Published RL/ML schedulers
- Naïve LLM agents (no control plane) with bash access



</div>

<div>

### Infrastructure

**Runner**: Containers/VMs, pinned kernel
**Agent Sandbox**: MCP server + verifier
**Evaluator**: Multi-run stats + SLO checks
**Reproducibility**: Fixed seeds, hardware profiles


### Task Done

Built framework with ~10 workloads, working on more:

https://github.com/eunomia-bpf/schedcp

</div>

</div>

<div class="text-xs mt-6 opacity-60">
*SLO = Service Level Objective: measurable targets (e.g., P99 latency < 10ms, throughput > 1000 req/s) you set to ensure the services you deliver meet customers' expectations, and define what metrics are better.
</div>


---
layout: center
class: text-center
---

# Thank You

**Reference**: Zheng et al., "Towards Agentic OS: An LLM Agent Framework for Linux Schedulers," MLforSystem 2025

Questions?
