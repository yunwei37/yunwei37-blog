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

**A Framework for LLM Agents to Safely Tune the Linux**

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

We propose the benchmark to systematically evaluate **Agentic OS Optimization**.

**Problem Definition**:

Treat OS optimization as a 2 step **Goal-Oriented Agentic Task**:
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

- What SLO improvement do we buy given the agents?
- Can LLM agents infer optimization goals from telemetry, without being told the SLO?
- How do LLM agents achieve optimizations? Do we need to design better system interfaces?
<!-- - How does different interface (MCP vs direct code gen and bash) affect performance? -->
<!-- - Can they hold SLOs under drift with controller‑grade stability (no thrash)? -->

---

# Benchmark Implementation

**Approach**: OSS software (Helm/Docker) with pre-defined SLOs from documentation

<div class="grid grid-cols-2 gap-8 text-sm mt-4">

<div>

### Workload Suite

- **CPU-bound**: kernel build, LLVM, xz/gzip, ffmpeg
- **Latency-critical**: schbench, hackbench, context-switch
- **Server**: nginx+wrk, Redis+memtier
- **Data processing**: rocksdb, SQLite queries, clickhouse
- **GPU**: vllm, llama.cpp, pytorch, faiss

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

# Benchmark Setup

<div class="grid grid-cols-2 gap-8">
<div>

### Testbed Specifications

- **OS**: Ubuntu 24.04.3 LTS
- **Kernel**: 6.15.11-061511-generic
- **CPU**: Intel Core Ultra 9 285K
- **Cores**: 24 cores (1 thread/core)
- **Memory**: 128 GB DDR5
- **GPU**: NVIDIA GeForce RTX 5090 (32 GB)
- **Storage**: NVMe SSD

</div>
<div>

### Setup

- **Model**: Claude Sonnet 4.5, Haiku 4.5
- **Config**: MCP interface and direct code/bash access

### Tunable Parameters

- sysctl configs
- Tune and write eBPF policy for CPU thread scheduling
- Tune and write eBPF policy for GPU memory management and GPU kernel scheduling

</div>
</div>

---

# Benchmark Results (1/2)

### RQ1: What SLO improvement do we buy given the agents?

<img src="/table.png" class="h-80 mx-auto" />

*results with claude code and Claude Sonnet 4.5, 3 times and pick the best.  Average: 2.02x (Without outliers, 1.45x)*

---

# Benchmark Results (2/2)

<div class="grid grid-cols-2 gap-8">
<div>

### RQ2: Goal Inference

**Can agents infer goals without explicit SLOs?**

- **Sonnet 4.5**: 88.2% success (15/17 workloads)
- **Haiku 4.5**: 70.6% success (12/17 workloads)

Bad on some benchmarks (e.g. hackbench, context-switch) due to non-widely known goals.
Compare optimization goal with ground truth by human.

**Avg steps(LLM calls):**

- **Sonnet 4.5**: 23.2 steps
- **Haiku 4.5**: 35.8 steps

</div>
<div>

### RQ3: Optimization Strategies

**How do agents optimize? Better interfaces needed?**

- MCP (test with sonnet) increases steps by 13% vs direct Bash, and reduces improvement.
- Direct code/bash access more flexible
- MCP favors safety, auditability, and cross-model compatibility

</div>
</div>

---
layout: center
class: text-center
---

# Thank You

**Reference**: Zheng et al., "Towards Agentic OS: An LLM Agent Framework for Linux Schedulers," MLforSystem 2025

Questions?