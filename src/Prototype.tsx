import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from "motion/react";
import "./tokens.css";
import "./styles.css";

/* Motion, frame-differenced off a 60fps recording of the real app:
   nav 150ms · sheet 200ms · screen 300ms, ease-out, no overshoot.
   Swish does not bounce, so nothing here springs. */
const EASE = [0.16, 1, 0.3, 1] as const;
const D = { nav: 0.15, sheet: 0.2, screen: 0.3 };

type Item = { id: string; name: string; meta: string; price: number; thumb: string };
type Phase = "tracking" | "locked" | "alert" | "override";
type Resolution = { kind: "swap"; item: Item; secs: number } | { kind: "refund" } | null;

/* The page reads this to show the reasoning for wherever you are in the flow,
   rather than dumping all of it up front. */
export type Stage = "tracking" | "locked" | "alert1" | "override1" | "resolved1" | "alert2" | "resolved2";

const BUTTER_CORN: Item = { id: "butter-corn", name: "Butter Corn", meta: "Serves 1 · closest match", price: 139, thumb: "/food/butter-corn.jpg" };
const BHEL_PURI: Item = { id: "bhel-puri", name: "Bhel Puri", meta: "Serves 1 · Bestseller", price: 119, thumb: "/food/bhel-puri.jpg" };
const WEDGES: Item = { id: "potato-wedges", name: "Peri Peri Potato Wedges", meta: "Serves 1 · Crispy", price: 149, thumb: "/food/potato-wedges.jpg" };

const LOST = { name: "Peri Peri Corn", price: 139 };
/* The rest of the bag. Bhel Puri is already here, so it must never be offered as a
   swap — a reviewer on 11 Aug was talked into exactly that over the phone and
   "ended up giving me the same item twice". */
const ALSO_IN_ORDER = [BHEL_PURI];
const ORDER_TOTAL = LOST.price + BHEL_PURI.price + 7;
const OVERRIDE_WINDOW = 40;

const ALTERNATIVES = [BUTTER_CORN, BHEL_PURI, WEDGES];
const inOrder = (i: Item) => ALSO_IN_ORDER.some((o) => o.id === i.id);
const delta = (p: number) =>
  p === LOST.price ? "Same price" : p < LOST.price ? `₹${LOST.price - p} back` : `₹${p - LOST.price} more`;
const money = (p: number) =>
  p === LOST.price ? "total unchanged"
    : p < LOST.price ? `₹${LOST.price - p} back to your card`
    : `₹${p - LOST.price} added to your card`;

const Check = () => (
  <svg width="60%" height="60%" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M4 12.5 9.5 18 20 6.5" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const StatusGlyphs = () => (
  <span className="glyphs" aria-hidden>
    <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor"><rect y="7" width="3" height="4" rx="1" /><rect x="4.5" y="5" width="3" height="6" rx="1" /><rect x="9" y="2.5" width="3" height="8.5" rx="1" /><rect x="13.5" width="3" height="11" rx="1" /></svg>
    <svg width="15" height="11" viewBox="0 0 15 11" fill="none"><path d="M1 3.6a9.5 9.5 0 0 1 13 0M3.4 6.2a6 6 0 0 1 8.2 0M6 8.8a2.3 2.3 0 0 1 3 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
    <svg width="24" height="11" viewBox="0 0 24 11" fill="none"><rect x="0.6" y="0.6" width="20" height="9.8" rx="2.6" stroke="currentColor" strokeWidth="1.2" opacity=".6" /><rect x="2.2" y="2.2" width="16.8" height="6.6" rx="1.6" fill="currentColor" /><path d="M22.4 4v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity=".6" /></svg>
  </span>
);

const Ribbon = () => (
  <div className="ribbon">
    <span className="bolt" aria-hidden>ϟ</span>
    <div>
      <div className="val t-h3">9 minutes</div>
      <div className="sub t-caption">Unchanged. Your food is still on time.</div>
    </div>
  </div>
);

function OptionRow({ item, selected, disabled, onPick }: { item: Item; selected?: boolean; disabled?: boolean; onPick?: () => void }) {
  const body = (
    <>
      <img className="thumb" src={item.thumb} alt="" />
      <span className="info">
        <span className="t-title">{item.name}</span>
        <span className="meta t-caption">{disabled ? "Already in your order" : item.meta}</span>
      </span>
      <span className="money">
        <span className="t-title">₹{item.price}</span>
        {!disabled && <span className="delta t-caption">{delta(item.price)}</span>}
      </span>
      <span className={`radio${selected ? " on" : ""}`}>{selected && <Check />}</span>
    </>
  );
  if (disabled) return <div className="option disabled">{body}</div>;
  return (
    <button className={`option${selected ? " selected" : ""}`} onClick={onPick} aria-pressed={!!selected}>
      {body}
    </button>
  );
}

/* Owns its own ticking state so the sheet above it never re-renders —
   a re-render per second was restarting the sheet's layout animation. */
function Countdown({ from, liveRef, onExpire }: { from: number; liveRef: React.RefObject<number>; onExpire: () => void }) {
  const [left, setLeft] = useState(from);
  const expire = useRef(onExpire);
  expire.current = onExpire;
  /* Stop ticking the moment this body starts leaving. Setting state on an
     exiting AnimatePresence child restarts its exit animation, so it never
     completes — and with mode="wait" that deadlocks the swap to the next body. */
  const present = useIsPresent();

  useEffect(() => {
    if (!present) return;
    const start = performance.now();
    const id = setInterval(() => {
      const l = Math.max(0, from - (performance.now() - start) / 1000);
      liveRef.current = l;
      setLeft(l);
      if (l <= 0) { clearInterval(id); expire.current(); }
    }, 250);
    return () => clearInterval(id);
  }, [from, liveRef, present]);

  return (
    <div className="countdown">
      <div className="row">
        <span className="lbl t-caption">Locking this in</span>
        <span className="num t-caption-strong" aria-live="polite">{Math.ceil(left)}s</span>
      </div>
      <div className="track">
        {/* drains in CSS — no React work per frame */}
        <div className="fill" style={{ "--from": `${(from / OVERRIDE_WINDOW) * 100}%`, animationDuration: `${from}s` } as React.CSSProperties} />
      </div>
    </div>
  );
}

function LockScreen({ onOpen, T, reduce }: { onOpen: () => void; T: (d: number, delay?: number) => object; reduce: boolean | null }) {
  return (
    <motion.div className="lock"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.06 }}
      transition={T(D.screen)}
    >
      <div className="lock-status"><StatusGlyphs /></div>
      <div className="lock-date t-subtitle">Tuesday, 9 September</div>
      <div className="lock-clock">9:41</div>

      {/* Has to survive being the only thing someone reads: what broke, what we
          already did, that the 9 minutes holds, and what tapping gets you. */}
      <motion.button className="notif" onClick={onOpen}
        initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={T(D.screen, 0.35)}
      >
        <span className="notif-top">
          <span className="notif-icon" aria-hidden>ϟ</span>
          <span className="name t-micro">Swish</span>
          <span className="when t-caption">now</span>
        </span>
        <span className="notif-title t-title">The {LOST.name} just ran out</span>
        <span className="notif-body t-body">
          We’ve put {BUTTER_CORN.name} on the griddle — same 9 minutes, same price. Tap to change it.
        </span>
      </motion.button>

      <div className="lock-controls" aria-hidden>
        <span className="lock-ctl">⚡</span>
        <span className="lock-ctl">◉</span>
      </div>
    </motion.div>
  );
}

export default function Prototype({ onStage }: { onStage?: (s: Stage) => void }) {
  const reduce = useReducedMotion();
  const T = (d: number, delay = 0) => ({ duration: reduce ? 0 : d, ease: EASE, delay: reduce ? 0 : delay });

  const [phase, setPhase] = useState<Phase>("tracking");
  const [round, setRound] = useState<1 | 2>(1);
  const [lostAgain, setLostAgain] = useState<Item | null>(null); // whatever the first round settled on
  const [chosen, setChosen] = useState<Item>(BUTTER_CORN);
  const [resolution, setResolution] = useState<Resolution>(null);
  const [barFrom, setBarFrom] = useState(OVERRIDE_WINDOW);
  const remainingRef = useRef(OVERRIDE_WINDOW);

  const settle = (r: NonNullable<Resolution>) => { setResolution(r); setPhase("tracking"); };
  // the countdown only exists in round one, so there is no elapsed time to report after that
  const swap = (item: Item) =>
    settle({ kind: "swap", item, secs: round === 1 ? Math.max(1, Math.round(OVERRIDE_WINDOW - remainingRef.current)) : 0 });

  // order placed, phone goes idle, then the kitchen finds out mid-cook
  useEffect(() => {
    if (phase !== "tracking" || resolution || round !== 1) return;
    const t = setTimeout(() => setPhase("locked"), 1800);
    return () => clearTimeout(t);
  }, [phase, resolution, round]);

  /* The cascade. The 13 Jul reviewer was called three times: the kachori went, then
     the batata vada they agreed to, then the sandwich. A design that only survives
     one failure does not survive the review it is answering. */
  useEffect(() => {
    if (round !== 1 || !resolution || resolution.kind !== "swap") return;
    const failed = resolution.item; // whatever you actually settled on, not a fixed item
    const t = setTimeout(() => {
      setLostAgain(failed); setRound(2); setResolution(null); setPhase("alert");
    }, 2600);
    return () => clearTimeout(t);
  }, [round, resolution]);

  useEffect(() => { if (phase === "alert" && round === 1) setBarFrom(remainingRef.current); }, [phase, round]);

  const replay = () => {
    remainingRef.current = OVERRIDE_WINDOW;
    setResolution(null); setChosen(BUTTER_CORN); setBarFrom(OVERRIDE_WINDOW);
    setRound(1); setLostAgain(null); setPhase("tracking");
  };

  const sheetOpen = phase === "alert" || phase === "override";
  const candidates = ALTERNATIVES;
  // what the kitchen can still make: not already in the bag, and not the one that just went
  const remaining = ALTERNATIVES.find((i) => !inOrder(i) && i.id !== lostAgain?.id) ?? null;

  const stage: Stage =
    phase === "locked" ? "locked"
      : phase === "override" ? "override1"
      : phase === "alert" ? (round === 1 ? "alert1" : "alert2")
      : resolution ? (round === 1 ? "resolved1" : "resolved2")
      : "tracking";
  const emit = useRef(onStage);
  emit.current = onStage;
  useEffect(() => { emit.current?.(stage); }, [stage]);

  return (
    <div className="stage" data-stage={stage}>
      <div className={`device${phase === "locked" ? " on-dark" : ""}`}>
        <div className="phone">
          <div className="screen">
            <header className="header">
              <div className="statusbar">
                <span className="t-title">9:41</span>
                <StatusGlyphs />
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
              {/* The clock never moves. On resolve it flashes once, to make you look. */}
              <motion.div className="eta-pill"
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
                initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }}
                transition={T(D.sheet)}
              >
                <div className="grabber" />
                <Ribbon />

                <AnimatePresence mode="wait" initial={false}>
                  {phase === "alert" && round === 1 ? (
                    <motion.div key="alert" className="sheet-body"
                      initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14 }}
                      transition={T(D.nav)}
                    >
                      <div className="copy">
                        <h2 className="t-h2">The {LOST.name} just ran out.</h2>
                        <p className="t-body">
                          We’ve put {BUTTER_CORN.name} on the griddle instead — same 9 minutes, same price.
                          Change it if you’d rather have something else.
                        </p>
                      </div>
                      <OptionRow item={BUTTER_CORN} selected />
                      {/* urgency sits on the decision, never on the delivery */}
                      <Countdown from={barFrom} liveRef={remainingRef} onExpire={() => swap(BUTTER_CORN)} />
                      <div className="actions">
                        <button className="btn btn-primary t-title" onClick={() => swap(BUTTER_CORN)}>Keep it</button>
                        <button className="btn btn-secondary t-label" onClick={() => setPhase("override")}>Pick something else</button>
                        <button className="btn btn-ghost t-label" onClick={() => settle({ kind: "refund" })}>
                          Just drop it &amp; refund ₹{LOST.price}
                        </button>
                      </div>
                    </motion.div>
                  ) : phase === "alert" && round === 2 ? (
                    /* Second failure. The kitchen decided once and was wrong, so now it
                       asks — no auto-decision, no countdown, and refund leads. */
                    <motion.div key="alert2" className="sheet-body"
                      initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14 }}
                      transition={T(D.nav)}
                    >
                      <div className="copy">
                        <h2 className="t-h2">{(lostAgain ?? BUTTER_CORN).name} just went too.</h2>
                        <p className="t-body">
                          {remaining
                            ? "That’s twice, so we’re not going to keep guessing. This is the last thing the kitchen can make right now — or we refund it and the rest still comes."
                            : "That’s twice, and there’s nothing else the kitchen can make right now. We’ll put the money back and the rest of your order still comes."}
                        </p>
                      </div>
                      {remaining && <OptionRow item={remaining} />}
                      <div className="actions">
                        <button className="btn btn-primary t-title" onClick={() => settle({ kind: "refund" })}>
                          Refund ₹{LOST.price}, send the rest
                        </button>
                        {remaining && (
                          <button className="btn btn-secondary t-label" onClick={() => swap(remaining)}>
                            Send {remaining.name} instead
                          </button>
                        )}
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
                        {candidates.map((o, i) => (
                          <motion.div key={o.id}
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            transition={T(D.nav, 0.04 * i)}
                          >
                            <OptionRow item={o} disabled={inOrder(o)} selected={chosen.id === o.id} onPick={() => setChosen(o)} />
                          </motion.div>
                        ))}
                      </div>
                      <div className="t-caption note">
                        {chosen.price === LOST.price
                          ? `Your total stays ₹${ORDER_TOTAL}`
                          : chosen.price < LOST.price
                            ? `₹${LOST.price - chosen.price} goes back to the card you paid with`
                            : `₹${chosen.price - LOST.price} extra will be charged to your card`}
                      </div>
                      <div className="actions">
                        <button className="btn btn-primary t-title" onClick={() => swap(chosen)}>Confirm {chosen.name}</button>
                        <button className="btn btn-ghost t-label" onClick={() => settle({ kind: "refund" })}>
                          Just drop it &amp; refund ₹{LOST.price}
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
                      {resolution.kind === "swap" ? `${resolution.item.name} is on the griddle` : `${LOST.name} dropped`}
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
                      ? resolution.secs > 0
                        ? `Swapped in ${resolution.secs} seconds · ${money(resolution.item.price)}`
                        : `Swapped · ${money(resolution.item.price)}`
                      : `₹${LOST.price} back to your card · the rest is still on its way`}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {phase === "locked" && (
              <LockScreen onOpen={() => setPhase("alert")} T={T} reduce={reduce} />
            )}
          </AnimatePresence>
        </div>

        <div className="island" />
        <div className="home-indicator" />
      </div>

      <button className="replay" onClick={replay}>Replay</button>
    </div>
  );
}
