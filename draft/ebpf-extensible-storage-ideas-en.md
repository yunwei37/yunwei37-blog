# Programmable Extension of OS Subsystems Based on eBPF: Research Directions and Related Work

Target venues: OSDI, SOSP, FAST, NSDI

## 1. Background and Motivation

Over the past few years, the Linux kernel has been undergoing a quiet but profound architectural transformation: critical subsystem policies that were previously compiled into the kernel or loaded as heavyweight kernel modules are being refactored into programmable extension points based on eBPF. The BPF struct_ops mechanism (see https://docs.ebpf.io/linux/program-type/BPF_PROG_TYPE_STRUCT_OPS/ ) currently covers CPU scheduling (sched_ext), packet scheduling (Qdisc_ops), TCP congestion control (tcp_congestion_ops), HID device handling (hid_bpf_ops), and more recently page cache eviction policy (cache_ext). These efforts follow a common pattern: identify a policy-intensive subsystem where the "correct" algorithm depends heavily on workload characteristics, hardware configuration, or deployment environment; extract policy decisions into a set of well-defined callback interfaces; then allow eBPF programs written in user space to implement these callbacks under the safety guarantees of the BPF verifier. The end result is that operators, application developers, and even automated agents can deploy, hot-swap, and roll back subsystem policies without recompiling the kernel or rebooting.

This trend has changed the standard for "what counts as a contribution" in systems research. A paper proposing a single new scheduling algorithm or cache algorithm and implementing it as a kernel patch is becoming less attractive to program committees, because the extensible infrastructure already allows practitioners to deploy such algorithms themselves. Instead, the genuinely meaningful open problems have shifted upward: designing the extension interface itself, providing isolation and composition guarantees when multiple policies coexist, enforcing resource budgets that policy authors cannot bypass, and building toolchains that allow policies to be generated, verified, and orchestrated. In this context, an effective novelty claim should be compressible into a single indispensability statement—the most potent form in a program committee discussion: "Without the new hook/abstraction/guarantee we provide, the system must choose between hard tradeoffs A and B; we make it possible to satisfy both simultaneously." If the core sentence of a paper becomes "we implemented a certain policy/closed loop with eBPF," it will likely be judged as an engineering contribution. The following sections survey existing work in each subsystem and identify directions where substantial gaps remain.

## 2. Existing Work: Subsystems Already Made or Being Made into eBPF-Loadable Policy Planes

Before describing open directions, it is necessary to precisely survey the existing work that constrains these directions. Many seemingly natural "eBPF + subsystem X" ideas have already been explored at top venues, or are being actively pursued in the kernel community. These directions confirm that "fixing the mechanism, making policy loadable" is indeed a trend, but also mean that topic selection must either avoid them or build upon them by addressing composition, isolation, budget, and SLO concerns for greater novelty. This section organizes the most relevant results by contribution type (rather than by subsystem).

### 2.1 Programmable Policy Planes for Individual Subsystems

The sched_ext framework has been merged into Linux 6.12 mainline, allowing BPF programs to implement complete CFS-equivalent scheduling policies by hooking into struct sched_ext_ops callbacks. LWN positions it as a platform for rapid experimentation and workload-specific scheduling customization (see https://lwn.net/Articles/974387/ ; sched_ext_ops documentation at https://docs.ebpf.io/linux/program-type/BPF_PROG_TYPE_STRUCT_OPS/sched_ext_ops/ ). On the network side, BPF Qdisc (struct Qdisc_ops) enables users to prototype packet scheduling algorithms without writing kernel modules (see https://docs.ebpf.io/linux/program-type/BPF_PROG_TYPE_STRUCT_OPS/Qdisc_ops/ ). Syrup extends this idea, proposing a unified interface for user-defined scheduling policies across multiple system layers (CPU, network, storage), published at SOSP'21 (see https://www.scs.stanford.edu/~dm/home/papers/kaffes%3Asyrup.pdf ).

On the storage side, cache_ext is the most directly related predecessor work. Published at SOSP'25, the system introduces a BPF-based extension interface for the Linux page cache, allowing applications to specify custom eviction, insertion, and promotion policies. Its core design goal is multi-tenant support: different applications can install different policies on the same machine without interfering with each other, while still sharing the physical page cache (see https://www.asafcidon.com/uploads/5/9/7/0/59701649/cache_ext.pdf ; IBM Research page https://research.ibm.com/publications/cacheext-customizing-the-page-cache-with-ebpf ; see also CacheBPF https://arxiv.org/html/2502.02750v1 ). FetchBPF, published at ATC'24, takes a similar approach to prefetching, implementing customizable prefetch policies through eBPF hooks in the Linux readahead path (see https://www.usenix.org/system/files/atc24-cao.pdf ). P2Cache demonstrates that VM/cache policies can be eBPF-ified (see https://www.hotstorage.org/2023/papers/hotstorage23-final51.pdf ). Systems like PageFlex are also exploring adjacent design spaces.

On the GPU side, gpu_ext already makes GPU scheduling/memory management hooks into eBPF struct_ops (see https://arxiv.org/html/2512.12615v1 ).

### 2.2 Kernel-Side Execution and Storage Function Offloading

XRP, published at OSDI'22, demonstrated that storage-intensive operations (B-tree lookups, log scans) can be expressed as BPF programs and executed entirely within the kernel's NVMe driver, eliminating repeated user-kernel context switches. Performance gains were significant, but the paper also documented an important side effect: on fast storage devices, high-frequency I/O completion interrupts preempt the CPU time of co-located compute-intensive processes, reducing their throughput to only 34% of their fair share. The authors explicitly left this interrupt-driven unfairness problem as future work (see https://www.usenix.org/system/files/osdi22-zhong_1.pdf ). Delilah extends the offloading idea further, running eBPF programs on the embedded processors of computational storage devices, validating feasibility but not addressing multi-tenant isolation or semantic equivalence between host-side and device-side execution (see https://www.researchgate.net/publication/370818368 ).

### 2.3 Programmability of I/O Completion and Event Loops

The I/O completion path is receiving increasing attention. In 2019, Hou Tao published a set of RFC patches proposing to use eBPF to steer block I/O completion handling to specific CPUs, analogous to Receive Packet Steering in the network stack (see https://lwn.net/Articles/802234/ ). More recently, patch series for BPF-controlled io_uring have appeared on the kernel mailing list, targeting the ability to override the standard io_uring_enter execution model through BPF programs hooked via io_uring struct_ops. Declared use cases include smarter polling policies, fine-grained batching, and custom event loop logic. This work is still in development but converging rapidly (see https://lwn.net/Articles/1059915/ ; see also historical discussion https://lwn.net/Articles/1046950/ ). Furthermore, community discussion on combining io_uring with eBPF dates back considerably, with early mailing list threads containing in-depth discussion of io_uring+eBPF execution models, state management, and serialization (see https://lore.gnuweeb.org/io-uring/49df117c-dcbd-9b91-e181-e5b2757ae6aa%40gmail.com/t/ ).

An eBPF path selector for NVMe multipath also has an RFC patchset in discussion for making path selection programmable via eBPF (see https://lists.infradead.org/pipermail/linux-nvme/2025-July/057643.html ).

### 2.4 Policy Orchestration and Lifecycle Management

NetEdit, published at SIGCOMM'24 (Meta), addresses operational challenges when deploying multiple eBPF programs across a cluster. It provides an orchestration platform handling the lifecycle (deployment, testing, rollback, monitoring) of eBPF-based network tuning features. The authors note that the decoupling principles it introduces are not network-specific and can also be applied to eBPF programs in the storage and scheduling domains (see https://cs.stanford.edu/~keithw/sigcomm2024/sigcomm24-final159-acmpaginated.pdf ). On the storage side, cache_ext treats per-application policy isolation as a first-class design constraint, ensuring that one application's cache policy cannot degrade another application's performance.

### 2.5 DSLs and LLM-Based Policy Generation

SimpleBPF, published at the 2025 eBPF Workshop, combines a domain-specific language with LLM-based code generation and SMT (Z3)-based equivalence checking to produce verifier-friendly eBPF programs (see https://xzhu27.me/papers/simplebpf-ebpf2025.pdf ). This represents a broader trend: as the number of programmable extension points grows, the cost of writing correct BPF programs for each becomes a bottleneck, making automatic generation attractive. SchedCP goes further, proposing an LLM agent framework that automatically generates and deploys eBPF scheduling policies on sched_ext, integrating workload analysis, a policy repository, and an execution verifier for safe deployment (see https://arxiv.org/html/2509.01245v2 ). The related system "An Expert in Residence" (NeurIPS'25 ML4Sys workshop) uses an online LLM agent to tune Linux CFS hyperparameters, proposing to use MCP (Model Context Protocol) for tool discovery and invocation, and emphasizing transactional apply-commit-revert semantics, host-mediated approval gates, and policy controls to make online tuning auditable and reversible.

### 2.6 Partial Extensibility of the Block Layer

The Linux block layer (blk-mq) supports pluggable I/O schedulers (mq-deadline, kyber, bfq, none), but they are implemented as kernel modules with compile-time dependencies on internal APIs, rather than safe, hot-swappable BPF programs (see https://docs.kernel.org/block/blk-mq.html ). Tejun Heo's iocost controller includes discussion of future support for BPF custom cost functions, but the target is I/O cost modeling rather than dispatch/scheduling policy itself (see https://lwn.net/Articles/791175/ ). There is currently no merged or widely circulated patch series providing a sched_ext equivalent for blk-mq.

## 3. Core Open Directions (A–E)

The following five directions represent core gaps with high paper value. Each is described from three perspectives: the technical problem, why existing systems fail to address it, and the required form of contribution.

### Direction A: BPF Extension Layer for Block I/O Scheduling

The block I/O scheduling subsystem in Linux is one of the last policy-intensive kernel subsystems without a BPF extension interface. sched_ext has made CPU scheduling programmable, cache_ext has done the same for page cache eviction, but the blk-mq dispatch path still requires policy authors to write kernel modules or modify kernel source code. This gap matters because the "correct" block scheduling policy depends on multiple factors that vary across deployments and even over time within a single deployment: the mix ratio of latency-sensitive foreground I/O and throughput-oriented background I/O (such as LSM-tree compaction and filesystem garbage collection), the number of NVMe hardware queues, co-tenant models, and the desired tradeoff between fairness and tail latency.

A system for this direction would define a struct_ops-style interface for the blk-mq scheduling path, allowing BPF programs to implement request ordering, merging, and dispatch decisions. To be clear, the goal here is a complete policy ABI for blk-mq dispatch/scheduling, not a small extension to the iocost cost model—the BPF custom cost functions mentioned in iocost discussions cover only I/O cost estimation, not scheduling decisions themselves. Compared to simply "porting sched_ext to block," the difficult technical challenges include: the multi-queue topology of modern NVMe devices means schedulers must reason about queue-level parallelism rather than a single run queue; the need for per-tenant isolation so that one tenant's scheduling policy cannot starve another tenant's I/O; and interaction with I/O cost models (iocost/blkcg) that constrain dispatch decisions based on bandwidth and IOPS budgets. Evaluation needs to demonstrate that BPF-defined policies can simultaneously improve p99 and p999 latency, maintain throughput, and enforce fairness under real multi-tenant workloads, while keeping the overhead of the extension mechanism itself manageable.

The primary novelty risk is that reviewers may view this as a direct port of the sched_ext pattern. The defense must be grounded in specific technical difficulties in the block I/O path that do not arise in CPU scheduling, particularly the multi-queue structure and interaction with cgroup-based I/O control. Prior work to compare against includes sched_ext, cache_ext, Qdisc_ops, blk-mq documentation, and iocost (see corresponding references in Section 2).

### Direction B: Programmable I/O Completion Governance Layer

The I/O completion path—code executed when a storage device signals completion of a request—is becoming a critical performance bottleneck on fast NVMe devices. The kernel currently provides a fixed set of completion mechanisms: interrupt-driven completion, hybrid polling (io_uring IORING_SETUP_SQPOLL), and manual polling. The choice among these mechanisms is made at device or queue granularity and cannot be dynamically adjusted based on workload characteristics, latency targets, or co-tenant constraints.

A system for this direction would make the completion path programmable by exposing BPF-hookable callbacks at critical decision points: whether to poll or wait for an interrupt, how many completions to batch before waking the consumer, which CPU should handle a given completion, and how to prioritize completions across tenants. The technical difficulty lies in the fact that these callbacks execute on the hottest path in the I/O stack (typically in interrupt or softirq context), so the extension mechanism must have near-zero overhead in the common case and must not introduce priority inversions or unbounded delays.

However, this direction faces significant novelty risk. The BPF-controlled io_uring patch series is converging on a related design that allows BPF programs to customize the io_uring event loop including polling behavior (see https://lwn.net/Articles/1059915/ ). Hou Tao's 2019 RFC demonstrated BPF-based block layer completion steering (see https://lwn.net/Articles/802234/ ). To differentiate from this work, a paper in this direction needs to go beyond programmability itself and provide governance capabilities: enforceable interrupt handling time budgets, provable bounds on tail latency under multi-tenant contention, and safe rollback semantics when policy behavior becomes anomalous. This naturally leads to combining with Direction C.

### Direction C: Tenant-Aware Interrupt and Completion Budgeting

Modern fast storage devices (NVMe SSDs, Optane-class media) generate I/O completion interrupts at frequencies sufficient to dominate CPU utilization on the cores handling those interrupts. The Linux cgroup subsystem provides bandwidth and IOPS limits for I/O, and CPU time limits for computation, but it does not account for CPU time consumed by interrupt handlers and softirqs triggered by a tenant's I/O. This creates a resource model gap: a tenant executing high-frequency random I/O can effectively steal CPU time from co-located tenants by triggering interrupt storms, even if its cgroup I/O bandwidth limit is not exceeded. XRP specifically documented this problem, showing that compute-intensive processes co-located with I/O-intensive processes receive only 34% of their fair CPU share due to interrupt handling overhead, and explicitly left this problem as future work (see https://www.usenix.org/system/files/osdi22-zhong_1.pdf ).

A system for this direction would bridge this gap by introducing an interrupt budget abstraction: each tenant (or service-level objective) is assigned an interrupt/softirq CPU time budget, and the kernel enforces this budget by dynamically adjusting completion mechanisms (switching between interrupt mode and polling mode, adjusting interrupt coalescing parameters, steering completions to designated cores, batching completions more aggressively) to keep each tenant within its quota. The policy logic for these adjustments would be expressed as BPF programs, allowing operators to customize the tradeoff between latency and CPU efficiency, but the enforcement mechanism and budget accounting are provided by the kernel and cannot be bypassed by BPF policy.

The critical evaluation needs to demonstrate three things: without budgets, real multi-tenant workloads exhibit severe and unpredictable fairness violations due to interrupt overhead; with budgets, fairness is restored while the impact on I/O latency and throughput is bounded and configurable; the overhead of the mechanism itself (budget tracking, mode switching) is small enough for practical use. Analytical or experimental worst-case overhead bounds would significantly strengthen the contribution.

This direction carries the lowest novelty risk among the candidate directions surveyed in this document, because no existing system provides enforceable, per-tenant interrupt budgets. The gap is real, documented by a top-venue paper, and affects production systems. The primary implementation challenge is engineering budget enforcement across interrupt, softirq, and polling paths without introducing excessive overhead or breaking existing kernel abstractions. Prior work to compare against includes XRP (which documented the problem and left it open), iocost (I/O bandwidth budgets but not interrupt CPU budgets), the block completion steering RFC (CPU affinity but not budgeting), and cgroup v2 CPU and I/O controllers.

### Direction D: Cross-Subsystem Policy Composition and Stability

As BPF extension points proliferate across kernel subsystems, a new class of problems emerges: what happens when multiple BPF policies—potentially written by different teams, targeting different subsystems—are simultaneously active? A page cache eviction policy (cache_ext) may interact with a block scheduling policy (Direction A) and a CPU scheduling policy (sched_ext) in ways that none of their authors anticipated. For example, an aggressive cache eviction policy that reclaims pages aggressively may trigger writeback I/O that interacts poorly with a block scheduling policy optimized for read-intensive workloads, and the resulting interrupt load may conflict with the latency targets of the CPU scheduling policy. These cross-subsystem feedback loops are not hypothetical—they are the normal operating condition of busy multi-tenant servers.

NetEdit addresses the operational aspects of this problem for network BPF programs (deployment ordering, testing, rollback) but provides no semantic guarantees about policy interactions (see https://cs.stanford.edu/~keithw/sigcomm2024/sigcomm24-final159-acmpaginated.pdf ). cache_ext enforces isolation within the page cache subsystem but does not reason about interactions with policies in other subsystems. No existing system provides a framework for detecting or preventing cross-subsystem policy conflicts.

A system for this direction would provide three capabilities: a composition model defining execution ordering, state sharing, and conflict resolution rules when multiple BPF policies are active across subsystems; stability guards detecting feedback loops or oscillation between policies (e.g., a cache policy and a block scheduler alternately triggering each other's worst-case behavior); and a resource accounting model attributing the aggregate overhead of all active policies to specific tenants, preventing one tenant's policy set from degrading overall system performance. The contribution would be at the level of system architecture and formal or semi-formal guarantees, rather than a single new algorithm.

The novelty risk is moderate: reviewers familiar with NetEdit may view this as an extension of the orchestration approach to multiple subsystems. The defense must demonstrate that cross-subsystem composition introduces qualitatively different problems (feedback loops, emergent instability) that cannot be resolved by applying single-subsystem orchestration techniques to each subsystem independently.

### Direction E: Verifiable Code Migration Between Host and Device

Computational storage devices running eBPF programs on embedded processors have been demonstrated by Delilah (see https://www.researchgate.net/publication/370818368 ), but its programming model assumes single-tenant, single-version deployment with programs written and loaded by humans. As computational storage moves toward multi-tenancy and programs become more complex (or LLM-generated), three problems arise that Delilah does not address: ensuring that programs running on the device have the same observable behavior as a reference implementation on the host; supporting multiple tenants on a shared device and isolating their offloaded programs; and evolving programs (upgrades, rollbacks) without disrupting ongoing I/O.

A system for this direction would provide a host-device code migration framework with three components: a compilation pipeline that produces both a host-side reference implementation and a device-side variant from the same source, with machine-checkable proofs (or comprehensive test suites generated via differential testing) guaranteeing semantic equivalence on all inputs within the program's type; a multi-tenant execution environment on the device that isolates different tenants' programs in memory, compute budget, and I/O access; and a migration protocol that can transparently move execution bidirectionally between host and device without losing in-flight state, enabling zero-downtime upgrades and graceful degradation when the device is overloaded.

This direction is more exploratory than the others and depends on hardware capabilities not yet widely available. It is better suited for conferences that value forward-looking architectures (OSDI, ASPLOS) rather than those emphasizing evaluation on production hardware. Prior work to compare against includes Delilah, XRP kernel-side execution, and the BPF verifier and JIT infrastructure.

## 4. Recommended Direction Combinations

The directions above are not mutually exclusive, and in several cases combining them produces a stronger result. The following combinations are ordered by estimated strength of novelty claim.

The strongest combination is A+C: BPF extension layer for block I/O scheduling combined with tenant-aware interrupt budgeting. This combination addresses two distinct but complementary gaps. Direction A provides programmability (operators can deploy custom block scheduling policies), while Direction C provides governance (the kernel enforces interrupt CPU budgets that no policy can bypass). Combined, the claim is difficult for reviewers to reduce to "yet another eBPF hook" or "yet another resource controller": the system simultaneously makes block I/O scheduling programmable and makes the side effects of I/O (interrupt CPU consumption) accountable. The evaluation would show that in a multi-tenant NVMe environment with mixed foreground and background I/O, the combined system achieves improvements in tail latency and fairness beyond what programmable scheduling alone or interrupt budgeting alone can achieve. This combination directly addresses the open gap left by XRP while filling the block layer extensibility gap that cache_ext and sched_ext have already filled in their respective subsystems.

The second combination is B+C: programmable I/O completion governance combined with interrupt budgeting. This shifts the programmability from the block scheduling path to the completion path, and may be the better choice if BPF-controlled io_uring work does not extend to cover block layer completion. The key differentiation from the io_uring work lies in the governance layer: io_uring BPF struct_ops gives applications more flexible event loops, while B+C gives operators enforceable multi-tenant isolation over the completion path. The risk is that the io_uring work may expand and cover some of the same territory.

Direction C alone is also viable as a standalone paper. The interrupt budgeting problem is well-motivated (XRP's explicit future work call), technically challenging (requiring modifications to interrupt handling, softirq handling, and polling paths), and practically important (affecting any multi-tenant deployment on fast storage). The main concern for a standalone C paper is scope: reviewers may want to see how the budgeting mechanism integrates with programmable policies (i.e., they may push toward A+C or B+C).

## 5. Panorama of Extended Scenarios: Subsystems Not Yet Made into Mature eBPF Pluggable Extension Layers

The following list was produced after two rounds of "generate ideas → search whether anyone has done it (at least to the paper / mainstream open source / LKML RFC/patch level) → generate more and search again," filtering for scenarios where no formed eBPF pluggable extension layer has been found. "Not found" is not a mathematical proof of nonexistence, but means that using common keywords (eBPF + subsystem name + policy/struct_ops/extension/governor/hook, along with LKML/LWN threads) found no formed, widely-cited loadable policy plane. These represent the most comfortable blank spaces for paper writing.

### 5.1 Kernel: Memory Management and Virtual Memory

5.1.1 writeback_ext: Programmable Dirty Throttling and Writeback Pacing

Writeback/dirty throttling is fundamentally a hard tradeoff between "global consistency + tail latency." In multi-tenant mixed deployments, a workload often drags another's tail latency through the floor, but operators can only tune a pile of sysctls. The pluggable point is a policy hook on balance_dirty_pages() and wb thread pacing logic, outputting per-memcg dirty page limits, rates, and penalties/pardons. Large amounts of writeback mechanism and historical discussion can be found (see https://lwn.net/Articles/647919/ ), but no formed interface making writeback a eBPF policy plane has been seen.

5.1.2 wb_bw_alloc_ext: Cross-cgroup Writeback Bandwidth Allocation

The cgroup IO controller can manage device bandwidth, but the "memory→writeback→IO" chain is often still a black box. When targeting SLOs (e.g., p99), a controllable surface is missing. The pluggable point is making "who should write back first, how fast, who gets throttled first" into policy callbacks, taking PSI/dirty ratio/IO pressure as input and outputting tokens. No mature eBPF extension layer has been seen (see https://lwn.net/Articles/647919/ ).

5.1.3 shrinker_ext: Programmable Global Shrinker Arbitration

Linux reclaim has too many shrinkers (dcache/icache/zswap etc.) and the arbitration logic is a typical policy. It is especially needed for workload-awareness in multi-tenant plus tiered memory scenarios. The pluggable point introduces policy at the shrinker scheduling site, taking cache hotness, memcg pressure, and reclaim cost as input, outputting scan order/depth/skip decisions. Discussions of shrinker tunability have been found (see https://arxiv.org/html/2512.12530v1 ), but shrinker as an eBPF extension interface platform has not been seen.

5.1.4 dcache_icache_ext: Programmable dentry/inode Cache Eviction/Aging Policy

Many services' tail latency (especially in metadata-heavy scenarios) is effectively controlled by dcache/icache churn, but a single generic LRU cannot cover all workloads. The pluggable point targets aging, pinning, and batch reclaim policy for dentries/inodes, potentially per-cgroup. VFS path lookup documentation is extensive (see https://www.kernel.org/doc/html/v5.0/filesystems/path-lookup.html ), but an eBPF policy plane for dcache/icache eviction has not been seen.

5.1.5 zswap_ext: Programmable zswap Admission/Eviction/Compressor Selection

zswap is a classic "compress to trade CPU for memory" policy problem, strongly correlated with tail latency. Policy decisions include which pages enter zswap, when to evict, compression algorithm/level selection, and per-memcg budgets. zswap has clear mechanism documentation (see https://docs.kernel.org/admin-guide/mm/zswap.html ), but abstracting it into a hot-updatable, isolated eBPF policy plane has not been seen.

5.1.6 ksm_ext: Programmable KSM Deduplication Scan/Merge Policy

KSM's gains and overhead are highly workload-dependent, especially in KVM/container density scenarios. Scan rate, candidate selection, and merge thresholds are inherently policy decisions. Policy determines which mm/VMA entries participate, scan budget, deduplication priority, and per-tenant budgets. KSM has complete documentation (see https://docs.kernel.org/mm/ksm.html ), but an eBPF extension layer platformizing it has not been seen.

5.1.7 compaction_ext: Programmable Memory Compaction Triggering and Pacing Policy

Proactive compaction mechanisms often cause unpredictable latency spikes, but whether and how aggressively to trigger is actually a policy decision (see https://www.kernel.org/doc/Documentation/admin-guide/sysctl/vm.rst ). Policy takes fragmentation, THP success rate, PSI, and SLO as input, outputting compaction budget/timing/target order. Mechanism and sysctl documentation can be found (see https://docs.kernel.org/mm/physical_memory.html ), but compaction becoming an eBPF policy plane has not been seen.

5.1.8 numa_balance_ext: Programmable Automatic NUMA Balancing Scan/Migrate Policy

NUMA balancing must balance "migration benefit vs. migration jitter," and different workloads need different scan sizes/periods and migration aggressiveness (see https://www.kernel.org/doc/html/v6.2/scheduler/sched-debug.html ). Policy determines which processes participate, scan parameters, migration triggers, hot/cold page separation, and per-tenant/service tiered memory policies. Mechanism documentation exists, but a BPF extension layer has not been seen.

5.1.9 thp_ext: Programmable THP Collapse/Split and Fair Allocation

THP's "who gets hugepages" often causes cross-tenant unfairness, and collapse/split triggering conditions are policy decisions (see https://docs.kernel.org/admin-guide/mm/transhuge.html ). Policy outputs per-memcg THP budgets, khugepaged aggressiveness, and split rules. THP documentation is complete, but a formed eBPF policy plane interface for THP has not been found.

5.1.10 slab_reclaim_ext: Programmable Slab Cache Reclaim/Scan Arbitration

Slab reclaim triggering, scan volume, and priority often cause latency spikes, but the tuning space is small. The eBPF surface provides per-cache/memcg budget and priority callbacks for the shrink path.

5.1.11 watermark_ext: Programmable per-zone Watermark and kswapd Wake/Sleep Policy

Watermarks and kswapd aggressiveness represent a classic "throughput vs. p99" tension, where the optimal point varies greatly across machines and workloads. Policy outputs wakeup thresholds and per-round reclaim budgets, with bounded behavior required.

5.1.12 memcg_global_reclaim_ext: Programmable Victim Selection Under Global Pressure

In multi-tenant scenarios, "who should yield first" is a business policy question, not something pure kernel heuristics can solve. Policy takes PSI/OOM risk/tenant weight as input, outputting reclaim order/penalty.

5.1.13 swap_select_ext: Policy for Selecting Among Multiple Swap Devices

Currently relies mainly on priority and simple strategies, but "where to swap to" depends heavily on media latency/bandwidth/write amplification/energy consumption. Policy selects target device or queue for each swap-out operation, requiring strong constraints to avoid hot-path overhead explosion.

5.1.14 zram_policy_ext: Programmable zram Compression Algorithm/Level Plus Writeback Timing

The CPU vs. memory tradeoff is inherently a policy question, extremely sensitive to p99. Policy performs admission, compress-level selection, and writeback pacing per-memcg/process type.

5.1.15 tiering_ext: Programmable Memory Tiering Promotion/Demotion Policy

The future of "memory tiered like storage" (NUMA/CXL/slow memory) is becoming the norm, and default policies struggle to simultaneously handle throughput and tail latency. Policy combines access hotness, NUMA latency, and bandwidth to decide migration and budgets.

5.1.16 damon_to_bpf_ext: Making DAMON Action Decision Callbacks into eBPF

DAMON already has a framework for "executing actions based on access patterns," but policy expression remains somewhat fixed/user-space-configured (see https://lwn.net/Articles/1016525/ ). Making "what actions to trigger, what budget to apply" descend into eBPF, constrained by verifier/budget.

5.1.17 psi_controller_ext: PSI-Based In-Kernel Feedback Controller

PSI is a general signal, but "how to control resources" currently mostly happens in user space. At high event rates, user/kernel feedback loops are too slow and noisy. An in-kernel bounded controller that dynamically adjusts memcg/IO/CPU budgets could serve as a safe action space for agent tuning.

### 5.2 Kernel: Filesystem and Storage Stack

5.2.1 ext4_alloc_ext: Programmable ext4 Block Allocator

Placement policy determines fragmentation and tail latency (especially with SSDs/NVMe and mixed workloads), but the current state is a fixed allocator with limited heuristics. The pluggable point is a policy callback in ext4_mb_new_blocks() or related paths, taking file/directory hotness, IO category, cgroup, and zone/stripe information as input, outputting group/extent selection. Allocator source and improvement discussions can be found (see https://android.googlesource.com/kernel/common/%2B/880acbb718e15/fs/ext4/mballoc.c ), but abstracting the allocator into a loadable eBPF policy platform interface has not been seen.

5.2.2 journal_commit_ext: Programmable ext4/jbd2 Commit Batching and Fast-Commit Usage Policy

Commit periods are a classic "reliability vs. performance/tail latency" conflict, with different workloads needing different batching/flush semantics. Policy determines full commit vs. fast commit, commit timing (by SLO/throughput/failure domain), and cross-workload isolation. jbd2/journaling documentation is extensive (see https://www.kernel.org/doc/html/latest/filesystems/ext4/journal.html ), but an eBPF policy plane has not been seen.

5.2.3 bg_fs_maintenance_ext: Unified Programmable Scheduling Layer for Background Maintenance I/O

Covers btrfs scrub/balance/defrag, f2fs GC/checkpoint, and even filesystem-internal background threads. Background maintenance is a classic "needs to be done for throughput, but can't drag down foreground p99/p999" mixed deployment pain point, currently typically handled via cron/systemd plus ioprio, lacking kernel-level hard constraints. Provides a hook letting background threads query policy before each I/O, taking foreground SLO, queue depth, and tenant weight as input, outputting whether to yield/throttle/batch. btrfs scrub has mechanism documentation (see https://btrfs.readthedocs.io/en/latest/Scrub.html ); f2fs GC has mount/sysfs parameters, but no unified eBPF programmable governance layer has been seen.

5.2.4 f2fs_gc_ext: Programmable F2FS GC Triggering, Sleep, and Forced GC Policy

When GC triggers and how much it does in one pass directly determines tail latency; the current state is mainly mount options and parameters (see https://docs.kernel.org/filesystems/f2fs.html ). Policy dynamically adjusts GC aggressiveness, merging, and sleep window based on IO idle/PSI/service tier. No eBPF policy plane has been seen.

5.2.5 raid_resync_ext: Programmable mdraid Rebuild/Resync Scheduling Policy

Rebuild must complete quickly to reduce risk, but cannot saturate online service I/O. Currently uses sysctl speed limits plus kernel self-adaptation (see https://man7.org/linux/man-pages/man4/md.4.html ). Policy drives resync bandwidth/pace with risk budget plus SLO, dynamically adjusting per-tenant/device queue. Speed control mechanisms can be found, but no eBPF extension layer.

5.2.6 vfs_lookup_ext: Programmable Pathname Lookup and Negative Dentry Cache Semantics

Lookup/revalidate policies for large numbers of small files/metadata services are sensitive to tail latency, but such policies are often hard-coded. Policy determines negative dentry TTL, revalidation frequency, and directory-hotness-driven cache pinning. Complete VFS lookup mechanism descriptions exist (see https://www.kernel.org/doc/html/v5.0/filesystems/path-lookup.html ), but an eBPF policy plane has not been seen.

5.2.7 fsnotify_ext: Programmable Coalesce/Backpressure/Sampling Policy for inotify/fanotify Event Queues

Large-scale directory monitoring/security scanning/development tools are often overwhelmed by event storms. "How events are merged, whether to drop, how to rate-limit per tenant" is policy. Adding policy at event enqueue/dequeue, taking queue watermark, consumer rate, and tenant weight as input, outputting merge window, sampling rate, and drop policy. fanotify documentation describes the event queue (see https://man7.org/linux/man-pages/man7/fanotify.7.html ), but no eBPF programmable governance layer has been found.

5.2.8 fscrypt_key_ext: Programmable fscrypt Key Residency/Eviction Policy

Key caching policy affects latency spikes and attack surface; the hot key set varies greatly across workloads. Policy takes access frequency, tenant, SLO, and security level as input, outputting key retention/eviction and preloading decisions. No eBPF policy plane for fscrypt key cache has been found.

5.2.9 dm_cache_policy_ext: Programmable device-mapper Cache Admission/Eviction/Cleaning Policy

dm-cache has selectable modes and fixed policies, but not safely verifiable hot-update policy bytecode (see https://www.infradead.org/~mchehab/kernel_docs/admin-guide/device-mapper/cache.html ). Policy takes block hotness, dirty write ratio, and backend latency as input, outputting cache admission/eviction/writeback budget.

5.2.10 dm_writecache_flush_ext: Programmable writecache Flush/Batching Policy by SLO

Flush policy directly affects p99 and crash consistency window. Policy determines flush timing and batch size, with rollback required.

5.2.11 dm_thin_gc_ext: Programmable thin provisioning Metadata GC/Reclaim Pacing

Metadata GC is typical background maintenance I/O that drags tail latency when mixed with foreground. Policy provides unified governance of GC budget and foreground yielding.

5.2.12 fsverity_cache_ext: Programmable fs-verity Verification and Merkle Tree Block Cache/Scheduling Policy

Integrity verification CPU/IO overhead varies greatly; different workloads need different caching/verification pacing. Policy determines cache priority, verification batching window, and per-tenant budgets.

5.2.13 nfs_attr_cache_ext: Programmable NFS Client Attribute/Consistency Revalidation TTL Policy

Attribute cache TTL is an old "semantics vs. performance" tension, but remains a core tail latency driver in cloud-native/metadata-intensive services. Policy adjusts TTL and revalidation frequency based on directory/file hotness and consistency tier.

### 5.3 Kernel: Interrupt, Softirq, and Network Hot Path Governance

5.3.1 irq_coalesce_ext: Programmable NIC/NVMe Interrupt Coalescing Policy (SLO-Driven)

Coalescing is a classic "throughput vs. latency" policy where the optimal point varies completely across different workloads and load phases. Policy dynamically sets coalescing parameters, taking p99, queue depth, and CPU utilization as input, outputting coalesce_usecs/frames etc. ethtool coalescing mechanisms and parameters can be found (see https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/configuring-ethtool-settings-in-networkmanager-connection-profiles_configuring-and-managing-networking ), but no eBPF policy plane has been seen.

5.3.2 irq_budget_ext: Per-Tenant IRQ/softirq CPU Budget and Isolation (Hard Constraints)

Many systems can manage CPU time and IO bandwidth, but IRQ/softirq's hidden CPU consumption easily bypasses quotas, causing other tenants' tail latency to explode. This corresponds closely to Direction C. Policy outputs per-tenant IRQ budget, triggering batching/migration/suppression/polling conversion actions, with rollback and verifiable overhead required. No widely accepted eBPF IRQ budget/isolation platform has been seen (most are tracing or userspace irqbalance).

5.3.3 napi_budget_ext: Dynamic Policy for NAPI Poll Budget and Busy-Poll

Polling/busy-poll can easily destroy CPU fairness in high-frequency IO scenarios; budget allocation is policy. Policy takes per-queue backlog, latency, and CPU pressure as input, outputting per-round poll budget and whether to switch back to interrupt. NAPI mechanism is documented (see https://docs.kernel.org/networking/napi.html ), but no eBPF policy plane has been seen.

5.3.4 softirq_sched_ext: Fair Scheduling Policy for softirq Across Types/Devices

Competition among net_rx, block, timer, and other softirqs amplifies tail latency in high-IO scenarios; the current state favors fixed policies. Policy uniformly determines budget/priority/batch window for each softirq type. No work making softirq scheduling an eBPF pluggable layer has been found.

5.3.5 rps_rfs_ext: Programmable RPS/RFS Steering Policy (By Service Topology/NUMA/Tenant)

Steering policy directly affects cache locality, tail latency, and fairness, but the optimal solution is highly dependent on service topology and load shape. Policy takes socket/flow/NUMA/CPU pressure as input, outputting CPU selection and migration pace. No eBPF policy plane for RPS/RFS has been seen (more work is done at the XDP/tc layer for forwarding, not the steering policy itself).

5.3.6 wifi_rate_ext: Programmable mac80211 Rate Control and Airtime Scheduler eBPF Policy

Algorithms like Minstrel are hard-coded, but hot-updating policies based on business objectives (VR/VoIP/throughput/fairness) makes sense in AP/edge scenarios (see https://wireless.docs.kernel.org/en/latest/en/developers/documentation/mac80211/ratecontrol/minstrel.html ). Abstracting rate selection/airtime fairness hooks into policy callbacks requires verifier plus bounded cost. A framework using eBPF for WiFi monitoring (FLIP) can be found (see https://www.cse.scu.edu/~bdezfouli/publication/FLIP-MobiWac-2021.pdf ), but making rate control itself an eBPF policy plane has not been seen.

5.3.7 irq_affinity_ext: Programmable Interrupt Affinity/Migration Policy

irqbalance operates in user space with coarse granularity and struggles to guarantee tail and fairness under high-frequency devices. Policy outputs affinity/steering/migration pace and can combine with IRQ budget (Direction C) for strong isolation.

### 5.4 Kernel: Network Subsystem

TCP CC and qdisc can already use struct_ops (see https://docs.ebpf.io/linux/program-type/BPF_PROG_TYPE_STRUCT_OPS/tcp_congestion_ops/ ), so those do not count as gaps. The following are scenarios that are still blank.

5.4.1 conntrack_gc_ext: Programmable conntrack Table Eviction/Shrink Policy (By netns/Tenant Budget)

A full conntrack table is an incident, but "who to evict" is inherently policy (business priority, short connection storms, attack flows). Policy takes table watermark/hit rate/tenant weight as input, outputting eviction order and budget.

5.4.2 nat_port_alloc_ext: Programmable NAT Port Allocation Policy

In large-scale NAT scenarios, port selection affects conflicts and state explosion; fixed algorithms struggle to balance multiple objectives. Policy selects port range and step strategy per-tenant/destination/historical collision rate.

5.4.3 socket_mem_budget_ext: Socket Buffer Autotune and Fair Budget (per-cgroup)

Bufferbloat and unfairness often stem from buffer policies, directly manifesting as tail latency in mixed deployments. Policy dynamically adjusts rmem/wmem targets and backpressure thresholds.

5.4.4 route_ecmp_policy_ext: Programmable Kernel Routing ECMP/Path Selection Policy

Many scenarios want "routing selection to be business policy" (e.g., cost, latency, congestion, NUMA), but kernel routing policies are limited. Policy outputs nexthop selection and stickiness. This refers to the selection logic within the routing subsystem itself, not forwarding at the tc/XDP layer.

### 5.5 Kernel: Kernel Concurrency Framework, Time Subsystem, and Background Mechanisms

5.5.1 workqueue_ext: Programmable workqueue (cmwq) Concurrency/Preemption Policy

The workqueue is the vehicle for a large amount of kernel background work; parameters like max_active are backed by policy (throughput vs. latency/interference). Policy dynamically adjusts concurrency limits, CPU affinity, and yielding for certain wqs (by SLO/PSI/tenant). workqueue documentation clearly describes concurrency control (see https://docs.kernel.org/core-api/workqueue.html ), but no eBPF policy plane has been seen.

5.5.2 timer_coalesce_ext: Programmable Per-Tenant Timer Slack/Merge Policy

Timer merging affects latency tails and energy consumption, with different service objectives needing different approaches. Policy outputs slack policy/thresholds, differentiable by cgroup/SLO.

5.5.3 rcu_callback_ext: Programmable RCU Callback Batching/Pacing Policy

RCU callback storms cause uncontrollable jitter, but when and how much to batch is policy. Policy takes callback backlog/CPU pressure as input, outputting processing budget and yielding.

5.5.4 kthread_qos_ext: Unified QoS Scheduling Layer for Kernel Threads

Today each subsystem adjusts its own nice/affinity; there is no unified background task governance. A unified policy plane allocates budget and priority for all kernel background threads (jbd2/kswapd/btrfs workers etc.). Hard constraint: must not break forward progress.

### 5.6 Kernel: Virtualization, IOMMU, and Device Power

5.6.1 iommu_ext: Programmable IOMMU map/unmap Caching and IOTLB Invalidation Batching Policy

IOMMU flush/batch is a policy point between "isolation vs. performance," especially in high-throughput networking/virtualization scenarios (the IOTLB wall) (see https://www.kernel.org/doc/html/v6.0/userspace-api/iommu.html ; see also https://aliireza.github.io/files/iotlb-peerj23.pdf ). Policy determines mapping caching, invalidation merge window, and tiering by device/tenant. Mechanism and performance research exist, but no eBPF policy plane has been seen.

5.6.2 virtio_queue_sched_ext: Per-VM Scheduling and Budget for virtio Queue Dispatch/Completion

In vhost/virtio mixed deployments, a VM's IO/interrupts can easily preempt host CPU; this chains with the IRQ budget hard constraints of Direction C. Policy allocates budget, batch window, and steering to each VM queue.

5.6.3 kvm_page_aging_policy_ext: Programmable KVM Guest Page Aging Scan/Balloon/Tiering Policy

Cloud memory reuse, live migration, and balloon all depend on "who is hot, who is cold" policy; default heuristics cannot handle all cases. Policy determines scan budget, thresholds, and migration actions.

5.6.4 vfio_dma_map_cache_ext: VFIO/IOMMU Mapping Cache and Invalidation Batching Policy

IOTLB flush costs are high; policy selection depends heavily on device and workload. Policy outputs batch/flush window and caching policy.

5.6.5 usb_pm_ext: Programmable USB Autosuspend Idle-Delay Policy

Audio devices and interactive devices are extremely sensitive to autosuspend; "never autosuspend" wastes power. The policy clearly depends on workload. Policy dynamically sets autosuspend delay based on device type/recent interaction/power objectives. USB power management documentation describes the idle-delay mechanism (see https://www.kernel.org/doc/html/v6.1/driver-api/usb/power-management.html ), but no eBPF policy plane has been seen.

5.6.6 nvme_apst_ext: Programmable NVMe APST Power State Transition Policy

APST is often a source of online intermittent latency/stability issues; different services have completely different maximum tolerable latency. Policy takes SLO/workload/temperature/drive risk as input, outputting APST configuration. Community discussion of APST and parameters is extensive (see https://github.com/linux-nvme/nvme-cli/issues/878 ), but no eBPF policy plane has been seen.

5.6.7 pcie_aspm_ext: Programmable PCIe ASPM/L1 Sub-State Policy

Link power states affect wake-up latency; dynamic policy based on business needs is very reasonable (especially in mobile/edge). Policy coordinates NVMe APST with PCIe ASPM, taking end-to-end SLO as input and outputting link state targets. Extensive empirical tuning discussion can be found, but no eBPF loadable policy plane.

5.6.8 per_device_runtime_pm_ext: Unified Programmable autosuspend/Wake Policy for runtime PM

Not just USB—many devices' runtime PM is "parameters plus fixed heuristics." Policy determines autosuspend delay based on real usage patterns and SLOs.

### 5.7 Non-Kernel: Policy Plugin Bytecode via Userspace eBPF Runtime

The key point here is that entering the kernel is not required. Using userspace eBPF VMs (ubpf/rbpf/bpftime), policies can be separated from the main engineering codebase into hot-updatable, rollback-capable, isolated modules, making LLM agent-driven auto-tuning safer (policies run in a sandbox). bpftime is a typical representative of this approach (see https://github.com/eunomia-bpf/bpftime ; see also ubpf https://github.com/iovisor/ubpf ).

5.7.1 rocksdb_compaction_ext: Pluggable Policy for LSM Compaction/Background I/O (uBPF)

Compaction policy is a classic "throughput vs. write amplification vs. tail latency" triangle problem with huge workload variation. Policy determines compaction picking, priority, budget, and yielding/batching relative to foreground requests. No mainstream RocksDB implementation using eBPF as a policy plugin has been found (typically uses built-in policies or C++ plugins, not verifiable bytecode).

5.7.2 redis_eviction_ext: Pluggable Redis Key Eviction Policy (uBPF)

Redis explicitly makes eviction policy configurable, but still only among a few fixed options (see https://redis.io/docs/latest/develop/reference/eviction/ ). Policy takes key hotness/size/business tags/SLO as input, outputting eviction choices with per-tenant fairness. Many projects using eBPF to observe Redis can be found (e.g., https://github.com/dorkamotorka/redis-ebpf ), but making eviction itself an eBPF policy plane has not been seen.

5.7.3 grpc_resilience_ext: Pluggable gRPC Client-Side Retry/Hedging/Backoff Policy (uBPF)

Retry and hedging are core sources of tail latency and amplification effects; policy must be linked to SLO and downstream load. Policy takes recent errors/RTT distribution/queue length as input, outputting whether to retry, retry interval, and whether to hedge. eBPF used in gRPC observability/decoding can be found, but making resiliency policy into verifiable, hot-updatable eBPF policy plane has not been seen (see gRPC retry documentation https://grpc.io/docs/guides/retry/ ).

5.7.4 llm_infer_sched_ext: Pluggable Batching/KV-cache Eviction/Admission Control Policy for LLM Inference Server (uBPF)

LLM serving's tail latency, throughput, and memory churn depend heavily on policy, and are very well-suited for "online A/B testing plus fast rollback." Policy determines batch grouping, prefill/decode priority, KV eviction, and per-tenant budgets. No mainstream system using an eBPF VM for this layer of policy bytecode has been seen (policies are mostly hard-coded in schedulers).

5.7.5 postgres_autovacuum_ext: Programmable Postgres autovacuum/autoanalyze Scheduling Policy (uBPF Plugin)

The tradeoff between autovacuum trigger frequency, resource consumption, and foreground query latency is a classic policy problem. Policy can schedule vacuum behavior based on table size, dead tuple rate, and query load.

5.7.6 kafka_rebalance_ext: Pluggable Kafka Consumer Group Rebalance Policy (uBPF Plugin)

Rebalance policy affects partition assignment fairness, consumption latency, and service stability. As a hot-updatable bytecode plugin, policy iteration can be faster and safer.

5.7.7 envoy_retry_ext: Pluggable Envoy/L7 Retry/Hedging Policy (uBPF Plugin)

L7 proxy retry/hedging logic is similar to gRPC but more general. Expressing policy as verifiable bytecode enables safe updates without restarting the proxy.

5.7.8 jvm_go_gc_pacer_ext: Pluggable JVM/Go GC Pacer Policy (uBPF Plugin)

GC pacing is a "pause time vs. throughput vs. memory footprint" triangle tradeoff, highly workload-dependent. Expressing the pacer policy as a uBPF plugin enables online tuning and safe rollback.

## 6. Common Characteristics of These Gap Scenarios: Why They Are Suitable for eBPF Policy Planes

The candidate scenarios above essentially all satisfy the same set of platformization conditions. First, the mechanism is stable but the policy varies: the core mechanism of the subsystem does not need to change constantly, but workload and hardware changes require policies to change—typical examples include writeback, GC, coalescing, NUMA, and compaction. Second, hot update and rollback value is extremely high: when a policy is wrong, it raises tail latency, so fast rollback is essential, and this is naturally compatible with eBPF's loadable, verifiable nature (see BPF struct_ops documentation https://docs.ebpf.io/linux/program-type/BPF_PROG_TYPE_STRUCT_OPS/ ). Third, verifiable overhead is a hard requirement: it is not enough just to be able to plug in a policy; one must also be able to prove worst-case overhead, isolation, and mutual non-contamination. Fourth, LLM agent-driven tuning will become more common, because LLMs are good at exploring policy spaces, but they must be constrained within safe policy DSL/bytecode with resource budgets and guardrails. Encapsulating policy in eBPF (or a userspace eBPF VM) is exactly an engineering-feasible way to achieve this.

## 7. Will the Kernel Really Allow So Many Extensions?

The conclusion is that it will not allow "many, fine-grained" extensions, but will allow a small number of "high-leverage, strong-constraint" extension interfaces. And the trend is that more and more subsystems are willing to outsource policy to BPF, provided that safety, overhead, and fallback are treated as first-class citizens.

struct_ops itself is the infrastructure that lets subsystems outsource the implementation of function pointers to BPF; its initial use case was TCP congestion control (see https://lwn.net/Articles/809092/ ). This has since expanded in more directions—for example, BPF qdisc explicitly targets rapid experimentation with scheduling algorithms/policies. Even the extremely sensitive OOM killer in the mm domain has seen RFCs/discussions for implementing custom OOM handling policies with BPF, with clear safety guardrails in the design: if BPF doesn't free memory, fall back to the kernel OOM killer, with a "must declare amount released" safety mechanism (see https://lwn.net/Articles/1019230/ ; LKML discussion https://lkml.org/lkml/2025/4/28/105 ). io_uring is also advancing a patch series for BPF-controlled io_uring (see https://lwn.net/Articles/1059915/ ; history https://lwn.net/Articles/1046950/ ), trying to use struct_ops to let BPF control the event loop. DAMON is also preparing for more flexible policy expression (see https://lwn.net/Articles/1016525/ ).

But the kernel cannot open holes everywhere. Kernel maintainers typically enforce the following requirements, which no extension plane can bypass. First, the default path must have zero regression: no measurable overhead when no BPF is loaded. Second, strong fallback semantics: when BPF fails/times out/returns illegal values, it must fall back to the kernel's default policy (the OOM RFC is a typical example). Third, provably bounded cost: the maximum amount of work done per event in the hot path must be explicable and limitable. Fourth, attack surface control: who can load must have a clear permission model (CAP_BPF, cgroup delegation, etc.). Fifth, testability: kselftest/selftest is required, otherwise it is very hard to get into mainline (see the selftest discussion in the io_uring patch thread https://lore.gnuweeb.org/io-uring/?t=20260224161220 ). Sixth, interface stability policy: struct_ops/kfunc are powerful capabilities but also carry maintenance costs when internal kernel structures change affecting BPF programs; good routes for BTF/CO-RE/feature probing must be designed.

## 8. Priority Ordering: Top 10 Most Universal and High-Value Directions

Ordered comprehensively by coverage, business impact, and future trends (AI/cloud/CXL).

The first priority is IRQ/softirq/completion path budget and isolation (core Direction C), which is a universal pain point across storage, networking, and virtualization, endorsed by XRP's open gap.

The second priority is unified background work governance, including bg_fs_maintenance_ext, workqueue_ext, and kthread_qos_ext. Background tasks are one of the leading causes of tail latency.

The third priority is the policy plane for writeback/dirty throttling (writeback_ext plus wb_bw_alloc_ext), affecting almost all services with write I/O and a hotspot for multi-tenant conflicts.

The fourth priority is victim/budget policy under global memcg pressure (memcg_global_reclaim_ext), extremely universal in cloud environments.

The fifth priority is the decision plane for memory tiering (tiering_ext), which will become a "required course" once CXL/tiered memory becomes widespread.

The sixth priority is the dm-cache policy plane (dm_cache_policy_ext), very universal for cloud storage/local caching/write amplification control.

The seventh priority is conntrack GC/eviction (conntrack_gc_ext), universal for network infrastructure with high incident costs.

The eighth priority is timer/RCU jitter governance (timer_coalesce_ext plus rcu_callback_ext), a systemic problem of "if not addressed, will intermittently raise p99."

The ninth priority is cross-subsystem policy composition (core Direction D), an upper-level necessity to prevent system loss of control as policy planes multiply.

The tenth priority is userspace eBPF policy plugin-ification (based on bpftime/uBPF), as many extension points are easier to first implement as generic frameworks in user space, then identify the most valuable ones to sink into the kernel.

## 9. Practical Advice

If the goal is publishing at FAST/OSDI/SOSP rather than just merging patches, the recommended approach is: do only one or two of the most universal primitives on the kernel side (e.g., IRQ/softirq budget plus background work governance), making the interface extremely clean with strong constraints and strong fallback. For other scenarios, first implement a generic policy plugin framework using a userspace eBPF runtime (bpftime/uBPF/rBPF), letting LLM agents safely explore policies in user space; after demonstrating value, sink the most worthwhile small portion into the kernel. This "1 kernel extension plus 1 userspace extension framework" combination has both depth (kernel primitive) and breadth (userspace coverage), and is very favorable for paper narrative.

## 10. The Role of LLM Agents as Need Amplifiers

The emergence of LLM agents that automatically generate and deploy kernel policies adds a new dimension to the motivation for programmable, governable OS subsystems. SchedCP demonstrated an agent that generates sched_ext BPF policies from workload descriptions (see https://arxiv.org/html/2509.01245v2 ), and the "An Expert in Residence" system (NeurIPS'25 ML4Sys workshop) demonstrated an agent that uses MCP for tool discovery and invocation to tune Linux CFS parameters online with transactional semantics, emphasizing auditable and reversible online tuning. Both systems emphasize the necessity of safety infrastructure: execution verifiers, approval gates, and rollback mechanisms.

These agents amplify the need for the governance mechanisms described in Directions C and D. When human operators deploy BPF policies, they typically do so after careful testing and with full understanding of the policy's behavior. When LLM agents deploy policies as part of an automated optimization loop, the frequency of policy deployment increases by several orders of magnitude, policies may be less thoroughly understood, and the consequences of bad policies (tail latency spikes, fairness violations, system instability) must be automatically contained rather than relying on human intervention. This makes enforceable budgets, composition guards, and safe rollback semantics not merely desirable features, but necessary conditions for the programmable OS paradigm to scale.

This observation can serve as additional motivation for a paper pursuing any of the above directions, but it is not sufficient as a standalone contribution: novelty must be grounded in technical mechanisms, not in the observation that "agents need them."

## 11. Novelty Risk Assessment Summary

Direction C (tenant-aware interrupt budgeting) carries the lowest novelty risk. It addresses a specific, quantified problem that was explicitly left open by a top-venue paper (XRP). No existing system provides enforceable per-tenant interrupt CPU budgets, and the implementation requires non-trivial kernel modifications well beyond hooking a BPF program onto an existing hook.

Direction A (block I/O scheduling extension layer) carries moderate risk. The struct_ops extensibility pattern is now mature, and reviewers will ask what is harder about the block I/O path than CPU scheduling or page cache eviction. The answer must be grounded in the specific technical challenges of multi-queue NVMe dispatch and cgroup I/O control integration.

Direction B (completion programmability) carries the highest risk as a standalone contribution, because BPF-controlled io_uring is being actively developed in the kernel community. When combined with Direction C's governance mechanisms, it becomes viable.

Direction D (cross-subsystem composition) carries moderately high risk as a standalone contribution. NetEdit has already established the orchestration platform narrative for networking, and reviewers need to be convinced that cross-subsystem composition is qualitatively harder than per-subsystem orchestration.

Direction E (verifiable code migration) is the most exploratory, depends on hardware availability, and represents a longer-term positioning.

Among the extended scenario list, the hardest and most universal novelty combinations are: IRQ/softirq budget and isolation (first priority) combined with unified background work governance (second priority) or the writeback policy plane (third priority). These directions have broad coverage, high business impact, and have not been filled by existing work.
