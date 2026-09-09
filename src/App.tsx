import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
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

/* Annotation for whatever you're looking at: what the screen says, what happens
   when you act on it, and why it's built that way. */
type Note = { step: string; title: string; body: string };
const NOTES: Record<Stage, Note> = {
  tracking: {
    step: "Before",
    title: "Order placed, kitchen cooking.",
    body: "Nothing has gone wrong yet. In a moment something runs out mid-cook — and that is the part of the journey nobody has designed. Today it is a phone call.",
  },
  locked: {
    step: "01 · The alert",
    title: "You find out before you unlock.",
    body: "The notification carries the whole decision: what ran out, what the kitchen has already done about it, the money coming back, and that the nine minutes still holds. Someone who never opens the app has still been told everything that matters. Tap it and you land straight on the swap — no home screen, no menu, no hunting.",
  },
  alert: {
    step: "02 · The decision",
    title: "The kitchen decided. You get to disagree.",
    body: "It is already cooking the closest match, and charging less than you paid. The countdown sits on your decision, never on your delivery — leave it and it simply confirms, because you ordered food, not a decision tree. Three ways out, all one tap.",
  },
  override: {
    step: "03 · The alternatives",
    title: "Everything here is always in stock.",
    body: "Swaps only ever come from dishes the kitchen keeps on all day, so the thing that happened to one reviewer three times in a row cannot happen here. Bhel Puri sits greyed out because it is already in this order — another reviewer was talked into the same dish twice over the phone.",
  },
  resolved: {
    step: "04 · The payoff",
    title: "Better dish, money back, clock untouched.",
    body: "The arrival time flashes once, to make you look at it. Their whole failure mode is the promise breaking, so the fix is proving it did not. Seconds, in the app, with nobody calling anybody.",
  },
  dropped: {
    step: "04 · The exit",
    title: "Leaving is never punished.",
    body: "The refund amount and the timing are stated before you ask, and the rest of the order is untouched. If you want a person, you ask for one — Swish does not call you. That call is the exact thing this flow exists to remove.",
  },
};
const ORDER: Stage[] = ["tracking", "locked", "alert", "override", "resolved", "dropped"];

export default function App() {
  const egg = useTenMinuteEgg();
  const [stage, setStage] = useState<Stage>("tracking");
  const onStage = useCallback((s: Stage) => setStage(s), []);
  const note = NOTES[stage];
  const reached = ORDER.indexOf(stage);

  return (
    <main className="page">
      <header className="wrap">
        <blockquote className="review">
          “I got a call saying the kachori I ordered wasn’t available.”
          <cite>Swish · App Store review, 13 July</cite>
        </blockquote>
        <h1 className="hero-line">
          You didn’t get what you ordered.{" "}
          <span>You got something better, and ₹20 back.</span>
        </h1>
      </header>

      <section className="journey">
        <Prototype onStage={onStage} />

        <aside className="rail">
          <div className="rail-inner">
            {/* keyed remount rather than AnimatePresence — no exit to get stuck on */}
            <motion.div key={stage}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            >
              <p className="rail-step">{note.step}</p>
              <h2 className="rail-title">{note.title}</h2>
              <p className="rail-body">{note.body}</p>
            </motion.div>
            <div className="progress" aria-hidden>
              {ORDER.map((s, i) => <i key={s} className={i <= reached ? "on" : ""} />)}
            </div>
          </div>
        </aside>
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
