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

/* One line per moment, shown while you're looking at the thing it's about.
   Nothing at rest — the mockup speaks first. */
const NOTES: Partial<Record<Stage, string>> = {
  locked: "Works even if they never open the app.",
  alert1: "The kitchen decides. You get 40 seconds to override.",
  override1: "Bhel Puri is already in the bag, so it’s dead.",
  resolved1: "The clock never moved. That’s the whole point.",
  alert2: "Second failure, so the kitchen stops guessing.",
  resolved2: "Two failures, no phone call, nine minutes intact.",
};

export default function App() {
  const egg = useTenMinuteEgg();
  const [stage, setStage] = useState<Stage>("tracking");
  const [shown, setShown] = useState(false);
  const onStage = useCallback((s: Stage) => setStage(s), []);
  const note = NOTES[stage];

  // arrives with the moment, then gets out of the way
  useEffect(() => {
    if (!NOTES[stage]) { setShown(false); return; }
    setShown(true);
    const t = setTimeout(() => setShown(false), 6500);
    return () => clearTimeout(t);
  }, [stage]);

  return (
    <main className="page">
      <header className="wrap">
        <blockquote className="review">
          “I got a call saying the kachori I ordered wasn’t available.”
          <cite>Swish · App Store review, 13 July</cite>
        </blockquote>
        <h1 className="hero-line">
          The kitchen already put something else on the griddle.{" "}
          <span>Forty seconds to say no.</span>
        </h1>
      </header>

      <section className="journey">
        <Prototype onStage={onStage} />

        <div className="snip-slot">
          <AnimatePresence mode="wait" initial={false}>
            {shown && note && (
              <motion.p className="snip" key={stage}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              >
                <i aria-hidden /> {note}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </section>

      <footer className="wrap footnote">
        <p>
          Outside your delivery radius, so this is one screen recording, not fifteen orders.
          Forty seconds is a guess — your data would set it.
        </p>
        {/* TODO(syed): your links */}
        <div className="who">
          <a href="https://github.com/syedali9210/swish" target="_blank" rel="noreferrer">Source on GitHub</a>
        </div>
      </footer>

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
