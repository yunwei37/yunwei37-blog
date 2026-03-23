# ACRFence Presentation Script (~12 min)

## Slide 1: Title (~30s)

Hi everyone, I'm Yusheng Zheng from UC Santa Cruz. Today I'll be presenting ACRFence, our work on preventing semantic rollback attacks in agent checkpoint-restore. This is joint work with Yiwei Yang, Wei Zhang, and Andi Quinn.

## Slide 2: LLM Agents Are Taking Real-World Actions (~1 min)

So let's start with the context. LLM agents today are not just chatbots. They transfer money, provision cloud resources, delete customer data. They do this through tool calls, using protocols like MCP or function calling, across frameworks like LangGraph, CrewAI, Google ADK, and many others.

Now, when something goes wrong, or when you want to explore a different path, these frameworks let you rewind the agent to an earlier checkpoint and retry. This is very convenient.

But here's the catch: checkpoint-restore can only roll back the agent's local state. It cannot undo actions that have already been performed on external services. So the key question is: what happens to those external actions when you restore?

## Slide 3: Motivating Example (~2 min)

Let me walk you through a concrete attack. Look at this sequence diagram.

A user asks the agent to transfer 500 dollars to Bob. The agent generates a UUID as a unique reference, sends the transfer to the bank, and the bank processes it. So far so good.

Next, the agent calls a receipt-confirmation service that happens to be controlled by Bob. Bob returns a malformed response that crashes the agent. The framework automatically restores to the checkpoint before the transfer.

Now here's the critical part: when the agent retries, it generates a *different* UUID. The bank sees a new reference ID, finds no record of it, and processes it as a brand new transaction. Bob receives 1000 dollars instead of 500, and both transactions look completely legitimate in the bank's records because they carry distinct reference IDs.

We call this class of vulnerabilities *semantic rollback attacks*.

## Slide 4: Why Does This Happen? (~1 min)

So why does this happen? The root cause is that all existing duplicate-detection mechanisms share the same assumption: the caller will send identical requests on retry. This is true for traditional deterministic programs. Stripe's idempotency keys, Temporal's recorded values, Azure Durable Functions, they all rely on this.

But LLM agents violate this assumption. Even at temperature zero, GPU floating-point rounding produces different token sequences across runs. So a restored agent generates subtly different requests. The server sees a new reference ID and accepts it as a new transaction.

What makes this particularly dangerous is that each duplicate looks legitimate in isolation, because it carries its own distinct reference.

## Slide 5: 12 Frameworks Affected (~1.5 min)

This is not a theoretical problem. We surveyed 12 major agent frameworks, and none of them enforces exactly-once semantics at the tool boundary.

As you can see in this table, the issues are widespread. LangGraph has 8 or more reported issues where tools re-fire on resume. CrewAI has cases where entire crews run twice, resending emails. Google ADK's rewind leaves stale external state. And so on across OpenAI Agents, Claude Code, Cursor, and others.

Notably, a LangGraph maintainer has acknowledged that this problem is, quote, "architecturally difficult to fix." And Google ADK's official documentation explicitly warns that rewind cannot undo external side effects.

## Slide 6: Threat Model (~1 min)

We consider two attacker models.

The first is Crash-Induced Restore, where an external attacker, say a malicious MCP service in the agent's tool chain, deliberately triggers a crash after an irreversible action has completed. The framework auto-restores, and the agent re-executes with different parameters.

The second is Deliberate Rollback Abuse, where an insider with access to the rewind feature, like a malicious employee, intentionally restores to a prior checkpoint and redirects the agent to perform unauthorized actions using previously obtained credentials.

We enforce two invariants: no replay of irreversible effects across restores, and consumed credentials must stay consumed.

## Slide 7: Attack 1 - Action Replay (~1.5 min)

Let me detail the first attack. I walked through the basic mechanism with the double payment example. But this attack has three important properties.

First, it's chainable. Each crash-restore cycle produces another duplicate. An attacker can repeat this N times to get N+1 payments.

Second, it's hard to audit. Every transaction has a unique reference ID, so there's no obvious duplication in the logs.

Third, it's easily weaponizable. The attacker only needs to control one service in the agent's tool chain. They don't need to compromise the agent itself or the bank.

In our experiments using Claude Code with Qwen3-32B, all 10 checkpoint-restore trials produced duplicates. Without checkpoint-restore, zero out of ten had duplicates. This confirms the vulnerability is caused by the restore mechanism, not by general LLM behavior.

## Slide 8: Attack 2 - Authority Resurrection (~1.5 min)

The second attack targets single-use authorization tokens. Here's the scenario.

A malicious employee asks the agent to delete Alice's data under a legitimate GDPR request. The agent obtains a manager's single-use approval token, executes the deletion, and the token is marked as consumed. The employee then rewinds to the state right after approval was granted. The agent still holds the token but has no memory of having used it. The employee redirects: "now delete Bob's data." If the server validates tokens statelessly, checking only the cryptographic signature but not a consumption record, the request succeeds.

The result is that the manager approved deletion for Alice, but Bob's data was also deleted. This discrepancy is only visible by cross-referencing approval and execution logs.

This is not hypothetical. HashiCorp Vault has a documented issue where single-use tokens reappear after snapshot restore, the exact same pattern.

## Slide 9: Mitigation - ACRFence (~1.5 min)

So how do we address this? We propose ACRFence, which interposes at the tool boundary as an MCP proxy.

During normal execution, ACRFence logs each irreversible tool call, capturing context via eBPF at the OS level, so it requires no framework modifications.

The key insight is what happens on restore. A restored agent will generate a textually different but semantically equivalent call. Deterministic matching would flag this as a new call, which is exactly the problem. So instead, ACRFence uses a lightweight analyzer LLM to compare the new call against the log. It distinguishes fields that naturally vary across runs, like UUIDs, from fields that reflect the actual intent, like the amount and recipient.

Based on this, there are three outcomes: if the call is semantically equivalent, replay the recorded response. If the intent has changed, block and require an explicit fork. If consumed credentials are being reused, inform the agent.

Using an LLM for this avoids the need to manually annotate tool schemas, and it adapts to new tools automatically. And it only runs on the restore path, so there's zero overhead during normal execution.

## Slide 10: Related Work (~30s)

Briefly on related work. The inability to undo external effects after checkpoint-restore is a classic problem in distributed systems, the output commit problem. Existing solutions like durable execution, I/O tabling, and idempotency protocols all assume deterministic callers. Agent-specific work on record-and-replay, version control, and security frameworks does not address checkpoint-restore interactions. No prior work treats nondeterministic LLM re-synthesis after restore as a security attack surface.

## Slide 11: Summary (~30s)

To summarize. We identify a new vulnerability class: semantic rollback attacks, where LLM non-determinism after checkpoint-restore silently bypasses duplicate-detection mechanisms. We characterize two attack classes, Action Replay and Authority Resurrection, and show the problem is pervasive across 12 major frameworks. We propose ACRFence, which uses a lightweight analyzer LLM to enforce replay-or-fork semantics at the tool boundary without requiring any framework modifications.

## Slide 12: Thank You

Thank you. I'm happy to take questions.
