# Towards Agentic OS: An LLM Agent Framework for Linux Schedulers

**Paper:** https://arxiv.org/abs/2509.01245

## Authors

- Yusheng Zheng (UC Santa Cruz)
- Yanpeng Hu (ShanghaiTech University)
- Wei Zhang (University of Connecticut)
- Andi Quinn (UC Santa Cruz)

## Abstract

The research addresses a critical challenge in operating systems: kernel scheduling policies lack understanding of application-specific requirements. The authors present SchedCP, enabling autonomous LLM agents to optimize Linux schedulers safely and efficiently. Their framework separates semantic reasoning from execution mechanics, decomposing optimization into goal-inference and policy-synthesis stages. Using a Model Context Protocol server architecture with validation mechanisms, they demonstrate improvements of up to 1.79× performance gains and 13× cost reduction through their sched-agent multi-agent system.

## Core Framework Components

**SchedCP** operates as a control plane API providing three essential services:

1. **Workload Analysis Engine** - Tiered access to performance data, from cost-effective summaries to secure profiling tools and eBPF probes

2. **Scheduler Policy Repository** - Database storing executable eBPF scheduler programs with semantic search capabilities and performance metrics

3. **Execution Verifier** - Multi-stage validation pipeline including kernel verification, scheduler-specific static analysis, and dynamic validation in micro-VMs

## Multi-Agent Architecture

**sched-agent** implements in-context reinforcement learning through four specialized agents:

- **Observation Agent** - Builds workload profiles strategically querying analysis engines
- **Planning Agent** - Transforms profiles into optimization strategies
- **Execution Agent** - Manages development, validation, and deployment
- **Learning Agent** - Completes feedback loops and updates repositories

## Key Findings and Results

**Scheduler Configuration Performance:**
- Kernel compilation achieved 1.63× speedup initially, reaching 1.79× total improvement over EEVDF through iterative refinement
- schbench tests showed 2.11× better P99 latency and 1.60× higher throughput

**New Scheduler Synthesis:**
- Successfully identified optimization goals for 8 batch workload types
- Implemented Longest Job First scheduling achieving 20% average latency reduction
- Improved efficiency by 13× with cost reduced to $0.45 per workload synthesis

## Key Insight

The research demonstrates that successful autonomous OS optimization requires architectural separation between AI reasoning capabilities and system execution safeguards, rather than simply applying advanced LLMs to existing problems.
