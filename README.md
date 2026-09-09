# Swish — when the kitchen runs out

A case study page and working prototype of the one moment where Swish hands a paying customer to
a phone call.

Two App Store reviews, a month apart, describing the same gap:

> **13 July** — "About 10 minutes after placing my order, I got a call saying the kachori I ordered
> wasn't available." … "Another 15 minutes later, I received another call saying batata vada was
> also unavailable." … "only to be told the sandwich wasn't available either."

> **11 August** — "I ordered for two different dishes but they called and said no availability so
> ended up giving me the same item twice."

Swish **has** designed unavailability — at browse time, where an out-of-stock item is greyed out
with a disabled checkbox. The gap is *after* payment, mid-cook. This is that surface.

Checked against the App Store version history through 2.1.3 (1 Sept): no substitution feature has
shipped. Worth re-checking before sending — this team names features in release notes, so it would
be obvious.

```bash
npm install
npm run dev
```

## Flow

1. Order placed, tracking screen.
2. The phone goes idle. The kitchen runs out mid-cook and the notification lands on the lock screen.
3. Tap it — the app opens straight onto the swap already in progress, 40 seconds to override.
4. Keep it, pick something else, or drop it and refund.
5. Resolved, with the ETA untouched.

Everything renders inside an iPhone 14 Plus frame — 592×1281 at the design canvas scale, with the
Dynamic Island and home indicator — because that is the device the source footage was shot on. The
home indicator flips light on the lock screen and dark in the app, the way iOS does it.

## The call this makes

**The kitchen decides, it doesn't ask.** It has already started the closest swap and gives you
40 seconds to override. The customer ordered food, not a decision tree — and in a 10-minute app
a question costs more than a reversible wrong guess.

Everything else follows from that:

- **The notification carries the whole decision.** It has to survive being the only thing someone
  reads: what ran out, what the kitchen already did, that the 9 minutes still holds, and what
  tapping gets you. If they never open the app, they have still been told everything that matters.
  Tapping opens straight onto the swap in progress — no home screen, no menu, no hunting.
- **The clock ribbon never moves.** Swish's failure mode is the promise breaking, so the fix is
  proving it didn't. It's their own home/cart ETA component, reused on a screen they haven't
  built. On resolve it flashes once, just to make you look at it.
- **The countdown is on the decision, not the delivery.** Honest urgency instead of manufactured
  urgency. Stepping into the list *pauses* it — the auto-decision exists to protect passive
  users, not to rush active ones.
- **Swaps promise "same 9 minutes."** Only a company that owns its kitchens can say that.
  Blinkit's warehouse marks stock zero and moves on; Swish runs out mid-service.
- **It can't happen twice.** The July reviewer was called three times — the substitute they agreed
  to also ran out. So swaps only ever come from a small set the kitchen keeps on all day. The
  cascade isn't handled gracefully, it's designed out.
- **It reads as an upgrade, because it is one.** Everything in that set normally sells for more
  than you paid and costs you less — a ₹169 dish for ₹119, with ₹20 going back. The copy leads
  with that ("You've been upgraded to Butter Corn") and puts the cause in the very next breath
  ("The Peri Peri Corn ran out — so the kitchen's put a ₹169 dish on the griddle, charged you ₹20
  less, and your nine minutes hasn't moved"). Good news first, never instead of — one sentence
  carrying all three gains: better dish, money back, clock untouched.
- **Dropping states the refund, and the call is yours to ask for.** Amount and timing up front,
  the rest of the order unaffected, and a "Something wrong? Ask us to call" the customer triggers.
  Calling them automatically would reinstate the exact thing this whole piece argues against.
- **It never offers something already in the order.** The August reviewer was talked into a
  duplicate over the phone. Bhel Puri is already in that bag, so it appears in the list greyed out
  with a dead control — reusing Swish's own out-of-stock treatment rather than hiding it, so the
  customer can see the system knows.
- **"Just drop it and refund" is always one tap and never buried.** The review's whole problem
  was three calls to reach an outcome the customer would have picked in four seconds.
- **Kitchen voice.** "The Peri Peri Corn ran out — so the kitchen's put a ₹169 dish on the
  griddle," never "We regret to inform you that an item is unavailable."
- **Money is never a surprise.** Every option carries its delta, and the line above the button
  states the effect on the total before you commit.

Zero new surface area. Swish's restraint is deliberate — their users praise the app for being
uncluttered — so this adds one sheet to a screen that already exists and nothing else.

## Design system

`src/tokens.css` is the Figma file ported 1:1. Colours are **sampled from a 60fps screen
recording of the real app**, not invented:

| token | value | note |
| --- | --- | --- |
| `--brand-500` | `#2DB955` | the measured brand green — decorative fills only |
| `--brand-700` | `#178039` | AA-safe tint of the same 137° hue |
| `--surface-base` | `#FDFDFD` | measured — not pure white |
| `--brand-100` / `--brand-050` | `#E1F7E3` / `#EEFCF2` | pale mint / savings tint |
| `--warn-bg` | `#FDF1C8` | coupon cream |

White text never sits on `--brand-500` — it's only 2.6:1. Anything behind white copy, including
the app's own header gradient, uses `--brand-700` at 5.0:1.

Type is an 11-step DM Sans ramp (`.t-display` → `.t-micro`). Weight is always carried by the
named step, never by a loose override.

`--s` scales the 592px Figma canvas to a real device width. It is the only magic number; every
size, space and radius is written as its raw Figma value times `--s`, so the source stays
readable against the design file.

## Motion

Frame-differenced off the same recording. **Swish does not bounce** — matching that restraint
is more impressive than out-animating them, so nothing here springs.

| | |
| --- | --- |
| nav push | 150ms |
| bottom sheet | 200ms (measured 184–234) |
| screen change | 300ms (measured 284–300) |
| curve | ease-out, no overshoot — `cubic-bezier(0.16, 1, 0.3, 1)` |
| sheets | translate and opacity run together |
| signature | sparkle wipe, left to right — their splash move, reused on the swapped line |

`prefers-reduced-motion` is honoured throughout. The one exception is the countdown bar, which
keeps its duration because it is information, not decoration.

The bar drains in CSS and the timer owns its own state, so the sheet above it never re-renders
mid-animation.

## Honest gaps

- **The order-tracking screen behind the sheet is inferred.** The source recording stops at
  address confirmation, so the header, map and bottom panel are a reconstruction. `public/map.jpg`
  is exported from the Figma file, not from the real app.
- Food thumbnails are exported from the same Figma file. Swap in real product shots.
- The typeface is DM Sans. Theirs is close but unconfirmed from a 384px recording — it's a
  one-line change in `--font`.
