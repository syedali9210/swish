import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
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

/* Each moment points at the one component it is about, so the note is read
   against the thing itself rather than beside it. */
type Note = { step: string; title: string; body: string; target: string };
const NOTES: Record<Stage, Note> = {
  tracking: {
    step: "Before",
    title: "The promise, on the clock.",
    body: "Nothing has gone wrong yet. In a moment something runs out mid-cook — the part of the journey nobody has designed. Today it is a phone call.",
    target: ".eta-pill",
  },
  locked: {
    step: "01 · The alert",
    title: "You find out before you unlock.",
    body: "It carries the whole decision: what ran out, what the kitchen already did, the money coming back, and that the nine minutes holds. Someone who never opens the app has still been told everything. Tapping lands you straight on the swap — no home screen, no hunting.",
    target: ".notif",
  },
  alert: {
    step: "02 · The decision",
    title: "Already cooking, already cheaper.",
    body: "The kitchen picked the closest match and charged less than you paid — a ₹169 dish for ₹119. It decided rather than asking, because you ordered food, not a decision tree. The countdown below sits on your decision, never on your delivery.",
    target: ".sheet .option",
  },
  override: {
    step: "03 · The alternatives",
    title: "Greyed out, because it's already yours.",
    body: "Bhel Puri is in this order, so it can't be offered as the swap — a reviewer was talked into the same dish twice over the phone. Everything else here stays in the kitchen all day, so it can't run out on you a second time.",
    target: ".option.disabled",
  },
  resolved: {
    step: "04 · The payoff",
    title: "The number that never moved.",
    body: "It flashes once, to make you look at it. Their whole failure mode is the promise breaking, so the fix is proving it didn't. Better dish, money back, same nine minutes — and nobody called anybody.",
    target: ".eta-pill",
  },
  dropped: {
    step: "04 · The exit",
    title: "Leaving is never punished.",
    body: "Refund amount and timing stated before you ask, and the rest of the order untouched. If you want a person you ask for one — Swish doesn't call you. That call is the exact thing this flow exists to remove.",
    target: ".toast",
  },
};
const ORDER: Stage[] = ["tracking", "locked", "alert", "override", "resolved", "dropped"];

export default function App() {
  const egg = useTenMinuteEgg();
  const [stage, setStage] = useState<Stage>("tracking");
  const wrapRef = useRef<HTMLDivElement>(null);
  const hlRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);
  const calloutRef = useRef<HTMLElement>(null);
  const onStage = useCallback((s: Stage) => setStage(s), []);
  const note = NOTES[stage];
  const reached = ORDER.indexOf(stage);

  /* Track the target until it stops moving, then stop. A fixed timer can't know
     when a thing has settled — measuring at 360ms caught the notification card
     mid-entry and pinned the box 16px low. Written straight to the DOM so this
     never re-renders the prototype underneath it. */
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const PAD = 6;
    let raf = 0, last = "", stable = 0, stopped = false;
    /* Keep tracking for at least this long. Some targets animate on a delay —
       the notification waits 350ms — and "hasn't moved for 4 frames" reads as
       settled when it simply hasn't started yet. */
    const minUntil = performance.now() + 900;
    const deadline = performance.now() + 2500;

    const apply = (): string | null => {
      const el = wrap.querySelector(note.target) as HTMLElement | null;
      const hl = hlRef.current;
      if (!hl) return null;
      if (!el) { hl.style.opacity = "0"; return null; }
      const w = wrap.getBoundingClientRect(), r = el.getBoundingClientRect();
      if (!r.width || !r.height) { hl.style.opacity = "0"; return null; }

      const x = r.x - w.x - PAD, y = r.y - w.y - PAD;
      const bw = r.width + PAD * 2, bh = r.height + PAD * 2;
      // set properties, never `cssText +=` — that appends a fresh rule every frame
      hl.dataset.for = note.target;
      hl.style.opacity = "1";
      hl.style.left = `${x}px`;
      hl.style.top = `${y}px`;
      hl.style.width = `${bw}px`;
      hl.style.height = `${bh}px`;

      const anchorY = y + bh / 2;
      const co = calloutRef.current;
      if (co && window.innerWidth > 940) {
        const cy = Math.max(70, Math.min(anchorY, Math.max(70, w.height - 90)));
        co.style.top = `${cy}px`;
        const sx = x + bw + 8, mx = x + bw + 30, ex = x + bw + 56;
        pathRef.current?.setAttribute("d", `M ${sx} ${anchorY} H ${mx} V ${cy} H ${ex}`);
        dotRef.current?.setAttribute("cx", `${sx}`);
        dotRef.current?.setAttribute("cy", `${anchorY}`);
      } else if (co) {
        co.style.top = "";
      }
      return `${r.x},${r.y},${r.width},${r.height}`;
    };

    const tick = () => {
      if (stopped) return;
      const key = apply();
      if (key && key === last) stable++; else { stable = 0; last = key ?? ""; }
      const now = performance.now();
      if ((stable >= 4 && now > minUntil) || now > deadline) return;
      raf = requestAnimationFrame(tick);
    };

    /* Place it synchronously first. requestAnimationFrame is throttled when the
       page isn't painting, and relying on it alone left the box unpositioned. */
    apply();
    raf = requestAnimationFrame(tick);
    // timers still fire when rAF is throttled, so they catch delayed entrances
    const backups = [180, 500, 900].map((ms) => setTimeout(apply, ms));

    const onResize = () => { stable = 0; last = ""; cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); apply(); };
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", apply, { passive: true });
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      backups.forEach(clearTimeout);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", apply);
    };
  }, [stage, note.target]);

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

      <section className="journey" ref={wrapRef}>
        <Prototype onStage={onStage} />

        <div className="hl" ref={hlRef} aria-hidden />

        <svg className="leader" aria-hidden>
          <path ref={pathRef} fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
          <circle ref={dotRef} r="3.5" fill="var(--accent)" />
        </svg>

        <aside className="callout" ref={calloutRef}>
          <motion.div key={stage}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="callout-step">{note.step}</p>
            <h2 className="callout-title">{note.title}</h2>
            <p className="callout-body">{note.body}</p>
          </motion.div>
          <div className="progress" aria-hidden>
            {ORDER.map((s, i) => <i key={s} className={i <= reached ? "on" : ""} />)}
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
