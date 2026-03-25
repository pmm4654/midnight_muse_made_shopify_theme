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
