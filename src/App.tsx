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

/* One line, pinned to the component it is about. `safe` says which side of that
   component is dead space — the map, or empty lock screen — so on a phone the
   bubble lands there instead of over anything worth reading. */
type Note = { step: string; text: string; target: string; safe: "above" | "below" };
const NOTES: Record<Stage, Note> = {
  tracking: { step: "Before", text: "The promise everything hangs on.", target: ".eta-pill", safe: "above" },
  locked: { step: "01", text: "Everything they need, before they unlock.", target: ".notif", safe: "below" },
  alert: { step: "02", text: "Already cooking, already ₹20 cheaper.", target: ".sheet .option", safe: "above" },
  override: { step: "03", text: "Greyed out — already in your order.", target: ".option.disabled", safe: "above" },
  resolved: { step: "04", text: "Same nine minutes. No call.", target: ".eta-pill", safe: "above" },
  dropped: { step: "04", text: "Refund up front, no call needed.", target: ".toast", safe: "below" },
};

export default function App() {
  const egg = useTenMinuteEgg();
  const [stage, setStage] = useState<Stage>("tracking");
  const wrapRef = useRef<HTMLDivElement>(null);
  const hlRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const onStage = useCallback((s: Stage) => setStage(s), []);
  const note = NOTES[stage];

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

      /* The bubble sits beside the component on a wide screen, and above it on a
         phone — never below, because below is where the sheet's buttons are. */
      const pop = popRef.current;
      if (pop) {
        const p = pop.getBoundingClientRect();
        const device = wrap.querySelector(".device");
        const deviceRight = device ? device.getBoundingClientRect().right - w.x : x + bw;
        const gutter = w.width - deviceRight - 12;
        let place: string, px: number, py: number;
        if (gutter >= p.width) {
          // room beside the artwork: nothing is covered at all
          place = "right";
          px = deviceRight + 12;
          py = y + bh / 2 - p.height / 2;
        } else {
          /* No gutter, so it has to sit on the screen — put it on the dead space.
             With a sheet open that means the map above it, never the sheet itself. */
          const phone = wrap.querySelector(".phone")?.getBoundingClientRect();
          const sheet = wrap.querySelector(".sheet")?.getBoundingClientRect();
          const top = phone ? phone.top - w.y + 8 : 0;
          const bottom = phone ? phone.bottom - w.y - 8 : w.height;
          const sheetTop = sheet ? sheet.top - w.y - 10 : null;

          px = x + bw / 2 - p.width / 2;
          if (note.safe === "above") {
            place = "above";
            py = y - p.height - 12;
            if (sheetTop !== null) py = Math.min(py, sheetTop - p.height);
            if (py < top) { place = "below"; py = y + bh + 12; }
          } else {
            place = "below";
            py = y + bh + 12;
            if (py + p.height > bottom) { place = "above"; py = y - p.height - 12; }
          }
        }
        pop.dataset.place = place;
        pop.style.left = `${Math.max(4, Math.min(px, w.width - p.width - 4))}px`;
        pop.style.top = `${Math.max(2, Math.min(py, w.height - p.height - 2))}px`;
        pop.style.opacity = "1";
      }
      return `${r.x},${r.y},${r.width},${r.height}`;
    };

    /* Track every frame until it settles, then keep a slow pulse going. Stopping
       dead leaves the overlay stranded if anything shifts later — a late
       animation, a font swap, the sheet resizing under it. */
    let slow = 0;
    const tick = () => {
      if (stopped) return;
      const key = apply();
      if (key && key === last) stable++; else { stable = 0; last = key ?? ""; }
      const now = performance.now();
      if ((stable >= 4 && now > minUntil) || now > deadline) {
        slow = window.setInterval(apply, 400);
        return;
      }
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
      clearInterval(slow);
      backups.forEach(clearTimeout);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", apply);
    };
  }, [stage, note.target]);

  /* Only scroll when the highlighted component has actually gone off screen —
     never reposition the page under someone who can already see it. */
  useEffect(() => {
    if (window.innerWidth > 940) return;
    const t = setTimeout(() => {
      const el = wrapRef.current?.querySelector(NOTES[stage].target);
      if (!el) return;
      const r = el.getBoundingClientRect();
      const offScreen = r.top < 90 || r.bottom > window.innerHeight - 16;
      if (!offScreen) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    }, 450);
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
          You didn’t get what you ordered.{" "}
          <span>You got something better, and ₹20 back.</span>
        </h1>
      </header>

      <section className="journey" ref={wrapRef}>
        <Prototype onStage={onStage} />

        <div className="hl" ref={hlRef} aria-hidden />

        <div className="pop" ref={popRef}>
          <motion.div key={stage}
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="pop-step">{note.step}</span>
            <p className="pop-text">{note.text}</p>
          </motion.div>
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
