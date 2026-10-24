import { useEffect, useRef, useState, type CSSProperties } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

// Frosted floating toolbar: the front desk of the boutique.
// Same destinations as before; only the presentation changes.

const INK = "#1d1d1f"
const GOLD = "#a56f18"
const LABEL = "'Geist', 'Bricolage Grotesque', sans-serif"

type IconName = "watch" | "tag" | "trade" | "service" | "visit" | "insights" | "search" | "user" | "heart" | "menu" | "close"

function Icon({ name, size = 20, color = INK, weight = 1.25 }: { name: IconName; size?: number; color?: string; weight?: number }) {
    const p = { fill: "none", stroke: color, strokeWidth: weight, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block", flexShrink: 0 }}>
            {name === "watch" ? (<><circle {...p} cx="12" cy="12" r="5.5" /><path {...p} d="M12 9.5V12l1.6 1.2M9.2 6.8 9.8 3h4.4l.6 3.8M9.2 17.2l.6 3.8h4.4l.6-3.8" /></>) : null}
            {name === "tag" ? (<><path {...p} d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3a1 1 0 0 1 0 1.4l-7.3 7.3a1 1 0 0 1-1.4 0Z" /><circle {...p} cx="8" cy="8" r="1.3" /></>) : null}
            {name === "trade" ? (<><path {...p} d="M4 8.5h14.5M15 5l3.5 3.5L15 12M20 15.5H5.5M9 12l-3.5 3.5L9 19" /></>) : null}
            {name === "service" ? (<><path {...p} d="M14.6 6.2a4 4 0 0 0-5.1 5.1L4 16.8 7.2 20l5.5-5.5a4 4 0 0 0 5.1-5.1l-2.4 2.4-2.3-.5-.5-2.3Z" /></>) : null}
            {name === "visit" ? (<><path {...p} d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" /><circle {...p} cx="12" cy="10" r="2.2" /></>) : null}
            {name === "insights" ? (<><path {...p} d="M12 6.5c-1.8-1.6-4.5-2-7.5-1.7v13c3-.3 5.7.1 7.5 1.7 1.8-1.6 4.5-2 7.5-1.7v-13c-3-.3-5.7.1-7.5 1.7ZM12 6.5v13" /></>) : null}
            {name === "search" ? (<><circle {...p} cx="10.8" cy="10.8" r="6" /><path {...p} d="m15.3 15.3 4.7 4.7" /></>) : null}
            {name === "user" ? (<><circle {...p} cx="12" cy="8.5" r="3.6" /><path {...p} d="M4.8 20c1-3.6 3.8-5.6 7.2-5.6s6.2 2 7.2 5.6" /></>) : null}
            {name === "heart" ? (<><path {...p} d="M12 19.5s-7.5-4.4-7.5-10A4.2 4.2 0 0 1 12 7.2a4.2 4.2 0 0 1 7.5 2.3c0 5.6-7.5 10-7.5 10Z" /></>) : null}
            {name === "menu" ? (<><path {...p} d="M4.5 8.5h15M8.5 15.5h11" /></>) : null}
            {name === "close" ? (<><path {...p} d="m6 6 12 12M18 6 6 18" /></>) : null}
        </svg>
    )
}

interface NavLink { label: string; href: string; icon: IconName }
const MAIN: NavLink[] = [
    { label: "Buy", href: "/shop", icon: "watch" },
    { label: "Sell", href: "/sell", icon: "tag" },
    { label: "Trade", href: "/trade", icon: "trade" },
    { label: "Service", href: "/service", icon: "service" },
    { label: "Visit", href: "/visit", icon: "visit" },
    { label: "Insights", href: "/insights", icon: "insights" },
]
const ACTIONS: NavLink[] = [
    { label: "Search", href: "/shop", icon: "search" },
    { label: "Account", href: "/account", icon: "user" },
    { label: "Saved", href: "/watchlist", icon: "heart" },
]
const MORE: { label: string; href: string }[] = [
    { label: "About", href: "/about" },
    { label: "Authenticity", href: "/authenticity" },
    { label: "Make an offer", href: "/offer" },
]

interface Props {
    logo?: { src?: string; srcSet?: string; alt?: string }
    highlight: string
    style?: CSSProperties
}

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight auto
 */
export default function FloatingNav(props: Props) {
    const { logo, highlight = "Buy", style } = props
    const box = useRef<HTMLDivElement>(null)
    const [w, setW] = useState(1200)
    const [slim, setSlim] = useState(false)
    const [open, setOpen] = useState(false)
    const [path, setPath] = useState("")
    const onCanvas = RenderTarget.current() === RenderTarget.canvas
    useEffect(() => {
        const el = box.current
        let ro: ResizeObserver | null = null
        if (el && typeof ResizeObserver !== "undefined") { ro = new ResizeObserver(([e]) => setW(e.contentRect.width)); ro.observe(el); setW(el.getBoundingClientRect().width || 1200) }
        if (typeof window !== "undefined") { setPath(window.location.pathname) }
        const onScroll = () => setSlim(window.scrollY > 24)
        if (!onCanvas && typeof window !== "undefined") { window.addEventListener("scroll", onScroll, { passive: true }); onScroll() }
        return () => { ro && ro.disconnect(); if (typeof window !== "undefined") window.removeEventListener("scroll", onScroll) }
    }, [])
    useEffect(() => {
        if (typeof document === "undefined" || onCanvas) return
        document.body.style.overflow = open ? "hidden" : ""
        return () => { document.body.style.overflow = "" }
    }, [open])
    const phone = w < 810
    const desktopLabels = w >= 1100

    const glass: CSSProperties = {
        background: "linear-gradient(180deg, rgba(220,228,215,0.78), rgba(212,220,207,0.66))",
        backdropFilter: "blur(20px) saturate(160%)", WebkitBackdropFilter: "blur(20px) saturate(160%)",
        border: "1px solid rgba(255,255,255,0.6)",
        boxShadow: "0 1px 0 rgba(255,255,255,0.7) inset, 0 18px 40px -18px rgba(29,29,31,0.35), 0 2px 6px rgba(29,29,31,0.06)",
    }
    const is = (href: string) => path && (path === href || (href !== "/" && path.startsWith(href + "/")) || (href === "/shop" && path.startsWith("/shop")))

    const Item = ({ l, gold }: { l: NavLink; gold: boolean }) => {
        const [hover, setHover] = useState(false)
        const active = is(l.href)
        const color = hover || gold ? GOLD : INK
        return (
            <a href={l.href} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{ display: "flex", alignItems: "center", gap: 7, padding: desktopLabels ? "8px 12px" : "8px 9px", borderRadius: 999, textDecoration: "none", color, fontFamily: LABEL, fontSize: 13, fontWeight: 500, letterSpacing: "0.01em", background: active ? "rgba(255,255,255,0.55)" : "transparent", transform: hover ? "translateY(-1px)" : "none", transition: "transform 220ms ease, color 220ms ease, background 220ms ease" }} aria-label={l.label}>
                <Icon name={l.icon} size={18} color={color} />
                {desktopLabels ? <span>{l.label}</span> : null}
            </a>
        )
    }
    const Action = ({ l }: { l: NavLink }) => {
        const [hover, setHover] = useState(false)
        return (
            <a href={l.href} aria-label={l.label} title={l.label} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{ width: 38, height: 38, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", background: hover ? "rgba(255,255,255,0.6)" : "transparent", transform: hover ? "translateY(-1px)" : "none", transition: "transform 220ms ease, background 220ms ease" }}>
                <Icon name={l.icon} size={19} color={hover ? GOLD : INK} />
            </a>
        )
    }
    const Logo = ({ h }: { h: number }) => (
        <a href="/" aria-label="Mint Timepieces home" style={{ display: "flex", alignItems: "center", height: h, flexShrink: 0 }}>
            {logo && logo.src ? <img src={logo.src} srcSet={logo.srcSet} alt="Mint Timepieces" style={{ height: h, width: "auto", display: "block" }} /> : <span style={{ fontFamily: "'Mattone', sans-serif", fontWeight: 700, fontSize: 20, color: INK }}>M</span>}
        </a>
    )

    return (
        <div ref={box} style={{ width: "100%", position: "relative", pointerEvents: "none", ...style }}>
            <div style={{ padding: phone ? "10px 12px 0" : (slim ? "10px 20px 0" : "16px 20px 0"), transition: "padding 320ms cubic-bezier(0.22,1,0.36,1)" }}>
                <nav aria-label="Main" style={{ ...glass, pointerEvents: "auto", maxWidth: 1180, margin: "0 auto", borderRadius: phone ? 20 : 999, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: phone ? "8px 8px 8px 16px" : slim ? "6px 8px 6px 22px" : "9px 10px 9px 24px", transition: "padding 320ms cubic-bezier(0.22,1,0.36,1)" }}>
                    <Logo h={phone ? 24 : slim ? 24 : 28} />
                    {phone ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                            <Action l={ACTIONS[0]} />
                            <Action l={ACTIONS[2]} />
                            <button type="button" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)} style={{ width: 40, height: 40, border: 0, borderRadius: 999, background: open ? "rgba(255,255,255,0.65)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                                <Icon name={open ? "close" : "menu"} size={20} />
                            </button>
                        </div>
                    ) : (
                        <>
                            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                                {MAIN.map((l) => <Item key={l.label} l={l} gold={l.label === highlight} />)}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                                {ACTIONS.map((l) => <Action key={l.label} l={l} />)}
                            </div>
                        </>
                    )}
                </nav>
            </div>
            {phone && open ? (
                <div role="dialog" aria-label="Menu" style={{ pointerEvents: "auto", position: "fixed", inset: 0, zIndex: 1, padding: "72px 12px 24px", background: "rgba(248,245,240,0.5)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }} onClick={() => setOpen(false)}>
                    <div onClick={(e) => e.stopPropagation()} style={{ ...glass, borderRadius: 24, padding: 10, display: "flex", flexDirection: "column" }}>
                        {MAIN.map((l) => (
                            <a key={l.label} href={l.href} style={{ display: "flex", alignItems: "center", gap: 14, padding: "15px 14px", borderRadius: 16, textDecoration: "none", color: l.label === highlight ? GOLD : INK, fontFamily: LABEL, fontSize: 17, fontWeight: 500 }}>
                                <Icon name={l.icon} size={20} color={l.label === highlight ? GOLD : INK} />{l.label}
                            </a>
                        ))}
                        <div style={{ height: 1, background: "rgba(29,29,31,0.08)", margin: "6px 14px" }} />
                        {[ACTIONS[1], ACTIONS[2]].map((l) => (
                            <a key={l.label} href={l.href} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 14px", textDecoration: "none", color: INK, fontFamily: LABEL, fontSize: 15 }}>
                                <Icon name={l.icon} size={19} />{l.label}
                            </a>
                        ))}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "8px 14px 10px" }}>
                            {MORE.map((m) => <a key={m.label} href={m.href} style={{ padding: "8px 12px", borderRadius: 999, background: "rgba(255,255,255,0.6)", color: INK, fontFamily: LABEL, fontSize: 13, textDecoration: "none" }}>{m.label}</a>)}
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    )
}

addPropertyControls(FloatingNav, {
    logo: { type: ControlType.ResponsiveImage, title: "Logo" },
    highlight: { type: ControlType.Enum, title: "Gold action", options: ["Buy", "Sell", "Trade", "Service", "Visit", "Insights"], defaultValue: "Buy" },
})
