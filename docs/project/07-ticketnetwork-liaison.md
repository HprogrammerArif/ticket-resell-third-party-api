# TicketNetwork Liaison — Correspondence, Answers & Open Questions

**Last Updated:** 2026-08-22
**Owner:** Mohammed Arif
**Counterparties:** TicketNetwork Integration Support

---

## What This Doc Is

The single record of everything TicketNetwork has told us, everything we've asked, and everything still unanswered. Email threads are not a source of truth — this file is. Anything learned from TicketNetwork gets recorded here first, then propagated to the affected spec doc.

Raw email transcript lives at `docs/convesation-i-had-with-ticketnetwork-as-developer.md`. This file is the distilled, decision-relevant version.

---

## Contacts

| Person | Role | Email |
|--------|------|-------|
| Ian Schultz | Primary contact — Private Label, commercial, checkout | Ian.Schultz@ticketnetwork.com |
| Yuliya Biziuk | API Integration Lead / Front-End Developer | Yuliya.Biziuk@ticketnetwork.com |
| TN Integration Support | General integration queue | IntegrationSupport@ticketnetwork.com |
| TN Support | Bugs, map requests, portal accounts | support@ticketnetwork.com |
| Maps Feedback | MapWidget feature requests | MapsFeedback@ticketnetwork.com |

Always quote account `ZX7910-STORE` (or the BID/ZX#) in support correspondence — they route on it.

---

## Correspondence Timeline

| Date | Direction | Substance |
|------|-----------|-----------|
| 2026-08-08 | Us → TN Support | Opening 9 questions: order placement, pricing, fulfillment, webhooks, refunds, settlement, subscriptions, production access, rate limits |
| 2026-08-09 | Yuliya → Us | "Looks like need Mercury API" — routed to Ian |
| 2026-08-10 | Us → Yuliya | Mercury onboarding questions |
| 2026-08-10 | Ian → Us | Qualifying question: do you want to be Merchant of Record, or use our checkout? |
| 2026-08-11 | Us → Ian | Answered: Option B (TN as Merchant of Record). Asked 5 questions on handoff, commission, attribution, order status, sandbox |
| 2026-08-11 | Ian → Us | **Full answers inline** — Private Label model confirmed. See Resolved section below |
| 2026-08-14 | Us → Ian | Shared Figma file; asked which design sections lack CatalogAPI data |
| 2026-08-14 | Ian → Us | "This looks good." Corrected the Stripe assumption. **Asked: what data sources are you missing?** Directed us to MapWidgetTool for pricing + maps. Attached `MapWidget3+Integration+Guide.pdf` |
| 2026-08-19 | Us → Steven | Requested written gift-card process doc; confirmed NDA received |
| 2026-08-19 | Us → Ian | Answered his question, confirmed NDA, requested Sandbox checkout access, 13 numbered questions. Steven cc'd (imesentertainment@gmail.com) |
| 2026-08-19 | Ian → Us | **All 13 answered inline.** See R12–R25. Deferred five technical items to Integration Support; asked us to clarify the checkout-info request; asked which email to open the TN Portal account under |

**Cadence observed:** Ian replies within 6–24 hours, answers inline point-by-point, and handles numbered lists well. Long consolidated emails work with him; short ones waste round trips. Turnaround from first contact to Private Label model confirmed was 3 days.

**Division of labour, learned 2026-08-19:** Ian owns commercial, Portal access, branding, payouts and policy. He routes anything endpoint-level or code-level to `IntegrationSupport@ticketnetwork.com` — Maps config IDs, `useC3`/`c3CheckoutDomain` values, CatalogAPI field semantics, SPA integration. Send technical questions there directly instead of through Ian.

---

## Resolved — What TicketNetwork Has Confirmed

All answers from Ian Schultz unless noted.

| # | Question | Answer | Date |
|---|----------|--------|------|
| R1 | Which model applies to us | **Private Label** — we drive traffic to a TN-hosted checkout. TN is Merchant of Record | 2026-08-11 |
| R2 | Mercury API needed? | **No.** Mercury is for integrators acting as their own Merchant of Record. Using Mercury means *not* leveraging TN checkout. We use Catalog + TN hosted checkout | 2026-08-11 |
| R3 | Checkout mechanism | Redirect to TN-hosted checkout. Not embeddable, not themeable to match our site | 2026-08-11 |
| R4 | Who owns payment/risk/fulfillment | TN — merchant processing, chargebacks, fraud review, fulfillment | 2026-08-11 |
| R5 | Attribution mechanism | UTM parameters + GTM tags placed within the flow. No affiliate-ID parameter | 2026-08-11 |
| R6 | Commission reporting | A sales reporting dashboard TN grants access to. **Not** an API or webhook | 2026-08-11 |
| R7 | Commission structure | Inventory at wholesale. We set markup. TN retains 7.5% of wholesale; we earn the balance. Example: wholesale $100, markup 20% → customer pays $120, TN retains $7.50, commission $12.50 | 2026-08-11 |
| R8 | Order status back to us | None. Customer gets confirmation + receipt directly, white-labeled to our brand. No action required on our part | 2026-08-11 |
| R9 | Sandbox checkout testing | Available **once an NDA is signed** | 2026-08-11 |
| R10 | Where pricing and seat maps come from | **MapWidgetTool (Seatics MapWidget3)** — not a JSON API. Guide provided | 2026-08-14 |
| R11 | Stripe in our Figma checkout | Not applicable — TN's hosted checkout owns that UX/UI entirely | 2026-08-14 |
| R12 | Static seat-map images outside the widget | **None.** MapWidget is the only surface. No additional endpoints, no images | 2026-08-19 |
| R13 | Order data back to us | **Not possible.** "How can that be if we are the ones handling fulfillment? You would need a webhook for that. I don't see this being possible since we are facilitating end to end" | 2026-08-19 |
| R14 | Any customer-facing order view | TN provides a "UA option" the customer has access to. The link to that account is inside the order receipt and confirmation email | 2026-08-19 |
| R15 | Cancellation / reschedule notification path to us | None. Handled entirely by TicketNetwork | 2026-08-19 |
| R16 | Maps `websiteConfigId` | "I believe it is 12498" — Ian, pending Integration Support confirmation | 2026-08-19 |
| R17 | TN Portal account + Maps Configuration Management Tool | **Yes, granted on request.** TN needs the email address to set it up | 2026-08-19 |
| R18 | Do `c3Utm*` params feed sales reporting? | Yes. **Testable only in Production** — not in Sandbox | 2026-08-19 |
| R19 | Promo codes | Managed in **TN Portal**, by TN internally and by us externally once access is granted. The discount applies to the retail price and **comes out of our margin** | 2026-08-19 |
| R20 | Gift cards | Codes must be **created in TN Portal ahead of time** | 2026-08-19 |
| R21 | Branding of checkout and receipt emails | Limited — "certain elements such as button color, logo." **Not custom styling.** Same for checkout | 2026-08-19 |
| R22 | Our iframe embedding of MapWidget3 | "I am fairly certain we do not support/recommend this route as iframes can present security issues." Integration Support to confirm | 2026-08-19 |
| R23 | Where markup is configured; where sales reporting lives | **Both in TN Portal** | 2026-08-19 |
| R24 | Production access | Go-live gate is verifying the ticket group passes correctly from maps → checkout. **Production starts at 50 calls/min** — lower than Sandbox Trial's 60 — increasable on request if we hit errors. No formal review checklist named | 2026-08-19 |
| R25 | Commission payouts | Steven submits banking info **once the site is live** — not a prerequisite. Paid **bi-weekly**, minimum threshold believed **$5**. Cancellations and lost chargebacks are **clawed back on the next remittance**; TN contests chargebacks on partners' behalf | 2026-08-19 |
| R26 | Which Seatics deployment serves a Sandbox event | **Sandbox catalog event IDs exist only in Sandbox Seatics.** `mapwidget3.seatics.com` answers `emptyEvent:true` / `mapIsInteractive:false` for a Sandbox event ID, while `mapwidget3-sandbox.seatics.com` returns the full interactive map. Verified on event 5215228 (Hamilton, Richard Rodgers Theatre). 47/50 Sandbox events have live maps. The map host must therefore track `TN_BASE_URL`, never `NODE_ENV` | 2026-08-20 |

---

## Decisions Forced by the 2026-08-19 Reply

**D1 — The customer Orders area cannot be built.** R13 and R15 close it: no order data, no webhooks, no cancellation notifications. The Figma "Orders" and notification screens have no data source and never will under Private Label. Options: remove the section entirely, or replace it with a static explainer pointing customers at the account link in their TicketNetwork receipt email (R14). Needs Steven's decision and a `06-frontend-spec.md` update. **This is a scope reduction, not a blocker.**

**D2 — Venue pages get no seat map.** R12 is final. Any seat-map affordance in the Figma outside the event page's widget must be cut.

**D3 — Branding expectations must be reset with Steven.** R21 caps it at logo and button colour on both checkout and transactional emails. The widget itself we *can* restyle freely (V13), so the visual seam is: our site and the widget are fully branded, checkout and emails are TicketNetwork's design with our logo on them.

**D4 — The iframe MapWidget3 embed is now a flagged risk.** R22 says TN does not recommend it. Our implementation depends on it because their script uses `document.write` (V6). Either Integration Support blesses the iframe, or supplies a supported SPA path, or we re-architect the event page. Do not promote to production until resolved.

**D5 — Payout paperwork is no longer a launch risk.** R25 reverses the earlier assessment. Banking details come *after* go-live, and no separate agreement or tax documentation was named. The item stays open only to confirm nothing else is required.

**D6 — Production is more rate-constrained than Sandbox.** R24: 50 calls/min in Production vs 60 in Trial. Catalog caching in the Express layer is now a launch requirement rather than an optimisation.

---

## Gift Cards — What R19/R20 Actually Permit

Ian's answers make gift cards *possible* against real ticket purchases, which reverses the earlier working assumption. But they constrain the design sharply, and one unanswered question decides whether the feature is viable at all.

**What we know:**
- Codes live in TN Portal and must be created ahead of time (R20). No API for programmatic issuance has been confirmed — assume manual creation until told otherwise.
- The discount hits retail price and is deducted from our margin (R19).

**The unresolved economics.** Margin on a ticket is the markup minus TicketNetwork's 7.5% of wholesale. On Ian's own example — wholesale $100, 20% markup, customer pays $120 — the margin is $12.50. A $50 gift card redeemed against that order exceeds the entire margin. Nobody has said what happens: whether TN caps the discount at available margin, allows commission to go negative, or rejects the code. **Until that is answered, no gift card denomination can be safely priced.**

**The mechanical unknowns:** whether a code is single-use or multi-use, fixed-amount or percentage, whether an unspent balance survives partial redemption, and whether codes carry expiry. A promo code is not natively stored value — if there is no remaining-balance behaviour, then "gift card" here means a one-shot discount code, not a wallet.

**The buildable shape, if the economics work:** pre-generate a batch of fixed-denomination codes in TN Portal, store them in our `gift_cards` table, and allocate one to a customer when they buy a gift card through our own Stripe flow. Our database tracks issuance and who holds which code; TicketNetwork's Portal tracks redemption. Reconciliation between the two is manual.

---

## How Commission Attribution Works

**Status: inferred, not confirmed by TicketNetwork.** Assembled from R5, R7, R18, R23 and the MapWidget3 guide. Raised with Integration Support 2026-08-22 for explicit confirmation. This is the mechanism Steven's entire income depends on, so it is written down rather than left as shared assumption.

Attribution appears to be **structural, not behavioural** — TicketNetwork does not track a visitor and work out where they came from. Our identity is carried by the plumbing:

1. Every CatalogAPI request must carry `websiteConfigId=12498` (query param or `x-listing-context` header)
2. MapWidget3 is loaded with the same config ID
3. Markup is configured in TN Portal **against that config** (R23) — which is why the widget can display a retail price at all. A $120 ticket exists because the request identified as WCID 12498 and TN applied our markup to the $100 wholesale
4. `c3CheckoutDomain` (V2) points at a checkout instance provisioned for that config
5. Any order completing on that checkout is ours by definition. TN retains 7.5% of wholesale (R7); the remaining markup is our commission
6. Reported in the TN Portal sales dashboard (R23), paid bi-weekly with clawback on cancellations and lost chargebacks (R25)

**There is no affiliate or reseller ID parameter.** We asked directly on 2026-08-11; Ian answered with UTM params and GTM tags and never named one. There isn't one, and under this model there doesn't need to be.

**UTM parameters are sub-attribution, not the payment mechanism.** They identify *which campaign* within our traffic produced a sale (R18). If they are broken or absent, commission still pays — we simply cannot attribute it to a marketing channel. Do not conflate the two.

### Consequences

- **The load-bearing assumption is step 4** — that `c3CheckoutDomain` is provisioned per-partner. We have not seen that value yet (Q6). If the checkout domain were shared across partners, something else must carry identity, and we would need to know what
- **Anything reaching TN checkout outside our widget is likely unattributed.** There is no fallback identifier to recover the sale
- **None of this is testable before launch.** Attribution is Production-only (R18) and no order data flows back (R13). The first proof that commission works is real money appearing in TN Portal after real customers have paid
- **Therefore: soft-launch deliberately.** Put a small number of real transactions through, confirm they appear in TN Portal with correct commission, and only then commit marketing spend. Ian's own go-live gate — "we need to ensure that the ticket group is passing correctly from maps → checkout" (R24) — is the same concern stated from TicketNetwork's side

---

## 2026-08-23 — Integration Support (Yuliya Biziuk) answered Q3, Q4, Q6

First technical reply from Integration Support. Four answers, two of which invalidate assumptions recorded above.

| # | Answer | Consequence |
|---|---|---|
| **R27** | **Our Maps WCID is 26809** — same in Sandbox and Production, already active for Production, no extra activation step | **We were sending 690.** It renders a map, so it was never caught — but it is not our config. Markup is configured per-config in Portal, so 690 shows prices that are not ours and a sale from it is unlikely to credit us. Fixed 2026-08-25. **Maps and CatalogAPI use different WCIDs** — Maps 26809, Catalog 12498. Nothing in the docs implied that |
| **R28** | Checkout config: `c3CheckoutDomain = "checkout.tickettransaction.com"`, `c3CurrencyCode = "USD"`, `useC3 = true`. Her comment: *"can be SSL - checkout.domain.com"* | **Answers Q6.** But see D7 — the domain is generic, not per-partner |
| **R29** | **"We don't have checkout in Sandbox. C3 checkout exists only in Production."** | **Answers Q-checkout-access, and voids A2.** The Sandbox checkout access we asked Ian for does not exist to grant |
| **R30** | *"As I know, checkout cannot be iframed, but let me confirm that."* — unconfirmed | **Direct risk to our architecture.** Our widget runs in an iframe. Q4(a) — top-window vs frame navigation — is now urgent, not academic |
| **R31** | `salesRank` is the intended signal for trending/popular. Documentation attached | Answers Q3. Closes homepage curation |

### D7 — RESOLVED 2026-08-25: attribution rides on a POSTed `WebsiteConfigId`

**Answered by reading TN's own widget source rather than waiting**, in `libsNoBootstrapDesktopCore`. The checkout hand-off is a form POST:

```js
tt = r(a ? '<form target="_blank"></form>' : '<form></form>')
     .attr({ method: "POST", action: "https://" + u.c3CheckoutDomain + "/Checkout/Order" })

v("WebsiteConfigId", u.websiteConfigId)   // hidden input
v(p + "Quantity", …)
v(p + "EventId",  w.eventID)
```

`v` appends a hidden input. **Our identity is carried as a `WebsiteConfigId` field in the POST body** — which is exactly the "something else must carry identity" the attribution section said we would need to find. A shared checkout domain is therefore fine: the domain does not identify us, the posted field does.

**This makes the 690 → 26809 correction a commission fix, not a cosmetic one.** That field is literally what credits the sale. Every click of Buy while we were sending 690 would have posted someone else's config ID.

Still worth confirming with TN in writing, since this is read from minified client code rather than stated by them — but the mechanism is no longer unknown.

**Also confirmed:** UTM values are appended to the action URL as query params (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`) from the `c3Utm*` config, matching V4.

### D7 (original) — The attribution assumption was disproven

`How Commission Attribution Works` above rests on step 4: *"`c3CheckoutDomain` points at a checkout instance provisioned for that config."* It states plainly: *"If the checkout domain were shared across partners, something else must carry identity, and we would need to know what."*

**R28 gives `checkout.tickettransaction.com` — a generic TicketNetwork domain, not a per-partner instance.** The load-bearing assumption is therefore false as written, and we do not know what carries our identity into checkout.

This is Steven's entire commission. It must be answered explicitly before launch, not inferred.

One thread worth pulling: Yuliya's inline comment reads *"can be SSL - checkout.domain.com"*, which may mean partners can be provisioned a branded checkout host such as `checkout.ticketlove.net`. If so, that would restore per-partner identity and resolve this cleanly. Asked as a follow-up.

### D8 — Checkout cannot be verified before Production

R29 means Ian's own go-live gate (R24 — *"ensure the ticket group is passing correctly from maps → checkout"*) **cannot be satisfied in Sandbox**, because there is no Sandbox checkout to pass anything to.

Consequences:
- **A2 is void.** We were blocking on clarifying a Sandbox checkout access request for something that does not exist. Ian could never have granted it
- Phase 7 cannot be built-and-verified in the usual order. The first real test of checkout is in Production, with real money
- **This makes the deliberate soft-launch mandatory, not advisory** — a small number of real transactions, confirmed in Portal with correct commission, before any marketing spend

---

## Verified By Us (not from TN)

Findings from reading TN's own artifacts — reliable, but not statements TN has made to us directly.

| # | Finding | Source | Consequence |
|---|---------|--------|-------------|
| V1 | CatalogAPI v2 models contain **no image, photo, media or logo fields anywhere**. `EventV2GetModel`, `VenueV2GetModel`, `PerformerGetModel` are pure metadata. The only `description` field in the entire schema is on category hierarchies | `docs/swagger.json`, all definitions grepped | All imagery and editorial copy is ours to source, write and license. Treated as settled — deliberately not asked of TN |
| V2 | Checkout handoff is configured via `Seatics.config.useC3` (bool) + `Seatics.config.c3CheckoutDomain` (URL) | MapWidget3 guide p.17, p.30 | This is the Private Label handoff the NDA unlocks. We cannot complete checkout without our real `c3CheckoutDomain` value |
| V3 | **Promo codes reach TN checkout** via `Seatics.config.c3PromoCode`, default-read from the `sea_promo_code` query string | Guide p.17, p.30 | Potential mechanism for gift cards to apply to real ticket purchases. Reverses the earlier assumption that stored value could never touch TN checkout. **Blocks Steven's gift card design** — see Client Actions |
| V4 | UTM values map to `c3UtmSource/Medium/Campaign/Content/Term`, default-read from the corresponding `utm_*` query params | Guide p.17 | Attribution plumbing is already defined; we only need confirmation that the dashboard reports on these |
| V5 | `Seatics.config.c3PaymentMethods` restricts payment methods at checkout (from `sea_payment_methods`). Restriction only — cannot add options | Guide p.17 | We can narrow payment options but not extend them |
| V6 | Widget script uses `document.write`, which browsers block for asynchronously injected scripts — it will not load via `next/script` under any strategy | Guide + our implementation | Worked around with an `<iframe srcDoc>` carrying a blocking script tag. See `MapWidgetEmbed.tsx` |
| V7 | **TN cannot charge in non-USD.** Currency symbol is display-only; changing it does not imply exchange support, and the integrator owns price accuracy | Guide p.31 | Our fr locale must still transact in USD. Affects i18n scope |
| V8 | Widget supports `lang=es/fr/pt/de` natively, or detects from website config | Guide p.26 | Our next-intl fr locale is supported at the widget layer |
| V9 | Mobile layout (<992px) expects the **full screen** — site header and footer must be hidden via CSS or layout calculations break | Guide p.13, p.24 | `[ADDRESSED 2026-08-22 — but the original reading was wrong]`. The guide assumes an in-page embed. Ours is an `<iframe srcDoc>`, so the widget's viewport **is** the iframe — the site header and footer are already outside its measurements and hiding them would do nothing. The real mobile defect was different: a fixed `h-[900px]` on a ~667px-tall phone pushed the widget's own controls below the fold and nested two scroll contexts. Now `h-[85svh] min-h-[560px]`, switching to `900px` at exactly `min-[992px]` to match the widget's own breakpoint. `svh` so mobile browser chrome doesn't hide the bottom of the map |
| V10 | Widget bundles Bootstrap 3.4.1 and jQuery 3.6.0 by default; suppress with `includeBootstrap=false` / `includeJQuery=false` | Guide p.15 | `[REVERTED 2026-08-23 — DO NOT SUPPRESS]`. Tried on 2026-08-22 and it **broke the map outright**: the widget's own code calls jQuery, so it dies with `Uncaught ReferenceError: jQuery is not defined` and nothing renders. The flags exist for **in-page embeds**, where those libraries would collide with the host page. Ours is an `<iframe srcDoc>` — the widget's libraries live in a separate document and never meet our Tailwind. There was no conflict to avoid, so the suppression was all cost and no benefit. Same mistaken premise as V9: guide advice written for a non-iframe integration |
| V14 | **The widget hardcodes `http://` for its own stylesheet.** Observed in production 2026-08-23: `http://mapwidget3-sandbox.seatics.com/Css/dark-mobile?v=…` is blocked as mixed content on our HTTPS pages, and the map fails to render. **The same file returns HTTP 200 over `https://`** — verified — so the host supports TLS and only the URL the script builds is wrong. This is Q10(b), now confirmed rather than theoretical | Browser console on `https://ticketlove.net/en/events/5222958` | **Never reproduces on `http://localhost`** — same scheme, so nothing is "mixed". It is invisible until the site is on HTTPS, which is why it appeared only after go-live. Worked around with `upgrade-insecure-requests` (CSP) in both the Caddy response headers and the `srcDoc` document, which makes the browser rewrite the scheme instead of blocking. **This is our workaround, not a fix** — report to Integration Support, since it also affects `Failed to load GrowthBook` and any other `http://` sub-resource |
| V11 | Checkout deep linking exists (`enableCheckoutDeepLinking`, on by default) — sends a user straight to checkout for a known ticket group via `tgid`, `qty`, `prc`, `cstnm` query params, with availability and price-increase checks | Guide p.51–54 | Enables cart-abandonment and marketing flows later |
| V12 | Widget exposes a tracking event listener — `FinishedLoading`, `MapInteraction`, `FiltersChanged`, `BuyButtonClicked` via `Seatics.TrackingEvents.registerEventListener`, plus `onBuyButtonClicked` | Guide p.25–26, p.88 | This is our GTM/analytics hook into the widget |
| V13 | Styling is expected to be overridden — add a *separate* stylesheet after the API call, never edit theirs. `useDarkTheme=true` is the dark base | Guide p.14, p.24 | Branding path for the widget exists and is sanctioned |
| V14 | Maps configuration has a **separate** management UI (Maps Configuration Management Tool) in TN Portal, requiring its own account and permissions | Guide p.16–17 | We do not have this access yet |

---

## Open Questions

Status as of 2026-08-20, after Ian's reply. Q1–Q13 numbering matches the 2026-08-19 email.

### For Ian (commercial / access)

| # | Question | Status | Blocks |
|---|----------|--------|--------|
| A1 | Which email address to open the TN Portal account under — **he is waiting on us** | `[ANSWERED 2026-08-22 — work.mohammedarif@gmail.com]` | Decision: dev team holds the account through build and testing; **ownership transfers to Steven after go-live**, since markup, promo codes and sales reporting are his to run. Asked Ian what the handover involves. **Post-launch action — do not lose this.** Unblocks Maps config tool, promo codes, markup configuration, sales reporting |
| A2 | Clarify what we meant by "checkout information" — he asked "Are you referring to integration with our hosted checkout?" and answered the access request with one word: "Checkout" | `[OPEN — WE ARE THE BLOCKER]` | Sandbox checkout access. He has not granted it; the thread is waiting on our clarification |
| A3 | NDA scope — does Steven's signature cover us as his development contractor? | `[OPEN]` | Not answered. May be moot if access is granted regardless |
| A4 | Gift card economics — what happens when a code's value exceeds the order's margin? Capped, negative commission, or rejected? | `[OPEN]` | **Gift card viability.** No denomination can be priced until answered |
| A5 | Promo code mechanics — single- or multi-use, fixed amount or percentage, partial redemption with remaining balance, expiry, and any API for issuance | `[OPEN]` | Gift card data model |
| A6 | Anything else needed from Steven's entity before payouts beyond banking details — reseller agreement, tax forms? | `[OPEN]` | Nothing. Confirmation only, per D5 |

### For Integration Support (technical — Ian routed these)

| # | Question | Status | Blocks |
|---|----------|--------|--------|
| 3 | Are `salesRank` / `priorityRank` the intended signals for trending/popular curation? | `[OPEN]` | Homepage curation logic |
| 4 | Confirm Maps `websiteConfigId` is 12498 | `[TESTED — EITHER WORKS]` | Nothing. Both `690` and `12498` return a live interactive map on Sandbox Seatics (2026-08-20, event 5215228). Confirmation is now cosmetic, not blocking |
| 6 | Correct values for `Seatics.config.useC3` and `c3CheckoutDomain`, and where in DevPortal the checkout documentation lives | `[OPEN]` | **Hard blocker** — checkout handoff |
| 10 | Supported integration path for a React/Next.js SPA given `document.write`, since TN does not recommend iframes (R22). Plus: (a) does the checkout hand-off navigate the top window or only the iframe? (b) the script pulls some sub-resources over plain `http://` — mixed-content behaviour under HTTPS is untested | `[OPEN — RISK]`. **(b) CONFIRMED IN PRODUCTION 2026-08-23** — see below | Promoting MapWidget3 to production. May force re-architecture, see D4 |
| — | Sandbox access to the Private Label checkout flow for ZX7910-STORE | `[OPEN]` | Phase 7 entirely |
| 6 | Confirm the attribution mechanism — is a sale credited to us structurally, via the website config and its provisioned checkout instance, or is an additional parameter required at handoff? | `[OPEN]` | **Steven's entire commission.** Currently inferred, not confirmed — see How Commission Attribution Works |

### Resolved since last revision

Q1 → R12. Q2 → R13/R14/R15 (see D1). Q5 → R17. Q7 → R18. Q8 → R19/R20. Q9 → R21. Q11 → R23. Q12 → R24. Q13 → R25.

---

## Immediate Actions

| Action | Owner | Note |
|--------|-------|------|
| Reply to Ian with the TN Portal email address | Mohammed | He is idle waiting on this. One line unblocks Portal access |
| Clarify the checkout-access request to Ian | Mohammed | The Sandbox grant is stalled on a misunderstanding, not a policy |
| Open an Integration Support thread with Q3, Q4, Q6, Q10 | Mohammed | Ian explicitly routed these. Quote ZX7910-STORE |
| ~~Change `NEXT_PUBLIC_MAPWIDGET_WEBSITE_CONFIG_ID` from `690` to `12498`~~ — **done, no change needed** | Dev | Smoke-tested 2026-08-20: both IDs return an identical live map on Sandbox. Left at `690`. The map host, not the config ID, was the real fault — see R26 |
| Reset Steven's expectations on branding (D3) and the Orders area (D1) | Mohammed | Both are visible reductions against the Figma he approved |
| Add catalog caching to the Express layer before launch (D6) | Dev | Production is 50 calls/min, below Sandbox |

---

## Blocking Dependency Map

Revised 2026-08-20 after Ian's reply.

```
Clarify checkout request to Ian (A2)   ← WE are the blocker
   └─> Sandbox checkout access
          └─> c3CheckoutDomain + useC3 values (Q6, Integration Support)
                 └─> Phase 7: real checkout handoff
                        └─> Ticket group passes maps → checkout correctly  (TN's stated go-live gate)
                               └─> Production access
                                      └─> Attribution verifiable (only in Prod, R18)
                                      └─> Banking details (after go-live, R25)

Send TN Portal email address to Ian (A1)   ← WE are the blocker, one line
   └─> TN Portal access
          ├─> Maps Configuration Management Tool
          ├─> Markup configuration        ← Steven cannot set pricing without this
          ├─> Sales reporting dashboard   ← Steven's dashboard = link to Portal
          └─> Promo code creation
                 └─> Gift card codes (must be pre-created, R20)

SPA integration path (Q10, Integration Support)   ← RISK, may force rework
   └─> MapWidget3 safe to promote to production

Gift card economics (A4) + code mechanics (A5)
   └─> Gift card redemption model
          └─> Steven's gift card process doc
                 └─> Gift card implementation
```

**What changed:** payout paperwork is no longer on the critical path (R25 — banking details come after go-live). The two things actually holding the project are both one-line replies we owe Ian, not anything TicketNetwork owes us. The genuine open risk moved to Q10: TicketNetwork does not recommend the iframe our MapWidget3 embed depends on.

---

## Client Actions (Steven)

| Item | Status | Note |
|------|--------|------|
| Sign TicketNetwork NDA | `[DONE]` 2026-08-19 | Signed and returned |
| Written gift-card process document | `[REQUESTED]` 2026-08-19 | Must cover: who funds the cards and where the money sits; what they redeem against; denominations, expiry, transferability, refundability, partial redemption; issuance channel (sold vs. comped); refund/chargeback/fraud handling |
| Decide gift card redemption model | `[BLOCKED: A4]` | Confirmed possible via TN Portal promo codes (R19/R20), but denominations cannot be set until the margin question is answered |
| Banking details for payouts | `[DEFERRED — after go-live]` | R25: submitted once the site is live. No longer a launch dependency |
| Accountant/counsel on stored value | `[NOT STARTED]` | Only if gift cards are *sold* for money: state expiry and escheatment rules, cash-back thresholds. Selling cards also requires our own processor (Stripe), separate from all TN transactions |
| Accept the Orders-area removal (D1) | `[NEEDS DECISION]` | Confirmed impossible. Remove, or replace with a pointer to the TN account link in his customers' receipt emails |
| Accept the branding cap (D3) | `[NEEDS ACKNOWLEDGEMENT]` | Checkout and transactional emails get our logo and button colour only — not our design |

---

## Correspondence Notes

**2026-08-19 outbound.** Sent with 13 numbered questions grouped by theme, Steven cc'd. All 13 came back answered within 11 hours. The format works — keep using it.

Deliberately **not** asked, per V1 — imagery and editorial copy. Confirmed absent from the schema; treated as our responsibility rather than spending a round trip.

**Two drafting mistakes to avoid repeating.** "Sandbox access to the Private Label checkout flow" and "share checkout information" both read as vague to Ian — he replied asking what we meant and the access grant stalled on it. Name the concrete artifact wanted (a URL, a credential, a document, a Portal permission) rather than a capability. And question 5 asked *whether* we could have a Portal account rather than supplying the email address to create it under, costing a full round trip on the item that unlocks the most.

---

## Standing Notes for Future Sessions

- **Ian's outstanding questions are the real blocker, not ours.** The 2026-08-14 → 2026-08-19 gap happened because his "what data sources are you missing?" sat unanswered. Check for an unanswered question from TN before drafting anything new.
- **Consolidate.** Each round trip costs 1–3 days. Send one thorough numbered email rather than several short ones.
- **Never assume a gap needs TN.** V1 was settled by reading `docs/swagger.json` directly. Check our own artifacts before asking.
- **The guide is 94 pages and mostly appendix.** Configuration reference is p.17–24; the appendix from p.30 has screenshots and code snippets for each setting.
