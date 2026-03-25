# AutoResearch for Email Marketing Optimization

## Research Analysis for Midnight Muse Made Shopify Store

---

## Part 1: What Is AutoResearch?

### Origin

[AutoResearch](https://github.com/karpathy/autoresearch) is an open-source framework created by **Andrej Karpathy** (released March 6, 2026, 55k+ GitHub stars). It lets an AI coding agent autonomously run experiments overnight on a real ML training setup.

### The Core Loop

```
Review → Hypothesize → Modify (one file) → Run → Evaluate (one metric) → Keep or Revert → Log → Repeat
```

**Three-file contract:**

| File | Role | Who Edits? |
|------|------|------------|
| `prepare.py` | Data prep, evaluation harness | Nobody (immutable) |
| `train.py` | Model, optimizer, training loop | AI agent only |
| `program.md` | Research directions, constraints | Human only |

**Key design principles:**
- **One GPU, one file, one metric** — simplicity is the point
- **Git is the memory** — every experiment is a commit; failures are reverted
- **Fixed 5-minute training budget** — ensures fair comparison across experiments
- **~12 experiments/hour, ~100 overnight** — no human in the loop

### Real-World Results (Original ML Context)

- **Karpathy:** 700 experiments over 2 days, found 20 real improvements, 11% speedup on already hand-optimized GPT-2 training code
- **Shopify CEO Tobi Lutke:** 120 automated experiments, 93 commits, 53% faster Liquid rendering with 61% fewer memory allocations
- **CIFAR-10 experiment:** 157 experiments in 15 hours, pushed validation accuracy from 90.12% to 94.55% on just the $20/month Claude tier

---

## Part 2: AutoResearch Beyond ML — Claude Code & Marketing Use Cases

### Claude Code Adaptations

The community has generalized the pattern far beyond ML training:

1. **[uditgoenka/autoresearch](https://github.com/uditgoenka/autoresearch)** (2,264 stars) — A Claude Code plugin that applies the loop to ANY domain with a measurable metric. Commands include `/autoresearch`, `/autoresearch:plan`, `/autoresearch:security`, `/autoresearch:debug`.

2. **[drivelineresearch/autoresearch-claude-code](https://github.com/drivelineresearch/autoresearch-claude-code)** — Pure skill port, no MCP server needed.

3. **[proyecto26/autoresearch-ai-plugin](https://github.com/proyecto26/autoresearch-ai-plugin)** — Plugin with both general-purpose and ML-specific templates.

4. **[ARIS (Auto-Research-In-Sleep)](https://github.com/wanshuiyin/Auto-claude-code-research-in-sleep)** — 31 composable skills including idea discovery, auto-review loops, and experiment automation.

### Non-ML Use Cases People Are Running

| Domain | The "File" | The "Metric" | Reported Results |
|--------|-----------|-------------|-----------------|
| Landing page copy | Skill markdown / template | Conversion score (eval-based) | 41% → 92% in 4 rounds |
| Cold email sequences | Email template file | Positive reply rate simulation | N/A (emerging) |
| Test coverage | Source code | % coverage | Continuous improvement loops |
| Bundle size | Build config | KB output | Reduction loops |
| SEO scoring | Page content | Lighthouse/SEO score | Score improvement |
| Security audit | Codebase | Vulnerability count | Count reduction |
| Prompt engineering | System prompt file | Eval pass rate | Iterative refinement |

### The Marketing Application Pattern

Eric Siu (Single Grain): *"Most marketing teams run ~30 experiments a year. The next generation will run 36,500+. They'll run experiments while they sleep."*

For email marketing, the pattern becomes:

```
Your "train.py"  →  Email template / subject line / copy
Your "prepare.py" →  Evaluation script (scores against criteria mechanically)
Your "program.md" →  Brand guidelines, tone constraints, optimization goals
Your "metric"     →  CTR, open rate, conversion rate, or composite score
```

The agent edits the template, the evaluation script scores it programmatically (e.g., checking for personalization, urgency, CTA clarity, character count, readability), and the agent keeps or reverts.

**Critical caveat:** For real email campaigns, you can't run 100 experiments overnight because each experiment requires actual human recipients and time to collect metrics. The autoresearch loop works in two modes for email:

1. **Offline mode (fast):** AI evaluates email copy against rubric criteria (proxy metric). Runs 100+ iterations overnight. Good for generating optimized starting candidates.
2. **Online mode (slow):** Actual A/B tests with real subscribers. One experiment per send. This is where the statistical constraints below apply.

---

## Part 3: Using Historical Data (CTR) as a Starting Point

### Yes — Historical CTR Data Is Extremely Valuable for Bootstrapping

**Bayesian Prior Initialization:**
- Collect baseline metrics from past campaigns: average CTR, open rate, conversion rate, and their variance
- Industry benchmarks for e-commerce email: open rates ~15-17%, CTR ~2-3%
- Initialize Beta distribution priors: if historical CTR is 2.5% from ~1000 sends, use Beta(25, 975)
- New experiments start from this informed prior rather than from scratch

**What historical data tells you:**
- **Baseline performance** — what "normal" looks like for your audience
- **Variance** — how much performance fluctuates naturally (critical for knowing when a change is real vs. noise)
- **Segment behavior** — which customer cohorts respond differently
- **Temporal patterns** — day-of-week and time-of-day effects
- **Content patterns** — which subject line styles, offers, and CTAs have historically performed best

**How to use it with autoresearch:**
1. Feed historical campaign data into the `program.md` equivalent (context document)
2. Have the AI agent analyze patterns: "Discount subject lines average 4.2% CTR vs. curiosity-gap lines at 2.8%"
3. Set the initial experiment variants informed by what's already worked
4. Use Thompson Sampling (Bayesian bandit) so historical performance shapes allocation from the start
5. Define the "beat this" baseline from your best historical campaign, not from zero

**Cold start vs. warm start:**
- **Cold start (no history):** Use industry benchmarks, run pure exploration phase first
- **Warm start (with history):** Skip exploration, immediately test variants inspired by top performers

---

## Part 4: Experiment Frequency — How Often Can You Run Optimization?

### Statistical Reality Check

Email A/B testing requires minimum sample sizes for statistical significance (alpha=0.05, power=0.80):

| Baseline CTR | Minimum Detectable Effect | Sample Size Per Variant |
|---|---|---|
| 2.5% | 20% relative lift (→ 3.0%) | ~14,600 |
| 2.5% | 30% relative lift (→ 3.25%) | ~6,500 |
| 2.5% | 50% relative lift (→ 3.75%) | ~2,400 |
| 5.0% | 20% relative lift (→ 6.0%) | ~7,000 |
| 5.0% | 50% relative lift (→ 7.5%) | ~1,100 |
| 15% (open rate) | 20% relative lift (→ 18%) | ~2,500 |

### Scenario A: 10 New Leads/Day + 3x/Week Marketing Emails

**Welcome/signup emails:**
- Monthly volume: ~300 new subscribers
- Annual volume: ~3,650 new subscribers
- A subject line A/B test detecting a 50% lift on 15% open rate needs ~600/variant = 1,200 total → **4 months per test**
- A CTR test (2.5% baseline, 50% lift) needs ~2,400/variant → **16 months** — essentially impractical

**Recommendations for 10 leads/day:**
- Do NOT run traditional A/B tests on welcome flows — sample sizes are too small
- Use **Thompson Sampling bandit** on welcome email subject lines (converges slowly but shifts allocation toward winners without requiring fixed sample size)
- Limit to **2 variants at a time** to concentrate limited data
- Focus exclusively on **large-effect changes** — completely different subject lines, presence vs. absence of a discount, radically different email formats (things that produce 50-100% lifts)
- **Test cycle for welcome emails:** Change variants every 3-6 months. 1-2 meaningful tests per year.
- **For marketing emails to existing list:** Depends on list size:

| Existing List Size | Weekly Sends (3x) | Testing Cadence |
|---|---|---|
| 500 | 1,500 | 1 subject line test/month (large effects only) |
| 2,000 | 6,000 | 1-2 tests/month |
| 5,000 | 15,000 | 2-4 tests/month |

- **Autoresearch offline mode value:** HIGH. Since you can't run fast online tests, use autoresearch to generate and score 50-100 email variants against evaluation rubrics overnight, then A/B test only the top 2 candidates. This dramatically reduces the number of online tests needed.

### Scenario B: 150 New Leads/Day + 3x/Week Marketing Emails

**Welcome/signup emails:**
- Monthly volume: ~4,500 new subscribers
- Annual volume: ~54,750 new subscribers
- Subject line test (open rate, 20% lift) needs ~5,000 total → **achievable in ~5 weeks**
- CTR test (2.5% baseline, 30% lift) needs ~13,000 total → **~3 months**

**Recommendations for 150 leads/day:**
- Run **continuous bandit optimization** on welcome series — Thompson Sampling with 3-4 variants, rotating in new challengers every 4-6 weeks
- Can sustain **6-10 traditional A/B tests per year** on welcome emails
- Abandoned cart flow tests (assuming 60-80% cart abandonment rate with 50+ orders/day = 100+ abandoned carts/day): **monthly A/B tests feasible**
- **Test cycle for welcome emails:** New variant every 4-6 weeks
- **For marketing emails to existing list:** With a growing list accumulating 150/day, the list grows fast:

| Time | Est. List Size | Weekly Sends (3x) | Testing Cadence |
|---|---|---|---|
| Month 1 | 4,500 | 13,500 | 2-3 tests/month |
| Month 6 | 27,000 | 81,000 | Weekly testing viable |
| Year 1 | 54,000+ | 162,000+ | Multiple concurrent tests; full optimization loop |

- **Autoresearch hybrid mode:** Use offline autoresearch to generate optimized candidates, then run online A/B tests with your larger sample. At 150/day, you can afford to test more subtle variations (10-20% lifts) rather than only dramatic changes.

### Summary Table: Test Frequency by Scenario

| | 10 leads/day | 150 leads/day |
|---|---|---|
| **Welcome email tests/year** | 2-4 (large effects only) | 8-12 (moderate effects detectable) |
| **Marketing email tests/month** | 1-2 (if list > 2k) | 4-8+ (growing quickly) |
| **Abandoned cart tests/year** | ~4 (if sufficient cart volume) | 12+ (monthly) |
| **Autoresearch offline loops/month** | Unlimited (run nightly) | Unlimited (run nightly) |
| **Recommended approach** | Bandit + offline autoresearch | Bandit + hybrid online/offline |

---

## Part 5: Which Email Campaign Types Are Good Candidates?

### Tier 1 — Best Candidates for AutoResearch

#### 1. Abandoned Cart Emails
- **Why:** High intent audience, clear conversion metric (recovery rate), sent frequently, highly testable elements (subject line, urgency framing, discount offer, product image layout)
- **AutoResearch fit:** EXCELLENT. The recovery rate provides a clean scalar metric. Volume is proportional to traffic, not just list size.
- **Typical baseline:** 5-15% recovery rate
- **What to optimize:** Subject lines, timing (1hr vs. 4hr vs. 24hr), incentive (no discount vs. 5% vs. 10% vs. free shipping), social proof inclusion, number of emails in sequence

#### 2. Welcome Series (Signup Emails)
- **Why:** Every subscriber enters this flow — volume scales directly with growth. First impressions set the tone for entire customer lifetime.
- **AutoResearch fit:** EXCELLENT. Open rate and CTR on first email are clean metrics. Can test subject line, content focus (brand story vs. product showcase vs. discount), timing between emails.
- **Typical baseline:** 50-60% open rate (highest of any email type), 10-15% CTR
- **What to optimize:** Subject line, discount offer (10% vs. 15% vs. free shipping), content sequence (brand → products → offer vs. offer → brand → products), email frequency in first week

#### 3. Promotional Blast Emails
- **Why:** Highest total volume (goes to full list), most sends per month (3x/week in our scenario), subject lines and offers are highly testable
- **AutoResearch fit:** EXCELLENT for offline optimization. Subject lines, preview text, CTA copy, offer framing, and email layout are all modifiable "files" the agent can iterate on.
- **Typical baseline:** 15-20% open rate, 2-3% CTR
- **What to optimize:** Subject lines (biggest lever), preview text, send time, offer presentation, CTA placement and copy, personalization approach

### Tier 2 — Good Candidates with Caveats

#### 4. Post-Purchase Follow-up
- **Why:** Good volume (proportional to orders), clear next actions (review request, cross-sell, repeat purchase)
- **Caveat:** Longer feedback loops if optimizing for repeat purchase rather than engagement
- **What to optimize:** Timing, cross-sell product selection, review request framing

#### 5. Product Highlight / New Arrivals
- **Why:** Regular sends, good for testing content formatting and product curation
- **Caveat:** Harder to isolate what's "the email" vs. "the product" driving performance
- **What to optimize:** Product selection algorithm, layout format, copy style

### Tier 3 — Harder to Optimize Automatically

#### 6. Win-Back / Re-engagement
- **Why:** High value per recovered customer
- **Caveat:** Low volume (only churning customers), long time horizons to measure success, small sample = slow learning
- **Better approach:** Use offline autoresearch to craft the best possible win-back sequence, then deploy as-is rather than trying to A/B test live

#### 7. Browse Abandonment
- **Why:** Can be high volume for larger stores
- **Caveat:** Requires sufficient site traffic; relevance is harder to measure than cart abandonment
- **Better approach:** Optimize the product recommendation algorithm rather than the email template

### Campaign Suitability Matrix

| Campaign Type | Online A/B Test Fit | Offline AutoResearch Fit | Combined Score |
|---|---|---|---|
| Abandoned cart | High (clear metric, good volume) | High (many testable elements) | Best |
| Welcome series | High (every subscriber) | High (critical first impression) | Best |
| Promotional blasts | High (largest audience) | High (subject lines, offers) | Best |
| Post-purchase | Medium (decent volume) | Medium (fewer levers) | Good |
| Product highlights | Medium (regular sends) | High (content optimization) | Good |
| Win-back | Low (small audience) | High (craft best version offline) | Moderate |
| Browse abandonment | Low-Medium | Medium | Moderate |

---

## Part 6: Practical Implementation for Midnight Muse Made

### Recommended Approach

1. **Install the Claude Code autoresearch skill** ([uditgoenka/autoresearch](https://github.com/uditgoenka/autoresearch))

2. **For each campaign type, create:**
   - A template file (the "train.py" — what the agent modifies)
   - An evaluation script (the "prepare.py" — scores the email against rubric criteria)
   - A program document (the "program.md" — brand guidelines, tone, constraints, optimization goals)

3. **Run offline optimization loops** to generate top candidates:
   - Score against: readability score, personalization depth, CTA clarity, urgency level, subject line length, emoji usage, brand voice adherence
   - Run 50-100 iterations per campaign type
   - Surface top 2-3 candidates for live testing

4. **Run online A/B tests** with the top offline candidates:
   - Use Thompson Sampling (bandit) for welcome flows
   - Use traditional A/B for promotional blasts (larger sample)
   - Track CTR as primary metric (most reliable post-Apple Mail Privacy Protection)
   - Always monitor unsubscribe rate and spam complaint rate as constraints

5. **Guard metrics (never sacrifice these for CTR gains):**
   - Unsubscribe rate < 0.3% per campaign
   - Spam complaint rate < 0.08% (Gmail threshold)
   - Brand voice consistency (evaluated by rubric)

### Tooling Note for Shopify

Per the CLAUDE.md notes: Shopify Email templates have **no API** — they must be managed in the Shopify UI. For true automated optimization with autoresearch, you would need a third-party email platform with API access like **Klaviyo** (most popular for Shopify, has built-in A/B testing, flow automation, and API access).

---

## Part 7: Offline Optimization Deep Dive — Approaches, Differences & Tradeoffs

The fundamental tension: **online testing gives you real signal but is slow and sample-constrained; offline testing is fast and unlimited but uses proxy metrics that may not perfectly predict real-world performance.** The art is in combining them.

### Approach 1: Heuristic / Rule-Based Scoring

**How it works:** A script mechanically scores each email variant against hard rules — no AI judgment involved.

**Example evaluation script:**
```bash
# Each check prints METRIC name=value
# Subject line length (40-60 chars optimal)
# Flesch reading ease score (target: 60-70 for marketing)
# Spam word count (fewer = better)
# CTA count (exactly 1 primary CTA = best)
# Personalization token count ({{first_name}}, etc.)
# Preview text present (yes/no)
# Image-to-text ratio
# Unsubscribe link present (compliance)
```

**What the autoresearch loop does:** Agent modifies the email template → script scores it → keep if total score improves → revert if not → repeat.

**Strengths:**
- Completely deterministic — same input always gives same score
- Runs in milliseconds — can do 500+ iterations overnight
- No API costs beyond Claude Code itself
- Easy to debug (you can see exactly why a score changed)
- Great for enforcing compliance and structural best practices

**Weaknesses:**
- Can only catch what you explicitly code for
- Optimizes for form, not substance — a perfectly-structured boring email scores high
- Can't evaluate persuasiveness, emotional resonance, or creativity
- Agent will game the rules (e.g., stuffing personalization tokens into awkward places to boost that sub-score)

**Best for:** Establishing a structurally sound baseline. Use as a "guard" metric (must pass) rather than the primary optimization target.

---

### Approach 2: LLM-as-Judge Evaluation

**How it works:** A separate LLM call (or the same agent wearing an "evaluator hat") scores the email against a rubric. The rubric defines what good looks like across multiple dimensions.

**Example rubric (scored 1-10 per dimension):**
```markdown
## Email Evaluation Rubric
- **Subject Line Appeal:** Would this make you open the email? (curiosity, urgency, relevance)
- **Value Proposition Clarity:** Is the benefit to the reader obvious within 3 seconds?
- **Brand Voice Consistency:** Does this sound like [your brand]? (refer to tone guide)
- **CTA Strength:** Is the call-to-action clear, specific, and compelling?
- **Personalization Quality:** Does it feel written for one person, not a list?
- **Scannability:** Can a reader get the gist by skimming headings and bold text?
- **Emotional Hook:** Does it connect to a desire, fear, or aspiration?
- **Unsubscribe Risk:** Would this annoy someone enough to unsubscribe? (inverse score)
```

**What the autoresearch loop does:** Agent modifies email → calls evaluator LLM with rubric → gets composite score → keep/revert → repeat.

**Strengths:**
- Can evaluate subjective quality (persuasiveness, tone, creativity)
- Flexible — change the rubric and you change what gets optimized
- Can simulate different audience perspectives ("Score this as a first-time visitor" vs. "Score this as a loyal repeat buyer")
- Catches subtle issues rules miss (awkward phrasing, unclear value prop)

**Weaknesses:**
- **Non-deterministic** — same email can score differently on repeated evaluations (mitigate by averaging 3-5 runs)
- **Self-reinforcing bias** — if the same model writes AND judges, it tends to prefer its own style. Scores drift toward "what Claude thinks is good" rather than "what your customers respond to"
- **Rubric sensitivity** — small wording changes in the rubric produce big score swings. Requires careful calibration.
- **API cost** — each evaluation is a full LLM call. At 100 iterations with 5 eval runs each = 500 API calls per night.
- **Proxy gap** — an LLM's judgment of "would this make you click?" has imperfect correlation with actual human CTR

**Best for:** Optimizing copy quality, tone, persuasiveness. The primary optimization metric for most email autoresearch loops.

**Mitigation strategies:**
- Use a different model for evaluation than for generation (e.g., generate with Claude, evaluate with GPT-4, or vice versa)
- Calibrate the rubric against historical data: score your 10 best and 10 worst past campaigns, verify the rubric ranks them correctly
- Add a "surprise" dimension to fight homogenization ("Does this contain at least one unexpected element?")

---

### Approach 3: Synthetic Audience Simulation

**How it works:** The LLM role-plays as different customer personas and "reacts" to each email variant. You create 10-20 synthetic personas based on your actual customer segments, then measure simulated engagement across the panel.

**Example personas:**
```markdown
Persona 1: Sarah, 28, first-time buyer, found you through Instagram, price-sensitive
Persona 2: Marcus, 45, repeat customer (6 orders), buys gifts, not price-sensitive
Persona 3: Jen, 33, subscribed 3 months ago, never purchased, browses weekly
Persona 4: Alex, 22, signed up for the discount, might unsubscribe soon
...
```

**For each persona, the evaluator answers:**
- Would this person open this email? (0 or 1)
- Would they click the CTA? (0 or 1)
- Would they unsubscribe? (0 or 1)
- Confidence level (1-5)

**Aggregate across all personas → simulated open rate, CTR, unsubscribe rate.**

**What the autoresearch loop does:** Agent modifies email → runs it past the persona panel → computes simulated metrics → keep/revert → repeat.

**Strengths:**
- Produces metrics in the same format as real campaign data (rates, percentages)
- Forces the optimization to consider diverse audience segments, not just the "average" reader
- Can surface tradeoffs (variant A is great for new subscribers but alienates loyalists)
- Catches "unsubscribe bombs" — variants that optimize CTR by being aggressive but drive churn

**Weaknesses:**
- **Personas are fictional** — they're the model's guess at how these people behave, not actual behavior data
- **Compounding hallucination** — model generates email, model role-plays personas, model aggregates results. Each layer adds uncertainty.
- **Expensive** — 20 personas x 5 questions x 100 iterations = 10,000 LLM calls per night
- **Calibration is hard** — how do you know your synthetic Sarah behaves like real Sarahs? You don't, unless you validate against historical data.
- **Convergence issues** — the agent may find emails that "trick" the personas rather than genuinely engaging humans

**Best for:** Catching segment-specific issues and preventing optimization for one group at the expense of others. Best used as a secondary check, not the primary metric.

---

### Approach 4: Historical Pattern Matching / Embedding Similarity

**How it works:** Embed your top-performing historical emails and your worst-performing ones into a vector space. Score new variants by their similarity to winners and distance from losers.

**Setup:**
1. Take your 20 highest-CTR campaigns and 20 lowest-CTR campaigns
2. Embed each using an embedding model
3. For each new email variant, compute: `score = avg_similarity(variant, winners) - avg_similarity(variant, losers)`

**What the autoresearch loop does:** Agent modifies email → embed it → compute similarity score → keep/revert → repeat.

**Strengths:**
- **Grounded in actual performance data** — the only approach that directly connects to what real humans did
- Deterministic (same email always gets same embedding score)
- Fast and cheap (embedding calls are ~100x cheaper than generation calls)
- Naturally encodes patterns you haven't explicitly identified (maybe your winners all have a certain rhythm or vocabulary the embeddings capture)

**Weaknesses:**
- **Regression to the mean** — optimizes toward "more like past winners," which means the agent converges on a blend of your existing style rather than discovering something new
- **Requires sufficient history** — needs 20+ campaigns with clear performance differentiation to work
- **Can't explain itself** — you know the score but not why
- **Doesn't generalize** — if your audience or product mix changes, historical patterns may not apply
- **Novelty penalty** — a genuinely creative, high-potential email that's unlike anything you've sent before would score low

**Best for:** Guardrail/sanity check. "Is this new variant at least in the neighborhood of what's worked before?" Use as a floor, not a ceiling.

---

### Approach 5: Composite / Ensemble Scoring (Recommended)

**How it works:** Combine multiple approaches with weighted scoring.

**Recommended composite for email autoresearch:**

```
TOTAL_SCORE = (
    0.15 × heuristic_score        # Structural quality floor
  + 0.45 × llm_judge_score        # Primary quality signal
  + 0.25 × persona_panel_score    # Segment diversity check
  + 0.15 × historical_similarity  # Grounding in real data
)

GUARD: heuristic_score >= 7/10        # Must pass structural checks
GUARD: persona_unsubscribe_rate < 5%  # Must not alienate segments
```

**Strengths:**
- No single failure mode dominates
- Heuristics catch structural issues, LLM catches quality issues, personas catch segment issues, history catches drift
- Guards prevent the agent from gaming any single dimension

**Weaknesses:**
- More complex to set up and calibrate
- Weight tuning is its own optimization problem (meta-autoresearch?)
- Slower per iteration (multiple eval calls)

---

### Tradeoff Summary Table

| Approach | Speed | Cost | Accuracy (proxy→real) | Novelty Discovery | Setup Effort |
|---|---|---|---|---|---|
| Heuristic/Rules | Fastest (ms) | Free | Low (structural only) | None | Medium |
| LLM-as-Judge | Medium (~5s) | Medium ($) | Medium-High | High | Low |
| Synthetic Personas | Slow (~30s) | High ($$) | Medium | Medium | High |
| Historical Embedding | Fast (~1s) | Low | Medium (past-biased) | None (penalizes novelty) | Medium |
| **Composite (recommended)** | **Medium (~15s)** | **Medium ($)** | **Highest** | **Medium-High** | **High** |

### Iterations Per Night (8 hours, single loop)

| Approach | Time Per Iteration | Iterations/Night |
|---|---|---|
| Heuristic only | ~2 seconds | ~14,000 |
| LLM-as-Judge (3 evals) | ~20 seconds | ~1,400 |
| Full composite | ~45 seconds | ~640 |
| Composite + 3 retries on close calls | ~90 seconds | ~320 |

Even the slowest approach gives you **320 experiments overnight** — 10x what most marketing teams run in a year.

---

### The Proxy Gap: The Central Tradeoff

All offline approaches share one fundamental limitation: **they optimize for a proxy of real human behavior, not actual human behavior.**

```
Proxy fidelity spectrum:

Heuristics ──── Embeddings ──── LLM Judge ──── Synthetic Personas ──── Real A/B Test
   Low                                                                     High
   (structural)    (pattern)      (quality)      (simulated behavior)     (actual behavior)

   Fast ───────────────────────────────────────────────────────────────── Slow
   Free ───────────────────────────────────────────────────────────────── Expensive (in time)
```

**The recommended workflow is a funnel:**

1. **Offline autoresearch** (overnight): Generate and evaluate 300+ variants → surface top 5
2. **Human review** (10 minutes): Pick the best 2 from the top 5
3. **Online A/B test** (days/weeks): Test the 2 finalists with real subscribers
4. **Feed results back** into historical data → improve the offline scoring calibration

This gives you the speed of offline optimization with the accuracy of online testing. The offline loop doesn't replace A/B testing — it dramatically narrows the search space so your limited online testing budget is spent on already-strong candidates rather than random guesses.

---

## Sources

- [karpathy/autoresearch (GitHub)](https://github.com/karpathy/autoresearch)
- [uditgoenka/autoresearch — Claude Code Skill (GitHub)](https://github.com/uditgoenka/autoresearch)
- [drivelineresearch/autoresearch-claude-code (GitHub)](https://github.com/drivelineresearch/autoresearch-claude-code)
- [ARIS — Auto-Research-In-Sleep (GitHub)](https://github.com/wanshuiyin/Auto-claude-code-research-in-sleep)
- [How to Use Claude Code with AutoResearch (MindStudio)](https://www.mindstudio.ai/blog/claude-code-autoresearch-self-improving-skills)
- [AutoResearch Pattern Applied to Marketing (MindStudio)](https://www.mindstudio.ai/blog/karpathy-autoresearch-pattern-marketing-automation)
- [Autonomous Marketing Optimization Agent (MindStudio)](https://www.mindstudio.ai/blog/autonomous-marketing-optimization-agent-autoresearch-loop)
- [AutoResearch 101 Builder's Playbook (Substack)](https://sidsaladi.substack.com/p/autoresearch-101-builders-playbook)
- [15 Hours of AI-Driven Optimization on CIFAR-10 (Medium)](https://medium.com/@zljdanceholic/15-hours-of-ai-driven-optimization-what-i-learned-using-claude-code-and-autoresearch-on-cifar-10-5bc50dd9749f)
- [The Karpathy Loop: 700 Experiments (Fortune)](https://fortune.com/2026/03/17/andrej-karpathy-loop-autonomous-ai-agents-future/)
- [Karpathy's Autoresearch Explained (DataScienceDojo)](https://datasciencedojo.com/blog/karpathy-autoresearch-explained/)
- [Guide to AutoResearch (DataCamp)](https://www.datacamp.com/tutorial/guide-to-autoresearch)
- [Karpathy Autonomous Experiment Loop (The New Stack)](https://thenewstack.io/karpathy-autonomous-experiment-loop/)
- [How Autoresearch Will Change SLM Adoption (Phil Schmid)](https://www.philschmid.de/autoresearch)
- [Karpathy's Setup Guide + Use Cases (Substack)](https://nicholasrhodes.substack.com/p/karpathy-autoresearch-setup-guide-use-cases)
