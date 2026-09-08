import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import Prototype, { type Stage } from "./Prototype";
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

/* One note per moment. Each answers something a customer actually wrote. */
const NOTES: Record<Stage, { step: string; title: string; body: string }> = {
  tracking: {
    step: "Before",
    title: "The order is already cooking.",
    body: "Paid, accepted, on the griddle. Everything after this point is the part nobody has designed.",
  },
  locked: {
    step: "The alert",
    title: "It has to work if they never open the app.",
    body: "What ran out, what the kitchen already did, and that the nine minutes still holds — all of it on the lock screen. Tapping opens straight onto the swap, not the home screen.",
  },
  alert1: {
    step: "The decision",
    title: "The kitchen decides, it doesn’t ask.",
    body: "It has already started the closest match. You ordered food, not a decision tree, and a question costs more than a reversible guess. Forty seconds to override — and that countdown is on the decision, never on the delivery.",
  },
  override1: {
    step: "The list",
    title: "Never something you already ordered.",
    body: "Bhel Puri is in this bag, so it sits dead in the list using Swish’s own out-of-stock treatment. One reviewer was talked into the same dish twice over the phone.",
  },
  resolved1: {
    step: "The payoff",
    title: "The clock never moved.",
    body: "Their whole failure mode is the promise breaking, so the fix is proving it didn’t. It flashes once, just to make you look at it.",
  },
  alert2: {
    step: "Again",
    title: "It gets to be confident exactly once.",
    body: "In the review this happened three times. So the second time, the kitchen stops deciding — no countdown, no third guess, and refund becomes the main action.",
  },
  resolved2: {
    step: "Done",
    title: "Two failures, no phone call.",
    body: "Nine minutes, intact. That is the thing the review was actually about.",
  },
};

const ORDER: Stage[] = ["tracking", "locked", "alert1", "override1", "resolved1", "alert2", "resolved2"];

export default function App() {
  const egg = useTenMinuteEgg();
  const [stage, setStage] = useState<Stage>("tracking");
  const onStage = useCallback((s: Stage) => setStage(s), []);
  const note = NOTES[stage];
  const reached = ORDER.indexOf(stage);

  return (
    <main className="page">
      <header className="wrap">
        <p className="eyebrow">Swish · unsolicited</p>
        <blockquote className="review">
          “I got a call saying the kachori I ordered wasn’t available.” … “another call saying batata
          vada was also unavailable.” … “only to be told the sandwich wasn’t available either.”
          <cite>App Store review, 13 July</cite>
        </blockquote>
        <h1 className="hero-line">
          When the kitchen runs out mid-order, Swish phones you.<br />
          <span>Here’s the version that doesn’t.</span>
        </h1>
      </header>

      <section className="journey">
        <Prototype onStage={onStage} />

        <aside className="rail">
          <div className="rail-inner">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={stage}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              >
                <p className="rail-step">{note.step}</p>
                <h2 className="rail-title">{note.title}</h2>
                <p className="rail-body">{note.body}</p>
              </motion.div>
            </AnimatePresence>
            <div className="progress" aria-hidden>
              {ORDER.map((s, i) => <i key={s} className={i <= reached ? "on" : ""} />)}
            </div>
          </div>
        </aside>
      </section>

      <section className="wrap outro">
        <h2>What I’d get wrong</h2>
        <p>
          I’m outside your delivery radius, so this is built from one screen recording rather than
          fifteen real orders. I’ve never seen the live order screen — everything behind the sheet is
          inferred. Forty seconds is a guess; your data would set that, not my taste.
        </p>
        <p>
          The palette and timings aren’t guesses. Both are measured off the recording — ease-out at
          150/200/300ms, no overshoot. Swish doesn’t bounce, so neither does this. And it adds no new
          surface area: one sheet, on a screen that already exists, from components already in the app.
        </p>
        {/* TODO(syed): your line, your links */}
        <div className="who">
          <a href="https://github.com/syedali9210/swish" target="_blank" rel="noreferrer">Source on GitHub</a>
        </div>
      </section>

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
