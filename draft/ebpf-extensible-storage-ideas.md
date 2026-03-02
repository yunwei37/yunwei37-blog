# 基于 eBPF 的操作系统子系统可编程扩展：研究方向与相关工作

目标会议：OSDI, SOSP, FAST, NSDI

## 1. 背景与动机

过去几年，Linux 内核正在经历一场安静但深刻的架构转型：原本编译进内核或以重量级内核模块形式加载的关键子系统策略，正在被重构为基于 eBPF 的可编程扩展点。BPF struct_ops 机制 [7] 目前已覆盖 CPU 调度（sched_ext [8]）、报文调度（Qdisc_ops [9]）、TCP 拥塞控制（tcp_congestion_ops）、HID 设备处理（hid_bpf_ops），以及最近的 page cache 淘汰策略（cache_ext [1]）。这些工作遵循一个共同模式：找到一个策略密集的子系统，其中"正确"的算法高度依赖于负载特征、硬件配置或部署环境；将策略决策抽取为一组定义良好的回调接口；然后允许用户态编写的 eBPF 程序在 BPF verifier 的安全保证下实现这些回调。最终效果是运维人员、应用开发者甚至自动化 agent 都可以在不重新编译内核或重启的前提下部署、热替换和回滚子系统策略。

这一趋势改变了系统研究中"什么算贡献"的标准。一篇提出单一新调度算法或新缓存算法并以内核补丁形式实现的论文，对程序委员会的吸引力正在下降，因为可扩展基础设施已经让实践者可以自行部署这类算法。相反，真正有意义的开放问题已经上移：设计扩展接口本身、在多策略共存时提供隔离与组合保证、执行策略作者无法绕过的资源预算、以及构建让策略能够被生成、验证和编排的工具链。以下各节梳理各子系统的现有工作，并识别仍然存在实质性空白的方向。

## 2. 已有工作

在描述开放方向之前，有必要精确地梳理约束这些方向的已有工作。许多看似自然的"eBPF + 子系统 X"想法已经在顶级会议上被探索过。本节按贡献类型（而非按子系统）组织最相关的结果。

### 2.1 单子系统的可编程策略平面

sched_ext 框架已合入 Linux 6.12 主线，允许 BPF 程序通过挂载到 struct sched_ext_ops 回调来实现完整的 CFS 等价调度策略。LWN 将其定位为快速实验和按负载定制的调度平台 [8]。网络侧，BPF Qdisc（struct Qdisc_ops）使用户能够在不编写内核模块的情况下原型化报文调度算法 [9]。Syrup [4] 将这一思路推广，提出跨多个系统层（CPU、网络、存储）的用户定义调度策略统一接口，发表于 SOSP'21。

在存储侧，cache_ext [1] 是最直接相关的前驱工作。该系统发表于 SOSP'25，为 Linux page cache 引入了基于 BPF 的扩展接口，允许应用指定自定义的淘汰、插入和提升策略。其核心设计目标是多租户支持：不同应用可以在同一台机器上安装不同策略而不互相干扰，同时仍然共享物理 page cache。FetchBPF [2] 发表于 ATC'24，采用类似方法处理预取问题，通过 Linux readahead 路径中的 eBPF hook 实现可定制的预取策略。P2Cache 和 PageFlex 等系统探索了相邻的设计空间。

### 2.2 内核态执行与存储函数下沉

XRP [3] 发表于 OSDI'22，证明了存储密集型操作（B-tree 查找、日志扫描）可以表达为 BPF 程序并完全在内核的 NVMe 驱动中执行，从而消除反复的用户态-内核态切换。性能提升显著，但论文也记录了一个重要的副作用：在快速存储设备上，高频 I/O completion 中断会抢占同机部署的计算密集型进程的 CPU 时间，将其吞吐量降低到公平份额的仅 34%。作者明确将这一中断驱动的不公平问题留作 future work。Delilah [6] 将下沉思路进一步延伸，在计算存储设备的嵌入式处理器上运行 eBPF 程序，验证了可行性，但未涉及多租户隔离或宿主机与设备执行之间的语义等价性。

### 2.3 I/O Completion 与事件循环的可编程性

I/O completion 路径正在获得越来越多的关注。2019 年，Hou Tao 发布了一组 RFC 补丁，提议使用 eBPF 将 block I/O completion 处理引导到指定 CPU 上执行，类似于网络栈中的 Receive Packet Steering (RPS) [13]。更近的进展是，内核邮件列表上出现了 BPF 控制 io_uring 的补丁系列 [12]，目标是允许通过 io_uring struct_ops 挂载的 BPF 程序覆盖标准 io_uring_enter 的执行模型。声明的用例包括更智能的 polling 策略、细粒度 batching 和自定义事件循环逻辑。这项工作仍在开发中，但正在快速收敛。

### 2.4 策略编排与生命周期管理

NetEdit [14] 发表于 SIGCOMM'24（Meta），解决了在集群范围内部署多个 eBPF 程序时的运维挑战。它提供了一个编排平台，处理基于 eBPF 的网络调优特性的生命周期（部署、测试、回滚、监控）。作者指出其引入的解耦原则并非网络特有，也可以应用于存储和调度领域的 eBPF 程序。在存储侧，cache_ext [1] 将每应用策略隔离作为一等设计约束，确保一个应用的缓存策略不会降低另一个应用的性能。

### 2.5 DSL 与基于 LLM 的策略生成

SimpleBPF [5] 发表于 2025 年 eBPF Workshop，将领域特定语言与基于 LLM 的代码生成和基于 SMT（Z3）的等价性检查相结合，产出对 verifier 友好的 eBPF 程序。这代表了一个更广泛的趋势：随着可编程扩展点数量增长，为每个扩展点编写正确 BPF 程序的成本成为瓶颈，自动生成变得有吸引力。SchedCP [15] 更进一步，提出一个 LLM agent 框架，自动在 sched_ext 上生成和部署 eBPF 调度策略，集成了负载分析、策略仓库和执行验证器以实现安全部署。相关系统 "An Expert in Residence"（NeurIPS'25 ML4Sys workshop）使用在线 LLM agent 调节 Linux CFS 超参数，强调事务化的 apply-commit-revert 语义和宿主机中介的审批门控，以保障生产安全。

### 2.6 Block 层的部分可扩展性

Linux block 层（blk-mq）支持可插拔的 I/O 调度器（mq-deadline、kyber、bfq、none），但它们以内核模块形式实现，编译时依赖内部 API，而非安全的、可热替换的 BPF 程序 [10]。Tejun Heo 的 iocost 控制器中包含了对未来支持 BPF 自定义成本函数的讨论 [11]，但其目标是 I/O 成本模型而非 dispatch/scheduling 策略本身。目前没有已合入或广泛流通的补丁系列为 blk-mq 提供 sched_ext 的等价物。

## 3. 开放方向

以下方向代表了基于上述梳理尚未被现有工作填补的空白。每个方向从技术问题、现有系统为何未能解决、以及所需贡献形态三个角度进行描述。

### 方向 A：block I/O 调度的 BPF 扩展层

Linux 中的 block I/O 调度子系统是最后几个尚未具备 BPF 扩展接口的策略密集型内核子系统之一。sched_ext 已经使 CPU 调度可编程，cache_ext 对 page cache 淘汰做了同样的事情，但 blk-mq 的 dispatch 路径仍然要求策略作者编写内核模块或修改内核源码。这一空白之所以重要，是因为"正确"的 block 调度策略取决于跨部署甚至在单一部署内随时间变化的多种因素：延迟敏感的前台 I/O 与吞吐导向的后台 I/O（如 LSM-tree compaction、文件系统垃圾回收）的混合比例，NVMe 硬件队列数量，共租户模型，以及 fairness 与 tail latency 之间期望的权衡。

这一方向的系统将为 blk-mq 调度路径定义 struct_ops 风格的接口，允许 BPF 程序实现请求排序、合并和 dispatch 决策。与简单地"将 sched_ext 移植到 block"相比，其困难的技术挑战包括：现代 NVMe 设备的多队列拓扑，意味着调度器必须推理队列级并行性而非单一运行队列；需要每租户隔离，使一个租户的调度策略不能饿死另一个租户的 I/O；以及与 I/O 成本模型（iocost/blkcg）的交互，该模型基于带宽和 IOPS 预算约束 dispatch 决策。评估需要证明 BPF 定义的策略能够在真实多租户负载下同时改善 p99 和 p999 延迟、维持吞吐量并执行 fairness，同时保持扩展机制自身的开销可控。

主要的 novelty 风险在于评审可能将其视为 sched_ext 模式的直接搬运。抗辩必须建立在 block I/O 路径中不出现于 CPU 调度的特定技术困难之上，尤其是多队列结构以及与基于 cgroup 的 I/O 控制的交互。

需要对标的已有工作：sched_ext [8], cache_ext [1], Qdisc_ops [9], blk-mq 文档 [10], iocost [11]。

### 方向 B：可编程的 I/O completion 治理层

I/O completion 路径——当存储设备发出请求完成信号时执行的代码——正在成为快速 NVMe 设备上的关键性能瓶颈。内核目前提供一组固定的 completion 机制：中断驱动的 completion、混合 polling（io_uring IORING_SETUP_SQPOLL）和手动 polling。这些机制的选择在设备或队列粒度上进行，无法根据负载特征、延迟目标或共租户约束动态调整。

这一方向的系统将通过在关键决策点暴露可挂载 BPF 的回调来使 completion 路径可编程：是 poll 还是等待中断，在唤醒消费者之前批量收割多少 completion，由哪个 CPU 处理给定的 completion，以及如何在租户之间优先级化 completion。技术难点在于这些回调在 I/O 栈的最热路径上执行（通常在中断或 softirq 上下文中），因此扩展机制在常见情况下必须具有近零开销，且不能引入优先级反转或无界延迟。

然而，这一方向面临显著的 novelty 风险。BPF 控制 io_uring 的补丁系列 [12] 正在收敛于一个相关设计，允许 BPF 程序定制 io_uring 事件循环（包括 polling 行为）。Hou Tao 2019 年的 RFC [13] 展示了基于 BPF 的 block 层 completion steering。要与这些工作区分，该方向的论文需要超越可编程性本身，提供治理能力：可执行的中断处理时间预算、多租户竞争下 tail latency 的可证明边界、以及策略行为异常时的安全回滚语义。这自然引向与方向 C 的结合。

需要对标的已有工作：BPF 控制 io_uring [12], block completion steer RFC [13], XRP 的中断公平性讨论 [3]。

### 方向 C：租户感知的中断与 completion 预算

现代快速存储设备（NVMe SSD、optane 级介质）产生 I/O completion 中断的频率足以主导处理这些中断的核心的 CPU 利用率。Linux cgroup 子系统为 I/O 提供带宽和 IOPS 限制，为计算提供 CPU 时间限制，但它不对租户 I/O 触发的中断处理程序和 softirq 所消耗的 CPU 时间进行记账。这造成了一个资源模型缺口：执行高频随机 I/O 的租户可以通过触发中断风暴来有效窃取同机部署租户的 CPU 时间，即使其 cgroup I/O 带宽限制未被超出。XRP [3] 具体地记录了这一问题，表明与 I/O 密集型进程同机部署的计算密集型进程由于中断处理开销仅获得其公平 CPU 份额的 34%，并将该问题明确留作 future work。

这一方向的系统将通过引入中断预算抽象来弥合这一缺口：每个租户（或服务级别目标）被分配一个中断/softirq CPU 时间预算，内核通过动态调整 completion 机制（在中断模式和 polling 模式之间切换、调整中断合并参数、将 completion 引导到指定核心、更积极地批量化 completion）来执行这一预算，使每个租户保持在其配额内。这些调整的策略逻辑将表达为 BPF 程序，允许运维人员定制延迟与 CPU 效率之间的权衡，但执行机制和预算记账由内核提供且不能被 BPF 策略绕过。

关键评估需要证明三件事：（1）没有预算时，真实多租户负载由于中断开销表现出严重且不可预测的公平性违规；（2）有预算时，公平性得以恢复，同时对 I/O 延迟和吞吐量的影响是有界且可配置的；（3）机制自身的开销（预算跟踪、模式切换）足够小以适合实际使用。分析性或实验性的最坏情况开销上界将显著增强贡献的力度。

这一方向在本文梳理的候选方向中 novelty 风险最低，因为没有现有系统提供可执行的、每租户的中断预算。该缺口是真实的，被一篇顶级会议论文所记录，并且影响生产系统。主要的实现挑战是在中断、softirq 和 polling 路径之间工程化预算执行，而不引入过高开销或破坏现有内核抽象。

需要对标的已有工作：XRP [3]（记录了问题并留作 open），iocost [11]（I/O 带宽预算但非中断 CPU 预算），block completion steer RFC [13]（CPU 亲和性但非预算），cgroup v2 CPU 与 I/O 控制器。

### 方向 D：跨子系统的策略组合与稳定性

随着 BPF 扩展点在内核子系统中不断增殖，一类新问题浮现：当多个 BPF 策略——可能由不同团队编写、面向不同子系统——同时活跃时，会发生什么？一个 page cache 淘汰策略（cache_ext）可能与一个 block 调度策略（方向 A）和一个 CPU 调度策略（sched_ext）产生其作者都未预料到的交互。例如，一个激进回收页面的缓存淘汰策略可能触发 writeback I/O，而这与一个为读密集型负载优化的 block 调度策略交互不良，由此产生的中断负载又与 CPU 调度策略的延迟目标相冲突。这些跨子系统反馈回路不是假想的，它们是繁忙多租户服务器的正常运行状态。

NetEdit [14] 为网络 BPF 程序解决了这一问题的运维方面（部署排序、测试、回滚），但不提供关于策略交互的语义保证。cache_ext [1] 在 page cache 子系统内执行隔离，但不推理与其他子系统中策略的交互。目前没有现有系统提供检测或防止跨子系统策略冲突的框架。

这一方向的系统将提供三项能力：一个组合模型，定义多个 BPF 策略跨子系统活跃时的执行顺序、状态共享和冲突解决规则；稳定性守卫，检测策略之间的反馈回路或振荡行为（例如一个缓存策略和一个 block 调度器交替触发彼此的最坏情况行为）；以及一个资源记账模型，将所有活跃策略的聚合开销归因到特定租户，防止一个租户的策略集合降低整体系统性能。贡献将在系统架构和形式化或半形式化保证的层面，而非单一新算法。

novelty 风险中等：熟悉 NetEdit 的评审可能将其视为编排方法向多子系统的扩展。抗辩必须证明跨子系统组合引入了质量上不同的问题（反馈回路、涌现性不稳定），这些问题不能通过对每个子系统独立应用单子系统编排技术来解决。

需要对标的已有工作：NetEdit [14], cache_ext 隔离模型 [1], Syrup 跨层调度 [4], sched_ext [8]。

### 方向 E：宿主机与设备之间的可验证代码迁移

在嵌入式处理器上执行 eBPF 程序的计算存储设备已由 Delilah [6] 所展示，但其编程模型假设单租户、单版本部署，程序由人工编写和加载。随着计算存储走向多租户且程序变得更复杂（或由 LLM 生成），出现了三个 Delilah 未解决的问题：确保设备上运行的程序与宿主机上的参考实现具有相同的可观察行为；在共享设备上支持多个租户并隔离它们的下沉程序；以及在不中断正在进行的 I/O 的情况下演进程序（升级、回滚）。

这一方向的系统将提供一个宿主机-设备代码迁移框架，包含三个组件：一条编译流水线，从同一源码产出宿主机端参考实现和设备端变体，附带机器可检验的证明（或通过差分测试生成的全面测试套件），保证两者在程序类型范围内的所有输入上语义等价；设备上的多租户执行环境，在内存、计算预算和 I/O 访问方面隔离不同租户的程序；以及一个迁移协议，可以透明地在宿主机和设备之间双向移动执行而不丢失正在进行的状态，实现零停机升级和设备过载时的优雅降级。

这一方向比其他方向更具探索性，且依赖于尚未广泛可用的硬件能力。它更适合重视前瞻性架构的会议（OSDI、ASPLOS），而非强调在生产硬件上进行评估的会议。

需要对标的已有工作：Delilah [6], XRP 内核态执行 [3], BPF verifier 与 JIT 基础设施 [7]。

## 4. 推荐的方向组合

上述方向并非互斥，在若干情况下组合后更强。以下组合按 novelty claim 的估计强度排序。

最强的组合是 A+C：block I/O 调度的 BPF 扩展层结合租户感知的中断预算。这一组合解决两个不同但互补的缺口。方向 A 提供可编程性（运维人员可以部署自定义 block 调度策略），方向 C 提供治理能力（内核执行任何策略都无法绕过的中断 CPU 预算）。两者结合使得 claim 难以被评审简化为"又一个 eBPF hook"或"又一个资源控制器"：系统同时使 block I/O 调度可编程，并使 I/O 的副作用（中断 CPU 消耗）可记账。评估将展示在混合前后台 I/O 的多租户 NVMe 环境中，组合系统对 tail latency 和 fairness 的改善超出单独的可编程调度或单独的中断预算所能达到的效果。这一组合直接消化了 XRP [3] 留下的 open gap，同时填补了 cache_ext [1] 和 sched_ext [8] 已在各自子系统填补的 block 层可扩展性空白。

第二个组合是 B+C：可编程的 I/O completion 治理结合中断预算。这将可编程性从 block 调度路径转移到 completion 路径，如果 BPF 控制 io_uring 的工作 [12] 未扩展到覆盖 block 层 completion，则可能是更好的选择。与 io_uring 工作的关键区分在于治理层面：io_uring BPF struct_ops 赋予应用更灵活的事件循环，而 B+C 赋予运维人员对 completion 路径的可执行多租户隔离。风险在于 io_uring 的工作可能扩展并覆盖部分相同领域。

方向 C 独立成文也是可行的。中断预算问题动机充分（XRP 的明确 future work 呼吁），技术上有挑战（需要修改中断处理、softirq 处理和 polling 路径），实践中也重要（影响任何在快速存储上的多租户部署）。独立 C 论文的主要顾虑是范围：评审可能希望看到预算机制如何与可编程策略集成（即他们可能推动 A+C 或 B+C 方向）。

## 5. LLM Agent 作为需求放大器的角色

自动生成和部署内核策略的 LLM agent 的出现，为可编程、可治理的操作系统子系统的动机增添了新维度。SchedCP [15] 展示了一个从负载描述生成 sched_ext BPF 策略的 agent，"An Expert in Residence" 系统（NeurIPS'25 ML4Sys workshop）展示了一个以事务语义在线调节 Linux CFS 参数的 agent。两个系统都强调了安全基础设施的必要性：执行验证器、审批门控和回滚机制。

这些 agent 放大了对方向 C 和 D 中描述的治理机制的需求。当人类运维人员部署 BPF 策略时，通常是在仔细测试后且完全理解策略行为的前提下进行。当 LLM agent 作为自动化优化循环的一部分部署策略时，策略部署频率增加数个数量级，策略可能不那么被充分理解，而不良策略的后果（tail latency 飙升、fairness 违规、系统不稳定）必须被自动遏制而非依赖人工干预。这使得可执行预算（方向 C）、组合守卫（方向 D）和安全回滚语义不仅是理想特性，而是可编程 OS 范式规模化发展的必要条件。

这一观察可以作为追求上述任何方向的论文的额外动机，但它不足以作为独立贡献：novelty 必须建立在技术机制之上，而非建立在"agent 需要它们"这一观察之上。

## 6. Novelty 风险评估总结

方向 C（租户感知的中断预算）承载的 novelty 风险最低。它解决了一个具体的、被量化的问题，而该问题被一篇顶级会议论文（XRP [3]）明确留作 open。没有现有系统提供可执行的每租户中断 CPU 预算，且实现需要非平凡的内核修改，远超在现有 hook 上挂载一个 BPF 程序。

方向 A（block I/O 调度扩展层）承载中等风险。struct_ops 可扩展性模式已经成熟，评审会问 block I/O 路径比 CPU 调度或 page cache 淘汰难在哪里。答案必须扎根于多队列 NVMe dispatch 和 cgroup I/O 控制集成的具体技术挑战。

方向 B（completion 可编程性）作为独立贡献承载最高风险，因为 BPF 控制 io_uring [12] 正在内核社区积极开发。当与方向 C 的治理机制结合时，它变得可行。

方向 D（跨子系统组合）作为独立贡献承载中等偏高风险。NetEdit [14] 已经为网络建立了编排平台叙事，评审需要被说服跨子系统组合比单子系统编排在本质上更困难。

方向 E（可验证的代码迁移）最具探索性，依赖于硬件的可用性，是一个更长期的布局。

## 参考文献

[1] cache_ext: Customizing the Page Cache with eBPF. SOSP 2025.
    https://www.asafcidon.com/uploads/5/9/7/0/59701649/cache_ext.pdf
    为 Linux page cache 策略引入 BPF 扩展接口。核心设计目标是多租户隔离：不同应用安装不同的
    淘汰/提升策略而不互相干扰，同时共享物理页面。

[2] FetchBPF: Customizable Prefetching Policies in Linux with eBPF. ATC 2024.
    https://www.usenix.org/system/files/atc24-cao.pdf
    在 readahead 路径中通过 BPF hook 实现应用特定的预取策略。

[3] XRP: In-Kernel Storage Functions with eBPF. OSDI 2022.
    https://www.usenix.org/system/files/osdi22-zhong_1.pdf
    将存储操作（B-tree 查找）表达为 BPF 程序在 NVMe 驱动中执行，消除用户态-内核态切换。
    记录了快速设备上高频 I/O 中断将同机计算密集型进程的 CPU 份额降低到公平值的 34%；
    该问题明确留作 future work。

[4] Syrup: User-Defined Scheduling Across the Stack. SOSP 2021.
    https://www.scs.stanford.edu/~dm/home/papers/kaffes%3Asyrup.pdf
    跨 CPU、网络和存储的用户定义调度策略统一接口。

[5] SimpleBPF: Offloading the Tedious Task of Writing eBPF Programs. eBPF Workshop 2025.
    https://xzhu27.me/papers/simplebpf-ebpf2025.pdf
    DSL + LLM 代码生成 + SMT（Z3）等价性检查，产出 BPF 程序。

[6] Delilah: eBPF-offload on Computational Storage. 2023.
    https://www.researchgate.net/publication/370818368
    展示了在计算存储设备处理器上运行 eBPF 程序的可行性。

[7] BPF struct_ops 文档. eBPF Docs.
    https://docs.ebpf.io/linux/program-type/BPF_PROG_TYPE_STRUCT_OPS/
    覆盖 tcp_congestion_ops, hid_bpf_ops, sched_ext_ops, Qdisc_ops。

[8] What's scheduled for sched_ext. LWN.
    https://lwn.net/Articles/974387/
    将 sched_ext 定位为快速调度实验和按负载定制的平台。已合入 Linux 6.12。

[9] BPF Qdisc struct_ops. eBPF Docs.
    https://docs.ebpf.io/linux/program-type/BPF_PROG_TYPE_STRUCT_OPS/Qdisc_ops/
    允许将报文调度算法原型化为 BPF 程序。

[10] Multi-Queue Block IO Queueing Mechanism (blk-mq). 内核文档.
     https://docs.kernel.org/block/blk-mq.html
     可插拔 I/O 调度器（mq-deadline, kyber, bfq, none）以内核模块实现，
     而非可热替换的 BPF 程序。

[11] IO cost model based work-conserving proportional controller. LWN.
     https://lwn.net/Articles/791175/
     Tejun Heo 的 iocost 控制器；包含对未来支持 BPF 自定义成本函数的讨论，
     目标是成本模型而非调度器本身。

[12] BPF controlled io_uring. LWN, 2025.
     https://lwn.net/Articles/1059915/
     通过 io_uring struct_ops 由 BPF 控制覆盖 io_uring_enter 执行的补丁系列。
     用例包括自定义 polling 和事件循环逻辑。

[13] Block: use eBPF to redirect IO completion. LWN, 2019.
     https://lwn.net/Articles/802234/
     Hou Tao 的 RFC：类比网络 RPS，使用 eBPF 选择 block I/O completion 处理的 CPU。

[14] NetEdit: An Orchestration Platform for eBPF Network Functions at Scale. SIGCOMM 2024 (Meta).
     https://cs.stanford.edu/~keithw/sigcomm2024/sigcomm24-final159-acmpaginated.pdf
     集群范围 eBPF 网络调优的生命周期管理（部署、测试、回滚、监控）。
     作者指出该方法可推广到网络之外的领域。

[15] SchedCP: Towards Agentic OS -- An LLM Agent Framework for Linux Schedulers. arXiv, 2025.
     https://arxiv.org/html/2509.01245v2
     LLM agent 生成和部署 sched_ext BPF 调度策略；集成负载分析、策略仓库和执行验证器。
