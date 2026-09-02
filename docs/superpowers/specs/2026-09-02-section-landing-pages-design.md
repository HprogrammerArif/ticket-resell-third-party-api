# Section Landing Pages — Design

**Date:** 2026-09-02
**Status:** Awaiting review
**Source:** Steven's UI notes, 2026-09-02, and Arif's reference screenshot

---

## Goal

Selecting **Sports** in the navigation should show all the sports as cards. Choosing one narrows to that sport. The same behaviour for every section in the navigation.

Steven's words: *"Each one of the categories should have dropdowns displaying the various Events, Shows, or Sports Groups, further broken down by the sports teams in those groups."* Arif's: *"currently when we click on sports, only BASEBALL shows instead of the whole of sports."*

The navbar dropdowns are deliberately **not** in this design. They read the same data, and are easier to build once this exists.

---

## What is wrong today

`/categories/sports` resolves the slug by scanning every category with events and taking the first whose name, URI or slug overlaps "sport". That match is arbitrary — it currently lands on a single league — so the visitor asks for Sports and gets Baseball.

The heading was corrected on 2026-09-02 to read "Sports" regardless. That was a plaster over the symptom; this replaces the mechanism.

---

## What the catalogue actually contains

Measured against the live API rather than assumed:

| Root | Name | Immediate children | Examples |
|---|---|---|---|
| `.1859.1988.` | **SPORTS** | 12 | BASEBALL, BOXING, HOCKEY, GOLF, RODEO, TENNIS |
| `.1859.1986.` | **CONCERTS** | 22 | POP / ROCK, ALTERNATIVE, COMEDY, JAZZ / BLUES |
| `.1859.1989.` | **THEATRE** | 11 | BROADWAY, MUSICAL / PLAY, BALLET, LAS VEGAS |

Each sport then has its own children — BASEBALL holds *Professional (MLB)*, *Minors (AAA)*, *College (Div I-A and Div I-AA)*, *Frontier League*, *Other*. Fifty-one of those leagues across the twelve sports.

Two findings worth recording:

- **`COMEDY` is a child of CONCERTS**, not a section of its own. The navigation now has a Comedy item, and it lands on a category with no children.
- **A parallel tree exists at `.718.72x.`** with identical structure and **blank names**. It mirrors `.1859.198x.` exactly. Anything resolving categories must not land there, or the visitor sees a grid of cards labelled "-".

---

## Decisions

### D1 — Resolve section roots by name, with the known path as a fast path

Hardcoding `.1859.1988.` alone would be a mistake. The Catalog WCID already differs between Sandbox and Production on this integration — 12498 against 26809 — which was discovered late and cost a day. Category identifiers may differ the same way, and the failure would be silent: a valid-looking page listing the wrong things.

So resolution is:

1. Look up the known path for the slug.
2. **Verify the returned name matches** the expected section name.
3. If it does not, scan categories for a depth-1 category with that name and use what is found.

The fast path is a single cached call. The fallback costs more, and only runs where the assumption has broken — which is exactly where the extra work is worth it.

### D2 — A category page shows its children as cards, or its events if it has none

One rule, applied at every level:

```
/categories/sports          -> 12 sport cards
/categories/.1859.1988.1864.  (BASEBALL)  -> 5 league cards
/categories/.1859.1988.1864.1969.  (MLB)  -> events
```

**Why the same rule at every level** rather than a special Sports page. The tree is three deep in places and two in others, and Comedy is a leaf directly under a section. A rule that reads "show what is beneath you, or the events if nothing is" handles all of those without a table of exceptions — and handles whatever TicketNetwork adds next.

A leaf with children still shows its events below the cards, so a visitor at BASEBALL is not forced to pick a league before seeing anything.

### D3 — Cards carry event and ticket counts

Per the reference screenshot: name, event count, ticket count. Both are already on `_metadata` for every category, so this costs nothing extra.

Counts are what make the grid useful — they are how a visitor tells RODEO with 50 events from RUGBY with 1.

### D4 — Categories with no events are not shown

The catalogue holds 375,581 categories; 232 have events. Showing an empty category is a dead end that looks like a fault.

### D5 — The parallel unnamed tree is excluded

Any category whose name is empty, or `-`, is dropped. This is what stops the `.718.` mirror leaking into a grid.

---

## Components

- `client/src/components/catalog/SubcategoryGrid.tsx` — the card grid. Name, event count, ticket count, the existing category gradient and icon.
- The existing `SubcategoryChips` row is **replaced** by this on section pages. Chips stay for deeper levels where the list is short.

## Files

| File | Change |
|---|---|
| `categories/[...path]/page.tsx` | Section resolution, and the children-or-events rule |
| `components/catalog/SubcategoryGrid.tsx` | New |
| `libs/CatalogSections.ts` | New — slug to root resolution, with the verify-and-fall-back logic |
| `locales/{en,es,fr}.json` | Headings and counts |

---

## Testing

| Test | Why it matters |
|---|---|
| `sports` resolves to the category named SPORTS | The defect being fixed |
| Resolution falls back to a name scan when the known path returns a different name | D1, the environment risk that already bit us once |
| A section returns its immediate children, not its grandchildren | Or Sports lists 63 entries including every league |
| Categories with no events are excluded | D4 |
| Categories with an empty or `-` name are excluded | D5, the parallel tree |
| A leaf category renders events, not an empty grid | D2 |

Verified in a browser, not by status code. Three separate rendering faults on this project returned HTTP 200 while broken.

---

## Out of scope

Navbar hover dropdowns — the next piece, reading this data.

Sorting or filtering within a section. The grid is ordered by event count, most first, and that is enough until someone says otherwise.

Per-sport imagery on the cards. The gradient and icon are the existing treatment and look deliberate.
