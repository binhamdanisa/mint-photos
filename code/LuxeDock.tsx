import { useEffect, useRef, useState, type CSSProperties } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

// Phone toolbar: a dark glass capsule of fine line icons. The page you are on opens into a cream pill with
// its name; tapping another tab glides the pill there before the page changes. Buy opens the buy prompt.
// The capsule eases down a touch while scrolling down and returns when scrolling up.

const CREAM = "#f4f2ec"
const INK = "rgb(29, 29, 31)"
const FONT = "'Bricolage Grotesque', system-ui, sans-serif"

type Key = "buy" | "sell" | "trade" | "jewelry" | "service"
const TABS: { key: Key; label: string; href: string }[] = [
    { key: "buy", label: "Buy", href: "/all-products" },
    { key: "sell", label: "Sell", href: "/sell" },
    { key: "trade", label: "Trade", href: "/trade" },
    { key: "jewelry", label: "Jewelry", href: "/jewelry" },
    { key: "service", label: "Service", href: "/service" },
]

// Fine line marks drawn for Mint: a wristwatch, a hang tag, linked arrows, a cut diamond, a watchmaker's screwdriver.
function Icon({ k, color }: { k: Key; color: string }) {
    const p = { fill: "none", stroke: color, strokeWidth: 1.35, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
            {k === "buy" ? (
                <g {...p}>
                    <path d="M9 2.8h6l.7 4.1M9 21.2h6l.7-4.1M9 2.8l-.7 4.1M9 21.2l-.7-4.1" />
                    <circle cx="12" cy="12" r="5.6" />
                    <circle cx="12" cy="12" r="4.1" strokeOpacity="0.45" />
                    <path d="M12 12V9.3M12 12l1.9 1.2" />
                    <path d="M17.6 11.2h1.3v1.6h-1.3" />
                </g>
            ) : k === "sell" ? (
                <g {...p}>
                    <path d="M12.6 3.6h6.6a1.2 1.2 0 0 1 1.2 1.2v6.6L11.2 20.6a1.3 1.3 0 0 1-1.8 0L3.4 14.6a1.3 1.3 0 0 1 0-1.8z" />
                    <circle cx="16.3" cy="7.7" r="1.3" />
                    <path d="M16.3 6.4C15.6 3.9 13.4 2.6 11.6 3.1" strokeOpacity="0.55" />
                    <path d="M8.6 14.3l3.3-3.3" strokeOpacity="0.5" />
                </g>
            ) : k === "trade" ? (
                <g {...p}>
                    <path d="M4.5 9.2a7.6 7.6 0 0 1 13.4-3.1" />
                    <path d="M18.4 2.9v3.6h-3.6" />
                    <path d="M19.5 14.8a7.6 7.6 0 0 1-13.4 3.1" />
                    <path d="M5.6 21.1v-3.6h3.6" />
                    <circle cx="12" cy="12" r="1.4" strokeOpacity="0.6" />
                </g>
            ) : k === "service" ? (
                <g {...p} transform="rotate(45 12 12)">
                    <path d="M12 2.2v1.3" />
                    <rect x="10.5" y="3.5" width="3" height="1.6" rx="0.8" />
                    <rect x="10.1" y="5.1" width="3.8" height="7.6" rx="1.2" />
                    <path d="M11.3 6.6v4.6M12.7 6.6v4.6" strokeOpacity="0.5" />
                    <path d="M12 12.7v7.1" />
                    <path d="M11.3 19.8h1.4l-.7 1.6z" />
                </g>
            ) : k === "jewelry" ? (
                <g {...p}>
                    <path d="M7.4 4.6h9.2l3.6 4.6L12 20.4 3.8 9.2z" />
                    <path d="M3.8 9.2h16.4" />
                    <path d="M7.4 4.6 9.6 9.2 12 4.6l2.4 4.6 2.2-4.6" strokeOpacity="0.6" />
                    <path d="M9.6 9.2 12 20.4l2.4-11.2" strokeOpacity="0.6" />
                </g>
            ) : (
                <g {...p}>
                    <path d="M12 6.4C9.8 4.9 6.8 4.5 3.6 4.9v13.2c3.2-.4 6.2 0 8.4 1.5 2.2-1.5 5.2-1.9 8.4-1.5V4.9c-3.2-.4-6.2 0-8.4 1.5z" />
                    <path d="M12 6.4v13.2" />
                    <path d="M6.2 8.6c1.3-.1 2.6.1 3.6.6M6.2 11.6c1.3-.1 2.6.1 3.6.6M14.2 9.2c1-.5 2.3-.7 3.6-.6" strokeOpacity="0.55" />
                </g>
            )}
        </svg>
    )
}

function activeFor(path: string): Key {
    const p = path.replace(/\/+$/, "")
    if (p.startsWith("/sell")) return "sell"
    if (p.startsWith("/trade")) return "trade"
    if (p.startsWith("/service")) return "service"
    if (p.startsWith("/jewelry")) return "jewelry"
    return "buy"
}

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight auto
 */
export default function LuxeDock(props: { style?: CSSProperties }) {
    const canvas = RenderTarget.current() === RenderTarget.canvas
    const [active, setActive] = useState<Key>("service")
    const [tucked, setTucked] = useState(false)
    const last = useRef(0)

    useEffect(() => {
        if (typeof window === "undefined" || canvas) return
        const read = () => setActive(activeFor(window.location.pathname))
        read()
        window.addEventListener("popstate", read)
        const iv = setInterval(read, 1000) // Framer changes pages without a full reload
        last.current = window.scrollY
        let raf = 0
        const onScroll = () => {
            if (raf) return
            raf = requestAnimationFrame(() => {
                raf = 0
                const y = window.scrollY
                if (y > last.current + 6) setTucked(true)
                else if (y < last.current - 6) setTucked(false)
                last.current = y
            })
        }
        window.addEventListener("scroll", onScroll, { passive: true })
        return () => { clearInterval(iv); cancelAnimationFrame(raf); window.removeEventListener("popstate", read); window.removeEventListener("scroll", onScroll) }
    }, [canvas])

    const go = (e: any, t: (typeof TABS)[number]) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return
        if (t.key === "buy") {
            e.preventDefault()
            setActive("buy")
            window.dispatchEvent(new CustomEvent("mint:open-buy"))
            return
        }
        if (t.key === active) return
        // Let the pill glide to the tapped tab, then change page.
        e.preventDefault()
        setActive(t.key)
        setTimeout(() => { window.location.href = t.href }, 260)
    }

    return (
        <div style={{ width: "100%", display: "flex", justifyContent: "center", pointerEvents: "none", ...props.style }}>
            <style>{`
.ld-cap{pointer-events:auto;display:flex;align-items:center;gap:2px;height:58px;padding:0 6px;border-radius:999px;box-sizing:border-box;
 background:linear-gradient(180deg,rgba(34,36,33,.80),rgba(18,19,18,.78));
 -webkit-backdrop-filter:blur(22px) saturate(150%);backdrop-filter:blur(22px) saturate(150%);
 border:1px solid rgba(255,255,255,.12);
 box-shadow:0 22px 44px -22px rgba(0,0,0,.7),0 2px 8px rgba(0,0,0,.18),inset 0 1px 0 rgba(255,255,255,.10),inset 0 -1px 0 rgba(212,178,120,.10);
 transition:transform 420ms cubic-bezier(.22,1,.36,1)}
.ld-cap.tuck{transform:translateY(6px) scale(.94)}
.ld-tab{display:flex;align-items:center;justify-content:center;height:46px;min-width:46px;padding:0;border-radius:999px;text-decoration:none;
 color:${CREAM};font-family:${FONT};font-size:14px;font-weight:500;letter-spacing:.01em;-webkit-tap-highlight-color:transparent;
 transition:background-color 380ms cubic-bezier(.22,1,.36,1),padding 380ms cubic-bezier(.22,1,.36,1),box-shadow 380ms ease}
.ld-tab .ld-lab{max-width:0;opacity:0;overflow:hidden;white-space:nowrap;transition:max-width 420ms cubic-bezier(.22,1,.36,1),opacity 260ms ease,margin 420ms cubic-bezier(.22,1,.36,1);margin-left:0}
.ld-tab.on{background:${CREAM};color:${INK};padding:0 16px 0 13px;box-shadow:inset 0 0 0 1px rgba(212,178,120,.55),0 6px 16px -8px rgba(0,0,0,.6)}
.ld-tab.on .ld-lab{max-width:90px;opacity:1;margin-left:8px}
.ld-tab:focus-visible{outline:1px solid #d4b278;outline-offset:2px}
@media (prefers-reduced-motion:reduce){.ld-cap,.ld-tab,.ld-tab .ld-lab{transition:none}}
`}</style>
            <nav aria-label="Buy, sell, trade, jewelry and service" className={"ld-cap" + (tucked ? " tuck" : "")}>
                {TABS.map((t) => {
                    const on = t.key === active
                    return (
                        <a key={t.key} href={t.href} className={"ld-tab" + (on ? " on" : "")} aria-label={t.label} aria-current={on && t.key !== "buy" ? "page" : undefined} onClick={(e) => go(e, t)}>
                            <Icon k={t.key} color={on ? INK : "rgba(244,242,236,0.84)"} />
                            <span className="ld-lab">{t.label}</span>
                        </a>
                    )
                })}
            </nav>
        </div>
    )
}

addPropertyControls(LuxeDock, {})
