# Coaching model spend per runner per month

**Date:** 14 October 2026

This note estimates first-party Claude API spend to coach one active runner for a month. It is an input to a later decision. It does not set a subscription price, and it does not decide whether any unpaid access exists.

Prices were read on 14 October 2026 from Anthropic's pricing documentation: [platform.claude.com/docs/en/about-claude/pricing](https://platform.claude.com/docs/en/about-claude/pricing) (HTTP date `Wed, 14 Oct 2026 20:25:49 GMT`; the same page is served as Markdown at `https://platform.claude.com/docs/en/about-claude/pricing.md`). The same afternoon, the API tab on [claude.com/pricing](https://claude.com/pricing) (HTTP date `Wed, 14 Oct 2026 20:31:13 GMT`) showed the same base, 5-minute cache-write, and cache-read rates used below. That marketing tab labels its cache prices as the 5-minute TTL. The 1-hour cache-write rates are taken from the documentation page.

Every token count below is an **assumption**. Nothing here was measured from production traffic.

## Ranges (uncached)

USD per runner, first-party Claude API, global routing (the default). The low end is the small text assumption with no thinking tokens. The high end is the large text assumption plus the thinking-token assumption. Calls are priced with no prompt-cache hit. Caching is a separate section, because a 5-minute or 1-hour cache expires between sessions that are hours or days apart.

| Call | Claude Sonnet 5.5 `claude-sonnet-5-5` | Claude Haiku 5.5 `claude-haiku-5-5` | Claude Sonnet 4.6 `claude-sonnet-4-6` |
| --- | ---: | ---: | ---: |
| One week of structured workouts | $0.0125 – $0.0794 | $0.000624 – $0.003970 | $0.0144 – $0.1020 |
| One rewrite of the upcoming seven days | $0.0143 – $0.0846 | $0.000715 – $0.004230 | $0.0165 – $0.1080 |
| One short check-in reply | $0.0060 – $0.0327 | $0.000299 – $0.001635 | $0.0069 – $0.0405 |
| Low month (4 weeks, 1 rewrite, 4 check-ins) | $0.0881 – $0.5330 | $0.004407 – $0.026650 | $0.1017 – $0.6780 |
| Busy month (5 weeks, 8 rewrites, 12 check-ins) | $0.2486 – $1.4662 | $0.012428 – $0.073310 | $0.2868 – $1.8600 |

Sonnet 5.5 is the current Sonnet on the [models overview](https://platform.claude.com/docs/en/models/overview) (API id `claude-sonnet-5-5`). Haiku 5.5 is the current smaller model on that page (API id `claude-haiku-5-5`), described there as the fastest, most cost-efficient model. Haiku 5.5's higher prompt-length prices are not used: every assumed call stays under 100,000 input tokens.

`claude-sonnet-4-6` is still an official id. The pricing page lists it under the display name **Claude Sonnet 4.6**. The model page [Claude Sonnet 4.6](https://platform.claude.com/docs/en/models/sonnet-4-6/overview) gives the id `claude-sonnet-4-6` and the same rates. No substitute Sonnet was needed.

## Prices used

USD per million tokens (MTok). Source: the pricing page above, model-pricing table and prompt-caching section.

| | Sonnet 5.5 | Haiku 5.5, prompt ≤100,000 tokens | Sonnet 4.6 |
| --- | ---: | ---: | ---: |
| Base input | $2 | $0.10 | $3 |
| Output | $10 | $0.50 | $15 |
| 5-minute cache write (1.25× input) | $2.50 | $0.125 | $3.75 |
| 1-hour cache write (2× input) | $4 | $0.20 | $6 |
| Cache read | $0.10 (0.05× input) | $0.01 (0.1× input) | $0.30 (0.1× input) |

Haiku 5.5 for a prompt over 100,000 tokens, from the same table: input $0.50, output $2.50, 5-minute cache write $0.625, 1-hour cache write $1, cache read $0.05. A request's prompt length includes cache reads and cache writes. That row is unused under the token assumptions below.

Other listed facts that are not applied in the tables:

- Batch API is 50% off input and output. These calls are interactive, so the discount is not applied.
- US-only inference (`inference_geo: "us"`) is a 1.1× multiplier on Claude 4.6 and later models, including cache writes and cache reads. The tables use global routing, which the pricing page says is the default and uses standard pricing.
- Fast mode is listed for Opus models. It is not a Sonnet or Haiku price.

Claude Sonnet 5 is also on the pricing page, at $2 / $10 per MTok input/output, with cache reads at $0.20 (0.1×, not Sonnet 5.5's 0.05×). Footnote 3 says the $2 / $10 rate, once described as introductory through 31 August 2026, is now the standard price, and the previously scheduled move to $3 / $15 on 1 September 2026 will not occur. Sonnet 5 is not one of the three columns above.

## Sibling spec, checked against the price page

Prior internal guess only: `running-tutor` `SPEC.md` sections 7.4 and 9. It is not a source for the token counts or the month shapes in this note.

Section 7.4 names Sonnet 4.6 at $3/M input, $15/M output, and $0.30/M cached read. Those three rates match the official pricing page and the Sonnet 4.6 model page on 14 October 2026. The spec does not state cache-write prices. The official 5-minute write is $3.75/MTok and the official 1-hour write is $6/MTok.

Section 9's `$2` per day per user cap does not appear on the official pricing page. It is that spec's own application limit. This note does not use it as a price or as a spend ceiling. The spec's quotas (week generations, adjusts, check-ins) are also unused.

## Assumptions

### Token counts, sized on the previous tokenizer

Claude Sonnet 4.6 and earlier models use the previous tokenizer. Claude 4.7 and later models, which includes Sonnet 5.5 and Haiku 5.5, use a newer tokenizer that the pricing page says produces approximately 30% more tokens for the same text. The exact increase depends on the content. In the arithmetic, Sonnet 5.5 and Haiku 5.5 multiply the text assumptions by **1.3**. That factor is Anthropic's stated approximate, applied as 1.3, not a count from their tokenizer. Sonnet 4.6 uses **1.0**.

Thinking tokens are already an assumed billed-token count, so the 1.3 factor is not applied to them. If the same reasoning text is also about 30% longer on the new tokenizer, the high end moves up by 30% of the thinking-token output charge. On Sonnet 5.5 that sensitivity is about $0.009 on a high week or rewrite and about $0.002 on a high check-in.

A compact seven-day JSON sample (warmup, steady or intervals, recovery, cooldown, no essay) is about 1,400 characters. The pricing page's character-to-token illustration for the current tokenizer is roughly 2.5 characters per token at the 1M-token window. That sketch is only a sanity check on the low output band. It is not an official count.

| Piece | Low | High | What it stands for |
| --- | ---: | ---: | --- |
| Standing instructions `S` | 1,500 | 6,000 | Stable coaching rules and the JSON output shape. Cached only when a cache hit actually happens. |
| Week variable input `Vw` | 800 | 3,000 | Profile, recent reports, and the request to write the next week. |
| Rewrite variable input `Vr` | 1,500 | 5,000 | The same runner context, plus the seven days being replaced and the life note. |
| Check-in variable input `Vc` | 400 | 1,500 | The latest report and a short question. |
| Week or rewrite response `Ow` | 500 | 2,000 | Seven days of blocks (warmup, intervals or steady work, recovery, cooldown). Not a long essay. |
| Check-in response `Oc` | 80 | 400 | A short reply. |
| Week or rewrite thinking `Tw` | 0 | 3,000 | Billed output tokens for reasoning. See below. |
| Check-in thinking `Tc` | 0 | 800 | Billed output tokens for reasoning. See below. |

The low standing-instruction size (1,500 previous-tokenizer tokens, 1,950 after ×1.3) is above the [prompt-caching minimums](https://platform.claude.com/docs/en/build-with-claude/prompt-caching): 512 tokens for Sonnet 5.5 and Haiku 5.5, and 1,024 tokens for Sonnet 4.6. A shorter prefix is not cached. The API still answers, and it bills that prefix as ordinary input. The documentation says a too-short cache request returns no error.

### Thinking tokens

The [thinking documentation](https://platform.claude.com/docs/en/build-with-claude/thinking) says thinking tokens are billed as output tokens, including when the thinking text is omitted from the response. There is no published token count for a workout JSON call. The 0 / 3,000 and 0 / 800 figures are assumptions.

Default behavior, from that page and the model pages:

- **Sonnet 5.5.** Adaptive thinking is on by default. `thinking: {type: "disabled"}` returns a 400 error. The low end of the range assumes `thinking: {type: "between_tools"}` and no tools. The docs say that, without tools, the response contains only text. Default effort on the models overview is `high`.
- **Haiku 5.5.** Adaptive thinking is on by default. `thinking: {type: "disabled"}` is accepted at effort `high` or below. Default effort is `medium`, which the steering page says may skip thinking for simple queries. The low end assumes zero thinking tokens.
- **Sonnet 4.6.** Thinking is off until the request sets `thinking: {type: "adaptive"}`. The low end, and the "high text, no thinking" figures further down, match that default. The top of the range adds the thinking-token assumption only if adaptive thinking is turned on. Default effort is `high`.

The same thinking-token band is used for all three models so the dollar gap is the price gap. Haiku's medium default makes the low end more plausible for a short check-in than the 800-token high end is.

### A month

| Month | Week generations | Rewrites of the upcoming seven days | Short check-ins | Calls |
| --- | ---: | ---: | ---: | ---: |
| Low | 4 | 1 | 4 | 9 |
| Busy | 5 | 8 | 12 | 25 |

Assumptions behind those counts: a low month writes one structured week for each of four weeks, life forces one rewrite, and the runner sends one short check-in a week. A busy month includes a partial fifth week, about two rewrites a week, and about three check-ins a week. Calls in the low month are more than an hour apart. In the busy month, some calls may land in a short burst; that case is only in the caching section.

### Left out of the dollar figures

No tool definitions, no web search ($10 per 1,000 searches on the pricing page), no images, no multi-turn transcript carried forward, no retries, and no data-residency multiplier. Prior-turn thinking is not carried into the next call. A failed generation that is retried would add another call of the same shape.

## Arithmetic

```
billed_input  = tokenizer_factor × (S + V)
billed_output = tokenizer_factor × O + T
usd           = billed_input  × input_price  / 1,000,000
              + billed_output × output_price / 1,000,000
```

`tokenizer_factor` is 1.3 for Sonnet 5.5 and Haiku 5.5, and 1.0 for Sonnet 4.6. `T` is 0 on the low bound and the thinking assumption on the high bound.

### One week, expanded

**Sonnet 4.6, low.** `S = 1,500`, `V = 800`, `O = 500`, `T = 0`.

```
input  = 1,500 + 800 = 2,300
output = 500
usd    = 2,300 × 3 / 1,000,000 + 500 × 15 / 1,000,000
       = 0.0069 + 0.0075
       = 0.0144
```

**Sonnet 4.6, high.** `S = 6,000`, `V = 3,000`, `O = 2,000`, `T = 3,000`.

```
input  = 6,000 + 3,000 = 9,000
output = 2,000 + 3,000 = 5,000
usd    = 9,000 × 3 / 1,000,000 + 5,000 × 15 / 1,000,000
       = 0.0270 + 0.0750
       = 0.1020
```

**Sonnet 5.5, low.** Same text, ×1.3. Prices $2 and $10.

```
input  = 1.3 × (1,500 + 800) = 2,990
output = 1.3 × 500 + 0 = 650
usd    = 2,990 × 2 / 1,000,000 + 650 × 10 / 1,000,000
       = 0.00598 + 0.00650
       = 0.01248
```

**Sonnet 5.5, high.**

```
input  = 1.3 × (6,000 + 3,000) = 11,700
output = 1.3 × 2,000 + 3,000 = 5,600
usd    = 11,700 × 2 / 1,000,000 + 5,600 × 10 / 1,000,000
       = 0.0234 + 0.0560
       = 0.0794
```

**Haiku 5.5** uses the same billed token counts as Sonnet 5.5 and the ≤100,000-token prices ($0.10 input, $0.50 output):

```
low  = 2,990 × 0.10 / 1,000,000 + 650 × 0.50 / 1,000,000 = 0.000624
high = 11,700 × 0.10 / 1,000,000 + 5,600 × 0.50 / 1,000,000 = 0.003970
```

### Every uncached call

"Text high" is the high text assumption with `T = 0`. "High" adds thinking tokens. Input and output columns are billed tokens.

| Model | Call | Bound | Input tokens | Output tokens | USD |
| --- | --- | --- | ---: | ---: | ---: |
| Sonnet 5.5 | Week | Low | 2,990 | 650 | 0.012480 |
| Sonnet 5.5 | Week | Text high | 11,700 | 2,600 | 0.049400 |
| Sonnet 5.5 | Week | High | 11,700 | 5,600 | 0.079400 |
| Sonnet 5.5 | Rewrite | Low | 3,900 | 650 | 0.014300 |
| Sonnet 5.5 | Rewrite | Text high | 14,300 | 2,600 | 0.054600 |
| Sonnet 5.5 | Rewrite | High | 14,300 | 5,600 | 0.084600 |
| Sonnet 5.5 | Check-in | Low | 2,470 | 104 | 0.005980 |
| Sonnet 5.5 | Check-in | Text high | 9,750 | 520 | 0.024700 |
| Sonnet 5.5 | Check-in | High | 9,750 | 1,320 | 0.032700 |
| Haiku 5.5 | Week | Low | 2,990 | 650 | 0.000624 |
| Haiku 5.5 | Week | Text high | 11,700 | 2,600 | 0.002470 |
| Haiku 5.5 | Week | High | 11,700 | 5,600 | 0.003970 |
| Haiku 5.5 | Rewrite | Low | 3,900 | 650 | 0.000715 |
| Haiku 5.5 | Rewrite | Text high | 14,300 | 2,600 | 0.002730 |
| Haiku 5.5 | Rewrite | High | 14,300 | 5,600 | 0.004230 |
| Haiku 5.5 | Check-in | Low | 2,470 | 104 | 0.000299 |
| Haiku 5.5 | Check-in | Text high | 9,750 | 520 | 0.001235 |
| Haiku 5.5 | Check-in | High | 9,750 | 1,320 | 0.001635 |
| Sonnet 4.6 | Week | Low | 2,300 | 500 | 0.014400 |
| Sonnet 4.6 | Week | Text high | 9,000 | 2,000 | 0.057000 |
| Sonnet 4.6 | Week | High | 9,000 | 5,000 | 0.102000 |
| Sonnet 4.6 | Rewrite | Low | 3,000 | 500 | 0.016500 |
| Sonnet 4.6 | Rewrite | Text high | 11,000 | 2,000 | 0.063000 |
| Sonnet 4.6 | Rewrite | High | 11,000 | 5,000 | 0.108000 |
| Sonnet 4.6 | Check-in | Low | 1,900 | 80 | 0.006900 |
| Sonnet 4.6 | Check-in | Text high | 7,500 | 400 | 0.028500 |
| Sonnet 4.6 | Check-in | High | 7,500 | 1,200 | 0.040500 |

Rewrite and check-in use the same formula with their own `V`, `O`, and `T`. Example, Sonnet 4.6 rewrite, low: input `1,500 + 1,500 = 3,000`, output `500`, USD `3,000 × 3 / 1,000,000 + 500 × 15 / 1,000,000 = 0.0165`.

### Month totals

```
low  = 4 × week + 1 × rewrite + 4 × check-in
busy = 5 × week + 8 × rewrite + 12 × check-in
```

Each bound uses that bound for every call. Low months are not mixed with high calls.

| Model | Month | Low | Text high | High (text + thinking) |
| --- | --- | ---: | ---: | ---: |
| Sonnet 5.5 | Low | 0.088140 | 0.351000 | 0.533000 |
| Sonnet 5.5 | Busy | 0.248560 | 0.980200 | 1.466200 |
| Haiku 5.5 | Low | 0.004407 | 0.017550 | 0.026650 |
| Haiku 5.5 | Busy | 0.012428 | 0.049010 | 0.073310 |
| Sonnet 4.6 | Low | 0.101700 | 0.405000 | 0.678000 |
| Sonnet 4.6 | Busy | 0.286800 | 1.131000 | 1.860000 |

Check, Sonnet 4.6 low month, low bound:

```
4 × 0.0144 + 1 × 0.0165 + 4 × 0.0069
= 0.0576 + 0.0165 + 0.0276
= 0.1017
```

Check, Sonnet 5.5 busy month, high bound:

```
5 × 0.0794 + 8 × 0.0846 + 12 × 0.0327
= 0.3970 + 0.6768 + 0.3924
= 1.4662
```

On Sonnet 4.6 the default is thinking off, so the default span is the low column through the text-high column: about $0.10 – $0.41 in a low month and about $0.29 – $1.13 in a busy month. The $0.68 and $1.86 figures are the month if adaptive thinking is on and the thinking-token assumption holds.

## What prompt caching does

Source: the pricing page (cache multipliers, and the statement that a 5-minute cache pays off after one cache read and a 1-hour cache pays off after two cache reads) and the [prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) page (minimum lengths, 5-minute default TTL, 1-hour TTL at 2×, and that a cache read refreshes the TTL at no extra charge).

The standing instructions are the only stable prefix. Variable runner context, the response, and thinking tokens stay at the ordinary input and output prices. Caching changes only the prefix portion.

A cache read also refreshes that entry. The next call still has to arrive before the TTL ends. A runner who generates a week, then checks in the next day, misses both the 5-minute cache and the 1-hour cache. Turning caching on for that pattern bills a cache **write** and no read:

```
prefix_usd = prefix_tokens × price / 1,000,000
```

High standing prefix: 6,000 tokens on Sonnet 4.6, and `1.3 × 6,000 = 7,800` on Sonnet 5.5 and Haiku 5.5.

| Model | Prefix tokens | Uncached | 5-minute write | 1-hour write | Cache read |
| --- | ---: | ---: | ---: | ---: | ---: |
| Sonnet 5.5 | 7,800 | 7,800 × $2 / 1e6 = $0.0156 | 7,800 × $2.50 / 1e6 = $0.0195 | 7,800 × $4 / 1e6 = $0.0312 | 7,800 × $0.10 / 1e6 = $0.00078 |
| Haiku 5.5 | 7,800 | 7,800 × $0.10 / 1e6 = $0.00078 | 7,800 × $0.125 / 1e6 = $0.000975 | 7,800 × $0.20 / 1e6 = $0.00156 | 7,800 × $0.01 / 1e6 = $0.000078 |
| Sonnet 4.6 | 6,000 | 6,000 × $3 / 1e6 = $0.0180 | 6,000 × $3.75 / 1e6 = $0.0225 | 6,000 × $6 / 1e6 = $0.0360 | 6,000 × $0.30 / 1e6 = $0.0018 |

One cold 5-minute write, with no later read, costs 0.25× the base input price extra on the prefix ($0.0045 on Sonnet 4.6 at the high prefix, $0.0039 on Sonnet 5.5). A cold 1-hour write costs a full extra 1× ($0.0180 and $0.0156 on those same prefixes). Across a low month of 9 isolated calls, leaving the 5-minute cache on and hitting nothing adds `9 ×` that per-call premium: $0.0405 on Sonnet 4.6 and $0.0351 on Sonnet 5.5, at the high prefix. The 1-hour cold premium for those 9 calls is $0.1620 and $0.1404.

A burst that does land inside the TTL is cheaper than two uncached calls. High bound, one rewrite and one check-in, one 5-minute write of the prefix and one cache read, variable tokens and output unchanged:

| Model | Two calls, uncached | 5-minute write + one read | Difference |
| --- | ---: | ---: | ---: |
| Sonnet 5.5 | 0.084600 + 0.032700 = 0.117300 | 0.117300 − 2 × 0.0156 + 0.0195 + 0.00078 = 0.106380 | −0.010920 |
| Haiku 5.5 | 0.004230 + 0.001635 = 0.005865 | 0.005865 − 2 × 0.00078 + 0.000975 + 0.000078 = 0.005358 | −0.000507 |
| Sonnet 4.6 | 0.108000 + 0.040500 = 0.148500 | 0.148500 − 2 × 0.0180 + 0.0225 + 0.0018 = 0.136800 | −0.011700 |

The saving is only on the prefix. Output price is untouched, and on these calls output is most of the bill. At the Sonnet 4.6 high pair, caching saves $0.0117 of a $0.1485 pair.

Assumption for a busy month in which half of the 25 calls are 5-minute cache reads and half are 5-minute cache writes (a second call inside the same 5-minute window as the write), high text and thinking. The variable input and the output stay at the uncached high month; only the prefix is repriced. Sonnet 4.6, high prefix:

```
uncached prefix = 25 × 6,000 × $3 / 1,000,000 = $0.4500
mixed prefix    = 25 × 6,000 × (0.5 × $3.75 + 0.5 × $0.30) / 1,000,000
                = 150,000 × $2.025 / 1,000,000
                = $0.30375
month           = $1.8600 − $0.4500 + $0.30375 = $1.71375
```

The same half-and-half prefix mix is $1.3297 on Sonnet 5.5 (from $1.4662 uncached) and $0.066972 on Haiku 5.5 (from $0.073310). On the low token bound the prefix is smaller, so the dollar change is smaller: Sonnet 5.5 busy-low moves from $0.248560 to $0.214435.

A 1-hour write pays off after two reads, as the pricing page says. High prefix, three calls' worth of prefix only:

```
Sonnet 4.6 uncached: 3 × 6,000 × $3 / 1e6 = $0.0540
1-hour write + two reads: 6,000 × $6 / 1e6 + 2 × 6,000 × $0.30 / 1e6 = $0.0396
```

That trio has to fit inside an hour of the write, or inside an hour of a read that refreshed it. A calendar month of coaching calls does not fit in one TTL. Keeping the prefix warm all month would require a refresh inside every TTL window, and each refresh that misses is another cache write.

## Figure that is not an official price

The sibling spec's **$2 per day per user** cap is not on the official pricing page, the Sonnet 4.6 model page, or the API tab of claude.com/pricing. It was not verified, and it is not used above.

The Sonnet 4.6 input, output, and cache-read rates from that spec were verified. The 5-minute and 1-hour cache-write rates were missing from the spec and are taken from the official page ($3.75 and $6 per MTok).
