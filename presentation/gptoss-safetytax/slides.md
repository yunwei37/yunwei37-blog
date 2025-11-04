---
theme: seriph
background: https://cover.sli.dev
title: GPT-OSS & Safety Tax
info: |
  ## GPT-OSS (20B, 120B) & the "Safety Tax"
  Open-Source Reasoning Models and the Cost of Safety
class: text-center
drawings:
  persist: false
transition: slide-left
mdc: true
duration: 35min
---

# GPT-OSS (20B, 120B) & the "Safety Tax"

**Open-Source Reasoning Models and the Cost of Safety**

<div class="abs-br m-6 text-sm opacity-50">
  CSE201 Paper Presentation
</div>

<div class="abs-bl m-6 text-sm opacity-50">
  Yusheng Zheng (yzhen165@ucsc.edu)
  <br>
  PhD Student
</div>

<!--
I'll first introduce GPT-OSS, OpenAI's new open-source reasoning models, covering their architecture, training, and performance. Then, we'll explore the "Safety Tax," a study on the trade-off between a model's safety and its reasoning skills.
-->

---
transition: fade-out
---

# Roadmap

* LLMs vs LRMs
* GPT-OSS: architecture and specs
* Pre-training and post-training for reasoning and tools
* Main capability results; coding and tool use results
* Third-party evaluation and deployment compare
* Safety testing and mitigation
* Safety Tax: method, findings, and discussion

<!--
We'll start by distinguishing LLMs from LRMs. Thenc over GPT-OSS's architecture and training, and review its performance on key benchmarks. We'll also look at third-party evaluations, deployment considerations, and safety measures before diving into the Safety Tax study.
-->

---

# LLM vs LRM (reasoning model)

<div class="grid grid-cols-1 md:grid-cols-5 gap-8 mt-6">

  <!-- LLM Card -->
  <div class="md:col-span-2 bg-gray-50/80 dark:bg-gray-800/80 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
    <div class="flex items-center mb-4">
      <div class="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg mr-4">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-500"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M12 12a5 5 0 0 0 5-5"/><path d="M12 12a5 5 0 0 1 5 5"/></svg>
      </div>
      <h2 class="text-2xl font-bold text-gray-800 dark:text-gray-100">LLM</h2>
    </div>
    <p class="text-gray-600 dark:text-gray-300">
      Standard Large Language Models are focused on conversational ability through pre-training and alignment for chat.
    </p>
  </div>

  <!-- LRM Card -->
  <div class="md:col-span-3 bg-gray-50/80 dark:bg-gray-800/80 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
    <div class="flex items-center mb-4">
      <div class="p-2 bg-teal-100 dark:bg-teal-900/50 rounded-lg mr-4">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-teal-500"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M12 8v8"/><path d="m8.5 14-4-4 4-4"/></svg>
      </div>
      <h2 class="text-2xl font-bold text-gray-800 dark:text-gray-100">LRM (Reasoning Model)</h2>
    </div>
    <ul class="space-y-3 text-gray-600 dark:text-gray-300">
      <li><strong class="font-semibold text-gray-700 dark:text-gray-200">Enhanced Training:</strong> Adds <strong class="text-teal-600 dark:text-teal-400">reasoning RL</strong> post-training to teach <strong class="text-teal-600 dark:text-teal-400">chain-of-thought</strong> (CoT) and <strong class="text-teal-600 dark:text-teal-400">tool use</strong>.</li>
      <li><strong class="font-semibold text-gray-700 dark:text-gray-200">Key Property:</strong> Features <strong class="text-teal-600 dark:text-teal-400">Test-time scaling</strong> — more inference compute improves accuracy on hard tasks.</li>
      <li><strong class="font-semibold text-gray-700 dark:text-gray-200">Pros:</strong> Excels at math, code, and multi-step tasks via tools (Python, browsing) and structured thought.</li>
      <li><strong class="font-semibold text-gray-700 dark:text-gray-200">Cons:</strong> Longer outputs, higher latency, and more complex failure modes.</li>
    </ul>
  </div>

</div>

<!--
First, let's distinguish between a standard Large Language Model (LLM) and a Large Reasoning Model (LRM). A typical LLM is pre-trained on vast amounts of text and then aligned for conversational chat. An LRM, however, goes a step further. After pre-training, it undergoes a special post-training phase using reinforcement learning to learn two key skills: chain-of-thought, which is breaking down problems step-by-step, and how to use external tools, like a Python interpreter.

The defining characteristic of an LRM is 'test-time scaling.' This means that giving the model more inference compute to generate a longer chain of thought improves its accuracy on difficult problems. The advantages are clear: LRMs excel at complex tasks like math and coding. However, this comes with trade-offs: longer outputs, higher latency, and more complex failure modes.

Let's look at the core specs of GPT-OSS.
-->

---

# GPT-OSS model card (core specs)

**Architecture:** Sparse MoE Transformer; Harmony chat format; three reasoning efforts (low/medium/high)

<div class="grid grid-cols-1 gap-4 mt-4">

| Model | Layers | Total params | Active params/token | Total experts | Active experts/token | Context |
|-------|--------|--------------|---------------------|---------------|----------------------|---------|
| **gpt-oss-120b** | 36 | 117B | 5.1B | 128 | 4 | 128k |
| **gpt-oss-20b** | 24 | 21B | 3.6B | 32 | 4 | 128k |

</div>

<div class="text-xs mt-4 opacity-70">
Source: OpenAI launch post and model card
</div>

<!--
Both models use a sparse MoE Transformer architecture. The 120B model has 117B total parameters across 128 experts, activating 5.1B per token. The 20B has 21B total parameters across 32 experts, with 3.6B active per token. This sparse design provides large-model knowledge at a small-model compute cost. Both support a 128k context window, the Harmony format, and configurable reasoning effort.
-->

---

# Pre-training (data and compute)

<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 text-sm">
  <div class="bg-gray-50/80 dark:bg-gray-800/80 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
    <h3 class="font-bold text-lg mb-3 text-indigo-600 dark:text-indigo-400">Data & Safety</h3>
    <ul class="space-y-2 text-gray-600 dark:text-gray-300">
      <li><strong>Data:</strong> Text-only, trillions of tokens (STEM, code, general knowledge). Cutoff June 2024.</li>
      <li><strong>Safety:</strong> Reuses <strong>CBRN</strong> filters from GPT-4o.</li>
    </ul>
  </div>
  <div class="bg-gray-50/80 dark:bg-gray-800/80 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
    <h3 class="font-bold text-lg mb-3 text-indigo-600 dark:text-indigo-400">Tokenizer</h3>
    <ul class="space-y-2 text-gray-600 dark:text-gray-300">
      <li><strong>Tokenizer:</strong> <strong class="font-mono">o200k_harmony</strong> (open-source).</li>
      <li><strong>Type:</strong> BPE, <strong class="font-semibold text-indigo-700 dark:text-indigo-300">201k tokens</strong>.</li>
    </ul>
  </div>
  <div class="md:col-span-2 bg-gray-50/80 dark:bg-gray-800/80 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
    <h3 class="font-bold text-lg mb-3 text-indigo-600 dark:text-indigo-400">Compute & Training Stack</h3>
    <ul class="space-y-2 text-gray-600 dark:text-gray-300">
      <li><strong>Hardware:</strong> <strong>NVIDIA H100</strong> GPUs.</li>
      <li><strong>Compute:</strong> <strong>~2.1M H100-hrs</strong> for 120B; 20B is ~10× less.</li>
      <li><strong>Stack:</strong> PyTorch, Triton kernels, and FlashAttention.</li>
    </ul>
  </div>
</div>

<div class="text-xs mt-4 opacity-70">
Source: Model card Sections 2.3 & 2.4
</div>

<!--
Let's discuss pre-training. The models were trained on trillions of text tokens, focusing on STEM, coding, and general knowledge, with a knowledge cutoff of June 2024. For safety, the pre-training data was filtered using the same CBRN filters as GPT-4o.

A new open-source tokenizer, 'o200k_harmony', was used. It's a BPE tokenizer with over 200,000 tokens, extending the GPT-4o tokenizer for the Harmony chat format.

The models were trained on NVIDIA H100s using a modern stack of PyTorch, Triton, and FlashAttention. The 120B model took about 2.1 million H100-hours, while the 20B model required roughly ten times less compute, making it far more efficient.

After pre-training, the models undergo a post-training phase.
-->

---

# Post-training (reasoning and tools)

<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 text-sm">
  <div class="bg-gray-50/80 dark:bg-gray-800/80 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
    <h3 class="font-bold text-lg mb-3 text-green-600 dark:text-green-400">Reasoning & Personality</h3>
    <ul class="space-y-2 text-gray-600 dark:text-gray-300">
      <li><strong>Method:</strong> <strong class="text-green-700 dark:text-green-300">Reasoning RL</strong> (o-series like).</li>
      <li><strong>Skills:</strong> CoT and plan-then-answer.</li>
      <li><strong>Personality:</strong> <strong>ChatGPT-like</strong>.</li>
      <li><strong>Effort Knob:</strong> <strong class="font-mono">low/medium/high</strong> reasoning.</li>
    </ul>
  </div>
  <div class="bg-gray-50/80 dark:bg-gray-800/80 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
    <h3 class="font-bold text-lg mb-3 text-green-600 dark:text-green-400">Tools & Agentic Features</h3>
    <ul class="space-y-2 text-gray-600 dark:text-gray-300">
      <li><strong>Tools:</strong> Browsing, Python (Jupyter), and dev functions.</li>
      <li><strong>Agentic:</strong> Interleaves tool calls, plans actions, multi-turn optimized.</li>
    </ul>
  </div>
  <div class="md:col-span-2 bg-gray-50/80 dark:bg-gray-800/80 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
    <h3 class="font-bold text-lg mb-3 text-green-600 dark:text-green-400">Harmony Format</h3>
    <ul class="space-y-2 text-gray-600 dark:text-gray-300">
      <li><strong>Role Hierarchy:</strong> System > Dev > User > Assistant > Tool.</li>
      <li><strong>Output Channels:</strong> <strong class="font-mono">analysis</strong>, <strong class="font-mono">commentary</strong>, <strong class="font-mono">final</strong>.</li>
    </ul>
  </div>
</div>

<div class="text-xs mt-4 opacity-70">
Source: Model card Section 2.5
</div>

<!--
The post-training phase is what makes these models true reasoning models. OpenAI applied reinforcement learning, similar to their 'o-series' models, to teach step-by-step reasoning and planning. This also gives the models a ChatGPT-like personality.

A key feature is the 'effort knob,' allowing developers to set reasoning effort to low, medium, or high via a system prompt. Higher effort means a longer chain of thought and better accuracy.

The 'Harmony' chat format establishes a strict role hierarchy (System, Developer, User, Assistant, Tool) to resolve conflicting instructions. It also separates the output into 'analysis,' 'commentary,' and 'final' channels.

The models were also trained to use tools like web browsing, a Python interpreter, and developer functions. They have advanced agentic features, allowing them to interleave tool calls, present action plans, and handle multi-turn conversations.
-->

---

# Evaluation: Main capabilities (AIME, GPQA, MMLU, HLE)

<div class="grid grid-cols-2 gap-4">
<div>

<img src="/gptoss-eval-main-1.png" class="rounded shadow-lg" alt="AIME 2024, AIME 2025, GPQA Diamond results" />

</div>
<div>

<img src="/gptoss-eval-main-2.png" class="rounded shadow-lg" alt="HLE and MMLU results" />

</div>
</div>

* **Key result:** 120B ≈ o4-mini; 20B competitive despite 6× smaller active params

<div class="text-xs mt-2 opacity-70">
Source: Model card Section 2.6, Figure 1
</div>

<!--
Now, let's look at how these models perform on main capability benchmarks, comparing them to OpenAI's proprietary o-series models.

The chart on the left focuses on math and science. On AIME 2024, a challenging math competition, the gpt-oss-120b with tools achieves 96.6% accuracy, nearly matching o3 and competitive with o4-mini. Remarkably, the 20B model, six times smaller in active parameters, scores an almost identical 96%.

On AIME 2025, the 120B model gets 97.9%, and the 20B model is slightly ahead at 98.7%. This shows that the scaling of these MoE models isn't always linear.

on GPQA Diamond, a benchmark of PhD-level science questions, the 120B model's 80.1% score is clearly ahead of the 20B's 71.5%, suggesting that extremelydifficult reasoning still benefits from a larger model.

The chart on the right shows two more benchmarks. HLE consists of expert-level questions so difficult that all models struggle. On MMLU, which tests broad, college-level knowledge, the 120B model achieves 90% accuracy, with the 20B not far behind at 85.3%.

The main takeaway is that the gpt-oss-120b is a strong performer, approaching o4-mini's capabilities, while the 20B model is a very competitive and efficient alternative.
-->

---

# Evaluation: Coding, tool use, and reasoning

<div class="grid grid-cols-2 gap-4">
<div class="text-sm">

**Coding (Elo, high reasoning):**
* **Codeforces (no tools):** 120B **2463**, 20B **2230**
* **Codeforces (with tools):** 120B **2622**, 20B **2516**

**SWE-Bench Verified (pass@1):** 120B **62.4%**, 20B **60.7%**

**Function calling:**
* **Tau-Bench Retail (pass@1):** 120B **67.8%**, 20B **54.8%**
* **Airline task:** 120B **49.2%**, 20B **38.0%**

<div class="text-xs mt-4 opacity-70">
Source: Model card Section 2.6, Figures 2 & 3
</div>

</div>
<div>

<img src="/gptoss-eval-coding.png" class="rounded shadow-lg mb-2" alt="Coding and tool use results" />

<img src="/gptoss-test-time-scaling.png" class="rounded shadow-lg" alt="Test-time scaling on AIME and GPQA" />

<div class="text-xs mt-1 opacity-70 text-center">
Figures 2 & 3: Coding results and test-time scaling
</div>

</div>
</div>

<!--
Now let's turn to coding, tool use, and reasoning.

The top chart on the right shows three coding evaluations. On Codeforces, a competitive programming benchmark, the 120B model gets an Elo rating of 2463 without tools, and the 20B scores 2230. With a terminal, their scores jump dramatically to 2622 and 2516, respectively. This shows the models effectively use tools to write, test, and debug code.

Next is SWE-Bench Verified, which tests the ability to solve real-world GitHub issues. The 120B model resolves 62.4% of issues, and the 20B is close behind at 60.7%. These are state-of-the-art results for open-weight models.

The chart also shows function calling ability on Tau-Bench. On a retail task, the 120B model achieves 67.8% accuracy, while the 20B gets 54.8%, suggesting complex function use benefits from the larger model.

The bottom chart demonstrates 'test-time scaling.' On AIME 2025 and GPQA Diamond, as the chain of thought gets longer, accuracy steadily increases for both models. This is a key property: they can "think harder" to achieve better results.

Overall, their evaluation shows while the 120B model often leads, the 20B remains highly competitive and shows genuine reasoning capabilities.
-->

---
layout: two-cols
layoutClass: gap-4
---

# Third-party evaluation (Aug–Sep 2025)

* **Bi et al., "Is GPT-OSS Good?" (arXiv):** standardized, **unquantized** setup; McNemar tests and effect sizes
* **Main finding:** **gpt-oss-20B > gpt-oss-120B** on some tasks in their harness
* **Overall placement:** both **mid-tier** among open models; **multilingual is weaker**
* scaling in sparse architectures may not yield proportional performance gains; maybe related MoE routing and prompt sensitivity


<div class="text-xs mt-4 opacity-70">
Source: Bi et al., arXiv 2508.12461
</div>

::right::

<img src="/third-party-eval.png" class="rounded shadow-lg mt-8" alt="Detailed performance analysis of GPT-OSS models across task subcategories" />

<div class="text-xs mt-2 opacity-70 text-center">
Figure 6: Performance across benchmark tasks
</div>

<!--
There are also some independent evaluations that discuss something interesting. A recent arxiv paper provides one, using a standardized, unquantized setup that shows the models' raw capabilities. In their tests, the smaller gpt-oss-20B model outperformed the 120B on HumanEval (coding) and MMLU (general knowledge), and achieve similar on some tests. You can see this in the chart: the orange bars for the 20B are taller than the blue bars for the 120B.

This counterintuitive result suggests that for sparse MoE models, bigger isn't always better, and performance depends heavily on the evaluation setup. The study also noted weaker multilingual capabilities.
-->

---

# Deployment: Memory, throughput, and efficiency

<div class="grid grid-cols-2 gap-6 text-sm">

<div>

**Memory Footprint (A100/H100):**
* 120B: **~80 GB** per device (with 4-bit KV cache)
* 20B: **~16 GB** per device (**5× reduction**)

**Throughput & Latency:**
* 120B: **128 tokens/s**; 20B: **178 tokens/s**
* Multi-turn latency growth: 0.8→2.9s (120B, 10 turns)

</div>

<div>

**Efficiency:**
* 20B: **2.6× less energy** per response at target accuracy
* MXFP4 on MoE weights

**Attention Architecture:**
* Alternating **banded** + **dense**, **GQA**, **RoPE**

</div>

</div>

<div class="text-xs mt-4 opacity-70">
Source: Model card Section 2.1, deployment analysis
</div>

<!--
Let's discuss the deployment. On modern GPUs, the 120B model needs about 80 GB of memory per device, while the 20B needs only 16 GB. This smaller footprint allowing for higher batch sizes and easier scaling.

In terms of speed, the 20B is faster, with a throughput of 178 tokens/second compared to 128 for the 120B on a 8 card vllm deployment.

From an efficiency standpoint, the 20B is the clear winner, using 2.6 times less energy per response for the same accuracy.

The GPT oss report also discussed their models use advanced techniques like grouped-query attention and rotary position embeddings to handle large context efficiently. A special 4-bit quantization format, MXFP4, is used on MoE weights, enabling these large models to run on current hardware.
-->

---

# Safety testing and mitigation approach

**Goal:** Test open-weight models reflecting how downstream actors can modify them

**Three key questions investigated:**
1. Does default gpt-oss-120b reach **"High" capability** in Bio/Chem, Cyber, or AI Self-Improvement? → **No**
2. Could adversarial actors **fine-tune** it to High capability? → **No** (even with robust internal FT + SAG review)
3. Does releasing it **advance the frontier** vs existing open models? → **No** (other models already at or near this level)

**Default safety approach:**
* **Deliberative alignment** to refuse disallowed content, resist jailbreaks, follow instruction hierarchy
* Evaluated on: disallowed content, jailbreaks, instruction hierarchy, hallucinations, bias

<div class="text-xs mt-4 opacity-70">
Source: Model card Section 3 and Preparedness summary
</div>

<!--
The paper describes OpenAI's safety testing philosophy for open-weight models: testing should reflect how downstream actors can modify them, both for good and potentially malicious purposes.

They investigated three key questions. First, does the default model reach High capability in sensitive domains under their Preparedness Framework? The answer is no.

Second, could adversarial actors fine-tune it to reach High capability in Bio/Chem or Cyber domains? They simulated this internally with robust fine-tuning. The Safety Advisory Group reviewed this and concluded it still did not reach High capability.

Third, does releasing this model significantly advance the frontier compared to existing open models? They ran biology evaluations on other open models and found them already at or near gpt-oss-120b's level, so the release doesn't introduce significant new risk.

The default model uses deliberative alignment during post-training to refuse disallowed content, resist jailbreaks, and follow the instruction hierarchy. They evaluated it on standard safety benchmarks including disallowed content, jailbreaks, instruction hierarchy, hallucinations, and bias.

However, safety alignment does not come without costs. This brings us to the second major topic: the Safety Tax.
-->

---
layout: center
class: text-center
---

# Safety Tax

**Safety Alignment Makes Your Large Reasoning Models Less Reasonable**

---

# Safety Tax: safety alignment can reduce reasoning

* **Claim of the paper:** safety alignment **improves safety** but **reduces reasoning accuracy** for LRMs
* **Observed on GPQA/AIME:** harmful score **falls**; accuracy **falls** after safety alignment
* **Name for the trade-off:** **"Safety Tax"**

<div class="mt-8">
<img src="/safety-tax-pipeline.png" class="rounded shadow-lg mx-auto" style="max-height: 280px;" alt="Two-stage pipeline to produce safety-aligned LRM" />

<div class="text-xs mt-2 opacity-70 text-center">
Figure 2: Two-stage pipeline: reasoning training followed by safety alignment with either DirectRefusal or SafeChain
</div>
</div>

<div class="text-xs mt-4 opacity-70">
Source: Safety Tax paper abstract and Figure 1
</div>

<!--
This concept, from a recent paper, asks a critical question: can we make large reasoning models safer without harming their performance?

The paper's conclusion is that there's a direct trade-off. The authors found that safety alignment techniques, while effective at making models safer, consistently reduce reasoning accuracy on benchmarks like GPQA and AIME. They call this performance drop the "Safety Tax."

The diagram illustrates this. You start with a base LLM with low "IQ" and low toxicity.

First, reasoning training boosts its IQ, making it a capable reasoning model, but also increases its toxicity. This is a known issue.

Second, safety alignment. Developers can choose 'DirectRefusal,' which trains the model on short, immediate refusals, or 'SafeChain,' which uses longer chains of thought where the model reasons about why a request is harmful before refusing.

Both paths lead to a safer model, but in both cases, the final "IQ" is lower than the unaligned reasoning model. This is the safety tax: both methods improve safety at the cost of reasoning capability.

So, how did the researchers actually measure this? Let's look at their methodology.
-->

---

# Safety Tax: methodology (what they did)

* **Two-stage pipeline:** **reasoning training → safety alignment** (mirrors common LRM workflows)
* **Base and LRMs:** default **s1.1-32B** as main LRM; also **DeepSeek-R1-Distill-Qwen-32B** and **LIMO-32B**
* **Safety data:**
  - **DirectRefusal:** short CoT + direct refusal; derived from **BeaverTails-refusal**
  - **SafeChain:** long CoT + refusal; derived from **Jiang et al., 2025**
* **Training setup:** **SFT**, **5 epochs** on **~1000 safety items** (per dataset)
* **Metrics:** **Reasoning accuracy** (AIME-24/GPQA) and **Harmful score** (BeaverTails moderation model)

<div class="text-xs mt-4 opacity-70">
Source: Safety Tax paper Sections 3–4, Tables 1–2
</div>

<!--
Let's look at the methodology of the Safety Tax study. The researchers used a two-stage pipeline that mirrors common LRM development: first reasoning training, then safety alignment.

They primarily used a 32B parameter model, s1.1-32B, and validated their results on two other 32B models, DeepSeek-R1 and LIMO-32B, to ensure their findings were robust.

They tested two safety alignment strategies. 'DirectRefusal' uses data with a short chain-of-thought and an immediate refusal. 'SafeChain' uses data with a longer chain-of-thought where the model reasons about why a request is harmful before refusing.

The training was done with supervised fine-tuning (SFT) for 5 epochs on about 1,000 safety examples for each strategy.

To measure the trade-off, they tracked reasoning accuracy on AIME and GPQA, and a 'Harmful score' from the BeaverTails moderation model.
-->

---

# Safety Tax: key results and overheads

<div class="grid grid-cols-2 gap-4">
<div>

**s1.1-32B:**
* Reasoning training **raises** accuracy vs base; **raises** harmful score (less safe)
* Safety alignment with **DirectRefusal** or **SafeChain** **reduces** harmful score (more safe)
* But safety alignment **drops** reasoning accuracy vs the reasoning model (down on AIME/GPQA)

**Generalization to DeepSeek-32B and LIMO-32B:** same **trade-off holds**

**System cost:** **SafeChain** needs **1.47×** training time and **~1.03×** GPU memory vs **DirectRefusal**

<div class="text-xs mt-4 opacity-70">
Source: Safety Tax paper
</div>

</div>
<div>

<img src="/safety-tax-results.png" class="rounded shadow-lg" alt="Safety Tax illustration showing harmful score reduction and reasoning accuracy loss" />

<div class="text-xs mt-2 opacity-70 text-center">
Figure 1: Safety alignment reduces harmful score by 59.6% (DirectRefusal) or 29.6% (SafeChain), but causes 23.24% or 7.07% reasoning accuracy loss
</div>

</div>
</div>

<!--
Now, let's look at the results, which clearly show the safety tax. The chart on the right is the key evidence, showing what happens to the model's harmful score and reasoning accuracy over five epochs of safety alignment.

The left graph tracks the harmful score. The initial reasoning model starts around 60. With 'DirectRefusal' (red dashed line), the score plummets, representing a nearly 60% reduction in harmful outputs. This method is highly effective at improving safety.

'SafeChain' (teal solid line) also reduces the harmful score, but more gradually, by about 30%. So, while both work, DirectRefusal is more aggressive.

But here's the catch. The right graph shows reasoning accuracy on GPQA. The initial model starts at about 60% accuracy. As safety alignment proceeds, both lines trend down. DirectRefusal causes a steep 23% loss in reasoning accuracy. The gentler SafeChain still causes a 7% loss.

This is the safety tax visualized. DirectRefusal buys more safety at a higher reasoning cost. SafeChain preserves more reasoning but is less effective at improving safety. There's no free lunch.

The researchers found this trade-off holds for the other models they tested, confirming it's a general phenomenon.
-->


---
layout: center
class: text-center
---

# References

<div class="text-sm text-left mx-auto max-w-3xl">

1. **GPT-OSS Model Card** - OpenAI
   [arXiv:2508.10925](https://arxiv.org/html/2508.10925v1)

2. **GPT-OSS Launch Post** - OpenAI
   [openai.com/index/introducing-gpt-oss](https://openai.com/index/introducing-gpt-oss/)

3. **Is GPT-OSS Good?** - Bi et al., 2025
   [arXiv:2508.12461](https://arxiv.org/abs/2508.12461)

4. **Safety Tax** - Jiang et al., 2025
   [arXiv:2503.00555](https://arxiv.org/pdf/2503.00555)

</div>

<!--
These are my sources. The GPT-OSS model card provides technical details, training setup, and safety results. The launch post gives the summary table and context figure. The third-party paper by Bi et al. is the independent check for MMLU and HumanEval. The Safety Tax paper supplies the method, tables, and main trade-off result.
-->

---
layout: center
class: text-center
---

# Thank You

Questions?
