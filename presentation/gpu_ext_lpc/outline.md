# LPC 2025 演讲大纲：Extending eBPF to GPU Device and Driver Contexts

## 演讲信息
- **会议**: Linux Plumbers Conference 2025 - eBPF Track
- **时长**: 30分钟
- **演讲者**: Yusheng Zheng, Tong Yu

---

## 整体结构（约30页）

### 第一部分：高层故事（6页）

#### 页1：封面
- 标题：Extending eBPF to GPU Device and Driver Contexts
- 演讲者、社区信息
- GitHub链接

#### 页2：GPU软件栈架构
- **三层架构图**：
  - **用户空间**（Applications & Runtimes）
    - 高层框架：PyTorch、vLLM、TensorRT等
    - 运行时：CUDA Runtime、cuDNN
    - 通过ioctl/mmap与驱动通信
    - 包含丰富语义信息（网络结构、延迟约束）

  - **内核驱动层**（Kernel Driver）
    - GPU的"OS组件"：管理MMU、中断、调度
    - 控制特权硬件机制
    - 当前是**one-size-fits-all**：
      - LRU页淘汰
      - 轮询调度
      - 固定预取策略

  - **设备端**（Device Execution）
    - GPU kernel：用户定义的计算代码
    - 厂商固件：专有、闭源
    - 硬件调度器：warp粒度管理
    - 对host完全**不透明**

- **关键观察**：驱动层是唯一能看到所有应用、控制硬件机制的位置

#### 页3：GPU资源管理的挑战

- **挑战1：GPU内存有限，需要offload**
  - GPU显存昂贵且容量有限（如RTX 5090: 32GB）
  - 大模型经常超过显存：
    - LLM KV-cache：随序列长度线性增长
    - MoE Expert：GPT-OSS-120B有59GiB参数
    - GNN embedding：图规模可达TB级
  - UVM (Unified Virtual Memory) 允许透明offload到CPU内存
  - **问题**：默认LRU淘汰策略不适合所有workload
    - Prefill阶段：顺序stride访问 → 需要预取
    - Decode阶段：稀疏随机访问 → 需要LFU
    - 不同workload的最优策略完全不同

- **挑战2：多租户调度冲突**
  - 数据中心GPU被多个租户共享
  - 不同workload有冲突需求：
    - 延迟敏感(LC)：LLM推理，需要低P99延迟
    - 尽力而为(BE)：训练任务，追求高吞吐
  - 现有方案不足：
    - MIG（Multi-Instance GPU）：固定分区，无法动态调整
    - 时间片轮转：无优先级区分
    - 用户空间隔离：无法跨进程协调
  - **问题**：缺乏细粒度抢占和优先级机制

- **挑战3：工作负载多样性**
  - 不同workload有完全不同的访问模式（图示）：
    - Faiss Build：顺序扫描
    - Faiss Query：随机访问
    - LLM Prefill：周期性顺序
    - LLM Decode：稀疏随机
    - DNN Training：周期性块访问
  - SM负载不均衡：观测到127x的SM间负载差异
  - **没有一种策略适合所有workload**

#### 页4：现有方案的Tradeoff
- **用户空间运行时**（vLLM、Paella、XSched...）
  - 应用绑定，需要代码修改
  - 无跨租户可见性
  - 无法访问底层驱动机制（如page fault handler）

- **驱动层修改**（TimeGraph、Gdev、GPreempt...）
  - 有控制权但策略固定
  - 内核修改，难部署维护
  - 厂商特定，稳定性风险

- **设备Profiler**（NVBit、Neutrino、CUPTI...）
  - 可见性好但只读，无法执行策略
  - 与驱动层隔离，无法协调
  - 高开销（NVBit: 85%+）

- **Host eBPF**（sched_ext等）
  - 对CPU调度有效
  - 但GPU仍是黑盒：无法观察设备端事件
  - GPU驱动无可编程hook

#### 页5：洞察 - GPU需要可扩展的OS策略接口
- **GPU驱动层是正确的位置**：
  - 全局可见性：看到所有应用
  - 特权访问：可控制硬件机制
  - 透明：无需修改应用
  - 跨租户：可协调不同workload
- **受sched_ext启发**：CPU侧已证明这种模式有效

- **但是，Host eBPF不够**：
  - 设备内部执行状态不可见（warp divergence、SM负载）
  - 内存访问模式不可见
  - 无法在GPU kernel内部执行策略逻辑

#### 页6：我们的探索 - eBPF for GPU
- **两个方向**：
  - Part 1: gpu_ext（驱动扩展）- 扩展Linux GPU驱动的eBPF attach点
  - Part 2: Device eBPF（bpftime）- 在GPU设备上运行eBPF

- **Talk目标**：分享prototype、讨论接口设计、征求社区反馈

---

### 第二部分：gpu_ext - 驱动侧eBPF扩展（8页）

#### 页7：过渡页
- Part 1: gpu_ext
- Extending Linux GPU Driver with eBPF

#### 页8：挑战 - GPU驱动不是为此设计的
- 暴露底层机制有稳定性风险
- 需要窄、安全、可验证的接口
- GPU内存管理和调度机制复杂

#### 页9：gpu_ext架构
- 架构图
- 用户空间控制平面：标准eBPF工具链
- 内核验证器：扩展GPU特定struct_ops
- 驱动Hook：内存和调度attach点

#### 页10：内存管理接口
- 将GPU内存放置视为**可编程缓存**
- struct gdrv_mem_ops:
  - region_add：region创建
  - region_access：内存访问
  - region_remove：region淘汰
  - prefetch：预取机会
- kfuncs：重排淘汰列表
- 可实现：LRU、LFU、工作负载感知淘汰、stride预取等
- 内核在内存压力下保留最终权限

#### 页11：调度接口
- 控制GPU队列生命周期和优先级
- struct gdrv_sched_ops:
  - queue_create：设置优先级/时间片
  - queue_destroy：清理
- kfunc：gdrv_sched_preempt触发协作式抢占
- 策略可设置：队列优先级、时间片时长、runlist交错频率
- 用例：延迟敏感 vs 尽力而为区分、多租户公平、实时抢占

#### 页12：实现 - 扩展NVIDIA开源GPU模块
- **修改内容**：
  - UVM模块约100行插桩
  - page fault处理器hook
  - prefetch逻辑hook
  - TSG生命周期事件hook
  - 使用Linux eBPF验证器 + GPU特定struct_ops/kfunc via BTF

- **安全模型**：
  - handler返回决策，内核执行
  - 策略可重排淘汰列表
  - 内核保留最终权限
  - 不能损坏设备状态
  - 与sched_ext相同的信任模型

#### 页13：gpu_ext用例 - LLM Expert Offloading
- **Setup**：GPT-OSS-120B MoE (59 GiB) on RTX 5090 (32GB) - 1.84x过量订阅
- **eBPF策略洞察**：
  - Prefill：stride模式 → stride预取
  - Decode：时间局部性 → LFU淘汰
  - 页级粒度，非expert级
- **结果**：
  - 4.8x decode加速 vs 框架offload
  - 无需修改应用
  - 单独UVM比框架offload更差

#### 页14：gpu_ext用例 - 多租户调度 & 内存优先级
- **多租户调度**：
  - Setup：2 LC + 4 BE进程，计算密集
  - 策略：LC 1s时间片，BE 200μs时间片
  - 结果：LC P99延迟降低95%，方差降低99%

- **内存优先级区分**：
  - Setup：两个进程竞争GPU内存，UVM过量订阅
  - 关键洞察：内存密集workload需要内存策略，调度策略无效(<1%)
  - 结果：总完成时间改善55-92%

---

### 第三部分：Device eBPF - GPU设备端执行（8页）

#### 页15：过渡页
- Part 2: Device eBPF
- Running eBPF on GPU Device (bpftime)

#### 页16：GPU执行模型背景（给内核开发者）
- **什么是SIMT**：
  - 单指令多线程：同一条指令在多个线程上并行执行
  - 线程组织成Warp（32线程一组）
  - 同一Warp内线程同步执行相同指令
  - 不同分支 → 串行化（Divergence）

- **与CPU的关键差异**：
  | 特性 | CPU | GPU |
  |-----|-----|-----|
  | 线程数 | 几十个 | 数万个 |
  | 调度单位 | 单线程 | Warp (32线程) |
  | 分支处理 | 预测 | 串行化 |
  | 抢占 | 完整 | 有限 |

- **线程层次**：Thread → Warp (32) → Block → Grid → SM

#### 页17：Device eBPF能做什么
- 细粒度profiling：指令级
- 运行时适应：响应设备状态
- Block调度：跨SM work-stealing
- 内存hint：设备端prefetch触发
- 补充host侧策略

#### 页18：Device eBPF架构
- 架构图
- eBPF字节码：标准clang/LLVM工具链
- SIMT感知验证器：warp一致性检查
- GPU JIT后端：编译到PTX/SPIR-V

#### 页19：设备端Attach点
- struct gdev_mem_ops:
  - access：warp观察到内存访问
  - fence：内存fence点
- helper：gdev_mem_prefetch触发host处理器

- struct gdev_sched_ops:
  - enter/exit：worker block开始/结束
  - probe/retprobe：设备函数入口/出口
  - should_try_steal：work-stealing决策

- Attach点：kernel入口/出口、内存操作、线程开始/结束、函数边界

#### 页20：SIMT挑战 & 方案
- **CPU eBPF假设标量执行**：
  - 单线程执行模型
  - 分支是免费的
  - 内存访问是per-thread的

- **GPU SIMT不同**：
  - 32线程锁步执行（warp）
  - divergent分支 → 串行化
  - 非uniform内存 → 非合并访问
  - 设备上无隔离/恢复

- **安全问题**：
  - Warp Divergence：per-thread eBPF逻辑导致不同路径
  - 死锁风险：GPU范围barrier + divergent控制流

- **性能问题**：
  - 内存带宽不足：per-thread map访问消耗大量带宽
  - GPU内存带宽是稀缺资源，naive插桩并让每个 thread update 一次 map 会严重影响原kernel性能

- **方案**：Warp级执行 - 每个warp只执行一次eBPF程序，而不是每个线程都执行

#### 页21：实现 - bpftime GPU后端
- **Pipeline**：
  1. 标准eBPF字节码（clang）
  2. SIMT感知验证pass
  3. LLVM后端 → PTX/SPIR-V
  4. 动态二进制插桩
  5. 注入trampoline到GPU kernel

- **关键技术**：
  - 拦截CUDA运行时API
  - 用trampoline重写kernel PTX
  - 无需重编译
  - 无需重启应用

- **基于bpftime**：
  - 现有用户空间eBPF运行时
  - GPU JIT基础设施约10 KLOC
  - LLVM PTX后端约1 KLOC

#### 页22：Device eBPF用例
- **Block调度**：
  - Setup：GEMM workload，跨thread block负载不均
  - 三种策略：FixedWork、Greedy、LatencyBudget
  - 关键发现：没有单一策略占优，可编程性重要

- **低开销可观测性**：
  - kernelretsnoop：per-block时间戳，8% vs NVBit 85%
  - threadhist：负载不均检测，3% vs NVBit 87%
  - launchlate：kernel启动延迟，14% vs NVBit 93%
  - **3-10x更低开销**，因为warp-uniform执行

---

### 第四部分：协作与总结（8页）

#### 页23：过渡页
- Putting It Together
- Cross-Layer Coordination

#### 页24：跨层eBPF Map
- **问题**：
  - Host和device异步操作
  - 不同内存层次
  - 需要共享策略状态

- **方案：层次化Map**：
  - 逻辑：单一key-value存储
  - 物理：跨host DRAM、GPU全局内存、SM本地存储的分片

- **一致性模型**：
  - 松弛、最终一致性
  - GPU本地分片在同步点合并
  - 基于快照的聚合
  - 陈旧影响最优性，不影响正确性
  - 内存完整性由驱动/MMU保证

#### 页25：示例 - 协调内存策略
- 图示：Device eBPF观察访问模式 → 跨层Map → Host eBPF做淘汰/预取决策
- GPU设备端：
  - 检测prefill中的stride模式
  - 跟踪per-region访问频率
  - 调用gdev_mem_prefetch()预测region
- GPU驱动端：
  - 使用设备提供的访问计数
  - 实现LFU而非LRU
  - 通过kfunc重排淘汰列表

#### 页26：可移植性讨论
- **当前实现**：
  - NVIDIA开源GPU内核模块
  - CUDA运行时拦截
  - PTX代码生成

- **设计与Linux抽象对齐**：
  - Host侧：HMM / migrate_vma（AMD ROCm使用）、DRM scheduler的drm_sched_entity
  - Device侧：SPIR-V作为厂商中立字节码

- **可移植性需要**：
  - 厂商特定运行时支持
  - 每种GPU架构的硬件调优
  - 上游驱动修改（如果追求）

#### 页27：开放问题 & 讨论
- **接口设计**：
  - struct_ops是GPU的正确模型吗？
  - 缺少什么hook？
  - 如何处理厂商差异？

- **集成**：
  - 如何与现有eBPF工具集成？
  - 与CPU侧trace的关联？
  - 需要什么用户空间工具？

- **社区 & 上游**：
  - 有上游支持的兴趣吗？
  - 哪些部分值得上游？
  - 如何与GPU厂商合作？

- **用例**：
  - 什么workload最受益？
  - 多租户GPU集群？
  - 实时/延迟敏感场景？

#### 页28：挑战与经验
- **有效的**：
  - eBPF的安全模型可迁移
  - struct_ops提供干净接口
  - Warp级执行降低开销
  - 跨层Map实现协调

- **困难的**：
  - GPU驱动是复杂的怪兽
  - SIMT语义需要仔细处理
  - 厂商差异显著
  - 调试设备端eBPF很痛苦

- **经验**：
  1. 从窄开始：最小接口，后续扩展
  2. 安全优先：内核保留最终权限
  3. 匹配模型：不要对抗SIMT，拥抱它
  4. 松弛一致性OK：对于策略决策

#### 页29：Thank You & Q&A
- 链接：
  - bpftime: github.com/eunomia-bpf/bpftime
  - GPU examples: github.com/eunomia-bpf/bpftime/tree/master/example/gpu
- Questions & Discussion?

---

## 需要准备的图片

1. `/arch-gpu-ext.png` - gpu_ext架构图
2. `/arch-device-ebpf.png` - Device eBPF架构图
3. `/llama-expert-offload.png` - LLM expert offload结果图
4. `/scheduler-latency.png` - 多租户调度结果图
5. `/memory-priority.png` - 内存优先级结果图
6. `/clc-policies.png` - Block调度策略对比图

---

## 与学术论文的差异

| 方面 | 学术论文 | LPC演讲 |
|------|----------|---------|
| 开场 | 贡献列表、设计原则 | 实际问题、征求反馈 |
| 重点 | 系统设计、评估方法论 | 接口设计、社区集成 |
| 结尾 | 总结贡献 | 开放问题、讨论 |
| 风格 | 展示成果 | 探索性、讨论式 |

## 关键叙事点

1. **两个方向**：gpu_ext和Device eBPF分开讲，各自完整（设计→实现→用例）
2. **按论文方式讲高层故事**：GPU多样性 → 现有方案tradeoff → 驱动是正确位置 → 但Host eBPF不够 → 两个方向
3. **LPC风格收尾**：开放问题、征求反馈、讨论环节
4. **强调可编程性价值**：不同workload需要不同策略，没有银弹
