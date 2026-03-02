# 基于 eBPF 的操作系统子系统可编程扩展：研究方向与相关工作

目标会议：OSDI, SOSP, FAST, NSDI

## 1. 背景与动机

过去几年，Linux 内核正在经历一场安静但深刻的架构转型：原本编译进内核或以重量级内核模块形式加载的关键子系统策略，正在被重构为基于 eBPF 的可编程扩展点。BPF struct_ops 机制（参见 https://docs.ebpf.io/linux/program-type/BPF_PROG_TYPE_STRUCT_OPS/ ）目前已覆盖 CPU 调度（sched_ext）、报文调度（Qdisc_ops）、TCP 拥塞控制（tcp_congestion_ops）、HID 设备处理（hid_bpf_ops），以及最近的 page cache 淘汰策略（cache_ext）。这些工作遵循一个共同模式：找到一个策略密集的子系统，其中"正确"的算法高度依赖于负载特征、硬件配置或部署环境；将策略决策抽取为一组定义良好的回调接口；然后允许用户态编写的 eBPF 程序在 BPF verifier 的安全保证下实现这些回调。最终效果是运维人员、应用开发者甚至自动化 agent 都可以在不重新编译内核或重启的前提下部署、热替换和回滚子系统策略。

这一趋势改变了系统研究中"什么算贡献"的标准。一篇提出单一新调度算法或新缓存算法并以内核补丁形式实现的论文，对程序委员会的吸引力正在下降，因为可扩展基础设施已经让实践者可以自行部署这类算法。相反，真正有意义的开放问题已经上移：设计扩展接口本身、在多策略共存时提供隔离与组合保证、执行策略作者无法绕过的资源预算、以及构建让策略能够被生成、验证和编排的工具链。在这一背景下，一个有效的 novelty claim 应当可以压缩为一句不可替代性陈述——这是程序委员会讨论时最有杀伤力的形态："没有我们提供的新 hook/新抽象/新保证，系统就必须在 A 和 B 两个硬 tradeoff 之间二选一；而我们让它可以同时满足。"如果论文的核心句子变成"我们用 eBPF 实现了某个策略/闭环"，那多半会被判定为工程贡献。以下各节梳理各子系统的现有工作，并识别仍然存在实质性空白的方向。

## 2. 已有工作：已经被做成或正在被做成 eBPF 可装载策略平面的子系统

在描述开放方向之前，有必要精确地梳理约束这些方向的已有工作。许多看似自然的"eBPF + 子系统 X"想法已经在顶级会议上被探索过，或者正在内核社区中积极推进。这些方向说明"把机制固定、策略可装载"确实是趋势，但也意味着选题必须避开它们，或者在它们之上做 composition、isolation、budget、SLO 才更具 novelty。本节按贡献类型（而非按子系统）组织最相关的结果。

### 2.1 单子系统的可编程策略平面

sched_ext 框架已合入 Linux 6.12 主线，允许 BPF 程序通过挂载到 struct sched_ext_ops 回调来实现完整的 CFS 等价调度策略。LWN 将其定位为快速实验和按负载定制的调度平台（参见 https://lwn.net/Articles/974387/ ；sched_ext_ops 文档见 https://docs.ebpf.io/linux/program-type/BPF_PROG_TYPE_STRUCT_OPS/sched_ext_ops/ ）。网络侧，BPF Qdisc（struct Qdisc_ops）使用户能够在不编写内核模块的情况下原型化报文调度算法（参见 https://docs.ebpf.io/linux/program-type/BPF_PROG_TYPE_STRUCT_OPS/Qdisc_ops/ ）。Syrup 将这一思路推广，提出跨多个系统层（CPU、网络、存储）的用户定义调度策略统一接口，发表于 SOSP'21（参见 https://www.scs.stanford.edu/~dm/home/papers/kaffes%3Asyrup.pdf ）。

在存储侧，cache_ext 是最直接相关的前驱工作。该系统发表于 SOSP'25，为 Linux page cache 引入了基于 BPF 的扩展接口，允许应用指定自定义的淘汰、插入和提升策略。其核心设计目标是多租户支持：不同应用可以在同一台机器上安装不同策略而不互相干扰，同时仍然共享物理 page cache（参见 https://www.asafcidon.com/uploads/5/9/7/0/59701649/cache_ext.pdf ；IBM Research 页面 https://research.ibm.com/publications/cacheext-customizing-the-page-cache-with-ebpf ；另见 CacheBPF https://arxiv.org/html/2502.02750v1 ）。FetchBPF 发表于 ATC'24，采用类似方法处理预取问题，通过 Linux readahead 路径中的 eBPF hook 实现可定制的预取策略（参见 https://www.usenix.org/system/files/atc24-cao.pdf ）。P2Cache 证明了 VM/缓存策略可以被 eBPF 化（参见 https://www.hotstorage.org/2023/papers/hotstorage23-final51.pdf ）。PageFlex 等系统也在探索相邻的设计空间。

GPU 侧已有 gpu_ext 将 GPU scheduling/内存管理 hooks 做成 eBPF struct_ops 的系统（参见 https://arxiv.org/html/2512.12615v1 ）。

### 2.2 内核态执行与存储函数下沉

XRP 发表于 OSDI'22，证明了存储密集型操作（B-tree 查找、日志扫描）可以表达为 BPF 程序并完全在内核的 NVMe 驱动中执行，从而消除反复的用户态-内核态切换。性能提升显著，但论文也记录了一个重要的副作用：在快速存储设备上，高频 I/O completion 中断会抢占同机部署的计算密集型进程的 CPU 时间，将其吞吐量降低到公平份额的仅 34%。作者明确将这一中断驱动的不公平问题留作 future work（参见 https://www.usenix.org/system/files/osdi22-zhong_1.pdf ）。Delilah 将下沉思路进一步延伸，在计算存储设备的嵌入式处理器上运行 eBPF 程序，验证了可行性，但未涉及多租户隔离或宿主机与设备执行之间的语义等价性（参见 https://www.researchgate.net/publication/370818368 ）。

### 2.3 I/O Completion 与事件循环的可编程性

I/O completion 路径正在获得越来越多的关注。2019 年，Hou Tao 发布了一组 RFC 补丁，提议使用 eBPF 将 block I/O completion 处理引导到指定 CPU 上执行，类似于网络栈中的 Receive Packet Steering（参见 https://lwn.net/Articles/802234/ ）。更近的进展是，内核邮件列表上出现了 BPF 控制 io_uring 的补丁系列，目标是允许通过 io_uring struct_ops 挂载的 BPF 程序覆盖标准 io_uring_enter 的执行模型。声明的用例包括更智能的 polling 策略、细粒度 batching 和自定义事件循环逻辑。这项工作仍在开发中，但正在快速收敛（参见 https://lwn.net/Articles/1059915/ ；另见历史讨论 https://lwn.net/Articles/1046950/ ）。此外，社区对 io_uring 与 eBPF 的结合讨论由来已久，早期邮件列表中就有关于 io_uring+eBPF 执行模型、状态管理和序列化的深入讨论（参见 https://lore.gnuweeb.org/io-uring/49df117c-dcbd-9b91-e181-e5b2757ae6aa%40gmail.com/t/ ）。

NVMe multipath 的 eBPF path selector 也已有 RFC patchset 在讨论将 path selection 做成 eBPF（参见 https://lists.infradead.org/pipermail/linux-nvme/2025-July/057643.html ）。

### 2.4 策略编排与生命周期管理

NetEdit 发表于 SIGCOMM'24（Meta），解决了在集群范围内部署多个 eBPF 程序时的运维挑战。它提供了一个编排平台，处理基于 eBPF 的网络调优特性的生命周期（部署、测试、回滚、监控）。作者指出其引入的解耦原则并非网络特有，也可以应用于存储和调度领域的 eBPF 程序（参见 https://cs.stanford.edu/~keithw/sigcomm2024/sigcomm24-final159-acmpaginated.pdf ）。在存储侧，cache_ext 将每应用策略隔离作为一等设计约束，确保一个应用的缓存策略不会降低另一个应用的性能。

### 2.5 DSL 与基于 LLM 的策略生成

SimpleBPF 发表于 2025 年 eBPF Workshop，将领域特定语言与基于 LLM 的代码生成和基于 SMT（Z3）的等价性检查相结合，产出对 verifier 友好的 eBPF 程序（参见 https://xzhu27.me/papers/simplebpf-ebpf2025.pdf ）。这代表了一个更广泛的趋势：随着可编程扩展点数量增长，为每个扩展点编写正确 BPF 程序的成本成为瓶颈，自动生成变得有吸引力。SchedCP 更进一步，提出一个 LLM agent 框架，自动在 sched_ext 上生成和部署 eBPF 调度策略，集成了负载分析、策略仓库和执行验证器以实现安全部署（参见 https://arxiv.org/html/2509.01245v2 ）。相关系统 "An Expert in Residence"（NeurIPS'25 ML4Sys workshop）使用在线 LLM agent 调节 Linux CFS 超参数，提出用 MCP（Model Context Protocol）做工具发现与调用，并强调事务化的 apply-commit-revert 语义、宿主机中介的审批门控（host-mediated approval gates）和策略控制（policy controls），使在线调优过程可审计、可回滚。

### 2.6 Block 层的部分可扩展性

Linux block 层（blk-mq）支持可插拔的 I/O 调度器（mq-deadline、kyber、bfq、none），但它们以内核模块形式实现，编译时依赖内部 API，而非安全的、可热替换的 BPF 程序（参见 https://docs.kernel.org/block/blk-mq.html ）。Tejun Heo 的 iocost 控制器中包含了对未来支持 BPF 自定义成本函数的讨论，但其目标是 I/O 成本模型而非 dispatch/scheduling 策略本身（参见 https://lwn.net/Articles/791175/ ）。目前没有已合入或广泛流通的补丁系列为 blk-mq 提供 sched_ext 的等价物。

## 3. 核心开放方向（A–E）

以下五个方向代表了具有较高论文价值的核心空白。每个方向从技术问题、现有系统为何未能解决、以及所需贡献形态三个角度进行描述。

### 方向 A：block I/O 调度的 BPF 扩展层

Linux 中的 block I/O 调度子系统是最后几个尚未具备 BPF 扩展接口的策略密集型内核子系统之一。sched_ext 已经使 CPU 调度可编程，cache_ext 对 page cache 淘汰做了同样的事情，但 blk-mq 的 dispatch 路径仍然要求策略作者编写内核模块或修改内核源码。这一空白之所以重要，是因为"正确"的 block 调度策略取决于跨部署甚至在单一部署内随时间变化的多种因素：延迟敏感的前台 I/O 与吞吐导向的后台 I/O（如 LSM-tree compaction、文件系统垃圾回收）的混合比例，NVMe 硬件队列数量，共租户模型，以及 fairness 与 tail latency 之间期望的权衡。

这一方向的系统将为 blk-mq 调度路径定义 struct_ops 风格的接口，允许 BPF 程序实现请求排序、合并和 dispatch 决策。需要明确的是，这里的目标是 blk-mq dispatch/scheduling 的完整 policy ABI，而非 iocost cost model 的一个小扩展——iocost 讨论中提到的 BPF 自定义成本函数只涉及 I/O 代价估算，不涉及调度决策本身。与简单地"将 sched_ext 移植到 block"相比，其困难的技术挑战包括：现代 NVMe 设备的多队列拓扑，意味着调度器必须推理队列级并行性而非单一运行队列；需要每租户隔离，使一个租户的调度策略不能饿死另一个租户的 I/O；以及与 I/O 成本模型（iocost/blkcg）的交互，该模型基于带宽和 IOPS 预算约束 dispatch 决策。评估需要证明 BPF 定义的策略能够在真实多租户负载下同时改善 p99 和 p999 延迟、维持吞吐量并执行 fairness，同时保持扩展机制自身的开销可控。

主要的 novelty 风险在于评审可能将其视为 sched_ext 模式的直接搬运。抗辩必须建立在 block I/O 路径中不出现于 CPU 调度的特定技术困难之上，尤其是多队列结构以及与基于 cgroup 的 I/O 控制的交互。需要对标的已有工作包括 sched_ext、cache_ext、Qdisc_ops、blk-mq 文档和 iocost（参见第 2 节中的对应引用）。

### 方向 B：可编程的 I/O completion 治理层

I/O completion 路径——当存储设备发出请求完成信号时执行的代码——正在成为快速 NVMe 设备上的关键性能瓶颈。内核目前提供一组固定的 completion 机制：中断驱动的 completion、混合 polling（io_uring IORING_SETUP_SQPOLL）和手动 polling。这些机制的选择在设备或队列粒度上进行，无法根据负载特征、延迟目标或共租户约束动态调整。

这一方向的系统将通过在关键决策点暴露可挂载 BPF 的回调来使 completion 路径可编程：是 poll 还是等待中断，在唤醒消费者之前批量收割多少 completion，由哪个 CPU 处理给定的 completion，以及如何在租户之间优先级化 completion。技术难点在于这些回调在 I/O 栈的最热路径上执行（通常在中断或 softirq 上下文中），因此扩展机制在常见情况下必须具有近零开销，且不能引入优先级反转或无界延迟。

然而，这一方向面临显著的 novelty 风险。BPF 控制 io_uring 的补丁系列正在收敛于一个相关设计，允许 BPF 程序定制 io_uring 事件循环包括 polling 行为（参见 https://lwn.net/Articles/1059915/ ）。Hou Tao 2019 年的 RFC 展示了基于 BPF 的 block 层 completion steering（参见 https://lwn.net/Articles/802234/ ）。要与这些工作区分，该方向的论文需要超越可编程性本身，提供治理能力：可执行的中断处理时间预算、多租户竞争下 tail latency 的可证明边界、以及策略行为异常时的安全回滚语义。这自然引向与方向 C 的结合。

### 方向 C：租户感知的中断与 completion 预算

现代快速存储设备（NVMe SSD、optane 级介质）产生 I/O completion 中断的频率足以主导处理这些中断的核心的 CPU 利用率。Linux cgroup 子系统为 I/O 提供带宽和 IOPS 限制，为计算提供 CPU 时间限制，但它不对租户 I/O 触发的中断处理程序和 softirq 所消耗的 CPU 时间进行记账。这造成了一个资源模型缺口：执行高频随机 I/O 的租户可以通过触发中断风暴来有效窃取同机部署租户的 CPU 时间，即使其 cgroup I/O 带宽限制未被超出。XRP 具体地记录了这一问题，表明与 I/O 密集型进程同机部署的计算密集型进程由于中断处理开销仅获得其公平 CPU 份额的 34%，并将该问题明确留作 future work（参见 https://www.usenix.org/system/files/osdi22-zhong_1.pdf ）。

这一方向的系统将通过引入中断预算抽象来弥合这一缺口：每个租户（或服务级别目标）被分配一个中断/softirq CPU 时间预算，内核通过动态调整 completion 机制（在中断模式和 polling 模式之间切换、调整中断合并参数、将 completion 引导到指定核心、更积极地批量化 completion）来执行这一预算，使每个租户保持在其配额内。这些调整的策略逻辑将表达为 BPF 程序，允许运维人员定制延迟与 CPU 效率之间的权衡，但执行机制和预算记账由内核提供且不能被 BPF 策略绕过。

关键评估需要证明三件事：没有预算时，真实多租户负载由于中断开销表现出严重且不可预测的公平性违规；有预算时，公平性得以恢复，同时对 I/O 延迟和吞吐量的影响是有界且可配置的；机制自身的开销（预算跟踪、模式切换）足够小以适合实际使用。分析性或实验性的最坏情况开销上界将显著增强贡献的力度。

这一方向在本文梳理的候选方向中 novelty 风险最低，因为没有现有系统提供可执行的、每租户的中断预算。该缺口是真实的，被一篇顶级会议论文所记录，并且影响生产系统。主要的实现挑战是在中断、softirq 和 polling 路径之间工程化预算执行，而不引入过高开销或破坏现有内核抽象。需要对标的已有工作包括 XRP（记录了问题并留作 open）、iocost（I/O 带宽预算但非中断 CPU 预算）、block completion steer RFC（CPU 亲和性但非预算）以及 cgroup v2 CPU 与 I/O 控制器。

### 方向 D：跨子系统的策略组合与稳定性

随着 BPF 扩展点在内核子系统中不断增殖，一类新问题浮现：当多个 BPF 策略——可能由不同团队编写、面向不同子系统——同时活跃时，会发生什么？一个 page cache 淘汰策略（cache_ext）可能与一个 block 调度策略（方向 A）和一个 CPU 调度策略（sched_ext）产生其作者都未预料到的交互。例如，一个激进回收页面的缓存淘汰策略可能触发 writeback I/O，而这与一个为读密集型负载优化的 block 调度策略交互不良，由此产生的中断负载又与 CPU 调度策略的延迟目标相冲突。这些跨子系统反馈回路不是假想的，它们是繁忙多租户服务器的正常运行状态。

NetEdit 为网络 BPF 程序解决了这一问题的运维方面（部署排序、测试、回滚），但不提供关于策略交互的语义保证（参见 https://cs.stanford.edu/~keithw/sigcomm2024/sigcomm24-final159-acmpaginated.pdf ）。cache_ext 在 page cache 子系统内执行隔离，但不推理与其他子系统中策略的交互。目前没有现有系统提供检测或防止跨子系统策略冲突的框架。

这一方向的系统将提供三项能力：一个组合模型，定义多个 BPF 策略跨子系统活跃时的执行顺序、状态共享和冲突解决规则；稳定性守卫，检测策略之间的反馈回路或振荡行为（例如一个缓存策略和一个 block 调度器交替触发彼此的最坏情况行为）；以及一个资源记账模型，将所有活跃策略的聚合开销归因到特定租户，防止一个租户的策略集合降低整体系统性能。贡献将在系统架构和形式化或半形式化保证的层面，而非单一新算法。

novelty 风险中等：熟悉 NetEdit 的评审可能将其视为编排方法向多子系统的扩展。抗辩必须证明跨子系统组合引入了质量上不同的问题（反馈回路、涌现性不稳定），这些问题不能通过对每个子系统独立应用单子系统编排技术来解决。

### 方向 E：宿主机与设备之间的可验证代码迁移

在嵌入式处理器上执行 eBPF 程序的计算存储设备已由 Delilah 所展示（参见 https://www.researchgate.net/publication/370818368 ），但其编程模型假设单租户、单版本部署，程序由人工编写和加载。随着计算存储走向多租户且程序变得更复杂（或由 LLM 生成），出现了三个 Delilah 未解决的问题：确保设备上运行的程序与宿主机上的参考实现具有相同的可观察行为；在共享设备上支持多个租户并隔离它们的下沉程序；以及在不中断正在进行的 I/O 的情况下演进程序（升级、回滚）。

这一方向的系统将提供一个宿主机-设备代码迁移框架，包含三个组件：一条编译流水线，从同一源码产出宿主机端参考实现和设备端变体，附带机器可检验的证明（或通过差分测试生成的全面测试套件），保证两者在程序类型范围内的所有输入上语义等价；设备上的多租户执行环境，在内存、计算预算和 I/O 访问方面隔离不同租户的程序；以及一个迁移协议，可以透明地在宿主机和设备之间双向移动执行而不丢失正在进行的状态，实现零停机升级和设备过载时的优雅降级。

这一方向比其他方向更具探索性，且依赖于尚未广泛可用的硬件能力。它更适合重视前瞻性架构的会议（OSDI、ASPLOS），而非强调在生产硬件上进行评估的会议。需要对标的已有工作包括 Delilah、XRP 内核态执行和 BPF verifier 与 JIT 基础设施。

## 4. 推荐的方向组合

上述方向并非互斥，在若干情况下组合后更强。以下组合按 novelty claim 的估计强度排序。

最强的组合是 A+C：block I/O 调度的 BPF 扩展层结合租户感知的中断预算。这一组合解决两个不同但互补的缺口。方向 A 提供可编程性（运维人员可以部署自定义 block 调度策略），方向 C 提供治理能力（内核执行任何策略都无法绕过的中断 CPU 预算）。两者结合使得 claim 难以被评审简化为"又一个 eBPF hook"或"又一个资源控制器"：系统同时使 block I/O 调度可编程，并使 I/O 的副作用（中断 CPU 消耗）可记账。评估将展示在混合前后台 I/O 的多租户 NVMe 环境中，组合系统对 tail latency 和 fairness 的改善超出单独的可编程调度或单独的中断预算所能达到的效果。这一组合直接消化了 XRP 留下的 open gap，同时填补了 cache_ext 和 sched_ext 已在各自子系统填补的 block 层可扩展性空白。

第二个组合是 B+C：可编程的 I/O completion 治理结合中断预算。这将可编程性从 block 调度路径转移到 completion 路径，如果 BPF 控制 io_uring 的工作未扩展到覆盖 block 层 completion，则可能是更好的选择。与 io_uring 工作的关键区分在于治理层面：io_uring BPF struct_ops 赋予应用更灵活的事件循环，而 B+C 赋予运维人员对 completion 路径的可执行多租户隔离。风险在于 io_uring 的工作可能扩展并覆盖部分相同领域。

方向 C 独立成文也是可行的。中断预算问题动机充分（XRP 的明确 future work 呼吁），技术上有挑战（需要修改中断处理、softirq 处理和 polling 路径），实践中也重要（影响任何在快速存储上的多租户部署）。独立 C 论文的主要顾虑是范围：评审可能希望看到预算机制如何与可编程策略集成（即他们可能推动 A+C 或 B+C 方向）。

## 5. 扩展场景全景：尚未被做成成熟 eBPF 可插拔扩展层的子系统

以下清单是经过两轮"想点子 → 检索有没有人做过（至少到 paper / 主流开源 / LKML RFC/patch 级别）→ 再补一批再检索"后，筛选出的目前没有搜到成型 eBPF 可插拔扩展层的场景。所谓"没搜到"并非数学证明不存在，而是用常见关键词（eBPF + 子系统名 + policy/struct_ops/extension/governor/hook，以及 LKML/LWN 线索）未找到已成型、被广泛引用的可装载 policy plane。这些恰好是做论文最舒适的空白地带。

### 5.1 内核：内存管理与虚拟内存

5.1.1 writeback_ext：dirty throttling 与 writeback pacing 可编程

writeback/dirty 限流本质是"全局一致性 + tail latency"的硬权衡。多租户混部时经常出现某个 workload 把别人尾延迟拖穿，但运维人员只能调一堆 sysctl。可插拔点在于 balance_dirty_pages() 和 wb 线程的 pacing 逻辑上做一个 policy hook，输出每 memcg 的脏页上限、速率和惩罚/赦免。能找到大量 writeback 机制和历史讨论（参见 https://lwn.net/Articles/647919/ ），但没有看到 writeback 变成 eBPF policy plane 的成型接口。

5.1.2 wb_bw_alloc_ext：跨 cgroup 的 writeback 带宽分配

cgroup 的 IO 控制能管 device 带宽，但 writeback 这条"内存→回写→IO"链路常常仍是黑盒。想要 SLO（比如 p99）时缺一个可控面。可插拔点是把"谁该先回写、回写多快、谁先被 throttle"做成 policy callback，输入 PSI/dirty ratio/IO 压力，输出 token。没有看到成熟的 eBPF 扩展层（参见 https://lwn.net/Articles/647919/ ）。

5.1.3 shrinker_ext：全局 shrinker 仲裁可编程

Linux reclaim 里 shrinker 太多（dcache/icache/zswap 等），而仲裁逻辑是典型策略。多租户加分层内存时尤其需要 workload-aware。可插拔点在 shrinker 调度处引入 policy，输入 cache 热度、memcg 压力、回收成本，输出 scan order/scan depth/跳过。能搜到 shrinker 与可调性问题被讨论（参见 https://arxiv.org/html/2512.12530v1 ），但没有看到 shrinker 作为 eBPF 扩展接口的平台。

5.1.4 dcache_icache_ext：dentry/inode cache 淘汰/aging 策略可编程

很多服务的 tail latency（尤其 metadata-heavy 场景）实际上被 dcache/icache 抖动控制，但很难用一个通用 LRU 覆盖所有 workload。可插拔点针对 dentry/inode 的 aging、pin、batch reclaim 做 policy，甚至可以 per-cgroup。VFS path lookup 文档很多（参见 https://www.kernel.org/doc/html/v5.0/filesystems/path-lookup.html ），但没有看到 dcache/icache eviction 的 eBPF policy plane。

5.1.5 zswap_ext：zswap 的 admission/eviction/compressor 选择可编程

zswap 是典型"压缩换 CPU 换内存"的策略问题，和尾延迟强相关。policy 决策包括哪些页进 zswap、什么时候驱逐、压缩算法/级别选择、按 memcg 预算。zswap 有明确机制文档（参见 https://docs.kernel.org/admin-guide/mm/zswap.html ），但没有看到把它抽象成可热更新、可隔离的 eBPF policy plane。

5.1.6 ksm_ext：KSM 去重的 scan/merge 策略可编程

KSM 的收益和开销高度 workload-dependent，尤其在 KVM/容器密度场景。scan rate、候选选择、合并阈值本质是策略。policy 决定哪些 mm/哪些 VMA 参与、scan budget、去重优先级、按租户预算。KSM 有完整文档（参见 https://docs.kernel.org/mm/ksm.html ），但没有看到 eBPF 扩展层把它平台化。

5.1.7 compaction_ext：内存 compaction 触发与 pacing 策略可编程

proactive compaction 这类机制常引发不可预期的 latency spike，但是否触发和触发多猛其实是策略（参见 https://www.kernel.org/doc/Documentation/admin-guide/sysctl/vm.rst ）。policy 输入碎片度、THP 成功率、PSI、SLO，输出 compaction budget/时机/目标 order。能找到机制与 sysctl（参见 https://docs.kernel.org/mm/physical_memory.html ），但没有看到 compaction 变成 eBPF policy plane。

5.1.8 numa_balance_ext：自动 NUMA balancing 的 scan/migrate 策略可编程

NUMA balancing 要在"迁移收益 vs 迁移抖动"间权衡，不同 workload 需要不同 scan size/period、migrate 激进度（参见 https://www.kernel.org/doc/html/v6.2/scheduler/sched-debug.html ）。policy 决定哪些进程参与、scan 参数、migrate 触发、冷热页分离、按租户/服务分层内存策略。有机制说明，但没有看到 BPF 扩展层。

5.1.9 thp_ext：THP collapse/split 与公平分配可编程

THP 的"谁能吃到 hugepage"经常导致跨租户不公平，而 collapse/split 触发条件是策略（参见 https://docs.kernel.org/admin-guide/mm/transhuge.html ）。policy 输出每 memcg 的 THP 预算、khugepaged aggressiveness、split 规则。THP 文档齐全，但没有搜到 THP 作为 eBPF policy plane 的成型接口。

5.1.10 slab_reclaim_ext：slab 缓存回收/扫描仲裁可编程

slab 的回收触发、扫描量、优先级经常引发 latency spike，但调参空间小。eBPF 面是对 shrink 路径提供按 cache/memcg 的 budget 与优先级回调。

5.1.11 watermark_ext：per-zone 水位线与 kswapd 唤醒/休眠策略可编程

水位/kswapd 的 aggressiveness 是典型"吞吐 vs p99"的矛盾，不同机器和工作负载最优点差很多。policy 输出 wakeup threshold、每轮 reclaim budget，并要求 bounded。

5.1.12 memcg_global_reclaim_ext：全局压力下 memcg 受害者选择可编程

多租户下"谁该先让步"是业务策略问题，不是纯内核启发式能解决的。policy 输入 PSI/oom 风险/租户权重，输出 reclaim order/penalty。

5.1.13 swap_select_ext：多 swap 设备间的选择/分流策略

现在主要靠优先级和简单策略，但"该 swap 到哪里"很依赖介质延迟/带宽/写放大/能耗。policy 为每次 swap-out 选择目标 device 或队列，需要强约束避免热路径开销爆炸。

5.1.14 zram_policy_ext：zram 压缩算法/级别加 writeback 时机可编程

CPU 和内存的 tradeoff 本质是策略，对 p99 极其敏感。policy 按 memcg/进程类型做 admission、compress-level、writeback pacing。

5.1.15 tiering_ext：内存分层 promotion/demotion 策略可编程

未来"内存像存储一样分层"（NUMA/CXL/慢内存）是常态，默认策略很难同时兼顾吞吐与 tail。policy 结合访问热度、NUMA 延迟、带宽，决定迁移与预算。

5.1.16 damon_to_bpf_ext：让 DAMON 的动作决策回调 eBPF

DAMON 已经能做"按访问模式执行操作"的框架，但策略表达仍偏固定/用户态配置（参见 https://lwn.net/Articles/1016525/ ）。把"触发什么动作、动作多大 budget"下沉到 eBPF，并用 verifier/预算约束它。

5.1.17 psi_controller_ext：基于 PSI 的内核内反馈控制器

PSI 是通用信号，但"怎么控制资源"目前多在用户态。高事件率时 user/kernel feedback loop 太慢太抖。在内核侧做 bounded 的控制器，动态调整 memcg/IO/CPU budget，可以成为 agent 调优的安全 action space。

### 5.2 内核：文件系统与存储栈

5.2.1 ext4_alloc_ext：ext4 block allocator 可编程

放置策略决定碎片与 tail latency（尤其 SSD/NVMe 加混部），现状是固定 allocator 逻辑加少量启发式。可插拔点在 ext4_mb_new_blocks() 或相关路径提供 policy callback，输入文件/目录热度、IO 类别、cgroup、zone/stripe 信息，输出 group/extent 选择。能找到 allocator 源码与改进讨论（参见 https://android.googlesource.com/kernel/common/%2B/880acbb718e15/fs/ext4/mballoc.c ），但没有看到把 allocator 抽象成可装载 eBPF policy 的平台接口。

5.2.2 journal_commit_ext：ext4/jbd2 的 commit batching 与 fast-commit 使用策略可编程

commit 周期是"可靠性 vs 性能/尾延迟"的经典对抗，不同 workload 需要不同 batching/flush 语义。policy 决定 full commit vs fast commit、commit 时机（按 SLO/吞吐/故障域），以及跨工作负载隔离。jbd2/journalling 文档很多（参见 https://www.kernel.org/doc/html/latest/filesystems/ext4/journal.html ），但没有看到 eBPF policy plane。

5.2.3 bg_fs_maintenance_ext：后台维护 IO 的统一可编程调度层

覆盖 btrfs scrub/balance/defrag、f2fs GC/checkpoint，甚至文件系统自带的后台线程。后台维护是典型"吞吐要做、但不能拖垮前台 p99/p999"的混部痛点，现在通常靠 cron/systemd 加 ioprio，缺内核级强约束。提供 hook 让后台线程每次发起 IO 前询问 policy，输入前台 SLO、队列深度、租户权重，输出是否让步/限速/批处理。btrfs scrub 有机制说明（参见 https://btrfs.readthedocs.io/en/latest/Scrub.html ）；f2fs GC 有 mount/sysfs 参数，但没有看到统一的 eBPF 可编程治理层。

5.2.4 f2fs_gc_ext：F2FS GC 的触发、sleep、强制 GC 策略可编程

GC 何时触发、一次做多少，直接决定 tail latency，现状主要是 mount 选项和参数（参见 https://docs.kernel.org/filesystems/f2fs.html ）。policy 根据 IO idle/PSI/服务等级动态调 GC aggressiveness、合并、sleep window。没有看到 eBPF policy plane。

5.2.5 raid_resync_ext：mdraid rebuild/resync 的调度策略可编程

rebuild 既要尽快完成降低风险，又不能把线上服务 IO 打穿。现在是 sysctl 速度上下限加内核自适应（参见 https://man7.org/linux/man-pages/man4/md.4.html ）。policy 以风险预算加 SLO 驱动 resync 带宽/节奏，按租户/设备队列动态调整。能找到速度控制机制，但没有看到 eBPF 扩展层。

5.2.6 vfs_lookup_ext：pathname lookup 与 negative dentry 缓存语义可编程

大量小文件/元数据服务的 lookup/revalidate 策略对尾延迟很敏感，但这类策略经常被硬编码。policy 决定 negative dentry 的 TTL、revalidate 频率、目录热度驱动的缓存 pinning。有完整 VFS lookup 机制描述（参见 https://www.kernel.org/doc/html/v5.0/filesystems/path-lookup.html ），但没有看到 eBPF policy plane。

5.2.7 fsnotify_ext：inotify/fanotify 事件队列的 coalesce/backpressure/sampling 策略可编程

大规模目录监控/安全扫描/开发工具常被事件风暴拖垮。"事件如何合并、是否丢弃、如何对租户限流"是策略。在事件入队/出队处加 policy，输入队列水位、consumer 速率、租户权重，输出合并窗口、采样率、丢弃策略。fanotify 文档描述了事件队列（参见 https://man7.org/linux/man-pages/man7/fanotify.7.html ），但没有搜到 eBPF 可编程治理层。

5.2.8 fscrypt_key_ext：fscrypt 密钥驻留/驱逐策略可编程

密钥缓存策略会影响延迟峰值与攻击面，不同 workload 的热密钥集合差异巨大。policy 输入访问频率、租户、SLO、安全级别，输出 key retention/evict、预加载。没有搜到 fscrypt key cache 的 eBPF policy plane。

5.2.9 dm_cache_policy_ext：device-mapper cache 的 admission/eviction/cleaning 策略可编程

dm-cache 有模式与固定策略可选，但不是安全可验证的热更新策略字节码（参见 https://www.infradead.org/~mchehab/kernel_docs/admin-guide/device-mapper/cache.html ）。policy 输入 block 热度、写脏比例、后端延迟，输出缓存放入/驱逐/回写预算。

5.2.10 dm_writecache_flush_ext：writecache 的 flush/batching 策略按 SLO 可编程

flush 策略直接影响 p99 与崩溃一致性窗口。policy 决定 flush 时机和批大小，并要求可回退。

5.2.11 dm_thin_gc_ext：thin provisioning 元数据 GC/回收 pacing 可编程

元数据 GC 是典型后台维护 IO，和前台混部时容易拖 tail。policy 统一治理 GC budget 与前台让步。

5.2.12 fsverity_cache_ext：fs-verity 验证与 Merkle 树块缓存/调度策略可编程

完整性校验的 CPU/IO 开销波动大，对不同 workload 需要不同 caching/验证节奏。policy 决定缓存优先级、验证批处理窗口、按租户预算。

5.2.13 nfs_attr_cache_ext：NFS 客户端属性/一致性 revalidation TTL 策略可编程

属性缓存 TTL 是"语义 vs 性能"的老矛盾，但在云原生/元数据密集服务里依然是尾延迟核心。policy 按目录/文件热度/一致性等级调整 TTL 与 revalidate 频率。

### 5.3 内核：中断、softirq 与网络热路径治理

5.3.1 irq_coalesce_ext：NIC/NVMe interrupt coalescing 策略可编程（SLO 驱动）

coalescing 是"吞吐 vs 延迟"的典型策略，不同 workload、不同负载阶段最优点完全不一样。policy 动态设置 coalesce 参数，输入 p99、队列深度、CPU 利用率，输出 coalesce_usecs/frames 等。能搜到 ethtool coalesce 的机制与参数（参见 https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/configuring-ethtool-settings-in-networkmanager-connection-profiles_configuring-and-managing-networking ），但没有看到 eBPF policy plane。

5.3.2 irq_budget_ext：按租户的 IRQ/softirq CPU 预算与隔离（强约束）

很多系统能管 CPU time 和 IO 带宽，但 IRQ/softirq 的隐形 CPU 消耗容易绕开配额，导致别人的尾延迟爆炸。这与方向 C 高度对应。policy 输出每租户的 IRQ budget，触发批处理/迁移/抑制/转 polling 动作，要求可回退、可验证开销。没有看到一个被广泛接受的 eBPF IRQ 预算/隔离平台（大多是 tracing 或用户态 irqbalance）。

5.3.3 napi_budget_ext：NAPI poll budget 与 busy-poll 的动态策略

polling/busy poll 很容易在高频 IO 场景把 CPU 公平性打穿，budget 如何分配是策略。policy 输入每队列 backlog、延迟、CPU 压力，输出每轮 poll 的预算、是否切回 interrupt。NAPI 机制有文档（参见 https://docs.kernel.org/networking/napi.html ），但没有看到 eBPF policy plane。

5.3.4 softirq_sched_ext：softirq 层面的跨类型/跨设备公平调度策略

net_rx、block、timer 等 softirq 之间的竞争会在高 IO 场景放大尾延迟，现状偏固定策略。policy 统一决定每类 softirq 的 budget/优先级/批窗口。没有搜到把 softirq 调度做成 eBPF 可插拔层的工作。

5.3.5 rps_rfs_ext：RPS/RFS steering 策略可编程（按服务拓扑/NUMA/租户）

steering 策略直接影响 cache locality、尾延迟和公平，但最优方案高度依赖服务拓扑与负载形态。policy 输入 socket/flow/NUMA/CPU 压力，输出 CPU 选择与迁移节奏。没有看到 RPS/RFS 的 eBPF policy plane（更多是在 XDP/tc 层做转发，不是 steering 策略本身）。

5.3.6 wifi_rate_ext：mac80211 rate control 与 airtime scheduler 的 eBPF 可插拔策略

Minstrel 等算法是硬编码，但 AP/边缘场景想要按业务目标（VR/VoIP/吞吐/公平）热更新策略很合理（参见 https://wireless.docs.kernel.org/en/latest/en/developers/documentation/mac80211/ratecontrol/minstrel.html ）。把 rate selection/airtime fairness 的 hook 抽象成 policy callback，要求 verifier 加 bounded cost。能找到用 eBPF 做 WiFi 监控的框架 FLIP（参见 https://www.cse.scu.edu/~bdezfouli/publication/FLIP-MobiWac-2021.pdf ），但没有看到把 rate control 本身变成 eBPF policy plane。

5.3.7 irq_affinity_ext：中断亲和性/迁移策略可编程

irqbalance 是用户态粗粒度，在高频设备下很难保证 tail 和公平。policy 输出 affinity/steering/迁移节奏，并能和 IRQ budget（方向 C）组合成强隔离。

### 5.4 内核：网络子系统

TCP CC 和 qdisc 已经能用 struct_ops 做了（参见 https://docs.ebpf.io/linux/program-type/BPF_PROG_TYPE_STRUCT_OPS/tcp_congestion_ops/ ），因此不算空白。以下是仍然空白的场景。

5.4.1 conntrack_gc_ext：conntrack 表项的淘汰/缩表策略可编程（按 netns/租户预算）

conntrack 满了就是事故，但"淘汰谁"本质是策略（业务优先级、短连接风暴、攻击流）。policy 输入表水位/命中/租户权重，输出 eviction order 与 budget。

5.4.2 nat_port_alloc_ext：NAT 端口分配策略可编程

大规模 NAT 场景，端口选择影响冲突与状态爆炸，固定算法很难兼顾多目标。policy 按租户/目的端/历史冲突率选端口段与步进策略。

5.4.3 socket_mem_budget_ext：socket buffer autotune 与公平预算（per-cgroup）

bufferbloat 和 unfairness 常常来自缓冲区策略，在混部里直接反映为 tail。policy 动态调整 rmem/wmem 目标与 backpressure 阈值。

5.4.4 route_ecmp_policy_ext：内核路由 ECMP/路径选择策略可编程

很多场景希望"路由选择是业务策略"（比如成本、延迟、拥塞、NUMA），但内核路由策略有限。policy 输出 nexthop 选择与 stickiness。这里说的不是 tc/XDP 层转发，而是路由子系统本身的选择逻辑。

### 5.5 内核：内核并发框架、时间子系统与后台机制

5.5.1 workqueue_ext：workqueue（cmwq）并发度/抢占策略可编程

workqueue 是大量内核后台工作的承载体，max_active 等参数背后是策略（吞吐 vs latency/干扰）。policy 动态调整某些 wq 的并发上限、CPU 亲和、让步机制（按 SLO/PSI/租户）。workqueue 文档清楚描述了并发控制（参见 https://docs.kernel.org/core-api/workqueue.html ），但没有看到 eBPF policy plane。

5.5.2 timer_coalesce_ext：timer slack/合并策略按租户可编程

timer 合并影响延迟尾部和能耗，不同服务目标不同。policy 输出 slack 策略/阈值，并可按 cgroup/SLO 区分。

5.5.3 rcu_callback_ext：RCU callbacks 的 batching/pacing 策略可编程

RCU callback 风暴会造成不可控抖动，但何时批和批多少是策略。policy 输入 callback backlog/CPU 压力，输出处理预算与让步。

5.5.4 kthread_qos_ext：内核线程统一 QoS 调度层

今天每个子系统各自调 nice/affinity，缺统一的后台任务治理。一个统一 policy plane 给所有内核后台线程（jbd2/kswapd/btrfs workers 等）分配预算和优先级。强约束：不能破坏 forward progress。

### 5.6 内核：虚拟化、IOMMU 与设备电源

5.6.1 iommu_ext：IOMMU map/unmap caching 加 IOTLB invalidation batching 策略可编程

IOMMU 的 flush/batch 是"隔离 vs 性能"的策略点，尤其高吞吐网络/虚拟化场景（IOTLB wall）（参见 https://www.kernel.org/doc/html/v6.0/userspace-api/iommu.html ；另见 https://aliireza.github.io/files/iotlb-peerj23.pdf ）。policy 决定映射缓存、invalidate 合并窗口、按设备/租户分级。有机制与性能研究，但没有看到 eBPF policy plane。

5.6.2 virtio_queue_sched_ext：virtio 队列 dispatch/completion 的 per-VM 调度与预算

vhost/virtio 混部下某 VM 的 IO/中断容易抢占 host CPU，这和方向 C 的 IRQ 预算强约束是一条链。policy 给每 VM 队列分配 budget、batch window、steering。

5.6.3 kvm_page_aging_policy_ext：KVM guest 页老化扫描/balloon/tiering 策略可编程

云上内存复用、热迁移、balloon 都依赖"谁热谁冷"的策略，默认 heuristic 很难通吃。policy 决定扫描预算、阈值与迁移动作。

5.6.4 vfio_dma_map_cache_ext：VFIO/IOMMU 映射缓存与 invalidation batching 策略

IOTLB flush 代价大，策略选择强依赖设备与 workload。policy 输出 batch/flush window 与缓存策略。

5.6.5 usb_pm_ext：USB autosuspend idle-delay 策略可编程

音频设备、交互设备对 autosuspend 极敏感，"永不 autosuspend"又浪费电。策略显然依赖 workload。policy 根据设备类型/最近交互/功耗目标动态设定 autosuspend delay。USB 电源管理文档描述了 idle-delay 机制（参见 https://www.kernel.org/doc/html/v6.1/driver-api/usb/power-management.html ），但没有看到 eBPF policy plane。

5.6.6 nvme_apst_ext：NVMe APST 功耗状态转换策略可编程

APST 经常是线上偶发延迟/稳定性问题的来源之一，不同服务对最大可容忍 latency 完全不同。policy 输入 SLO/负载/温度/掉盘风险，输出 APST 配置。社区大量讨论 APST 及参数（参见 https://github.com/linux-nvme/nvme-cli/issues/878 ），但没有看到 eBPF policy plane。

5.6.7 pcie_aspm_ext：PCIe ASPM/L1 子状态策略可编程

链路省电状态会影响唤醒延迟，按业务动态策略非常合理（尤其移动/边缘）。policy 协调 NVMe APST 加 PCIe ASPM，输入端到端 SLO，输出链路状态目标。能找到大量经验性调参讨论，但没有看到 eBPF 可装载 policy plane。

5.6.8 per_device_runtime_pm_ext：runtime PM 的 autosuspend/唤醒策略统一可编程

不仅 USB，很多设备 runtime PM 都是"参数加固定启发式"。policy 基于真实使用模式与 SLO 决策 autosuspend delay。

### 5.7 非内核：用 userspace eBPF runtime 做策略插件字节码

这里的关键点是不要求进内核。可以用 userspace eBPF VM（ubpf/rbpf/bpftime）把策略从主工程里剥离成可热更新、可回滚、可隔离的模块，从而让 LLM agent 做自动调优时更安全（策略跑在 sandbox 里）。bpftime 是这一路线的典型代表（参见 https://github.com/eunomia-bpf/bpftime ；另见 ubpf https://github.com/iovisor/ubpf ）。

5.7.1 rocksdb_compaction_ext：LSM compaction/background IO 的可插拔策略（uBPF）

compaction 策略是典型"吞吐 vs 写放大 vs 尾延迟"的三角问题，workload 差异巨大。policy 决定 compaction picking、优先级、budget、与前台请求的让步/批处理。没有搜到 RocksDB 用 eBPF 作为策略插件的主流实现（通常是内置策略或 C++ 插件，不是可验证字节码）。

5.7.2 redis_eviction_ext：Redis key eviction 的可插拔策略（uBPF）

Redis 官方明确了 eviction policy 是可选项，但仍是枚举几个固定策略（参见 https://redis.io/docs/latest/develop/reference/eviction/ ）。policy 输入 key 热度/大小/业务标签/SLO，输出 evict 选择，且可做 per-tenant fairness。能搜到大量用 eBPF 观测 Redis 的项目（例如 https://github.com/dorkamotorka/redis-ebpf ），但没有看到把 eviction 本身变成 eBPF policy plane。

5.7.3 grpc_resilience_ext：gRPC client-side retry/hedging/backoff 的可插拔策略（uBPF）

重试和对冲是尾延迟与放大效应的核心来源，策略必须跟 SLO 和下游负载联动。policy 输入最近错误/RTT 分布/队列长度，输出是否重试、重试间隔、是否 hedge。能搜到 eBPF 用在 gRPC 可观测/解码的方向，但没有看到把 resiliency 策略做成可验证、可热更新的 eBPF policy plane（参见 gRPC retry 文档 https://grpc.io/docs/guides/retry/ ）。

5.7.4 llm_infer_sched_ext：LLM inference server 的 batching/KV-cache eviction/admission control 策略（uBPF）

LLM serving 的 tail latency、吞吐、显存抖动强依赖策略，而且非常适合"在线 AB 加快速回滚"。policy 决定 batch 组包、prefill/decode 优先级、KV eviction、按租户预算。没有看到主流系统用 eBPF VM 做这一层策略字节码（多是写死在调度器里）。

5.7.5 postgres_autovacuum_ext：Postgres autovacuum/autoanalyze 调度策略（uBPF 插件）

autovacuum 的触发频率、资源消耗与前台查询延迟之间的权衡是典型策略问题。policy 可以根据表大小、死元组率、查询负载来调度 vacuum 行为。

5.7.6 kafka_rebalance_ext：Kafka consumer group rebalance 策略（uBPF 插件）

rebalance 策略影响分区分配公平性、消费延迟和服务稳定性。作为可热更新的字节码插件可以让策略迭代更快更安全。

5.7.7 envoy_retry_ext：Envoy/L7 retry/hedging 策略（uBPF 插件）

L7 proxy 的重试/对冲逻辑与 gRPC 类似但更泛化。以可验证字节码形式表达策略，可以在不重启 proxy 的前提下安全更新。

5.7.8 jvm_go_gc_pacer_ext：JVM/Go GC pacer 策略（uBPF 插件）

GC pacing 是"暂停时间 vs 吞吐 vs 内存占用"的三角权衡，高度 workload-dependent。以 uBPF 插件形式表达 pacer 策略可以实现在线调优和安全回滚。

## 6. 这些空白场景的共性：为什么适合做成 eBPF policy plane

上述候选场景基本都满足同一类平台化条件。首先是机制稳定但策略多变：子系统核心机制不想天天改，但 workload 和硬件变化让策略必须变，典型如 writeback、GC、coalescing、NUMA、compaction。其次是热更新和回滚价值极高：一旦策略写错会拉升尾延迟，所以必须能快速回滚，这和 eBPF 的可装载、可验证天然契合（参见 BPF struct_ops 文档 https://docs.ebpf.io/linux/program-type/BPF_PROG_TYPE_STRUCT_OPS/ ）。第三是可验证开销是硬门槛：不仅能插策略，还要能证明 worst-case overhead、隔离与不相互污染。第四是 LLM agent 驱动调优会变得更常见，因为 LLM 擅长探索策略空间，但必须把它限制在安全的策略 DSL/bytecode 加资源预算加 guardrail 里。把策略封装进 eBPF（或 userspace eBPF VM）正好是一个工程上可落地的方式。

## 7. 内核真的会允许这么多扩展吗

结论是不会允许"数量很多、粒度很碎"的扩展，但会允许少数"高杠杆、强约束"的扩展接口。并且趋势是越来越多子系统愿意把策略外包给 BPF，前提是把安全、开销和回退做成一等公民。

struct_ops 本身就是让子系统把 function pointers 的实现外包给 BPF 的基础设施，最初用例是 TCP 拥塞控制（参见 https://lwn.net/Articles/809092/ ）。后续已经扩展到更多方向，例如 BPF qdisc 明确以快速实验调度算法/策略为目标。连 OOM killer 这种极敏感的 mm 领域，都已经出现用 BPF 实现自定义 OOM 处理策略的 RFC/讨论，设计里明确了安全护栏：如果 BPF 没释放内存就回退到内核 OOM killer，并有"必须声明释放量"的安全机制（参见 https://lwn.net/Articles/1019230/ ；LKML 讨论 https://lkml.org/lkml/2025/4/28/105 ）。io_uring 也在推进 BPF controlled io_uring 的 patch 系列（参见 https://lwn.net/Articles/1059915/ ；历史 https://lwn.net/Articles/1046950/ ），尝试用 struct_ops 让 BPF 控制 event loop。DAMON 也在为更灵活的策略表达做准备（参见 https://lwn.net/Articles/1016525/ ）。

但内核不可能到处开洞。内核维护者通常会卡以下几条，任何 extension plane 都绕不过。第一是默认路径必须零回归：没加载 BPF 时不能引入可测开销。第二是强回退语义：BPF 失败/超时/返回非法必须能回退到内核默认策略（OOM RFC 就是典型做法）。第三是可证明的 bounded cost：hot path 里每个事件最多做多少工作要可解释、可限制。第四是攻击面控制：谁能加载需要清晰的权限模型（CAP_BPF、cgroup 委派等）。第五是可测试：必须有 kselftest/selftest，否则很难进主线（参见 io_uring patch thread 中的 selftest 讨论 https://lore.gnuweeb.org/io-uring/?t=20260224161220 ）。第六是接口稳定性策略：struct_ops/kfunc 是强能力，但也带来内核内部结构变动影响 BPF 程序的维护成本，必须设计好 BTF/CO-RE/feature probing 的路线。

## 8. 优先级排序：Top 10 最通用且价值最大的方向

按覆盖面、业务影响和未来趋势（AI/云/CXL）综合排序。

第一优先级是 IRQ/softirq/完成路径的预算与隔离（核心方向 C），这是跨存储、网络、虚拟化的通用痛点，且有 XRP 的 open gap 背书。

第二优先级是统一后台工作治理，包括 bg_fs_maintenance_ext、workqueue_ext 和 kthread_qos_ext。后台任务是 tail latency 的头号杀手之一。

第三优先级是 writeback/dirty throttling 的 policy plane（writeback_ext 加 wb_bw_alloc_ext），影响几乎所有有写 IO 的服务，也是多租户冲突高发区。

第四优先级是 memcg 全局压力下的 victim/预算策略（memcg_global_reclaim_ext），云上极其通用。

第五优先级是内存分层/tiering 的决策 plane（tiering_ext），CXL/分层内存普及后会变成"必修课"。

第六优先级是 dm-cache policy plane（dm_cache_policy_ext），云存储/本地缓存/写放大控制都非常通用。

第七优先级是 conntrack GC/eviction（conntrack_gc_ext），网络基础设施通用且事故代价大。

第八优先级是 timer/RCU 抖动治理（timer_coalesce_ext 加 rcu_callback_ext），属于"不做就会偶发拉 p99"的系统性问题。

第九优先级是跨子系统的 policy composition（核心方向 D），当 policy plane 变多，这是防止系统失控的上层必需品。

第十优先级是 userspace eBPF 的策略插件化（基于 bpftime/uBPF），很多扩展点更容易在用户态先做成通用框架，再挑最有价值的下沉进内核。

## 9. 实操建议

如果目标是发 FAST/OSDI/SOSP 而非单纯 patch 合入，建议的打法是：内核侧只做一到两个最通用的 primitive（例如 IRQ/softirq budget 加后台工作治理），把接口做得极干净，强约束、强回退。其余场景先用 userspace eBPF runtime 做成通用 policy plugin 框架（bpftime/uBPF/rBPF），让 LLM agent 在用户态安全探索策略；跑出价值后再把最值得的那一小部分下沉进内核。这种"1 个内核扩展加 1 个 userspace 扩展框架"的组合，既有深度（内核 primitive）又有广度（userspace 覆盖面），对论文叙事非常有利。

## 10. LLM Agent 作为需求放大器的角色

自动生成和部署内核策略的 LLM agent 的出现，为可编程、可治理的操作系统子系统的动机增添了新维度。SchedCP 展示了一个从负载描述生成 sched_ext BPF 策略的 agent（参见 https://arxiv.org/html/2509.01245v2 ），An Expert in Residence 系统（NeurIPS'25 ML4Sys workshop）展示了一个基于 MCP 做工具发现与调用、以事务语义在线调节 Linux CFS 参数的 agent，强调可审计、可回滚的在线调优。两个系统都强调了安全基础设施的必要性：执行验证器、审批门控和回滚机制。

这些 agent 放大了对方向 C 和 D 中描述的治理机制的需求。当人类运维人员部署 BPF 策略时，通常是在仔细测试后且完全理解策略行为的前提下进行。当 LLM agent 作为自动化优化循环的一部分部署策略时，策略部署频率增加数个数量级，策略可能不那么被充分理解，而不良策略的后果（tail latency 飙升、fairness 违规、系统不稳定）必须被自动遏制而非依赖人工干预。这使得可执行预算、组合守卫和安全回滚语义不仅是理想特性，而是可编程 OS 范式规模化发展的必要条件。

这一观察可以作为追求上述任何方向的论文的额外动机，但它不足以作为独立贡献：novelty 必须建立在技术机制之上，而非建立在"agent 需要它们"这一观察之上。

## 11. Novelty 风险评估总结

方向 C（租户感知的中断预算）承载的 novelty 风险最低。它解决了一个具体的、被量化的问题，而该问题被一篇顶级会议论文（XRP）明确留作 open。没有现有系统提供可执行的每租户中断 CPU 预算，且实现需要非平凡的内核修改，远超在现有 hook 上挂载一个 BPF 程序。

方向 A（block I/O 调度扩展层）承载中等风险。struct_ops 可扩展性模式已经成熟，评审会问 block I/O 路径比 CPU 调度或 page cache 淘汰难在哪里。答案必须扎根于多队列 NVMe dispatch 和 cgroup I/O 控制集成的具体技术挑战。

方向 B（completion 可编程性）作为独立贡献承载最高风险，因为 BPF 控制 io_uring 正在内核社区积极开发。当与方向 C 的治理机制结合时，它变得可行。

方向 D（跨子系统组合）作为独立贡献承载中等偏高风险。NetEdit 已经为网络建立了编排平台叙事，评审需要被说服跨子系统组合比单子系统编排在本质上更困难。

方向 E（可验证的代码迁移）最具探索性，依赖于硬件的可用性，是一个更长期的布局。

在扩展场景清单中，novelty 最硬且最通用的组合是：IRQ/softirq 预算与隔离（第一优先级）加统一后台工作治理（第二优先级）或 writeback policy plane（第三优先级）。这几个方向覆盖面广、业务影响大、且均未被现有工作填满。
