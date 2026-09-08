import { useEffect, useState } from "react";
import { motion } from "motion/react";
import Prototype from "./Prototype";
import "./page.css";

/* Ten minutes is Swish's unit, so the egg only lands for someone who actually
   stayed. ?egg=5 shortens it for testing. */
function useTenMinuteEgg() {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const override = Number(new URLSearchParams(location.search).get("egg"));
    const after = Number.isFinite(override) && override > 0 ? override * 1000 : 10 * 60 * 1000;
    const t = setTimeout(() => setShown(true), after);
    return () => clearTimeout(t);
  }, []);
  return shown;
}

const DECISIONS: [string, string][] = [
  ["The kitchen decides, it doesn’t ask.",
   "It has already started the closest swap and gives you 40 seconds to override. You ordered food, not a decision tree — and in a ten-minute app a question costs more than a reversible wrong guess."],
  ["The clock never moves.",
   "Swish’s failure mode is the promise breaking, so the fix is proving it didn’t. That block is their own ETA component, reused on a screen they haven’t built. It flashes once on resolve, just to make you look."],
  ["The countdown is on the decision, not the delivery.",
   "Honest urgency instead of manufactured urgency. Step into the list and it pauses — the auto-decision exists to protect people who aren’t looking, not to rush people who are."],
  ["It survives happening twice.",
   "The July reviewer was called three times. So when the swap also runs out, the kitchen stops deciding: no countdown, no third guess, and refund becomes the primary action. It gets to be confident once."],
  ["It never offers you something you already ordered.",
   "The August reviewer was talked into a duplicate over the phone. Bhel Puri is already in that bag, so it sits in the list greyed out — using Swish’s own out-of-stock treatment rather than quietly hiding it."],
  ["Refund is always one tap, never buried.",
   "Three calls to reach an outcome someone would have picked in four seconds is the actual complaint. Leaving is never more than one tap from anywhere in the flow."],
];

export default function App() {
  const egg = useTenMinuteEgg();

  return (
    <main className="wrap">
      <p className="eyebrow">Swish · 10-minute food delivery · unsolicited</p>

      <blockquote className="review">
        “About 10 minutes after placing my order, I got a call saying the kachori I ordered wasn’t
        available.” … “Another 15 minutes later, I received another call saying batata vada was also
        unavailable.” … “only to be told the sandwich wasn’t available either.”
        <cite>App Store review, 13 July</cite>
      </blockquote>

      <blockquote className="review">
        “I ordered for two different dishes but they called and said no availability so ended up
        giving me the same item twice.”
        <cite>App Store review, 11 August</cite>
      </blockquote>

      <h1 className="hero-line">
        This is the only place in Swish where the product hands you to a phone call.
      </h1>

      <p className="lead" style={{ marginTop: 22 }}>
        Two reviews, a month apart, describing the same gap in two different ways. One cost the
        customer three calls and half an hour. The other quietly sent them the same dish twice.
      </p>

      <p>
        Swish <strong>has</strong> designed unavailability — at browse time, where an out-of-stock item
        sits greyed out with a dead checkbox. The gap is after payment, mid-cook, when a 250 sq ft
        kitchen physically runs out of something. Blinkit’s warehouse marks stock zero and moves on.
        Swish cooks to order, so availability changes minute to minute. Nobody else has this problem,
        which is probably why nobody has solved it.
      </p>

      <p>So I built the version that doesn’t need the phone call.</p>

      <div className="exhibit">
        <Prototype />
      </div>
      <p className="exhibit-cap">
        Wait it out, or step in and change it. Then wait once more — the swap runs out too, because
        in the review it did. Replay runs the whole thing again.
      </p>

      <hr className="rule" />

      <h2>Six decisions</h2>
      <p className="section-note">Each one is answering something a customer actually wrote.</p>
      <ol className="decisions">
        {DECISIONS.map(([title, body], i) => (
          <motion.li key={title}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: i * 0.03 }}
          >
            <span className="n">{String(i + 1).padStart(2, "0")}</span>
            <span><b>{title}</b> {body}</span>
          </motion.li>
        ))}
      </ol>

      <hr className="rule" />

      <h2>The constraint I didn’t touch</h2>
      <p>
        Swish’s restraint is deliberate. Their own reviewers praise the app for keeping a small,
        carefully picked range instead of the overwhelming grid everyone else ships — that is a design
        position, not an oversight. So this adds <strong>zero new surface area</strong>: one sheet, on a
        screen that already exists, assembled from components already in the app. The nine-minute block
        at the top of the sheet is theirs, lifted from the cart. The greyed-out row is their own
        out-of-stock treatment. Nothing here asks them to become a different product.
      </p>

      <hr className="rule" />

      <h2>What I’d get wrong</h2>
      <p>
        I’m outside your delivery radius, so this is built from one 79-second screen recording rather
        than fifteen real orders. I’ve never seen the live order screen — everything behind the sheet is
        inferred, and if it looks nothing like this, the sheet still works but the frame around it needs
        redoing. Forty seconds is a guess; your data would set that number, not my taste. And I don’t
        know what the kitchen can actually see about stock in real time, which is the thing that decides
        whether any of this is buildable.
      </p>
      <p>
        The palette and motion aren’t guesses, though. Colours are sampled off the recording and the
        timings are frame-differenced from it — 150ms nav, 200ms sheets, 300ms screens, ease-out, no
        overshoot. Swish doesn’t bounce, so neither does this.
      </p>

      <hr className="rule" />

      {/* TODO(syed): swap in your own line and links before sending */}
      <h2>Syed Ali</h2>
      <p className="section-note">
        Product designer in Bengaluru. I read the review section before I opened Figma.
      </p>
      <div className="who">
        <a href="https://github.com/syedali9210/swish" target="_blank" rel="noreferrer">Source on GitHub</a>
      </div>

      {egg && (
        <motion.p className="egg"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.2 }}
        >
          you’ve been here ten minutes. that’s a whole dosa.
        </motion.p>
      )}
    </main>
  );
}
