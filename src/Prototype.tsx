import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import "./tokens.css";
import "./styles.css";

/* Motion, frame-differenced off a 60fps recording of the real app:
   nav 150ms · sheet 200ms · screen 300ms, ease-out, no overshoot.
   Swish does not bounce, so nothing here springs. */
const EASE = [0.16, 1, 0.3, 1] as const;
const D = { nav: 0.15, sheet: 0.2, screen: 0.3 };

type Item = {
  id: string; name: string; meta: string;
  list: number;   // what it normally sells for
  yours: number;  // what you are actually charged
  thumb: string;
};
type Phase = "tracking" | "locked" | "alert" | "override";
type Resolution = { kind: "swap"; item: Item; secs: number } | { kind: "refund" } | null;

export type Stage = "tracking" | "locked" | "alert" | "override" | "resolved" | "dropped";

/* The kitchen keeps a few things on all day. Swaps only ever come from here, so
   the thing that happened to the 13 Jul reviewer — agreeing to a substitute that
   then also ran out, three times — cannot happen. It is designed out, not
   handled. Priced below what you already paid, so the swap is never a downgrade. */
const BUTTER_CORN: Item = { id: "butter-corn", name: "Butter Corn", meta: "Always in our kitchen", list: 169, yours: 119, thumb: "/food/butter-corn.jpg" };
const WEDGES: Item = { id: "potato-wedges", name: "Peri Peri Potato Wedges", meta: "Always in our kitchen", list: 189, yours: 129, thumb: "/food/potato-wedges.jpg" };
const ALWAYS_ON = [BUTTER_CORN, WEDGES];

const BHEL_PURI: Item = { id: "bhel-puri", name: "Bhel Puri", meta: "Bestseller", list: 119, yours: 119, thumb: "/food/bhel-puri.jpg" };

const LOST = { name: "Peri Peri Corn", paid: 139 };
/* Already in the bag. A reviewer on 11 Aug was talked into a duplicate over the
   phone, so anything already ordered is shown dead rather than offered. */
const ALSO_IN_ORDER = [BHEL_PURI];
// what you can pick from, with anything already ordered shown dead at the end
const CHOICES = [...ALWAYS_ON, ...ALSO_IN_ORDER];
const OVERRIDE_WINDOW = 40;

const inOrder = (i: Item) => ALSO_IN_ORDER.some((o) => o.id === i.id);
const backTo = (i: Item) => LOST.paid - i.yours;

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
      <div className="sub t-caption">Not a second added.</div>
    </div>
  </div>
);

/* The upgrade is shown, never announced: a dearer dish, struck through to what
   you actually pay, with the difference going back. The customer draws the
   conclusion, which lands better than the app claiming it. */
function OptionRow({ item, selected, disabled, onPick }: { item: Item; selected?: boolean; disabled?: boolean; onPick?: () => void }) {
  const better = !disabled && item.list > LOST.paid;
  const body = (
    <>
      <img className="thumb" src={item.thumb} alt="" />
      <span className="info">
        <span className="name-row">
          <span className="t-title">{item.name}</span>
          {better && <span className="pill t-micro">Upgrade</span>}
        </span>
        <span className="meta t-caption">{disabled ? "Already in your order" : item.meta}</span>
      </span>
      <span className="money">
        <span className="price-row">
          {better && <s className="list t-caption">₹{item.list}</s>}
          <span className="t-title">₹{item.yours}</span>
        </span>
        {!disabled && (
          <span className="delta t-caption">
            {backTo(item) > 0 ? `₹${backTo(item)} back` : backTo(item) < 0 ? `₹${-backTo(item)} more` : "Same price"}
          </span>
        )}
      </span>
      <span className={`radio${selected ? " on" : ""}`}>{selected && <Check />}</span>
    </>
  );
  if (disabled) return <div className="option disabled">{body}</div>;
  return (
    <button className={`option${selected ? " selected" : ""}`} onClick={onPick} aria-pressed={!!selected}>{body}</button>
  );
}

/* Writes the seconds straight to the DOM and never calls setState. Any render
   triggered from inside an exiting AnimatePresence child restarts its exit
   animation, so the exit never completes and mode="wait" deadlocks — the next
   body never mounts. No state here means that cannot happen at all. */
function Countdown({ from, liveRef, onExpire }: { from: number; liveRef: React.RefObject<number>; onExpire: () => void }) {
  const numRef = useRef<HTMLSpanElement>(null);
  const expire = useRef(onExpire);
  expire.current = onExpire;

  useEffect(() => {
    const start = performance.now();
    const id = setInterval(() => {
      const l = Math.max(0, from - (performance.now() - start) / 1000);
      liveRef.current = l;
      if (numRef.current) numRef.current.textContent = `${Math.ceil(l)}s`;
      if (l <= 0) { clearInterval(id); expire.current(); }
    }, 250);
    return () => clearInterval(id);
  }, [from, liveRef]);

  return (
    <div className="countdown">
      <div className="row">
        <span className="lbl t-caption">Confirming in</span>
        <span className="num t-caption-strong" aria-live="polite" ref={numRef}>{Math.ceil(from)}s</span>
      </div>
      <div className="track">
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

      <motion.button className="notif" onClick={onOpen}
        initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={T(D.screen, 0.35)}
      >
        <span className="notif-top">
          {/* their real app icon: green square, white four-point sparkle */}
          <span className="notif-icon" aria-hidden>✦</span>
          <span className="name t-micro">Swish</span>
          <span className="when t-caption">now</span>
        </span>
        {/* front-loaded: iOS truncates this to about two lines */}
        <span className="notif-title t-title">You’ve been upgraded to {BUTTER_CORN.name}</span>
        <span className="notif-body t-body">
          The {LOST.name} ran out. It’s a ₹{BUTTER_CORN.list} dish and ₹{backTo(BUTTER_CORN)} is
          already going back — still landing in 9 minutes.
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
  const [chosen, setChosen] = useState<Item>(BUTTER_CORN);
  const [resolution, setResolution] = useState<Resolution>(null);
  const [callAsked, setCallAsked] = useState(false);
  const [barFrom, setBarFrom] = useState(OVERRIDE_WINDOW);
  const remainingRef = useRef(OVERRIDE_WINDOW);

  const settle = (r: NonNullable<Resolution>) => { setResolution(r); setPhase("tracking"); };
  const swap = (item: Item) =>
    settle({ kind: "swap", item, secs: Math.max(1, Math.round(OVERRIDE_WINDOW - remainingRef.current)) });

  useEffect(() => {
    if (phase !== "tracking" || resolution) return;
    const t = setTimeout(() => setPhase("locked"), 1800);
    return () => clearTimeout(t);
  }, [phase, resolution]);

  useEffect(() => { if (phase === "alert") setBarFrom(remainingRef.current); }, [phase]);

  const replay = () => {
    remainingRef.current = OVERRIDE_WINDOW;
    setResolution(null); setChosen(BUTTER_CORN); setBarFrom(OVERRIDE_WINDOW);
    setCallAsked(false); setPhase("tracking");
  };

  const sheetOpen = phase === "alert" || phase === "override";
  const stage: Stage =
    phase === "locked" ? "locked"
      : phase === "override" ? "override"
      : phase === "alert" ? "alert"
      : resolution ? (resolution.kind === "refund" ? "dropped" : "resolved")
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
              <motion.div key="sheet" className="sheet"
                initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }}
                transition={T(D.sheet)}
              >
                <div className="grabber" />
                <Ribbon />

                {/* Deliberately not AnimatePresence. mode="wait" holds the incoming body
                    until the outgoing one finishes exiting, and anything that re-renders
                    that exiting subtree restarts the exit — so it never finishes and the
                    swap deadlocks. A keyed remount just plays the enter animation and
                    cannot get stuck. */}
                {phase === "alert" ? (
                    <motion.div key="alert" className="sheet-body"
                      initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }}
                      transition={T(D.nav)}
                    >
                      <div className="copy">
                        {/* upgrade first so it lands as good news, cause in the very next
                            breath so it never reads as hiding what went wrong */}
                        <h2 className="t-h2">You’ve been upgraded to {BUTTER_CORN.name}.</h2>
                        {/* the ribbon above already carries the time — don't say it twice */}
                        <p className="t-body">
                          The {LOST.name} ran out. Butter Corn normally goes for ₹{BUTTER_CORN.list} —
                          yours is ₹{BUTTER_CORN.yours}, with ₹{backTo(BUTTER_CORN)} already heading back.
                        </p>
                      </div>
                      <OptionRow item={BUTTER_CORN} selected />
                      <Countdown from={barFrom} liveRef={remainingRef} onExpire={() => swap(BUTTER_CORN)} />
                      <div className="actions">
                        <button className="btn btn-primary t-title" onClick={() => swap(BUTTER_CORN)}>Keep the upgrade</button>
                        <button className="btn btn-secondary t-label" onClick={() => setPhase("override")}>Pick something else</button>
                        <button className="btn btn-ghost t-label" onClick={() => settle({ kind: "refund" })}>
                          No thanks — refund ₹{LOST.paid}
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div key="override" className="sheet-body"
                      initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }}
                      transition={T(D.nav)}
                    >
                      <div className="copy">
                        {/* they tapped "something else" expecting a downgrade — tell them otherwise */}
                        <h2 className="t-h2">These are all upgrades too.</h2>
                        <p className="t-body">
                          We keep them on all day, so they can’t run out on you. Every one costs less
                          than you paid.
                        </p>
                      </div>
                      <div className="options">
                        {CHOICES.map((o, i) => (
                          <motion.div key={o.id}
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            transition={T(D.nav, 0.04 * i)}
                          >
                            <OptionRow item={o} disabled={inOrder(o)} selected={chosen.id === o.id} onPick={() => setChosen(o)} />
                          </motion.div>
                        ))}
                      </div>
                      <div className="t-caption note">
                        ₹{backTo(chosen)} back to the card you paid with
                      </div>
                      <div className="actions">
                        <button className="btn btn-primary t-title" onClick={() => swap(chosen)}>Upgrade to {chosen.name}</button>
                        <button className="btn btn-ghost t-label" onClick={() => settle({ kind: "refund" })}>
                          No thanks — refund ₹{LOST.paid}
                        </button>
                      </div>
                    </motion.div>
                  )}
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
                <div className="toast-copy">
                  <div className="title-row">
                    <span className="wipe t-title">
                      {resolution.kind === "swap" ? `Upgraded to ${resolution.item.name}` : "Taken off your order"}
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
                      ? `A ₹${resolution.item.list} dish for ₹${resolution.item.yours} — ₹${backTo(resolution.item)} is on its way back`
                      : `₹${LOST.paid} back to your card in 3–5 days. Everything else still lands in 9 minutes.`}
                  </div>
                  {/* the call is the customer's to ask for, never ours to impose */}
                  {resolution.kind === "refund" && (
                    <button className="toast-action t-caption-strong" onClick={() => setCallAsked(true)} disabled={callAsked}>
                      {callAsked ? "We’ll call you in a minute." : "Something wrong? Ask us to call"}
                    </button>
                  )}
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
