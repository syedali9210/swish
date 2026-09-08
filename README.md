# Swish — when the kitchen runs out

A working prototype of the one moment where Swish hands a paying customer to a phone call.

From a July App Store review: order placed, payment taken, then a call — the kachori isn't
available. The customer agrees to batata vada. Fifteen minutes later, another call, that's gone
too. A third call, the sandwich as well.

Swish **has** designed unavailability — at browse time, where an out-of-stock item is greyed out
with a disabled checkbox. The gap is *after* payment, mid-cook. This is that surface.

```bash
npm install
npm run dev
```

## The call this makes

**The kitchen decides, it doesn't ask.** It has already started the closest swap and gives you
40 seconds to override. The customer ordered food, not a decision tree — and in a 10-minute app
a question costs more than a reversible wrong guess.

Everything else follows from that:

- **The clock ribbon never moves.** Swish's failure mode is the promise breaking, so the fix is
  proving it didn't. It's their own home/cart ETA component, reused on a screen they haven't
  built. On resolve it flashes once, just to make you look at it.
- **The countdown is on the decision, not the delivery.** Honest urgency instead of manufactured
  urgency. Stepping into the list *pauses* it — the auto-decision exists to protect passive
  users, not to rush active ones.
- **Swaps promise "same 9 minutes."** Only a company that owns its kitchens can say that.
  Blinkit's warehouse marks stock zero and moves on; Swish runs out mid-service.
- **"Just drop it and refund" is always one tap and never buried.** The review's whole problem
  was three calls to reach an outcome the customer would have picked in four seconds.
- **Kitchen voice.** "The Peri Peri Corn just ran out," never "We regret to inform you."
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
