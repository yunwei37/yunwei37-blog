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

## ...and frameworks let you rewind when things go wrong

<div class="grid grid-cols-2 gap-8 text-lg mt-4">

<div class="border-l-4 border-blue-500 pl-4">

### LLM Agents Today

- Transfer money, provision cloud resources, delete data
- Interact with external services via **tool calls** (MCP, function calling)
- Frameworks: LangGraph, CrewAI, Google ADK, AutoGen, ...

</div>

<div class="border-l-4 border-orange-500 pl-4">

### Checkpoint-Restore

- Frameworks save agent state at checkpoints
- On error/crash, **rewind** to earlier state and retry
- Convenient for error recovery and exploration
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

<div class="grid grid-cols-2 gap-6 text-base mt-2">

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

<div class="mt-3 p-2 bg-yellow-50 rounded border border-yellow-300">
Each duplicate looks <strong>legitimate in isolation</strong> because it carries a distinct reference.
</div>

</div>

</div>

---

# This Is a Real Problem: 12 Frameworks Affected

<div class="text-base mb-2">
We surveyed 12 major agent frameworks. <strong>None</strong> enforces exactly-once semantics at the tool boundary.
</div>

<div class="flex gap-4 text-sm">

<div class="flex-1">

| Framework | # | Key Finding |
|-----------|---|-------------|
| LangGraph | 8+ | Tools re-fire on resume |
| CrewAI | 5 | Crew runs twice; emails resent |
| Google ADK | 4 | Rewind leaves stale state |
| AutoGen | 3 | Entry node runs twice |
| OpenAI Agents | 3 | Repeated function calls |
| Claude Code | 5 | Tool re-fires after approval |

</div>

<div class="flex-1">

| Framework | # | Key Finding |
|-----------|---|-------------|
| OpenClaw | 6 | Webhook replay (GHSA) |
| Cursor | 4 | Undo reverts unrelated agents |
| OpenHands | 1 | Repeated commits |
| Vercel AI | 1 | Repeated tool calls |
| LiveKit | 2 | Tools fire twice |
| n8n | 3 | Retry causes repeated charges |

</div>

</div>

<div class="mt-2 text-sm opacity-80">
LangGraph maintainer confirmed the problem is "architecturally difficult to fix." Google ADK docs explicitly warn rewind cannot undo external effects.
</div>

---

# Threat Model

## Two Attacker Models

<div class="grid grid-cols-2 gap-6 text-base mt-4">

<div class="border-2 border-red-400 rounded-lg p-4">

<div class="font-semibold text-red-600 mb-2 flex items-center gap-2 text-lg"><mdi-lightning-bolt class="text-xl" /> Crash-Induced Restore</div>

- **External attacker** (e.g., malicious MCP service)
- Triggers crash **after** irreversible action
- Framework auto-restores to checkpoint
- Agent re-executes with **different parameters**

</div>

<div class="border-2 border-purple-400 rounded-lg p-4">

<div class="font-semibold text-purple-600 mb-2 flex items-center gap-2 text-lg"><mdi-account-alert class="text-xl" /> Deliberate Rollback Abuse</div>

- **Insider** with access to rewind feature
- Intentionally restores to prior checkpoint
- Redirects agent with **unauthorized actions**
- Uses previously obtained credentials

</div>

</div>

<div class="mt-3 text-base">
<strong>Invariants:</strong> (1) No replay of irreversible effects across restores. (2) Consumed credentials must stay consumed.
</div>

---

# Attack 1: Action Replay

<div class="grid grid-cols-2 gap-6 text-base mt-1">

<div>

### How It Works

1. User asks agent to transfer $500 to Bob
2. Agent generates UUID, transfer succeeds
3. Agent calls Bob's MCP service for receipt
4. Bob returns malformed response → **CRASH**
5. Framework restores to checkpoint
6. Agent re-generates **different** UUID
7. Bank accepts as **new transaction**

**Result:** Bob receives **$1000** instead of $500. Both transactions appear **legitimate** (distinct IDs).

</div>

<div>

### Key Properties

<div class="border-l-4 border-red-500 pl-4 mb-3">

**Chainable:** Each crash-restore cycle produces another duplicate.

</div>

<div class="border-l-4 border-orange-500 pl-4 mb-3">

**Hard to audit:** Every transaction has a unique reference ID.

</div>

<div class="border-l-4 border-yellow-600 pl-4 mb-3">

**Weaponizable:** Attacker only needs one service in the tool chain.

</div>

<div class="p-2 bg-green-50 rounded border border-green-300">
<strong>Experiment:</strong> 10/10 CR trials produced duplicates. 0/10 without checkpoint.
</div>

</div>

</div>

---

# Attack 2: Authority Resurrection

<div class="grid grid-cols-2 gap-5 text-sm mt-1">

<div>

### Scenario

1. Employee asks agent to delete Alice's data (legit GDPR)
2. Agent obtains manager's **single-use approval token**
3. Agent executes deletion, token marked **consumed**
4. Employee uses **rewind** to restore to after approval
5. Agent holds token but has **no memory of using it**
6. Employee redirects: "delete Bob's data"
7. Stateless validation → **succeeds**

**Result:** Manager approved for **Alice**, but **Bob's** data also deleted. Discrepancy visible only by cross-referencing logs.

</div>

<div>

### Why It Works

<div class="border-2 border-purple-300 rounded-lg p-3 mb-3">

**Stateless validation** checks only the cryptographic signature, not a consumption record. Token is valid, request accepted.

</div>

<div class="border-2 border-green-300 rounded-lg p-3 mb-3">

**Stateful validation** (server-side revocation list) correctly rejects the reused token.

</div>

### Real-World Precedent

<div class="p-2 bg-blue-50 rounded border border-blue-300">
<strong>HashiCorp Vault:</strong> Single-use tokens reappear after snapshot restore (Issue #28378).
</div>

</div>

</div>

---

# Experimental Validation

<div class="text-lg mb-4">
Testbed: Claude Code CLI + Qwen3-32B. Checkpoint-restore via session truncation. External services as MCP tool servers.
</div>

<div class="grid grid-cols-2 gap-8">

<div class="border-2 border-red-400 rounded-lg p-5">

<div class="font-semibold text-red-600 mb-3 text-xl">Action Replay Results</div>

| Condition | Duplicates |
|-----------|-----------|
| With checkpoint-restore | **10/10** (100%) |
| Without checkpoint (baseline) | **0/10** (0%) |

<div class="mt-3 text-base">
Confirms vulnerability is caused by restore mechanism, not general LLM behavior.
</div>

</div>

<div class="border-2 border-purple-400 rounded-lg p-5">

<div class="font-semibold text-purple-600 mb-3 text-xl">Authority Resurrection Results</div>

| Validation | Token Reuse |
|-----------|-----------|
| Stateless (signature only) | **2/2** succeeded |
| Stateful (revocation list) | **0/2** (blocked) |

<div class="mt-3 text-base">
Stateful server-side validation is the only defense. Agent-side protections are insufficient.
</div>

</div>

</div>

---

# Mitigation: ACRFence

<div class="grid grid-cols-2 gap-5 text-base mt-1">

<div>

### How It Works

ACRFence interposes at the **tool boundary** (MCP proxy):

1. **Record** an *effect receipt* for each irreversible tool call
2. Key by *effect fingerprint*: thread ID, branch ID, tool name, canonical args, env context
3. Context captured via **eBPF** system-level monitors

### On Restore

- **Match** → replay recorded response (no re-execution)
- **Differs** → block, surface prior receipt, require explicit **fork**

</div>

<div>

### Key Properties

<div class="border-l-4 border-blue-500 pl-4 mb-3">

**Framework-agnostic:** Captures context at OS level, no framework modifications needed.

</div>

<div class="border-l-4 border-green-500 pl-4 mb-3">

**Replay-or-Fork:** Identical retry → safe replay. Divergent → blocked until explicit fork.

</div>

<div class="border-l-4 border-purple-500 pl-4 mb-3">

**Token tracking:** Records consumption so agent is informed before reuse.

</div>

<div class="border-l-4 border-gray-500 pl-4">

**Future work:** Branch management, richer fingerprinting, automated classification.

</div>

</div>

</div>

---

# Related Work

<div class="grid grid-cols-2 gap-5 text-base mt-1">

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

<div class="mt-3 p-2 bg-red-50 rounded border border-red-300 text-base text-center">
<strong>No prior work</strong> treats nondeterministic LLM re-synthesis after restore as a security attack surface.
</div>

---

# Summary

<div class="text-xl leading-relaxed mt-4">

- **New vulnerability class:** *Semantic rollback attacks* exploit LLM non-determinism after checkpoint-restore, silently bypassing duplicate-detection mechanisms

- **Two attack classes:** *Action Replay* (duplicate irreversible effects) and *Authority Resurrection* (reuse of consumed credentials)

- **Pervasive problem:** Validated across 12 major agent frameworks; independently confirmed by framework maintainers

- **Mitigation:** ACRFence records irreversible effects and enforces replay-or-fork semantics at the tool boundary, without requiring agent framework modifications

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
