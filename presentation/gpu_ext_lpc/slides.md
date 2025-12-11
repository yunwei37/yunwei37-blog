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

# The Problem & Existing Solutions

<div class="grid grid-cols-2 gap-6">

<div>

### The Problem of Stack

**User-space Runtime** (closed-source)

**GPU Driver** (partially open-source)
- One-Size-Fits-All policies
- Memory: LRU eviction, tree-based prefetch
- Scheduling: Round-robin, fixed timeslice

**Vendor Firmware** (closed-source, black box)

**Applications & Device Code**
- Diverse workloads, diverse access patterns

</div>

<div>

### Existing Solutions Fall Short

<div class="border-l-4 border-blue-500 pl-2 mb-2">

**User-space Runtimes** (vLLM, Paella, XSched)
- Application-bound, requires code changes
- No cross-tenant visibility, cannot access driver

</div>

<div class="border-l-4 border-green-500 pl-2 mb-2">

**Driver Modifications** (TimeGraph, Gdev, GPreempt)
- Policies are static, hard to deploy
- Vendor-specific, stability risks

</div>

<div class="border-l-4 border-orange-500 pl-2 mb-2">

**Device Profilers** (NVBit, Neutrino, CUPTI)
- Read-only, cannot execute policies
- High overhead (NVBit: 85%+)

</div>

<div class="border-l-4 border-purple-500 pl-2 mb-2">

**Host eBPF** (sched_ext)
- GPU remains a black box
- No programmable hooks in GPU driver

</div>

</div>

</div>

---

# Insight: GPU Needs an Extensible OS Policy Interface

<div class="grid grid-cols-2 gap-6">

<div class="border-2 border-blue-500 rounded-lg p-4">

### GPU Driver is the Right Place

- **Global visibility**: sees all applications
- **Privileged access**: controls hardware mechanisms
- **Transparent**: no app modifications needed
- **Cross-tenant**: can coordinate different workloads

Inspired by **sched_ext**: CPU-side has proven this pattern works

</div>

<div class="border-2 border-orange-500 rounded-lg p-4">

### But Host eBPF is Not Enough

- Device internal execution state invisible
  - Warp divergence, SM load
- Memory access patterns invisible
- Cannot execute policy logic **inside GPU kernels**

<div class="mt-3 p-2 bg-orange-50 rounded text-base">
Need to extend eBPF to GPU device and driver contexts
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
- Memory management hooks
- Scheduling interface hooks
- Uses standard eBPF verifier + struct_ops

</div>

<div class="border-2 border-green-500 rounded-lg p-4">

### Part 2: Device eBPF

**Running eBPF on GPU Device (bpftime)**

- SIMT-aware verification
- Compile eBPF to PTX/SPIR-V
- Device-side hooks and helpers
- Cross-layer eBPF Maps

</div>

</div>

<div class="mt-6 p-3 bg-gray-100 rounded text-lg text-center">

**Talk Goals**: Share prototype, discuss interface design, solicit community feedback

</div>

---
layout: center
class: text-center
---

# Part 1: gpu_ext

Extending Linux GPU Driver with eBPF

---

# Challenge: GPU Driver Wasn't Designed for This

<div class="text-lg mt-4">

- Exposing low-level mechanisms has **stability risks**
- Need a **narrow, safe, verifiable** interface
- GPU memory management and scheduling mechanisms are **complex**

</div>

<div class="mt-6 p-4 bg-blue-50 rounded-lg">

### Our Approach

- Treat GPU memory placement as a **programmable cache**
- Policy can reorder eviction list, kernel retains final authority
- Same trust model as **sched_ext**

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

# Memory Management Interface

<div class="grid grid-cols-2 gap-4">

<div>

```c
// Host-side policy handlers for GPU memory
struct gdrv_mem_ops {
  // Region created or eligible for device placement
  int (*region_add)(gdrv_mem_add_ctx_t *ctx);

  // Memory subsystem observes region use
  int (*region_access)(gdrv_mem_access_ctx_t *ctx);

  // Region about to leave device-resident set
  int (*region_remove)(gdrv_mem_remove_ctx_t *ctx);

  // Safe points for prefetch decisions
  int (*prefetch)(gdrv_mem_prefetch_ctx_t *ctx);
};

// kfuncs: reorder regions in eviction list
bool gdrv_mem_list_insert_head(list, region);
bool gdrv_mem_list_insert_tail(list, region);
```

</div>

<div class="text-base">

### Treat GPU Memory as Programmable Cache

- **region_add**: Region creation
- **region_access**: Memory access observed
- **region_remove**: Region eviction
- **prefetch**: Prefetch opportunity

### Implementable Policies

- LRU, LFU, workload-aware eviction
- Stride prefetch
- Application-specific hints

### Safety

- Kernel retains final authority under memory pressure

</div>

</div>

---

# Scheduling Interface

<div class="grid grid-cols-2 gap-4">

<div>

```c
// Host-side policy handlers for GPU scheduling
struct gdrv_sched_ops {
  // Hardware queue creation
  // Set priority/timeslice, return 0 to accept
  int (*queue_create)(gsched_queue_ctx_t *ctx);

  // Hardware queue destruction; cleanup policy
  void (*queue_destroy)(gsched_queue_ctx_t *ctx);
};

// kfunc: trigger cooperative preemption
bool gdrv_sched_preempt(gdrv_preempt_ctx_t *ctx);
```

</div>

<div class="text-base">

### Control GPU Queue Lifecycle & Priority

- **queue_create**: Set priority/timeslice
- **queue_destroy**: Cleanup

### Policy Can Set

- Queue priority
- Timeslice duration
- Runlist interleaving frequency

### Use Cases

- LC vs BE differentiation
- Multi-tenant fairness
- Real-time preemption

</div>

</div>

---

# Implementation: Extending NVIDIA Open GPU Modules

<div class="grid grid-cols-2 gap-6 text-base">

<div class="border-l-4 border-blue-500 pl-4">

### Modifications

- UVM module: ~100 lines instrumentation
- Page fault handler hooks
- Prefetch logic hooks
- TSG lifecycle event hooks
- Uses Linux eBPF verifier + GPU-specific struct_ops/kfunc via BTF

</div>

<div class="border-l-4 border-green-500 pl-4">

### Safety Model

- Handlers return decisions, kernel executes
- Policy can reorder eviction list
- Kernel retains final authority
- Cannot corrupt device state
- **Same trust model as sched_ext**

</div>

</div>

---

# Use Case: LLM Expert Offloading

<div class="grid grid-cols-2 gap-6">

<div class="text-base">

### Setup

- GPT-OSS-120B MoE (59 GiB)
- RTX 5090 (32GB) - **1.84x oversubscription**

### eBPF Policy Insight

- **Prefill**: stride pattern → stride prefetch
- **Decode**: temporal locality → LFU eviction
- Page-level granularity, not expert-level

### Results

- **4.8x decode speedup** vs framework offload
- No application modifications needed
- UVM alone worse than framework offload

</div>

<div>

<img src="/llama_uvm_combined_color.png" class="rounded shadow-lg" alt="LLM Expert Offloading Results" />

</div>

</div>

---

# Use Case: Multi-tenant Scheduling & Memory Priority

<div class="grid grid-cols-2 gap-6 text-base">

<div class="border-2 border-blue-400 rounded-lg p-4">

### Multi-tenant Scheduling

**Setup**: 2 LC + 4 BE processes, compute-intensive

**Policy**: LC 1s timeslice, BE 200μs timeslice

**Results**:
- LC P99 latency reduced **95%**
- Variance reduced **99%**

</div>

<div class="border-2 border-green-400 rounded-lg p-4">

### Memory Priority Differentiation

**Setup**: Two processes competing for GPU memory, UVM oversubscribed

**Key Insight**: Memory-intensive workloads need memory policy, scheduling policy ineffective (<1%)

**Results**: Total completion time improved **55-92%**

</div>

</div>

---

# Multi-tenant Evaluation Results

<div class="grid grid-cols-2 gap-4">

<div class="text-center">
<img src="/scheduler_latency_throughput.pdf" class="mx-auto rounded shadow-lg" style="max-height: 200px;" />
<div class="text-sm mt-1">Scheduling: LC P99 reduced **96%**, BE throughput unchanged</div>
</div>

<div class="text-center">
<img src="/all_kernels_stacked.pdf" class="mx-auto rounded shadow-lg" style="max-height: 200px;" />
<div class="text-sm mt-1">Memory policy: **55-92%** improvement; scheduler <1%</div>
</div>

</div>

<div class="mt-4 p-3 bg-blue-50 rounded text-base">

**Key Insight**: For memory-bound workloads, scheduling policies are ineffective (<1%). Need **memory policies** to address UVM page faults and PCIe bandwidth bottlenecks.

</div>

---
layout: center
class: text-center
---

# Part 2: Device eBPF

Running eBPF on GPU Device (bpftime)

---

# GPU Execution Model Background (for Kernel Developers)

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

<div class="mt-4 p-2 bg-orange-50 rounded text-base">
Key difference: GPU threads in a warp must follow the same control flow path, or performance degrades significantly
</div>

</div>

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
- Dynamic policy adjustment
- Real-time decision making

### Complement Host-side Policies

- Provide device visibility to host
- Cross-layer coordination

</div>

<div>

### SM Load Imbalance Problem

<img src="/thread_scheduling_motivation.png" class="rounded shadow-lg" style="max-height: 160px;" />

**127x** difference observed between SMs

### Device eBPF Can Help

- **Block Scheduling**: Cross-SM work-stealing
- **Memory Hints**: Device-side prefetch triggering
- **Load Balancing**: Runtime decisions based on SM state

</div>

</div>

---

# Device eBPF Architecture

<div class="grid grid-cols-2 gap-6">

<div>

<img src="/gpu-ebpf-arch.png" class="rounded shadow-lg" style="max-height: 350px;" alt="Device eBPF Architecture" />

</div>

<div class="text-lg">

### Pipeline

1. **eBPF Bytecode**: Standard clang/LLVM toolchain
2. **SIMT-aware Verifier**: Warp uniformity checks
3. **GPU JIT Backend**: Compile to PTX/SPIR-V

### Key Techniques

- Intercept CUDA runtime API
- Rewrite kernel PTX with trampolines
- No recompilation needed
- No application restart needed

</div>

</div>

---

# Device-side Attach Points

<div class="grid grid-cols-2 gap-4">

<div>

```c
// Device-side memory handler interface
struct gdev_mem_ops {
    // Warp observed memory access
    void (*access)(gdev_mem_access_ctx_t *ctx);
    // Memory fence point
    void (*fence)(gdev_mem_fence_ctx_t *ctx);
};

// Device-side helper
int gdev_mem_prefetch(gmem_region_t* r);

// Device-side block scheduling handlers
struct gdev_sched_ops {
  void (*enter)(gdev_block_ctx_t *ctx);
  void (*exit)(gdev_block_ctx_t *ctx);
  void (*probe)(gdev_block_ctx_t *ctx);
  void (*retprobe)(gdev_block_ctx_t *ctx);
  bool (*should_try_steal)(gdev_block_ctx_t *ctx);
};
```

</div>

<div class="text-base">

### Memory Hooks

- **access**: Warp observes memory access
- **fence**: Memory fence point
- **gdev_mem_prefetch**: Trigger host handler

### Scheduling Hooks

- **enter/exit**: Worker block start/end
- **probe/retprobe**: Device function entry/exit
- **should_try_steal**: Work-stealing decision

### Attach Points

- Kernel entry/exit
- Memory operations
- Thread start/end
- Function boundaries

</div>

</div>

---

# SIMT Challenge & Solution

<div class="grid grid-cols-2 gap-6 text-base">

<div class="border-l-4 border-red-500 pl-4">

### CPU eBPF Assumes Scalar Execution

- Single-threaded execution model
- Branches are "free"
- Memory access is per-thread

### GPU SIMT is Different

- 32 threads lockstep execution (warp)
- Divergent branches → serialization
- Non-uniform memory → uncoalesced access
- **No isolation/recovery on device**

</div>

<div class="border-l-4 border-green-500 pl-4">

### Safety Issues

- **Warp Divergence**: Per-thread eBPF logic causes different paths
- **Deadlock Risk**: GPU-wide barrier + divergent control flow

### Performance Issues

- **Memory Bandwidth**: Per-thread map access consumes bandwidth
- GPU memory bandwidth is scarce resource

### Solution: Warp-level Execution

Execute eBPF program **once per warp**, not per thread

</div>

</div>

---

# Implementation: bpftime GPU Backend

<div class="grid grid-cols-2 gap-6 text-base">

<div>

### Pipeline

1. Standard eBPF bytecode (clang)
2. SIMT-aware verification pass
3. LLVM backend → PTX/SPIR-V
4. Dynamic binary instrumentation
5. Inject trampolines into GPU kernel

### Key Techniques

- Intercept CUDA runtime API
- Rewrite kernel PTX with trampolines
- No recompilation needed
- No application restart needed

</div>

<div>

### Based on bpftime

- Existing user-space eBPF runtime
- GPU JIT infrastructure: ~10 KLOC
- LLVM PTX backend: ~1 KLOC

### Overhead

- **3-14%** vs NVBit 85%+
- Thanks to warp-uniform execution

</div>

</div>

---

# Use Case: Observability Tools

<div class="grid grid-cols-2 gap-4 text-base">

<div>

### kernelretsnoop

Thread completion time distribution
- Attach GPU kretprobe at kernel exit
- Record per-thread: thread_idx + globaltimer
- Diagnose: warp divergence, boundary conditions

### threadhist

Thread execution count histogram
- Per-thread array map counting
- Diagnose: grid-stride loop bounds, load imbalance

</div>

<div>

### launchlate

Launch latency analysis
- CPU-side uprobe records T1
- GPU-side kprobe records T2
- Latency = T2 - T1
- Diagnose: small kernel overhead, context switch, PCIe congestion

### SM/Warp/Lane Mapping

```c
bpf_get_sm_id()   // SM hardware ID
bpf_get_warp_id() // Warp ID
bpf_get_lane_id() // Lane ID
```
- Diagnose: SM load imbalance, Warp occupancy

</div>

</div>

---
layout: center
class: text-center
---

# Putting It Together

Cross-Layer Coordination

---

# Cross-Layer eBPF Maps

<div class="grid grid-cols-2 gap-4 text-base">

<div>

### Why Device-Local Maps?

If every map access crosses PCIe to host memory:
- GPU local access: **~100ns**
- Cross-PCIe access: **~40μs**
- **400x difference!**

### GPU Map Types

| Map Type | Use Case | Example |
|----------|----------|---------|
| Per-thread Array | Per-thread counters | threadhist |
| GPU Ringbuf | Report events to host | kernelretsnoop |
| Shared Map | Low-freq global config | Policy config |

</div>

<div>

### GPU-side Helpers

```c
u32 idx = bpf_get_thread_idx();  // Thread index
u64 ts = bpf_get_globaltimer();  // Nanosecond timestamp
u32 sm_id = bpf_get_sm_id();     // SM hardware ID
u32 warp_id = bpf_get_warp_id(); // Warp ID
bpf_prefetch_l2(addr);           // L2 prefetch
bpf_map_update_elem(&map, &key, &val, BPF_ANY);
```

### Map Placement Strategy

| Location | Advantage | Disadvantage |
|----------|-----------|--------------|
| CPU DRAM | Host access easy | High PCIe latency |
| GPU HBM | Fast GPU access | Uses VRAM |
| Shared Mem | Lowest latency | Small, limited scope |

</div>

</div>

---

# Device-side Overhead: gBPF vs eGPU-style

<div class="text-center">
<img src="/microbench_comparison.pdf" class="mx-auto rounded shadow-lg" style="max-height: 300px;" />
</div>

<div class="grid grid-cols-2 gap-6 mt-4 text-base">

<div class="border-l-4 border-green-500 pl-3">

**(a) GPU-side Operations**: gBPF's SIMT-aware warp-level execution reduces overhead by **60-81%** compared to eGPU-style naive injection

</div>

<div class="border-l-4 border-red-500 pl-3">

**(b) CPU Map via PCIe**: **34ms** latency - 6000x slower than GPU-side operations, motivating hierarchical map design

</div>

</div>

---

# Design Principles for Cross-Layer Maps

<div class="grid grid-cols-2 gap-6 text-lg">

<div class="border-l-4 border-blue-500 pl-4">

### Placement Guidelines

- **Hot state** (frequent updates): GPU local, aggregate to host by epoch
- **Cold data** (low-freq config): Host DRAM, GPU reads occasionally
- **High-freq bidirectional**: Hierarchical maps + batch sync

</div>

<div class="border-l-4 border-green-500 pl-4">

### Consistency Model

- Relaxed, eventual consistency
- GPU local shards merge at sync points
- **Staleness affects optimality, not correctness**

</div>

</div>

---

# Example: Coordinated Memory Policy

<div class="grid grid-cols-2 gap-6 text-base">

<div class="border-2 border-blue-400 rounded-lg p-4">

### GPU Device Side

- Detect stride patterns in prefill
- Track per-region access frequency
- Call `gdev_mem_prefetch()` to predict regions
- Update access counts in cross-layer map

</div>

<div class="border-2 border-green-400 rounded-lg p-4">

### GPU Driver Side

- Use device-provided access counts
- Implement LFU instead of LRU
- Reorder eviction list via kfunc
- Make informed prefetch decisions

</div>

</div>

<div class="mt-4 p-3 bg-gray-100 rounded text-center">

Device eBPF observes access patterns → Cross-layer Map → Host eBPF makes eviction/prefetch decisions

</div>

---

# Portability Discussion

<div class="grid grid-cols-2 gap-6 text-base">

<div class="border-l-4 border-blue-500 pl-4">

### Current Implementation

- NVIDIA open GPU kernel modules
- CUDA runtime interception
- PTX code generation

### Design Aligns with Linux Abstractions

- **Host-side**: HMM / migrate_vma (AMD ROCm uses this), DRM scheduler's drm_sched_entity
- **Device-side**: SPIR-V as vendor-neutral bytecode

</div>

<div class="border-l-4 border-orange-500 pl-4">

### Portability Requires

- Vendor-specific runtime support
- Hardware tuning for each GPU architecture
- Upstream driver modifications (if pursuing)

### Future Directions

- AMD ROCm support via HIP runtime
- Intel GPU support via Level Zero
- Standardized interfaces where possible

</div>

</div>

---

# Policy Building Blocks & Observability Tools

<div class="grid grid-cols-2 gap-4 text-sm">

<div>

### Policy Building Blocks (LOC)

| Policy | Domain | LOC |
|--------|--------|-----|
| Global FIFO Eviction | Host | 145 |
| Global LFU Eviction | Host | 304 |
| Multi-tenant Quota LRU | Host | 472 |
| Adaptive Seq. Prefetch | Host | 375 |
| Stride Prefetch | Host | 472 |
| GPU L2 Stride Prefetch | Device | 45 |
| Dynamic Timeslice | Host | 408 |
| Preemption Control | Host | 925 |
| MaxSteals (CLC) | Device | 19 |

</div>

<div>

### Observability Tools Overhead

| Tool | LOC | gBPF | NVBit |
|------|-----|------|-------|
| kernelretsnoop | 153 | **8%** | 85% |
| threadhist | 89 | **3%** | 87% |
| launchlate | 347 | **14%** | 93% |

<div class="mt-4 p-2 bg-green-50 rounded text-base">

**Key**: gBPF's warp-uniform execution achieves **3-14%** overhead vs NVBit's **85-93%**

</div>

</div>

</div>

---

# Open Questions & Discussion

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
layout: center
class: text-center
---

# Thank You

Questions & Discussion?

<div class="mt-8 text-lg">

bpftime: [github.com/eunomia-bpf/bpftime](https://github.com/eunomia-bpf/bpftime)

GPU examples: [github.com/eunomia-bpf/bpftime/tree/master/example/gpu](https://github.com/eunomia-bpf/bpftime/tree/master/example/gpu)

</div>
