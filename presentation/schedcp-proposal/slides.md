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

Based on "Towards Agentic OS: An LLM Agent Framework for Linux Schedulers" to appear in MLforSystem 2025 workshop. https://arxiv.org/html/2509.01245v4

<div class="abs-br m-6 text-sm opacity-50">
  Class Project Presentation
</div>

---

# Background & Project Goal

<div class="grid grid-cols-2 gap-8">
<div>

### Background: The Optimization Gap

- **Challenge**: Generic OS policies (Linux) often fail specific app needs (SLOs).
- **Solution**: **SchedCP** proved LLM Agents can safely tune schedulers by decoupling *reasoning* (LLM) from *execution* (eBPF).

### The Problem

- **No Standard**: We lack a consistent way to measure "Agentic OS" performance.
- **Baselines**: "Human expertise" is subjective; existing RL is too narrow.

</div>
<div>

### Our Goal: A Standardized Benchmark

We propose the first benchmark to systematically evaluate **Agentic OS Optimization**.

**Problem Definition**:

Treat OS optimization as a **Goal-Oriented Agentic Task**:
1. **Goal Inference**: Infer optimization targets from system signals (logs, metrics) without explicit hints.
2. **Policy Synthesis**: Use diverse tools (eBPF, configs) to meet SLOs under constraints.

 Enable reproducible research and fair comparison of models/frameworks.

</div>
</div>

---

# Benchmark Framework Design

Goal: Evaluate LLM agent's ability to optimize OS behavior for diverse workloads under explicit **SLOs** and **budgets** (time, tokens, CPU/energy)

Build a RL-like environment for the agents, and allow agents to tune the OS configs and using code generation to alert OS behavior.

## RQs

- Can LLM agents infer optimization goals from telemetry, without being told the SLO?
<!-- - Can they hold SLOs under drift with controller‑grade stability (no thrash)? -->
- What SLO improvement do we buy given the agents?
- How do LLM agents achieve optimizations? Do we need to design better system interfaces?
<!-- - How does different interface (MCP vs direct code gen and bash) affect performance? -->

---

# Benchmark Implementation

**Approach**: OSS software (Helm/Docker) with pre-defined SLOs from documentation

<div class="grid grid-cols-2 gap-8 text-sm mt-4">

<div>

### Workload Suite (20-30)

- **CPU-bound**: kernel build, LLVM, xz/gzip, ffmpeg
- **Latency-critical**: schbench, hackbench, context-switch
- **Server**: nginx+wrk, Redis+memtier
- **Data processing**: sort/join, SQLite queries
- **Stress**: memory/CPU test suit
- **GPU**: vllm, llama.cpp, pytorch

Each: **clear SLOs + repeatable harness**

### Baselines

- Tested: Linux defaults (e.g. EEVDF)
- Future work: Published RL/ML tuners (e.g., DeepRM, Sparrow)

</div>

<div>

### Infrastructure

- **Runner**: Containers/VMs, pinned kernel
- **Input**: Docker file, config files and source code
- **Evaluator**: Multi-run stats of performance improvement + SLO checks
<!-- **Reproducibility**: Fixed seeds, hardware profiles -->
<!-- 

### Task Done

Built framework with ~10 workloads, working on more:

https://github.com/eunomia-bpf/schedcp -->

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