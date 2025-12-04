# RQ1: SLO Improvement Results

## What SLO improvement do we buy given the agents?

| Workload | Metric | Baseline | Best | Improvement |
|----------|--------|----------|-------|-------------|
| vllm qwen3 kvcache offload with UVM | Tokens/s | 149.6 | 183.3 | 1.23x |
| llama.cpp GPT-OSS-120b moe offload with UVM | Tokens/s | 7.7 | 86.9 | 11.28x |
| pytorch GNN oversubscription | Epoch Time | 71.0s | 27.4s | 2.59x |
| faiss add UVM | Time | 68.4s | 49.3s | 1.39x |
| faiss search UVM | Time | 56.5s | 51.4s | 1.10x |
| kernel build (tiny config) | Time | 12s | 6.7s | 1.79x |
| LLVM build | Time | 340s | 243s | 1.40x |
| xz/gzip | Throughput | 45 MB/s | 56 MB/s | 1.24x |
| ffmpeg | FPS | 120 fps | 151 fps | 1.26x |
| schbench | P99 Latency | 156μs | 74μs | 2.11x |
| hackbench | Time | 2.8s | 2.0s | 1.40x |
| context-switch | Latency | 4.2μs | 3.0μs | 1.40x |
| nginx+wrk | RPS | 45K | 51K | 1.13x |
| Redis+memtier | P99 Latency | 2.1ms | 1.4ms | 1.50x |
| rocksdb | Ops/s | 125K | 147K | 1.18x |
| SQLite queries | QPS | 8.5K | 9.9K | 1.16x |
| clickhouse | Query Time | 2.4s | 1.9s | 1.26x |

*Preliminary results with Claude Sonnet 4.5*
