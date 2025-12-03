import React from 'react';
import { Document, Page, View, Text } from '@react-pdf/renderer';
import { styles, PAGE_WIDTH, PAGE_HEIGHT, colors } from '../styles';

// Bullet item component
const BulletItem: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={styles.bulletItem}>
    <Text style={styles.bullet}>•</Text>
    <Text style={styles.bulletText}>{children}</Text>
  </View>
);

// Section component
const Section: React.FC<{ title: string; children: React.ReactNode; color?: string }> = ({
  title,
  children,
  color = colors.secondary
}) => (
  <View style={[styles.section, { borderLeftColor: color }]}>
    <Text style={[styles.sectionTitle, { borderBottomColor: color }]}>{title}</Text>
    <View style={styles.sectionContent}>{children}</View>
  </View>
);

// Result item component
const ResultItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.resultItem}>
    <Text style={styles.resultLabel}>{label}</Text>
    <Text style={styles.resultValue}>{value}</Text>
  </View>
);

export const SchedCPPoster: React.FC = () => (
  <Document>
    <Page size={{ width: PAGE_WIDTH, height: PAGE_HEIGHT }} style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>SchedCP: Autonomous OS Optimization</Text>
        <Text style={styles.subtitle}>A Framework for LLM Agents to Safely Tune the Linux Scheduler</Text>
        <Text style={styles.authors}>Yusheng Zheng, Xiaochen Wang, Yiwei Yang</Text>
        <Text style={styles.affiliation}>
          UC Santa Cruz • MLforSystems @ NeurIPS 2025 Spotlight
        </Text>
      </View>

      {/* Main Content - Two Columns */}
      <View style={styles.content}>
        {/* Left Column */}
        <View style={styles.column}>
          {/* Motivation */}
          <Section title="Motivation" color={colors.secondary}>
            <Text style={{ fontSize: 22, marginBottom: 15, color: colors.text }}>
              Can LLM Agents fully automatically optimize OS? Start from schedulers.
            </Text>

            <View style={styles.highlightBox}>
              <Text style={styles.highlightText}>The Problem</Text>
            </View>

            <View style={styles.bulletList}>
              <BulletItem>
                Semantic Gap: Schedulers fail to understand application needs (latency vs throughput, SLOs)
              </BulletItem>
              <BulletItem>
                Knowledge Gap: Developers lack workload insight; users lack kernel expertise
              </BulletItem>
              <BulletItem>
                Kernel programming is hard, limiting innovation
              </BulletItem>
            </View>

            <View style={[styles.highlightBox, { marginTop: 20 }]}>
              <Text style={styles.highlightText}>Current Solutions Fall Short</Text>
            </View>

            <View style={styles.bulletList}>
              <BulletItem>
                Traditional RL-based: Require per-workload training and human-specific SLOs
              </BulletItem>
              <BulletItem>
                Naïve LLM/Agents: Fixed pipeline needing human guidance, unsafe (can crash system), inefficient ($6, 33 min/run)
              </BulletItem>
            </View>
          </Section>

          {/* Key Insight */}
          <Section title="Key Insight" color={colors.accent}>
            <View style={[styles.highlightBox, { backgroundColor: '#ecfdf5' }]}>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.primary, textAlign: 'center' }}>
                Decouple Reasoning from Execution in 2 Stages
              </Text>
            </View>

            <Text style={{ fontSize: 20, marginVertical: 15, color: colors.text, lineHeight: 1.5 }}>
              Separate the AI's role of reasoning ("what and how to optimize") from the system's role of execution ("how to observe and act"). The system remains safe and useful as AI Agent improves.
            </Text>

            <View style={styles.twoColumn}>
              <View style={styles.halfColumn}>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.secondary, marginBottom: 8 }}>
                  1. Goal-Inference
                </Text>
                <Text style={{ fontSize: 18, color: colors.text }}>
                  Uses tools to analyze workload intent, structure, and system environments
                </Text>
              </View>
              <View style={styles.halfColumn}>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.secondary, marginBottom: 8 }}>
                  2. Policy-Synthesis
                </Text>
                <Text style={{ fontSize: 18, color: colors.text }}>
                  LLM configures or generates safe, efficient eBPF schedulers from analysis
                </Text>
              </View>
            </View>
          </Section>

          {/* Architecture */}
          <Section title="System Architecture" color={colors.primary}>
            <View style={styles.twoColumn}>
              <View style={styles.halfColumn}>
                <Text style={{ fontSize: 22, fontWeight: 'bold', color: colors.primary, marginBottom: 10 }}>
                  Control Plane (MCP Server)
                </Text>
                <View style={styles.bulletList}>
                  <BulletItem>Workload Analysis Engine</BulletItem>
                  <BulletItem>Policy Repository (eBPF templates)</BulletItem>
                  <BulletItem>Execution Verifier (safety checks)</BulletItem>
                </View>
              </View>
              <View style={styles.halfColumn}>
                <Text style={{ fontSize: 22, fontWeight: 'bold', color: colors.primary, marginBottom: 10 }}>
                  Sched-Agent Loop
                </Text>
                <View style={styles.bulletList}>
                  <BulletItem>Observation → Monitoring</BulletItem>
                  <BulletItem>Planning → Goal inference</BulletItem>
                  <BulletItem>Execution → Policy deployment</BulletItem>
                  <BulletItem>Learning → Refinement</BulletItem>
                </View>
              </View>
            </View>

            <View style={[styles.highlightBox, { marginTop: 15 }]}>
              <Text style={{ fontSize: 20, color: colors.text, textAlign: 'center' }}>
                LLM Agent in control plane, not data plane — manage OS like a human SRE without overhead
              </Text>
            </View>
          </Section>
        </View>

        {/* Right Column */}
        <View style={styles.column}>
          {/* Results */}
          <Section title="Preliminary Results" color={colors.accent}>
            <Text style={{ fontSize: 20, marginBottom: 15, color: colors.text }}>
              Evaluated on Claude Code + Claude Opus 4
            </Text>

            <View style={styles.resultsBox}>
              <ResultItem label="Kernel Build Speedup" value="1.79×" />
              <ResultItem label="P99 Latency Reduction" value="2.11×" />
              <ResultItem label="Throughput Improvement" value="1.60×" />
              <ResultItem label="Cost Reduction vs Naïve Agents" value="13×" />
            </View>

            <View style={styles.diagramBox}>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.primary }}>
                Performance Comparison
              </Text>
              <Text style={[styles.diagramText, { marginTop: 10 }]}>
                [Benchmark charts: Linux Build, Schbench, Scheduler Comparison]
              </Text>
            </View>
          </Section>

          {/* Benchmark Framework */}
          <Section title="Benchmark Framework Design" color={colors.secondary}>
            <Text style={{ fontSize: 20, marginBottom: 10, color: colors.text }}>
              Evaluate LLM agent's ability to optimize OS behavior for diverse workloads under explicit SLOs and budgets
            </Text>

            <Text style={{ fontSize: 22, fontWeight: 'bold', color: colors.primary, marginTop: 15, marginBottom: 10 }}>
              Research Questions
            </Text>
            <View style={styles.bulletList}>
              <BulletItem>Can agents infer optimization goals from telemetry without being told the SLO?</BulletItem>
              <BulletItem>Can they maintain SLOs under drift with controller-grade stability?</BulletItem>
              <BulletItem>What improvement per token/second — scaling laws?</BulletItem>
            </View>

            <Text style={{ fontSize: 22, fontWeight: 'bold', color: colors.primary, marginTop: 15, marginBottom: 10 }}>
              Two-Phase Challenge
            </Text>
            <View style={styles.bulletList}>
              <BulletItem>Goal Inference: From traces/metrics/logs, infer bottlenecks & targets</BulletItem>
              <BulletItem>Policy Synthesis: Select/configure tools OR synthesize eBPF code</BulletItem>
            </View>
          </Section>

          {/* Workload Suite */}
          <Section title="Workload Suite (20-30 benchmarks)" color={colors.primary}>
            <View style={styles.twoColumn}>
              <View style={styles.halfColumn}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.secondary }}>CPU-bound</Text>
                <Text style={{ fontSize: 16, color: colors.text }}>kernel build, LLVM, xz/gzip, ffmpeg</Text>

                <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.secondary, marginTop: 10 }}>Latency-critical</Text>
                <Text style={{ fontSize: 16, color: colors.text }}>schbench, hackbench, context-switch</Text>

                <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.secondary, marginTop: 10 }}>Server</Text>
                <Text style={{ fontSize: 16, color: colors.text }}>nginx+wrk, Redis+memtier</Text>
              </View>
              <View style={styles.halfColumn}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.secondary }}>Data processing</Text>
                <Text style={{ fontSize: 16, color: colors.text }}>sort/join, SQLite queries</Text>

                <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.secondary, marginTop: 10 }}>Stress</Text>
                <Text style={{ fontSize: 16, color: colors.text }}>memory/CPU test suite</Text>

                <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.secondary, marginTop: 10 }}>GPU</Text>
                <Text style={{ fontSize: 16, color: colors.text }}>vllm, llama.cpp, pytorch</Text>
              </View>
            </View>

            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.accent, marginTop: 15, textAlign: 'center' }}>
              Each workload: clear SLOs + repeatable harness
            </Text>
          </Section>

          {/* Future Work */}
          <Section title="Next Steps" color={colors.accent}>
            <View style={styles.bulletList}>
              <BulletItem>Develop standardized benchmark framework for agentic tasks</BulletItem>
              <BulletItem>Extend to I/O, memory, power subsystems</BulletItem>
              <BulletItem>Compare across models: Claude Code, Codex, and others</BulletItem>
            </View>
          </Section>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View>
          <Text style={styles.footerText}>MLforSystems Workshop @ NeurIPS 2025</Text>
          <Text style={[styles.footerText, { fontSize: 16, marginTop: 5 }]}>
            Paper: arxiv.org/abs/2509.01245
          </Text>
        </View>
        <View>
          <Text style={styles.footerLink}>github.com/eunomia-bpf/schedcp</Text>
        </View>
        <View>
          <Text style={[styles.footerText, { fontSize: 16 }]}>
            SLO = Service Level Objective: measurable targets to ensure services meet customer expectations
          </Text>
        </View>
      </View>
    </Page>
  </Document>
);

export default SchedCPPoster;
