import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import "./tokens.css";
import "./styles.css";

/* Motion, frame-differenced off a 60fps recording of the real app:
   nav 150ms · sheet 200ms · screen 300ms, ease-out, no overshoot.
   Swish does not bounce, so nothing here springs. */
const EASE = [0.16, 1, 0.3, 1] as const;
const D = { nav: 0.15, sheet: 0.2, screen: 0.3 };

type Item = { id: string; name: string; meta: string; price: number; thumb: string };
type Phase = "tracking" | "alert" | "override";
type Resolution = { kind: "swap"; item: Item; secs: number } | { kind: "refund" } | null;

const ORIGINAL = { name: "Peri Peri Corn", price: 139 };
const ORDER_TOTAL = 146;
const OVERRIDE_WINDOW = 40; // seconds the kitchen gives you to override

const OPTIONS: Item[] = [
  { id: "butter-corn", name: "Butter Corn", meta: "Serves 1 · on the griddle", price: 139, thumb: "/food/butter-corn.jpg" },
  { id: "bhel-puri", name: "Bhel Puri", meta: "Serves 1 · Bestseller", price: 119, thumb: "/food/bhel-puri.jpg" },
  { id: "potato-wedges", name: "Peri Peri Potato Wedges", meta: "Serves 1 · Crispy", price: 149, thumb: "/food/potato-wedges.jpg" },
];

const delta = (p: number) =>
  p === ORIGINAL.price ? "Same price" : p < ORIGINAL.price ? `₹${ORIGINAL.price - p} back` : `₹${p - ORIGINAL.price} more`;

const money = (p: number) =>
  p === ORIGINAL.price ? "total unchanged"
    : p < ORIGINAL.price ? `₹${ORIGINAL.price - p} back to your card`
    : `₹${p - ORIGINAL.price} added to your card`;

const Check = () => (
  <svg width="60%" height="60%" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M4 12.5 9.5 18 20 6.5" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* Owns its own ticking state so the sheet above it never re-renders —
   a re-render per second was restarting the sheet's layout animation. */
function Countdown({ from, liveRef, onExpire }: { from: number; liveRef: React.RefObject<number>; onExpire: () => void }) {
  const [left, setLeft] = useState(from);
  const expire = useRef(onExpire);
  expire.current = onExpire;

  useEffect(() => {
    const start = performance.now();
    const id = setInterval(() => {
      const l = Math.max(0, from - (performance.now() - start) / 1000);
      liveRef.current = l;
      setLeft(l);
      if (l <= 0) { clearInterval(id); expire.current(); }
    }, 250);
    return () => clearInterval(id);
  }, [from, liveRef]);

  return (
    <div className="countdown">
      <div className="row">
        <span className="lbl t-caption">Locking this in</span>
        <span className="num t-caption-strong">{Math.ceil(left)}s</span>
      </div>
      <div className="track">
        {/* drains in CSS — no React work per frame */}
        <div className="fill" style={{ "--from": `${(from / OVERRIDE_WINDOW) * 100}%`, animationDuration: `${from}s` } as React.CSSProperties} />
      </div>
    </div>
  );
}

export default function App() {
  const reduce = useReducedMotion();
  const T = (d: number, delay = 0) => ({ duration: reduce ? 0 : d, ease: EASE, delay: reduce ? 0 : delay });

  const [phase, setPhase] = useState<Phase>("tracking");
  const [chosen, setChosen] = useState<Item>(OPTIONS[0]); // kitchen already started the closest match
  const [resolution, setResolution] = useState<Resolution>(null);
  const [barFrom, setBarFrom] = useState(OVERRIDE_WINDOW);
  const remainingRef = useRef(OVERRIDE_WINDOW);

  const settle = (r: NonNullable<Resolution>) => { setResolution(r); setPhase("tracking"); };
  const swap = (item: Item) =>
    settle({ kind: "swap", item, secs: Math.max(1, Math.round(OVERRIDE_WINDOW - remainingRef.current)) });

  // the kitchen finds out mid-cook
  useEffect(() => {
    if (phase !== "tracking" || resolution) return;
    const t = setTimeout(() => setPhase("alert"), 1600);
    return () => clearTimeout(t);
  }, [phase, resolution]);

  // Stepping into the list pauses the clock — the auto-decision exists to protect
  // passive users, not to rush active ones.
  useEffect(() => { if (phase === "alert") setBarFrom(remainingRef.current); }, [phase]);

  const replay = () => {
    remainingRef.current = OVERRIDE_WINDOW;
    setResolution(null); setChosen(OPTIONS[0]); setBarFrom(OVERRIDE_WINDOW); setPhase("tracking");
  };

  const sheetOpen = phase === "alert" || phase === "override";

  return (
    <div className="page">
      <div className="phone">
        <div className="screen">
          <header className="header">
            <div className="statusbar">
              <span className="t-title">9:41</span>
              <span className="glyphs" aria-hidden>
                <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor"><rect y="7" width="3" height="4" rx="1" /><rect x="4.5" y="5" width="3" height="6" rx="1" /><rect x="9" y="2.5" width="3" height="8.5" rx="1" /><rect x="13.5" width="3" height="11" rx="1" /></svg>
                <svg width="15" height="11" viewBox="0 0 15 11" fill="none"><path d="M1 3.6a9.5 9.5 0 0 1 13 0M3.4 6.2a6 6 0 0 1 8.2 0M6 8.8a2.3 2.3 0 0 1 3 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                <svg width="24" height="11" viewBox="0 0 24 11" fill="none"><rect x="0.6" y="0.6" width="20" height="9.8" rx="2.6" stroke="currentColor" strokeWidth="1.2" opacity=".6" /><rect x="2.2" y="2.2" width="16.8" height="6.6" rx="1.6" fill="currentColor" /><path d="M22.4 4v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity=".6" /></svg>
              </span>
            </div>
            <div className="navbar">
              <button className="circle-btn" aria-label="Back">
                <svg width="40%" viewBox="0 0 24 24" fill="none"><path d="M15 5 8 12l7 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <h1 className="t-h2">Order status</h1>
              <button className="help-pill t-caption-strong">
                Help
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M4 13v-1a8 8 0 0 1 16 0v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><rect x="2.5" y="12.5" width="4.5" height="7" rx="2.2" fill="currentColor" /><rect x="17" y="12.5" width="4.5" height="7" rx="2.2" fill="currentColor" /></svg>
              </button>
            </div>
          </header>

          <div className="map">
            <img src="/map.jpg" alt="Live map of the order on its way" />
            {/* The clock never moves. On resolve it flashes once, just to make you look. */}
            <motion.div
              className="eta-pill"
              animate={resolution && !reduce ? { scale: [1, 1.05, 1], backgroundColor: ["#fdfdfd", "#e1f7e3", "#fdfdfd"] } : {}}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <div className="lbl t-micro">ARRIVING IN</div>
              <div className="val t-h3">9 minutes</div>
            </motion.div>
          </div>

          <section className="panel">
            <div className="addr-label t-caption-strong">Delivering to</div>
            <div className="addr">
              <span className="t-label">Home</span>
              <span className="rest t-caption">➤ J R Makwoods Apartment, Old Mangammanapalya…</span>
            </div>
            <div className="duo">
              <div className="duo-card chef">
                <div className="duo-top"><div className="avatar y" aria-hidden>👨‍🍳</div></div>
                <div>
                  <div className="t-caption-strong">Chef Manjunath &amp; team</div>
                  <div className="sub t-caption">has prepared your order</div>
                </div>
              </div>
              <div className="duo-card rider">
                <div className="duo-top">
                  <div className="avatar" aria-hidden>🛵</div>
                  <div className="call" aria-hidden>
                    <svg width="45%" viewBox="0 0 24 24" fill="currentColor"><path d="M6.6 2h3l1.6 4-2 1.4a12 12 0 0 0 5.4 5.4l1.4-2 4 1.6v3A2.6 2.6 0 0 1 17.4 18 15.4 15.4 0 0 1 4 4.6 2.6 2.6 0 0 1 6.6 2Z" /></svg>
                  </div>
                </div>
                <div>
                  <div className="t-caption-strong">Anubhav</div>
                  <div className="sub t-caption">is on the way to deliver</div>
                </div>
              </div>
            </div>
            <div className="safety">
              <span aria-hidden style={{ fontSize: "calc(26px * var(--s))" }}>🛡️</span>
              <div className="grow">
                <div className="t-caption-strong">Our kitchen is just minutes away</div>
                <div className="sub t-caption">Learn how we ensure safe delivery</div>
              </div>
              <span aria-hidden style={{ color: "var(--text-tertiary)" }}>›</span>
            </div>
          </section>
        </div>

        <AnimatePresence>
          {sheetOpen && (
            <motion.div key="scrim" className="scrim"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={T(D.sheet)} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {sheetOpen && (
            // translate and opacity run together — exactly what the recording does
            <motion.div key="sheet" className="sheet"
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={T(D.sheet)}
            >
              <div className="grabber" />

              <div className="ribbon">
                <span className="bolt" aria-hidden>ϟ</span>
                <div>
                  <div className="val t-h3">9 minutes</div>
                  <div className="sub t-caption">Unchanged. Your food is still on time.</div>
                </div>
              </div>

              <AnimatePresence mode="wait" initial={false}>
                {phase === "alert" ? (
                  <motion.div key="alert" className="sheet-body"
                    initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14 }}
                    transition={T(D.nav)}
                  >
                    <div className="copy">
                      <h2 className="t-h2">The {ORIGINAL.name} just ran out.</h2>
                      <p className="t-body">
                        We’ve put {OPTIONS[0].name} on the griddle instead — same 9 minutes, same price.
                        Change it if you’d rather have something else.
                      </p>
                    </div>

                    <div className="option selected">
                      <img className="thumb" src={OPTIONS[0].thumb} alt="" />
                      <div className="info">
                        <span className="t-title">{OPTIONS[0].name}</span>
                        <span className="meta t-caption">{OPTIONS[0].meta}</span>
                      </div>
                      <div className="money">
                        <span className="t-title">₹{OPTIONS[0].price}</span>
                        <span className="delta t-caption">{delta(OPTIONS[0].price)}</span>
                      </div>
                      <div className="radio on"><Check /></div>
                    </div>

                    {/* urgency sits on the decision, never on the delivery */}
                    <Countdown from={barFrom} liveRef={remainingRef} onExpire={() => swap(OPTIONS[0])} />

                    <div className="actions">
                      <button className="btn btn-primary t-title" onClick={() => swap(OPTIONS[0])}>Keep it</button>
                      <button className="btn btn-secondary t-label" onClick={() => setPhase("override")}>Pick something else</button>
                      <button className="btn btn-ghost t-label" onClick={() => settle({ kind: "refund" })}>
                        Just drop it &amp; refund ₹{ORIGINAL.price}
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="override" className="sheet-body"
                    initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14 }}
                    transition={T(D.nav)}
                  >
                    <div className="copy">
                      <h2 className="t-h2">Pick something else</h2>
                      <p className="t-body">Everything here is in the kitchen right now, so your 9 minutes holds either way.</p>
                    </div>

                    <div className="options">
                      {OPTIONS.map((o, i) => (
                        <motion.button key={o.id}
                          className={`option${chosen.id === o.id ? " selected" : ""}`}
                          onClick={() => setChosen(o)}
                          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                          transition={T(D.nav, 0.04 * i)}
                          aria-pressed={chosen.id === o.id}
                        >
                          <img className="thumb" src={o.thumb} alt="" />
                          <span className="info">
                            <span className="t-title">{o.name}</span>
                            <span className="meta t-caption">{o.meta}</span>
                          </span>
                          <span className="money">
                            <span className="t-title">₹{o.price}</span>
                            <span className="delta t-caption">{delta(o.price)}</span>
                          </span>
                          <span className={`radio${chosen.id === o.id ? " on" : ""}`}>
                            {chosen.id === o.id && <Check />}
                          </span>
                        </motion.button>
                      ))}
                    </div>

                    <div className="t-caption note">
                      {chosen.price === ORIGINAL.price
                        ? `Your total stays ₹${ORDER_TOTAL}`
                        : chosen.price < ORIGINAL.price
                          ? `₹${ORIGINAL.price - chosen.price} goes back to the card you paid with`
                          : `₹${chosen.price - ORIGINAL.price} extra will be charged to your card`}
                    </div>

                    <div className="actions">
                      <button className="btn btn-primary t-title" onClick={() => swap(chosen)}>Confirm {chosen.name}</button>
                      <button className="btn btn-ghost t-label" onClick={() => settle({ kind: "refund" })}>
                        Just drop it &amp; refund ₹{ORIGINAL.price}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {resolution && (
            <motion.div key="toast" className="toast"
              initial={{ opacity: 0, y: -18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -18 }}
              transition={T(D.screen)}
            >
              <div className="check"><Check /></div>
              <div>
                <div className="title-row">
                  <span className="wipe t-title">
                    {resolution.kind === "swap" ? `${resolution.item.name} is on the griddle` : `${ORIGINAL.name} dropped`}
                    {!reduce && (
                      <motion.span className="sweep"
                        initial={{ x: "-140%" }} animate={{ x: "260%" }}
                        transition={{ duration: 0.55, ease: "easeOut", delay: 0.15 }} />
                    )}
                  </span>
                  <motion.span className="sparkle t-caption-strong" aria-hidden
                    initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }}
                    transition={T(D.screen, 0.35)}>✦</motion.span>
                </div>
                <div className="sub t-caption">
                  {resolution.kind === "swap"
                    ? `Swapped in ${resolution.secs} seconds · ${money(resolution.item.price)}`
                    : `₹${ORIGINAL.price} back to your card · the rest is still on its way`}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <p className="caption-strip t-caption">
        <b>The kitchen decides, you override.</b> It has already started the closest swap and gives you {OVERRIDE_WINDOW} seconds.
        Wait it out, or step into the list — the countdown pauses while you choose.
      </p>
      <button className="replay" onClick={replay}>Replay</button>
    </div>
  );
}
