---
theme: academic
title: 'Extending eBPF to GPU Device and Driver Contexts'
info: |
  ## Extending eBPF to GPU Device and Driver Contexts
  Linux Plumbers Conference 2025 - eBPF Track
class: text-center
drawings:
  persist: false
transition: fade
mdc: true
layout: cover
colorSchema: light
---

<div class="text-center">

<div class="text-4xl font-bold leading-relaxed">Extending eBPF to GPU Device and Driver Contexts</div>

<div class="mt-6 text-lg">
Yusheng Zheng, Tong Yu
</div>

<div class="text-sm opacity-80 mt-2">
eunomia-bpf community
</div>

</div>

<div class="abs-tr m-4 flex flex-col items-end gap-3">
  <div class="flex items-center gap-3">
    <img src="/eunomia-logo.png" class="h-8" alt="eunomia-bpf" />
    <a href="https://github.com/eunomia-bpf/bpftime" class="text-sm opacity-70">github.com/eunomia-bpf/bpftime</a>
  </div>
</div>

---

# Agenda

<div class="grid grid-cols-2 gap-8 mt-4">

<div>

### Background
- GPU Stack Overview
- Workload Diversity

### The Problem
- Static Policies vs Diverse Workloads
- Existing Solutions & Limitations

### Insight
- GPU needs an extensible OS policy interface

</div>

<div>

### Our Exploration

**gpu_ext**: Extending GPU Driver with eBPF
   - Memory & Scheduling Interfaces for control

**Device eBPF**: Running eBPF on GPU (bpftime)
   - SIMT-aware
   - Observability Tools
   - Prefetch & Schedule (experimental)

**Cross-layer Coordination**
   - Cross Device eBPF Maps

</div>

</div>

---

# Background: GPU Stack Overview

<div class="grid grid-cols-2 gap-6">

<div class="flex-1 flex flex-col items-center justify-center">

<!-- GPU Stack Architecture Diagram -->
<div class="w-full">

<!-- User Space Layer - Multiple Apps with CUDA inside -->
<div class="text-sm font-bold text-blue-700 mb-1">User Space</div>
<div class="grid grid-cols-4 gap-1">
<div class="border-2 border-blue-400 rounded p-1 bg-blue-50 text-center">
<div class="text-xs font-semibold">vLLM</div>
<div class="border border-purple-400 rounded px-1 bg-purple-100 text-xs text-purple-600 mt-1">CUDA</div>
</div>
<div class="border-2 border-blue-400 rounded p-1 bg-blue-50 text-center">
<div class="text-xs font-semibold">PyTorch</div>
<div class="border border-purple-400 rounded px-1 bg-purple-100 text-xs text-purple-600 mt-1">CUDA</div>
</div>
<div class="border-2 border-blue-400 rounded p-1 bg-blue-50 text-center">
<div class="text-xs font-semibold">Faiss</div>
<div class="border border-purple-400 rounded px-1 bg-purple-100 text-xs text-purple-600 mt-1">CUDA</div>
</div>
<div class="border-2 border-blue-400 rounded p-1 bg-blue-50 text-center">
<div class="text-xs font-semibold">TensorRT</div>
<div class="border border-purple-400 rounded px-1 bg-purple-100 text-xs text-purple-600 mt-1">CUDA</div>
</div>
</div>

<div class="flex justify-center my-2">
<div class="text-gray-400 text-sm">↓ ioctl / mmap ↓</div>
</div>

<!-- Kernel Driver Layer -->
<div class="border-2 border-green-500 rounded-lg p-2 bg-green-50">
<div class="text-sm font-bold text-green-700 text-center mb-1">Kernel Driver</div>
<div class="grid grid-cols-3 gap-1">
<div class="border border-green-400 rounded p-1 bg-white text-center text-xs">UVM</div>
<div class="border border-green-400 rounded p-1 bg-white text-center text-xs">Channel</div>
<div class="border border-green-400 rounded p-1 bg-white text-center text-xs">MMU</div>
</div>
</div>

<!-- CPU/GPU Boundary -->
<div class="flex items-center my-2 gap-2">
<div class="text-xs text-gray-500 font-semibold -mt-4">CPU ↑</div>
<div class="flex-1 border-t-2 border-dashed border-gray-400"></div>
<div class="text-gray-500 text-xs px-2 bg-white">PCIe / NVLink</div>
<div class="flex-1 border-t-2 border-dashed border-gray-400"></div>
<div class="text-xs text-gray-500 font-semibold -mb-4">↓ GPU</div>
</div>

<!-- Device Layer -->
<div class="border-2 border-orange-500 rounded-lg p-2 bg-orange-50">
<div class="text-sm font-bold text-orange-700 text-center mb-1">GPU Device</div>
<!-- Firmware + Scheduler -->
<div class="grid grid-cols-2 gap-1 mb-1">
<div class="border border-orange-400 rounded p-1 bg-white text-center text-xs">Firmware</div>
<div class="border border-orange-400 rounded p-1 bg-white text-center text-xs">HW Scheduler</div>
</div>
<!-- SMs -->
<div class="border border-orange-400 rounded p-1 bg-white mb-1">
<div class="text-xs text-center text-orange-600 mb-1">Streaming Multiprocessors (SMs)</div>
<div class="grid grid-cols-4 gap-1">
<div class="border border-orange-300 rounded px-1 bg-orange-50 text-center text-xs">SM0</div>
<div class="border border-orange-300 rounded px-1 bg-orange-50 text-center text-xs">SM1</div>
<div class="border border-orange-300 rounded px-1 bg-orange-50 text-center text-xs">...</div>
<div class="border border-orange-300 rounded px-1 bg-orange-50 text-center text-xs">SMn</div>
</div>
</div>
<!-- Memory -->
<div class="grid grid-cols-2 gap-1">
<div class="border border-orange-400 rounded p-1 bg-white text-center text-xs">HBM / VRAM</div>
<div class="border border-orange-400 rounded p-1 bg-white text-center text-xs">L2 Cache</div>
</div>
</div>

</div>

</div>

<div>

### User Space
- Applications: vLLM, PyTorch, Faiss, TensorRT...
- Runtime: CUDA, cuDNN, cuBLAS
- Rich semantic info (model structure, SLOs)

### Kernel Driver
- GPU's "OS component"
- Memory management (UVM, page tables)
- Scheduling (channels, TSG)

### GPU Device
- User-defined GPU kernels
- Vendor firmware (proprietary)
- Hardware: SMs, Warps, HBM

</div>

</div>

---

# Background: Workload Diversity

<div class="grid grid-cols-2 gap-4">

<div>

<div class="flex flex-col gap-2">
<div class="flex items-center gap-2">
<div class="text-xs font-semibold w-20">Faiss Build</div>
<img src="/patterns/build-pattern.png" class="rounded shadow" style="height: 70px; flex: 1;" />
<div class="text-xs text-blue-600 w-16">Sequential</div>
</div>
<div class="flex items-center gap-2">
<div class="text-xs font-semibold w-20">Faiss Query</div>
<img src="/patterns/query-pattern.png" class="rounded shadow" style="height: 70px; flex: 1;" />
<div class="text-xs text-orange-600 w-16">Random</div>
</div>
<div class="flex items-center gap-2">
<div class="text-xs font-semibold w-20">LLM Prefill</div>
<img src="/patterns/prefill-pattern.png" class="rounded shadow" style="height: 70px; flex: 1;" />
<div class="text-xs text-blue-600 w-16">Stride</div>
</div>
<div class="flex items-center gap-2">
<div class="text-xs font-semibold w-20">LLM Decode</div>
<img src="/patterns/decode-pattern.png" class="rounded shadow" style="height: 70px; flex: 1;" />
<div class="text-xs text-orange-600 w-16">Sparse</div>
</div>
<div class="flex items-center gap-2">
<div class="text-xs font-semibold w-20">PyTorch DNN</div>
<img src="/patterns/dnn.png" class="rounded shadow" style="height: 70px; flex: 1;" />
<div class="text-xs text-green-600 w-16">Periodic</div>
</div>
</div>

</div>

<div>

### Diverse Resource & Behavior

- **Compute-bound** vs **Memory-bound**
- Different access patterns → different optimal policies

### Memory Placement / Offloading

- HBM expensive & limited (RTX 5090: 32GB)
- Models/Dataset exceed VRAM: MoE 59GiB, KV-cache grows

### Multi-tenancy Scheduling

- **LC**: LLM inference, needs low P99 latency
- **BE**: Training, needs high throughput
- Conflicts: memory competition, compute interference

</div>

</div>

---

# The Problem: GPU Software Stack

<div class="grid grid-cols-2 gap-6">

<div>

**User-space Runtime** (closed-source)

**GPU Driver** (partially open-source)
- One-Size-Fits-All policies
- Memory: LRU eviction, tree-based prefetch
- Scheduling: Round-robin, fixed timeslice

> Bad and blackbox policies make people want **kernel bypass** (e.g. UVM offer transparency, but they try to manage memory themselves)

**Vendor Firmware** (closed-source, black box)

**Applications & Device Code**
- Diverse workloads, diverse access patterns

</div>

<div>

**Where can we add extensibility?**

- Userspace shim (LD_PRELOAD): change command before they get to driver
- GPU Driver: **policy open-source** after 2022

</div>

</div>

---

# Existing Solutions For extensibility

<div class="grid grid-cols-2 gap-4">

<div class="border-l-4 border-blue-500 pl-3">

**User-space Runtimes** (vLLM, Sglang, ktransformer) and 
**Userspace shims** (XSched..)
- Application-bound
- No cross-tenant visibility and control
- Cannot access low level driver mechanisms

</div>

<div class="border-l-4 border-green-500 pl-3">

**Driver Modifications** (TimeGraph, Gdev, GPreempt)
- Policies are hard code, hard to maintain and deploy
- Safety risks

</div>

<div class="border-l-4 border-orange-500 pl-3">

**Device Profilers** (NVBit, Neutrino, CUPTI)
- Design for Read-only
- High overhead

</div>

<div class="border-l-4 border-purple-500 pl-3">

**Host eBPF**
- GPU device remains a black box
- No programmable hooks in GPU driver for control

</div>

</div>

---

# Insight: GPU Needs an Extensible OS Policy Interface

<div class="grid grid-cols-2 gap-6">

<div class="border-2 border-blue-500 rounded-lg p-4">

### GPU Driver is the Right Place

- **Global visibility and control**: coordinate all applications Cross-tenants
- **Privileged access**: controls hardware mechanisms (Replayable Pagefaults, TSG)
- **Transparent**: no app modifications needed

Inspired by **sched_ext/cache_ext**: CPU-side has proven this pattern works

</div>

<div class="border-2 border-orange-500 rounded-lg p-4">

### But Host eBPF is Not Enough

- Device side logic is complex
- Device internal execution state invisible
  - Warp divergence, SM load
- Memory sync patterns invisible
- Cannot execute policy logic **inside GPU kernels**

<div class="mt-3 p-2 bg-orange-50 rounded text-base">
Need to extend eBPF to GPU device contexts
</div>

</div>

</div>

---

# Our Exploration: eBPF for GPU

<div class="grid grid-cols-2 gap-8 mt-4">

<div class="border-2 border-blue-500 rounded-lg p-4">

### Part 1: gpu_ext

**Extending Linux GPU Driver with eBPF**

- Add eBPF attach points to GPU driver
- Memory management hooks in UVM
- Scheduling interface hooks with TSG
- Uses standard eBPF verifier + struct_ops

</div>

<div class="border-2 border-green-500 rounded-lg p-4">

### Part 2: Device eBPF

**Running eBPF on GPU Device (bpftime)**

- Compile eBPF to PTX/SPIR-V
- Device-side hooks and helpers
- Inject into GPU kernels via dynamic instrumentation
- Cross-layer eBPF Maps

</div>

</div>

---
layout: center
class: text-center
---

# Part 1: gpu_ext

Extending Linux GPU Driver with eBPF

---

# GPU Scheduling Concepts

<div class="grid grid-cols-3 gap-4">

<div>

### Key Concepts
- **Channel**: Command queue (per CUDA stream)
- **Task Group (TSG)**: Scheduling unit, groups channels
- **Runlist**: HW scheduler's queue of TSGs

</div>

<div>

### Why TSG, Not GPU Kernels?
- **Kernel launch bypasses driver** - userspace writes pushbuffer + doorbell via MMIO
- **Driver only sees TSG lifecycle** - create, bind, destroy

</div>

<div class="row-span-2 flex flex-col items-center">

### Task Group Lifecycle

<img src="/mermaid-sched.png" class="rounded" style="max-height: 320px;" />

</div>

<div class="col-span-2">

### Scheduling Parameters
- **Timeslice**: Time before preemption (1s LC / 200μs BE)
- **Interleave Level**: Priority (LOW/MED/HIGH)

</div>

</div>

---

# GPU Memory Concepts

<div class="grid grid-cols-3 gap-4">

<div>

### Key Concepts
- **Unified Memory**: CPU & GPU share VA space
- **VA Block**: Virtual address range
- **Chunk**: Physical block (2MB)
- **Replayable Fault**: Warp paused → driver migrates → replay

</div>

<div class="flex flex-col items-center">

### Page Fault Handling

<img src="/pagefault.png" class="rounded" style="max-height: 320px;" />

</div>

<div class="flex flex-col items-center">

### Chunk-VABlock Lifecycle

<img src="/chunk.png" class="rounded" style="max-height: 320px;" />

</div>

</div>

---

# Challenge: Expressiveness vs Safety

<div class="text-lg mt-4">

GPU drivers were **not designed** to expose a programmable interface

- **More Expressiveness** → Expose low-level mechanisms (page tables, command buffers)
  - Risk driver safety and isolation

- **More Safety** → Constrain to high-level abstractions
  - Risk: limits complex memory/scheduling decisions

</div>

<div class="mt-6 p-4 bg-blue-50 rounded-lg">

### Our Approach: Narrow, Safe Interface

- Policy **advises**, kernel **decides**
- Expose **structured hooks**, not raw mechanisms; **Bounded operations** via kfuncs
- Implemented as **struct_ops**

</div>

---

# Memory Management Interface

<div class="grid grid-cols-2 gap-4">

<div class="text-xs overflow-y-auto" style="max-height: 420px;">

```c
struct gpu_mem_ops {
  // Eviction hooks (2MB block granularity)
  // Called when block added to eviction list
  // Trigger: first alloc from block, becomes evictable
  int (*gpu_block_activate)(pmm, block, list);
  // Called when any page in block is accessed
  // Trigger: page fault on va_block mapped to this block
  int (*gpu_block_access)(pmm, block, list);
  // Called before selecting victim for eviction
  // Trigger: memory pressure, need to free blocks
  // Can: reorder used/unused lists
  int (*gpu_evict_prepare)(pmm,
    block_used_list, block_unused_list);
  // Prefetch hooks (page granularity)
  // Called before computing prefetch region
  // Trigger: after page fault handled
  // Can: set result_region directly (BYPASS)
  //      or enter tree iteration (ENTER_LOOP)
  int (*gpu_page_prefetch)(page_index, bitmap_tree,
    max_prefetch_region, result_region);
  // Called on each level of bitmap tree traversal
  // Can: expand/shrink prefetch_region
  int (*gpu_page_prefetch_iter)(bitmap_tree,
    max_region, current_region, counter,
    prefetch_region);
};
// kfuncs
void bpf_gpu_block_move_head(block, list);
void bpf_gpu_block_move_tail(block, list);
void bpf_gpu_set_prefetch_region(region, first, outer);
```

</div>

<div class="text-sm">

### Implementable Policies

The default policy is LRU + tree-based prefetching

- LFU, MRU, FIFO eviction
- Stride / sequential prefetch
- Per-process memory priority

### Safety: Programmable Cache Model

- Policy can **reorder** eviction list, but **cannot remove**
- Kernel picks final victim
- kfuncs only allow **move_head/move_tail** operations
- Prefetch policy sets region, kernel validates bounds

</div>

</div>

---

# Scheduling Interface

<div class="grid grid-cols-2 gap-4">

<div class="text-xs overflow-y-auto" style="max-height: 400px;">

```c
struct gpu_sched_ops {
  // Called when task group is created
  // Trigger: cuCtxCreate / cudaSetDevice
  // Can: set timeslice, interleave level
  // Ctx: tsg_id, engine_type, default_timeslice
  int (*task_init)(struct gpu_task_init_ctx *ctx);

  // Called when task group binds to runlist (ONE-TIME)
  // Trigger: first kernel launch activates the TSG
  // Note: subsequent kernel launches bypass driver!
  // Can: admission control (reject bind)
  int (*task_bind)(struct gpu_task_bind_ctx *ctx);

  // Called when task group is destroyed
  // Trigger: cuCtxDestroy / process exit
  // Can: cleanup BPF map state
  int (*task_destroy)(struct gpu_task_ctx *ctx);
};
// kfuncs
void bpf_gpu_set_timeslice(ctx, u64 us);
void bpf_gpu_set_interleave(ctx, u32 level);
void bpf_gpu_reject_bind(ctx);
```

</div>

<div class="text-sm">

### Policy Can Set

- Timeslice (1s for LC, 200μs for BE)
- Interleave level (LOW/MED/HIGH priority)
- Accept/reject task binding

### Use Cases

- LC vs BE differentiation by process name
- Multi-tenant fairness / isolation
- Overload protection

</div>

</div>

---

# Implementation: Extending NVIDIA Open GPU Modules (POC)

<div class="grid grid-cols-2 gap-6 text-base">

<div class="border-l-4 border-blue-500 pl-4">

### Modifications

- UVM module: ~100 lines instrumentation
- Page fault handler hooks
- Prefetch logic hooks
- TSG lifecycle event hooks

</div>

<div class="border-l-4 border-green-500 pl-4">

### Driver Independence

- ~1000 lines eBPF framework integration
- Uses Linux eBPF verifier + GPU-specific struct_ops/kfunc via BTF
- (May be **extracted** as standalone module)

</div>

</div>

<div class="mt-4 p-3 bg-gray-100 rounded text-sm">

**POC Code**: [github.com/eunomia-bpf/gpu_ext_policy](https://github.com/eunomia-bpf/gpu_ext_policy) (eBPF policies) | [github.com/eunomia-bpf/gpu_ext-kernel-modules](https://github.com/eunomia-bpf/gpu_ext-kernel-modules) (kernel modules)

</div>

---

# Use Cases Summary

<div class="grid grid-cols-2 gap-4 text-sm">

<div class="border-2 border-blue-400 rounded-lg p-3">

### Single Application

| Workload | Policy | Speedup |
|----------|--------|---------|
| LLM Expert (llama.cpp) | Sequential prefetch + LFU eviction | **~4x** decode speedup vs default framework offloading |
| KV-cache (vLLM) | LFU eviction + stride prefetch | **~1.5x** less TTFT vs default framework offloading, close to LMCache|

**Key**: 1) Hardware faster / sofware algorithm old -> Need to do more prefetching 2) Tree-based prefetch not optimal for LLM

</div>

<div class="border-2 border-green-400 rounded-lg p-3">

### Multi-Process

| Scenario | Policy | Improvement |
|----------|--------|-------------|
| LC+BE Scheduling | LC 1s / BE 200μs timeslice | **95%** P99 ↓ |
| Memory Priority | HP more prefetch and eviction protection, LP less | **55-92%** time ↓ |

**Key**: Default policy does not allow different process has different behavior: we can have priority.
-  Compute-bound → Scheduling; 
- Memory-bound → Memory policy

</div>

</div>

<div class="mt-4 p-3 bg-blue-50 rounded text-base">

**All use cases**: No application modifications needed

</div>

---
layout: center
class: text-center
---

# Part 2: Device eBPF

Running eBPF on GPU Device (bpftime)

---

# GPU Execution Model Background

<div class="grid grid-cols-2 gap-6">

<div class="text-base">

### What is SIMT?

- **S**ingle **I**nstruction **M**ultiple **T**hreads
- Same instruction executes on multiple threads in parallel
- Threads organized into **Warp** (32 threads)
- Same warp threads execute same instruction synchronously
- Different branches → **serialization (Divergence)**

### Thread Hierarchy

Thread → Warp (32) → Block → Grid → SM

</div>

<div>

| Feature | CPU | GPU |
|---------|-----|-----|
| Thread count | Tens | Tens of thousands |
| Scheduling unit | Single thread | Warp (32 threads) |
| Branch handling | Prediction | Serialization |
| Preemption | Full | Limited |

</div>

</div>

---

# GPU Memory Hierarchy

<div class="grid grid-cols-2 gap-4">

<div class="flex justify-center">

<img src="/gpu memory.png" class="rounded shadow-lg" style="max-height: 220px;" />

</div>

<div class="text-sm">

### Memory Levels

| Level | Speed | Capacity | Scope |
|-------|-------|----------|-------|
| Registers | Fastest | KB | Per-thread |
| Shared Mem | Fast | 48-164KB | Per-block |
| L1 Cache | Fast | 128KB | Per-SM |
| L2 Cache | Medium | MBs | Global |
| DRAM/HBM | Slow | GBs | Global |

</div>

</div>

<div class="mt-4 p-3 bg-gray-100 rounded text-sm">

- **Coalesced access**: Consecutive accesses merged into single transaction
- **Bank conflict**: Shared memory contention causes serialization
- **Cache miss**: Determines actual memory latency (L2 miss → HBM access ~400 cycles)

</div>

---

# What Can Device eBPF Do?

<div class="grid grid-cols-2 gap-6">

<div class="text-base">

### Fine-grained Profiling

- Instruction-level observability
- Per-thread/warp/SM metrics
- Memory access pattern detection

### Runtime Adaptation

- Respond to device state
- Safe and Dynamic policy adjustment in GPU kernel

### Complement Host-side Policies

- Provide device visibility to host
- Cross-layer coordination

</div>

<div>

### e.g. SM Load Imbalance Trace

<img src="/sm thread sched.png" class="rounded shadow-lg" style="max-height: 240px;" />

**127x** difference observed between SMs

Traced by [bpftime/gpu/threadscheduling](https://github.com/eunomia-bpf/bpftime/tree/master/example/gpu/threadscheduling)

</div>

</div>

---

# bpftime Architecture (With GPU)

<div class="flex justify-center">

<img src="/bpftime.png" class="rounded shadow-lg" style="max-height: 420px;" alt="Device eBPF Architecture" />

</div>

---

# Instrumentation: Fatbin Hook & PTX Injection

<div class="flex justify-center">

<img src="/fatbin.jpg" class="rounded shadow-lg" style="max-height: 420px;" alt="Fatbin Hook and PTX Injection" />

</div>

---

# PTX Injection: Patching & Wrapping

<div class="flex justify-center">

<img src="/injection.png" class="rounded shadow-lg" style="max-height: 420px;" alt="PTX Injection Details" />

</div>

---

# Example: launchlate - Kernel Launch Latency Profiler

<div class="grid grid-cols-2 gap-4">

<div class="text-xs">

```c
BPF_MAP_DEF(BPF_MAP_TYPE_ARRAY, launch_time);

// CPU-side uprobe captures launch time
SEC("uprobe/app:cudaLaunchKernel")
int uprobe_launch(struct pt_regs *ctx) {
    u64 ts_cpu = bpf_ktime_get_ns();
    bpf_map_update_elem(&launch_time, &key, &ts_cpu, BPF_ANY);
}

// GPU-side kprobe captures execution start
SEC("kprobe/_Z9vectorAddPKfS0_Pf")
int kprobe_exec() {
    u64 ts_gpu = bpf_get_globaltimer();
    u64 *ts_cpu = bpf_map_lookup_elem(&launch_time, &key);
    u64 latency = ts_gpu - *ts_cpu;
    // Update histogram...
}
```

</div>

<div class="text-sm">

### Problem

Kernels execute in 100μs each, but users report 50ms latency

### How It Works

1. **CPU uprobe**: Record T1 at `cudaLaunchKernel()`
2. **GPU kprobe**: Record T2 at kernel entry
3. **Latency** = T2 - T1 (queue + scheduling delay)

### Insights

- 10-100μs → Normal scheduling overhead
- 1-10ms spikes → Context switch / PCIe congestion
- **Solution**: CUDA Graphs / kernel fusion

[bpftime/gpu/launchlate](https://github.com/eunomia-bpf/bpftime/tree/master/example/gpu/launchlate)

</div>

</div>

---

# Optimizations

<div class="grid grid-cols-2 gap-6 text-sm">

<div class="border-l-4 border-blue-500 pl-4">

### Warp-level Execution

**Problem**: Per-thread eBPF causes warp divergence & bandwidth waste

**Solution**: Execute eBPF **once per warp** (32 threads), not per thread

- Warp leader executes, broadcasts result
- Reduces overhead by **60-81%** vs naive injection
- Avoids divergence and deadlock risks

</div>

<div class="border-l-4 border-green-500 pl-4">

### Hierarchical Map Placement

**Problem**: PCIe latency ~40μs vs GPU local ~100ns (**400-1000x difference**)

**Solution**: Verify once, place at runtime

| Data Type | Placement |
|-----------|-----------|
| Hot state (frequent) | GPU local, batch sync |
| Cold config | Host DRAM |
| Bidirectional | Hierarchical shards |

- Relaxed consistency: staleness affects optimality, not correctness

</div>

</div>

---

# Performance: Observability Tools Overhead

<div class="flex justify-center">

<div class="text-base">

| Tool | LOC | bpftime | NVBit |
|------|-----|---------|-------|
| kernelretsnoop | 153 | **8%** | 85% |
| threadhist | 89 | **3%** | 87% |
| launchlate | 347 | **14%** | 93% |

</div>

</div>

<div class="mt-6 p-3 bg-green-50 rounded text-center">

**Key**: Warp-uniform execution achieves **3-14%** overhead vs NVBit's **85-93%**

</div>

---
layout: center
class: text-center
---

# Thanks & Questions

<div class="mt-8 text-xl">

**POC Code**

[github.com/eunomia-bpf/gpu_ext_policy](https://github.com/eunomia-bpf/gpu_ext_policy) | [github.com/eunomia-bpf/gpu_ext-kernel-modules](https://github.com/eunomia-bpf/gpu_ext-kernel-modules)

**GPU eBPF (bpftime)**

[github.com/eunomia-bpf/bpftime](https://github.com/eunomia-bpf/bpftime)

</div>

---

# Backup: Open Questions & Discussion

<div class="grid grid-cols-2 gap-4 text-base">

<div class="border-2 border-blue-400 rounded-lg p-3">

### Interface Design

- Is struct_ops the right model for GPU?
- What hooks are missing?
- How to handle vendor differences?

</div>

<div class="border-2 border-green-400 rounded-lg p-3">

### Integration

- How to integrate with existing eBPF tools?
- Correlation with CPU-side traces?
- What user-space tools are needed?

</div>

<div class="border-2 border-orange-400 rounded-lg p-3">

### Community & Upstream

- Interest in upstream support?
- Which parts are worth upstreaming?
- How to collaborate with GPU vendors?

</div>

<div class="border-2 border-purple-400 rounded-lg p-3">

### Use Cases

- What workloads benefit most?
- Multi-tenant GPU clusters?
- Real-time/latency-sensitive scenarios?

</div>

</div>

---

# Challenges & Lessons Learned

<div class="grid grid-cols-2 gap-6 text-base">

<div class="border-l-4 border-green-500 pl-4">

### What Worked

- eBPF's safety model transfers well
- struct_ops provides clean interface
- Warp-level execution reduces overhead
- Cross-layer maps enable coordination

</div>

<div class="border-l-4 border-red-500 pl-4">

### What Was Hard

- GPU drivers are complex beasts
- SIMT semantics need careful handling
- Vendor differences are significant
- Debugging device-side eBPF is painful

</div>

</div>

<div class="mt-4 p-3 bg-blue-50 rounded text-base">

### Lessons

1. **Start narrow**: Minimal interface, extend later
2. **Safety first**: Kernel retains final authority
3. **Match the model**: Don't fight SIMT, embrace it
4. **Relaxed consistency is OK**: For policy decisions

</div>

---

# gpu_ext Architecture

<div class="grid grid-cols-2 gap-6">

<div>

<img src="/gpu-ebpf-arch.png" class="rounded shadow-lg" style="max-height: 350px;" alt="gpu_ext Architecture" />

</div>

<div class="text-lg">

### Components

- **User-space Control Plane**: Standard eBPF toolchain (clang/libbpf, bpftool)

- **Kernel Verifier**: Extended with GPU-specific struct_ops

- **Driver Hooks**: Memory and scheduling attach points

### Key Design

- Handlers return decisions, kernel executes
- Policy can reorder but not remove from eviction list
- Kernel enforces safety and correctness

</div>

</div>

---
layout: center
class: text-center
---

# Thank You

Questions & Discussion?

<div class="mt-8 text-lg">

bpftime: [github.com/eunomia-bpf/bpftime](https://github.com/eunomia-bpf/bpftime)

GPU examples: [github.com/eunomia-bpf/bpftime/tree/master/example/gpu](https://github.com/eunomia-bpf/bpftime/tree/master/example/gpu)

</div>
