---
theme: academic
title: 'ACRFence: Preventing Semantic Rollback Attacks in Agent Checkpoint-Restore'
info: |
  ## ACRFence: Preventing Semantic Rollback Attacks in Agent Checkpoint-Restore
  CoDAIM 2026 Workshop
class: text-center
coverDate: CoDAIM 2026 Workshop
drawings:
  persist: false
transition: fade
mdc: true
layout: cover
colorSchema: light
---

<div class="text-center">

<div class="text-4xl leading-relaxed">ACRFence: Preventing Semantic Rollback Attacks in Agent Checkpoint-Restore</div>

<div class="mt-8 text-xl">
Yusheng Zheng¹, Yiwei Yang¹, Wei Zhang², Andi Quinn¹
</div>

<div class="text-sm opacity-80 mt-2">
¹UC Santa Cruz · ²University of Connecticut
</div>

</div>

<div class="abs-br m-4 mb-8 flex flex-col items-end gap-3">
  <div class="flex items-center gap-4">
    <img src="/ucsc-logo.png" class="h-10" alt="UC Santa Cruz" />
    <img src="/uconn-logo.png" class="h-10" alt="University of Connecticut" />
  </div>
</div>

---

# LLM Agents Are Taking Real-World Actions

## ...and frameworks let you rewind and retry

<div class="grid grid-cols-2 gap-8 text-lg mt-4">

<div class="border-l-4 border-blue-500 pl-4">

### LLM Agents Today

- Transfer money, provision cloud resources, delete data
- Interact with external services via **tool calls** (MCP, function calling)
- Frameworks: Claude Code, Cursor, LangGraph, OpenClaw, ...

</div>

<div class="border-l-4 border-orange-500 pl-4">

### Checkpoint-Restore

- Frameworks save agent state at checkpoints
- **Rewind** to earlier state and retry
- For error recovery, exploration, human-in-the-loop correction
- But: **cannot undo external side effects**

</div>

</div>

<div class="mt-6 p-3 rounded border-2 border-dashed border-red-400 text-lg text-center">
<strong>Key question:</strong> What happens to actions already performed on external services when an agent is restored?
</div>

---

# Motivating Example: Double Payment Attack

<div class="flex justify-center">
  <img src="/fig-sequence.png" class="rounded shadow-lg" style="max-height: 420px;" alt="Sequence diagram showing Action Replay attack" />
</div>

<div class="text-base mt-2 text-center opacity-80">
A malicious payee (Bob) controls an MCP service, triggers a crash after payment, and the restored agent re-transfers with a <strong>different reference ID</strong>.
</div>

---

# Why Does This Happen?

## Root Cause: LLM Non-determinism Breaks Duplicate Detection

<div class="grid grid-cols-2 gap-6 text-lg mt-2">

<div>

### The Broken Assumption

All existing protections assume **the caller sends identical requests on retry**:

- Unique request IDs (Stripe, IETF)
- Recorded nondeterministic values (Temporal)
- Deterministic orchestrator logic (Azure Durable Functions)

<div class="mt-3 p-2 bg-red-50 rounded border border-red-300">
<strong>LLM agents violate this assumption.</strong>
</div>

</div>

<div>

### Why LLMs Are Non-deterministic

Even at temperature=0:
- **GPU floating-point rounding** produces different token sequences across runs
- A restored agent generates **subtly different** requests
- Servers see new reference IDs and **accept as new transactions**


</div>

</div>

---

# This Is a Real Problem: 12 Frameworks Affected

<div class="text-2xl font-bold mb-4">
12 frameworks surveyed, 40+ issues reported, <span class="text-red-600">0</span> enforce exactly-once
</div>

<div class="text-lg">

| Framework | Key Finding |
|-----------|-------------|
| LangGraph | Tools re-fire on resume; maintainer says "architecturally difficult to fix" |
| Google ADK | Docs explicitly warn rewind cannot undo external effects |
| OpenClaw | Webhook replay (GHSA security advisory) |
| Claude Code | Tool re-fires after user approval |
| n8n | Retry causes repeated Stripe charges |
| *...and 7 more* | *CrewAI, AutoGen, OpenAI Agents, Cursor, OpenHands, Vercel AI, LiveKit* |

</div>

---

# Threat Model

<div class="text-lg mt-2">

**Goal:** Duplicate irreversible effects or reuse consumed credentials after checkpoint-restore.

**Knowledge:** Adversary knows the framework supports CR and the agent interacts with external services via tool calls.

</div>

<div class="mt-4">

| | <mdi-lightning-bolt class="text-red-500" /> **External attacker** | <mdi-account-alert class="text-purple-500" /> **Insider** |
|---|---|---|
| **Controls** | One service in agent's tool chain | Framework rewind feature |
| **Can do** | Trigger crash after irreversible action | Redirect agent after restore |
| **Cannot** | Modify agent or target service | Modify target service validation |

</div>

<div class="mt-4 text-lg">
<strong>Invariants:</strong> (1) No replay of irreversible effects across restores. (2) Consumed credentials must stay consumed.
</div>

---

# Attack 1: Action Replay

<div class="grid grid-cols-2 gap-5 text-lg mt-1">

<div>

<img src="/fig-sequence.png" class="rounded shadow" style="max-height: 320px;" />

</div>

<div>

### <mdi-lightning-bolt class="text-red-500" /> External attacker scenario

- Controls one MCP service in the agent's tool chain
- Triggers crash **after** irreversible action completes
- Framework auto-restores to checkpoint
- Agent re-executes with **different parameters**

<div class="mt-3 p-2 bg-green-50 rounded border border-green-300">
<strong>Experiment:</strong> 10/10 CR trials produced duplicates. 0/10 without checkpoint.
</div>

</div>

</div>

---

# Attack 2: Authority Resurrection

<div class="grid grid-cols-2 gap-5 text-base mt-1">

<div>

### Scenario

1. Employee asks agent to delete Alice's data (legit GDPR)
2. Agent obtains manager's **single-use approval token**
3. Agent executes deletion, token marked **consumed**
4. Employee uses **rewind** to restore to after approval
5. Agent holds token but has **no memory of using it**
6. Employee redirects: "delete Bob's data"
7. Stateless validation → **succeeds**

**Result:** Manager approved for **Alice**, but **Bob's** data also deleted. Same pattern documented in HashiCorp Vault (Issue #28378).

</div>

<div class="text-lg">

### <mdi-account-alert class="text-purple-500" /> Insider scenario

- Has access to framework's rewind feature
- Intentionally restores to prior checkpoint
- Redirects agent with **unauthorized actions**
- Uses previously obtained credentials

<div class="mt-3 p-2 bg-green-50 rounded border border-green-300">
<strong>Experiment:</strong> Stateless: 2/2 succeeded. Stateful: 0/2 (blocked).
</div>

</div>

</div>

---

# Mitigation: ACRFence

<div class="grid grid-cols-2 gap-5 text-lg mt-1">

<div>

### How It Works

ACRFence interposes at the **tool boundary**:

1. **Log** each irreversible tool call (context via **eBPF** or MCP proxy)
2. On restore, **analyzer LLM** compares new call against log
3. Distinguishes run-varying fields (UUIDs) from **intent** (amount, recipient)

### On Restore → Three outcomes

- **Equivalent** → replay recorded response
- **Different intent** → block, require **fork**
- **Consumed credentials** → inform agent

</div>

<div>

### Key Properties

<div class="border-l-4 border-blue-500 pl-4 mb-3">

**Framework-agnostic:** Context captured at OS level via eBPF, no framework modifications.

</div>

<div class="border-l-4 border-green-500 pl-4 mb-3">

**LLM-based comparison:** No manual tool schema annotation; adapts to new tools automatically.

</div>

<div class="border-l-4 border-purple-500 pl-4 mb-3">

**Restore-path only:** Zero overhead during normal execution.

</div>

<div class="border-l-4 border-gray-500 pl-4">

**Future work:** Implementation, analyzer accuracy evaluation, performance overhead measurement.

</div>

<div class="text-sm opacity-60 mt-2">
Powered by <a href="https://github.com/eunomia-bpf/agentsight">AgentSight</a> · github.com/eunomia-bpf/agentsight
</div>

</div>

</div>

---

# Related Work

<div class="grid grid-cols-2 gap-5 text-lg mt-1">

<div>

### What Exists

- **Output commit problem** (classic distributed systems): CR cannot undo external effects
- **Durable execution** (Temporal, Azure): assume deterministic callers
- **I/O tabling**: safe replay for deterministic programs
- **Idempotency protocols** (Stripe, IETF): assume identical retry requests

</div>

<div>

### What's Missing

- **Agent record-and-replay**: doesn't address irreversible external effects
- **Agent version control** (AgentGit): rollback for traces, not external state
- **Security frameworks** (Progent, AgentSpec, OWASP): ignore checkpoint-restore
- **TEE rollback protection**: assumes deterministic programs

</div>

</div>

<div class="mt-3 p-2 bg-red-50 rounded border border-red-300 text-lg text-center">
<strong>No prior work</strong> treats nondeterministic LLM re-synthesis after restore as a security attack surface.
</div>

---

# Summary

<div class="text-xl leading-relaxed mt-4">

- **New vulnerability class:** *Semantic rollback attacks* exploit LLM non-determinism after checkpoint-restore, silently bypassing duplicate-detection mechanisms

- **Two attack classes:** *Action Replay* (duplicate irreversible effects) and *Authority Resurrection* (reuse of consumed credentials)

- **Pervasive problem:** Validated across 12 major agent frameworks; independently confirmed by framework maintainers

- **Mitigation:** ACRFence uses a lightweight analyzer LLM to compare post-restore tool calls against logged effects, enforcing replay-or-fork semantics without framework modifications

</div>

---
layout: center
class: text-center
---

# Thank You

Questions?

<div class="mt-8 text-lg opacity-70">
CoDAIM 2026 Workshop
</div>
