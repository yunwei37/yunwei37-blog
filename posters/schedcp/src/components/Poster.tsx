import React from 'react';
import { Document, Page, View, Text, Image } from '@react-pdf/renderer';
import { styles, PAGE_WIDTH, PAGE_HEIGHT, colors } from '../styles';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Image paths
const ASSETS_DIR = path.join(__dirname, '..', '..', 'assets');
const archImage = path.join(ASSETS_DIR, 'arch-schedcp.png');
const linuxBuildImage = path.join(ASSETS_DIR, 'linux-build-results.png');
const schbenchImage = path.join(ASSETS_DIR, 'schbench-results.png');
const schedulerCompImage = path.join(ASSETS_DIR, 'scheduler-comparison.png');

// Bullet item component
const BulletItem: React.FC<{ children: React.ReactNode; small?: boolean }> = ({ children, small = false }) => (
  <View style={styles.bulletItem}>
    <Text style={[styles.bullet, small && { fontSize: 20 }]}>•</Text>
    <Text style={[styles.bulletText, small && { fontSize: 20 }]}>{children}</Text>
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
        <Text style={styles.title}>Towards Agentic OS: An LLM Agent Framework for Linux Schedulers</Text>
        <Text style={styles.subtitle}>SchedCP: Autonomous, Safe, and Efficient OS Optimization</Text>
        <Text style={styles.authors}>
          Yusheng Zheng¹, Yanpeng Hu², Wei Zhang³, Andi Quinn¹
        </Text>
        <Text style={styles.affiliation}>
          ¹UC Santa Cruz  •  ²ShanghaiTech University  •  ³University of Connecticut
        </Text>
        <Text style={[styles.affiliation, { marginTop: 6, fontWeight: 'bold' }]}>
          MLforSystems Workshop @ NeurIPS 2025 (Spotlight)
        </Text>
      </View>

      {/* Main Content - Two Columns */}
      <View style={styles.content}>
        {/* Left Column */}
        <View style={styles.column}>
          {/* Motivation */}
          <Section title="Can LLM Agents fully automatically optimize OS?" color={colors.secondary}>
            <View style={styles.highlightBox}>
              <Text style={styles.highlightText}>The Problem</Text>
            </View>

            <View style={styles.bulletList}>
              <BulletItem>
                Semantic Gap: Schedulers fail to understand application needs (latency vs throughputs, SLOs)
              </BulletItem>
              <BulletItem>
                Knowledge Gap: Developers lack workload insight; users lack kernel expertise. Kernel programming is hard, limiting innovation.
              </BulletItem>
            </View>

            <View style={[styles.highlightBox, { marginTop: 12 }]}>
              <Text style={styles.highlightText}>Current Solutions Fall Short</Text>
            </View>

            <View style={styles.bulletList}>
              <BulletItem>
                Traditional RL-based: Require per-workload training and human-specific SLOs
              </BulletItem>
              <BulletItem>
                Naïve LLM/Agents: Fixed pipeline needing human guide, unsafe (can crash system), inefficient ($6, 33 min/run), may reduce performance
              </BulletItem>
            </View>
          </Section>

          {/* Key Insight */}
          <Section title="Our Insight: Decouple Reasoning from Execution" color={colors.accent}>
            <Text style={styles.bodyText}>
              Separate the AI's role of reasoning ("what and how to optimize") from the system's role of execution ("how to observe and act"). The system remains safe and useful when AI Agent gets better.
            </Text>

            <View style={styles.twoColumn}>
              <View style={styles.halfColumn}>
                <Text style={[styles.subHeading, { color: colors.secondary }]}>
                  1. Goal-Inference
                </Text>
                <Text style={styles.bodyTextSmall}>
                  Uses tools to analyze workload intent and structure, and system environments
                </Text>
              </View>
              <View style={styles.halfColumn}>
                <Text style={[styles.subHeading, { color: colors.secondary }]}>
                  2. Policy-Synthesis
                </Text>
                <Text style={styles.bodyTextSmall}>
                  LLM config or generate safe, efficient eBPF schedulers from its analysis
                </Text>
              </View>
            </View>
          </Section>

          {/* Architecture */}
          <Section title="System Architecture: SchedCP & Multi-Agent" color={colors.primary}>
            <Image src={archImage} style={{ width: 900, height: 585, objectFit: 'contain', marginBottom: 10 }} />

            <View style={styles.twoColumn}>
              <View style={styles.halfColumn}>
                <Text style={styles.subHeading}>
                  Control Plane: a MCP server
                </Text>
                <View style={styles.bulletList}>
                  <BulletItem small>Workload Analysis Engine</BulletItem>
                  <BulletItem small>Policy Repository (eBPF templates for code generation)</BulletItem>
                  <BulletItem small>Execution Verifier (safety checks)</BulletItem>
                </View>
              </View>
              <View style={styles.halfColumn}>
                <Text style={styles.subHeading}>
                  sched-agent
                </Text>
                <View style={styles.bulletList}>
                  <BulletItem small>Observation → Monitoring</BulletItem>
                  <BulletItem small>Planning → Goal inference with Reasoning</BulletItem>
                  <BulletItem small>Execution → Policy deployment</BulletItem>
                  <BulletItem small>Learning → Refinement</BulletItem>
                </View>
              </View>
            </View>

            <View style={[styles.highlightBox, { marginTop: 10 }]}>
              <Text style={styles.bodyTextSmall}>
                Key idea: LLM Agent in control plane, not the data plane, manage OS like a human SRE without overhead
              </Text>
            </View>
          </Section>
        </View>

        {/* Right Column */}
        <View style={styles.column}>
          {/* Results */}
          <Section title="Experimental Results" color={colors.accent}>
            <View style={styles.resultsBox}>
              <ResultItem label="Kernel Build Speedup" value="1.79×" />
              <ResultItem label="P99 Latency Reduction" value="2.11×" />
              <ResultItem label="Throughput Improvement" value="1.60×" />
              <ResultItem label="Cost Reduction vs Naïve" value="13×" />
            </View>

            <Image src={linuxBuildImage} style={{ width: 700, objectFit: 'contain', marginTop: 10 }} />
            <Text style={styles.caption}>
              Linux Kernel Build: 1.79× faster
            </Text>

            <Image src={schbenchImage} style={{ width: 700, objectFit: 'contain', marginTop: 10 }} />
            <Text style={styles.caption}>
              Schbench: 2.11× lower P99
            </Text>

            <Image src={schedulerCompImage} style={{ width: 600, objectFit: 'contain', marginTop: 10 }} />
            <Text style={styles.caption}>
              Overall Scheduler Comparison
            </Text>
          </Section>

          {/* Conclusions & Next Steps */}
          <Section title="Conclusions & Next Steps" color={colors.accent}>
            <View style={[styles.highlightBox, { backgroundColor: '#ecfdf5', marginTop: 0 }]}>
              <Text style={[styles.bodyText, { textAlign: 'center' }]}>
                First framework for fully autonomous LLM-driven OS optimization
              </Text>
            </View>

            <Text style={[styles.subHeading, { marginTop: 12 }]}>
              Key Contributions
            </Text>
            <View style={styles.bulletList}>
              <BulletItem>Decoupled architecture separating AI reasoning from system execution</BulletItem>
              <BulletItem>Safe eBPF scheduler synthesis with multi-stage verification</BulletItem>
              <BulletItem>13× cost reduction while achieving 1.79× performance gains</BulletItem>
            </View>

            <Text style={[styles.subHeading, { marginTop: 12 }]}>
              Future Work
            </Text>
            <View style={styles.bulletList}>
              <BulletItem>Extend to I/O, memory, and power subsystems</BulletItem>
              <BulletItem>Standardized benchmark for agentic OS tasks (20-30 workloads)</BulletItem>
            </View>
          </Section>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View>
          <Text style={styles.footerText}>MLforSystems @ NeurIPS 2025</Text>
          <Text style={[styles.footerText, { fontSize: 20, marginTop: 3 }]}>
            arxiv.org/abs/2509.01245
          </Text>
        </View>
        <View>
          <Text style={styles.footerLink}>github.com/eunomia-bpf/schedcp</Text>
        </View>
      </View>
    </Page>
  </Document>
);

export default SchedCPPoster;
