import { useEffect } from "react"
import { RenderTarget } from "framer"

/**
 * Mint motion layer. One quiet motion language for the whole site.
 * Lives once in the Nav & Footer layout. Renders no visible UI.
 *
 * What it does
 * - First screen composes in sequence on load: imagery, then headline, then copy, then the action (pure CSS, so it never waits on scripts).
 * - Content below the first screen reveals on scroll with a soft fade and a small rise.
 * - Headlines reveal line by line; body copy follows as one calm block.
 * - Editorial imagery (never product photography) eases from 1.03 to 1.06 as it reveals, then settles, with a gentle parallax.
 * - A thin brass line draws across the top of each section once per visit.
 * - Home, About and Atelier shift quietly between sand and sage tints by chapter.
 * - Touch feedback: cards lift a touch, buttons settle, the saved heart pulses.
 * - Reduced motion: everything is instant. Buy panels, availability, forms and the cart are never animated.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */

const BRASS = "#a56f18"
const SAND = "#f7f2ea"
const SAGE = "#e8eee4"
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)"

// Pages in scope (A5). Product pages get editorial reveals only, never on the first screen.
const ENTRY_ROUTE_IDS = ["Y_nqQrdIC", "ZBEoTxBdt", "CIAaqEuRN", "j25U1tedj", "eSMqDry9N", "g8rveuKOK", "b6WTmTPX6", "HnWvUJjGB", "zXoIvBUbO"]

type Kind = "home" | "collection" | "product" | "about" | "atelier" | "editorial" | null

function kindFor(pathname: string): Kind {
    const p = pathname.replace(/\/+$/, "") || "/"
    if (p === "/") return "home"
    if (/^\/(shop|jewelry)\/[^/]+$/.test(p)) return "product"
    if (/^\/(shop|all-products|jewelry)$/.test(p) || /^\/brands\/[^/]+$/.test(p)) return "collection"
    if (p === "/about") return "about"
    if (p === "/design") return "atelier"
    if (p === "/service" || /^\/insights\/[^/]+$/.test(p)) return "editorial"
    return null
}

const CHROME_NAMES = new Set(["Footer", "Shipping Banner", "Floating Nav", "Mobile App Navigation", "Get template", "Nav", "Navigation", "SEO Structured Data"])
const CHROME_SEL = `:is([data-framer-name="Footer"],[data-framer-name="Shipping Banner"],[data-framer-name="Floating Nav"],[data-framer-name="Mobile App Navigation"],[data-framer-name="Get template"],nav,header,form,[role="dialog"],[data-framer-appear-id],[data-mm-skip])`

function buildCss() {
    const pre = ENTRY_ROUTE_IDS.map((id) => `html:not([data-mm-js]) #main[data-framer-hydrate-v2*='"routeId":"${id}"']`).join(",")
    const scope = `:is(${pre},html[data-mm-entry] #main)`
    const notChrome = `:not(${CHROME_SEL} *):not(${CHROME_SEL})`
    return `
@keyframes mmRise{from{opacity:0;translate:0 14px}to{opacity:1;translate:0 0}}
@keyframes mmWipe{0%{opacity:0;translate:0 10px;clip-path:inset(-20% -6% 100% -6%)}40%{opacity:1}100%{opacity:1;translate:0 0;clip-path:inset(-20% -6% -20% -6%)}}
@keyframes mmPulse{0%{scale:1}40%{scale:1.22}100%{scale:1}}
@media (prefers-reduced-motion: no-preference){
${scope} :is(img,video)${notChrome}{animation:mmRise 1s ${EASE} 0s both}
${scope} :is(h1,h2)${notChrome}{animation:mmWipe 1.1s ${EASE} .24s both}
${scope} :is(p,h3,h4)${notChrome}:not(:is(h1,h2,h3,button,a[data-framer-name$="Button"],[data-framer-name$="Action"]) *){animation:mmRise 1s ${EASE} .5s both}
${scope} :is([data-framer-name$="Button"],[data-framer-name$="Action"])${notChrome}{animation:mmRise .9s ${EASE} .74s both}
[data-mm="h"]{opacity:0!important;translate:0 18px!important}
[data-mm="in"]{transition:opacity 1s ${EASE} var(--mm-d,0ms),translate 1s ${EASE} var(--mm-d,0ms)!important}
[data-mm-sec]::before{content:"";position:absolute;z-index:3;top:0;left:var(--mm-l,24px);width:var(--mm-w,calc(100% - 48px));height:1px;background:${BRASS};opacity:.5;transform:scaleX(0);transform-origin:0 50%;pointer-events:none;transition:transform 1.4s ${EASE} .1s}
[data-mm-sec="in"]::before{transform:scaleX(1)}
[data-mm-card]{transition:translate .5s ${EASE},box-shadow .5s ${EASE}}
[data-mm-btn]{transition:scale .35s ${EASE}}
[data-mm-card][data-mm-press]{translate:0 -2px;transition-duration:.14s}
[data-mm-btn][data-mm-press]{scale:.97;transition-duration:.12s}
[data-mm-pulse]{animation:mmPulse .45s ${EASE}}
}
@media (prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine){
[data-mm-card]:hover{translate:0 -3px}
}
`
}

declare global {
    interface Window { __mintMotion?: boolean }
}

function start() {
    if (window.__mintMotion) return
    window.__mintMotion = true
    const html = document.documentElement
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)")
    html.setAttribute("data-mm-js", "")
    // Keep the CSS entry sequence alive for the first moments after scripts take over, so nothing restarts or jumps.
    const firstLeft = 2800 - performance.now()
    let entryTimer: any = 0
    const holdEntry = (ms: number) => {
        html.setAttribute("data-mm-entry", "")
        clearTimeout(entryTimer)
        entryTimer = setTimeout(() => html.removeAttribute("data-mm-entry"), ms)
    }
    if (firstLeft > 0 && kindFor(location.pathname) && kindFor(location.pathname) !== "product") holdEntry(firstLeft)

    touchFeedback()
    if (reduce.matches) return

    const lowEnd = ((navigator as any).deviceMemory && (navigator as any).deviceMemory <= 4) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4)
    const seen = new WeakSet<Element>()
    let kind: Kind = null
    let route = ""
    let sections: HTMLElement[] = []
    const restore: Array<() => void> = []
    const parallax = new Set<HTMLElement>()
    const parallaxOn = new Set<HTMLElement>()
    const secBlocks = new WeakMap<HTMLElement, HTMLElement[]>()

    const vh = () => window.innerHeight || 800
    const vw = () => window.innerWidth || 1200
    const phone = () => vw() < 768
    const rectOf = (el: Element) => el.getBoundingClientRect()
    const inView = (el: Element) => { const r = rectOf(el); return r.top < vh() * 0.98 && r.bottom > 0 }
    const visible = (el: Element) => { const r = rectOf(el); return r.width > 2 && r.height > 2 }
    const nameOf = (el: Element) => el.getAttribute("data-framer-name") || ""
    // Framer wraps many layers in display:contents boxes; look straight through them.
    const isContents = (el: Element) => { const r = rectOf(el); return r.width === 0 && r.height === 0 && el.children.length > 0 && getComputedStyle(el).display === "contents" }
    const kidsOf = (el: Element): HTMLElement[] => {
        const out: HTMLElement[] = []
        for (const c of Array.from(el.children) as HTMLElement[]) { if (isContents(c)) out.push(...kidsOf(c)); else out.push(c) }
        return out
    }

    const isChrome = (el: Element) => {
        if (CHROME_NAMES.has(nameOf(el))) return true
        const tag = el.tagName
        if (tag === "NAV" || tag === "HEADER" || tag === "FOOTER") return true
        const pos = getComputedStyle(el).position
        return pos === "fixed" || pos === "sticky"
    }

    function region(): HTMLElement | null {
        const t = document.querySelector("[data-layout-template]")
        if (!t) return null
        let best: HTMLElement | null = null, bh = 0
        for (const c of kidsOf(t)) {
            if (isChrome(c)) continue
            const h = rectOf(c).height
            if (h > bh) { bh = h; best = c }
        }
        return best
    }

    function findSections(root: HTMLElement): HTMLElement[] {
        const W = rectOf(root).width
        let node: HTMLElement = root
        for (let d = 0; d < 8; d++) {
            const kids = kidsOf(node).filter((k) => visible(k) && !isChrome(k))
            const wide = kids.filter((k) => { const r = rectOf(k); return r.width >= W * 0.88 && r.height >= 120 })
            if (wide.length >= 2) return wide
            if (wide.length === 1) { node = wide[0]; continue }
            break
        }
        return []
    }

    const CONTROL_SEL = "input,select,textarea,iframe,form,[contenteditable=true]"
    const ATOMIC = /^(H1|H2|H3|H4|H5|H6|P|IMG|PICTURE|VIDEO|SVG|BUTTON|A|LI|FIGURE|BLOCKQUOTE|TABLE|CANVAS)$/
    const SKIP_TAG = /^(SCRIPT|STYLE|TEMPLATE|NOSCRIPT|LINK|META|IFRAME|INPUT|SELECT|TEXTAREA|FORM|LABEL)$/
    const CARDISH = /\b(card|tile|step|review|post|feature|item)\b/i
    const BUY_NAMES = /actions|price|buy|checkout|cart|availability|purchase|concierge|quick facts|breadcrumb/i

    const hasOwnText = (el: Element) => Array.from(el.childNodes).some((n) => n.nodeType === 3 && (n.textContent || "").trim().length > 1)

    function collect(el: HTMLElement, out: HTMLElement[], depth: number) {
        if (depth > 16 || seen.has(el) || SKIP_TAG.test(el.tagName)) return
        if (el.hasAttribute("data-mm-skip") || el.hasAttribute("data-framer-appear-id") || el.getAttribute("role") === "dialog") return
        if (depth < 7 && isChrome(el)) return
        if (kind === "product" && BUY_NAMES.test(nameOf(el))) return
        const r = rectOf(el)
        if (r.width < 2 || r.height < 2) return
        const controls = !!el.querySelector(CONTROL_SEL)
        if (controls && r.height < vh()) return // a compact form or buy module stays perfectly still (A6)
        const kids = kidsOf(el).filter((c) => !SKIP_TAG.test(c.tagName) && visible(c))
        const smallGroup = depth >= 2 && r.height <= 140 && r.width < vw() * 0.95 && !el.querySelector("img,video,h1,h2")
        const atomic = !controls && (ATOMIC.test(el.tagName) || kids.length === 0 || hasOwnText(el) || smallGroup || (CARDISH.test(nameOf(el)) && r.height < vh() * 0.9))
        if (atomic) { out.push(el); return }
        for (const k of kids) collect(k, out, depth + 1)
    }

    function editorialImage(img: HTMLImageElement): HTMLElement | null {
        if (kind === "product" || kind === null) return null
        if (img.closest("a,button,[data-mm-skip]")) return null
        let p: Element | null = img
        for (let i = 0; i < 6 && p; i++, p = p.parentElement) if (/product|watch|photo|media|cutout|gallery|card|logo|avatar|icon/i.test(nameOf(p))) return null
        const r = rectOf(img)
        if (r.width < vw() * (phone() ? 0.7 : 0.38) || r.height < 160) return null
        if (getComputedStyle(img).objectFit !== "cover") return null
        const parent = img.parentElement
        if (!parent) return null
        const pr = rectOf(parent)
        if (Math.abs(pr.width - r.width) > 3 || Math.abs(pr.height - r.height) > 3) {
            // Only scale where an ancestor already clips the image, so nothing spills or reflows.
            let a: Element | null = parent, ok = false
            for (let i = 0; i < 3 && a; i++, a = a.parentElement) { const o = getComputedStyle(a).overflow; if (/hidden|clip/.test(o)) { ok = true; break } }
            if (!ok) return null
        } else if (!/hidden|clip/.test(getComputedStyle(parent).overflow)) {
            parent.style.overflow = "clip"
        }
        return img
    }

    function scaleSettle(img: HTMLElement, from: number) {
        const a = img.animate([{ scale: String(from) }, { scale: "1.06" }], { duration: 1500, easing: EASE, fill: "forwards" })
        a.onfinish = () => { img.style.setProperty("scale", "1.06"); a.cancel(); parallax.add(img); parallaxIO.observe(img) }
    }

    function measureLines(el: HTMLElement): number[] {
        const top = rectOf(el).top
        const bottoms: number[] = []
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
        const range = document.createRange()
        let n: Node | null
        while ((n = walker.nextNode())) {
            if (!(n.textContent || "").trim()) continue
            range.selectNodeContents(n)
            for (const r of Array.from(range.getClientRects())) {
                if (r.height < 4) continue
                const b = r.bottom - top
                if (!bottoms.some((x) => Math.abs(x - b) < 6)) bottoms.push(b)
            }
        }
        return bottoms.sort((a, b) => a - b)
    }

    function lineReveal(el: HTMLElement, delay: number) {
        const H = rectOf(el).height || 1
        const lines = measureLines(el).slice(0, 8)
        const n = Math.max(1, lines.length)
        const frames: Keyframe[] = [{ opacity: 0, translate: "0 12px", clipPath: "inset(-20% -6% 100% -6%)", easing: EASE }]
        for (let i = 0; i < n; i++) {
            const last = i === n - 1
            const bottomPct = last ? -20 : Math.max(0, ((H - lines[i]) / H) * 100)
            frames.push({ offset: (i + 1) / n, opacity: 1, translate: last ? "0 0" : `0 ${Math.round(12 * (1 - (i + 1) / n))}px`, clipPath: `inset(-20% -6% ${bottomPct.toFixed(2)}% -6%)`, easing: EASE })
        }
        el.removeAttribute("data-mm")
        el.animate(frames, { duration: Math.min(1200, 800 + (n - 1) * 140), delay, fill: "backwards" })
    }

    const parallaxIO = new IntersectionObserver((entries) => {
        for (const e of entries) e.isIntersecting ? parallaxOn.add(e.target as HTMLElement) : parallaxOn.delete(e.target as HTMLElement)
        tick()
    })
    let ticking = false
    function tick() {
        if (ticking) return
        ticking = true
        requestAnimationFrame(() => {
            ticking = false
            if (phone() && lowEnd) return
            const H = vh()
            parallaxOn.forEach((el) => {
                const r = rectOf(el)
                const t = Math.max(-1, Math.min(1, (r.top + r.height / 2 - H / 2) / H))
                const isImg = el.tagName === "IMG" || el.tagName === "VIDEO"
                const amp = isImg ? r.height * (phone() ? 0.014 : 0.022) : 6
                el.style.setProperty("translate", `0 ${(isImg ? -t : t) * amp}px`)
            })
        })
    }
    window.addEventListener("scroll", tick, { passive: true })

    const revealIO = new IntersectionObserver((entries) => {
        const batch = entries.filter((e) => e.isIntersecting).map((e) => e.target as HTMLElement).sort((a, b) => rectOf(a).top - rectOf(b).top || rectOf(a).left - rectOf(b).left)
        const perParent = new Map<Element | null, number>()
        let afterHeading = 0
        for (const el of batch) {
            revealIO.unobserve(el)
            const k = perParent.get(el.parentElement) || 0
            perParent.set(el.parentElement, k + 1)
            const isHeading = /^H[1-3]$/.test(el.tagName)
            const d = Math.min(k, 6) * 80 + (isHeading ? 0 : afterHeading)
            if (isHeading) { lineReveal(el, d); afterHeading = 260; if (!phone()) { parallax.add(el); setTimeout(() => parallaxIO.observe(el), 1300 + d) } continue }
            el.style.setProperty("--mm-d", d + "ms")
            requestAnimationFrame(() => {
                el.setAttribute("data-mm", "in")
                const done = () => { el.removeAttribute("data-mm"); el.style.removeProperty("--mm-d") }
                setTimeout(done, 1150 + d)
            })
            const scaled = el.hasAttribute("data-mm-scale") ? [el] : Array.from(el.querySelectorAll<HTMLElement>("[data-mm-scale]"))
            scaled.forEach((img) => { img.removeAttribute("data-mm-scale"); setTimeout(() => scaleSettle(img, 1.03), d) })
        }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.01 })

    const secIO = new IntersectionObserver((entries) => {
        for (const e of entries) if (e.isIntersecting) { (e.target as HTMLElement).setAttribute("data-mm-sec", "in"); secIO.unobserve(e.target) }
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.01 })

    function placeLine(sec: HTMLElement, blocks: HTMLElement[]) {
        const sr = rectOf(sec)
        let l = Infinity, rgt = -Infinity
        for (const b of blocks) {
            const r = rectOf(b)
            if (r.width >= sr.width * 0.97 || r.width < 8) continue
            l = Math.min(l, r.left); rgt = Math.max(rgt, r.right)
        }
        const pad = phone() ? 16 : 24
        const left = isFinite(l) ? Math.max(0, l - sr.left) : pad
        const width = isFinite(rgt) ? Math.min(sr.width - left, rgt - l) : sr.width - pad * 2
        sec.style.setProperty("--mm-l", Math.round(left) + "px")
        sec.style.setProperty("--mm-w", Math.round(width) + "px")
    }

    function scan(initial: boolean) {
        if (!kind) return
        const root = region()
        if (!root) return
        const secs = findSections(root)
        if (initial) sections = secs
        const groups: Array<[HTMLElement, HTMLElement[]]> = secs.length ? secs.map((s) => [s, []]) : [[root, []]]
        for (const [g, out] of groups) {
            // Product pages: the first section holds the photo and the buy panel; it stays exactly as it is.
            if (kind === "product" && g === groups[0][0] && secs.length) continue
            collect(g, out, 0)
            for (const el of out) {
                if (seen.has(el)) continue
                seen.add(el)
                const imgs = (el.tagName === "IMG" ? [el] : Array.from(el.querySelectorAll("img"))) as HTMLImageElement[]
                const editorial = imgs.map(editorialImage).filter(Boolean) as HTMLElement[]
                if (inView(el)) {
                    if (initial || performance.now() < 3000) editorial.forEach((img) => scaleSettle(img, 1))
                    continue
                }
                editorial.forEach((img) => { img.style.setProperty("scale", "1.03"); img.setAttribute("data-mm-scale", "") })
                el.setAttribute("data-mm", "h")
                revealIO.observe(el)
            }
            if (secs.length && g !== groups[0][0] && !g.hasAttribute("data-mm-sec")) {
                if (getComputedStyle(g).position === "static") g.style.position = "relative"
                secBlocks.set(g, out.length ? out : [g])
                placeLine(g, secBlocks.get(g)!)
                g.setAttribute("data-mm-sec", "")
                secIO.observe(g)
            }
        }
        if (initial && (kind === "home" || kind === "about" || kind === "atelier")) tints(root, secs)
    }

    // A4: quiet sand and sage chapters.
    let tintScroll: (() => void) | null = null
    function tints(root: HTMLElement, secs: HTMLElement[]) {
        if (secs.length < 3) return
        const targets: HTMLElement[] = [document.body]
        const t = document.querySelector<HTMLElement>("[data-layout-template]")
        if (t) targets.push(t)
        let n: HTMLElement | null = root
        while (n && n !== secs[0].parentElement) { targets.push(n); n = (n.children.length === 1 ? n.children[0] : secs[0].parentElement) as HTMLElement }
        if (secs[0].parentElement) targets.push(secs[0].parentElement)
        for (const el of targets) {
            const prevBg = el.style.getPropertyValue("background-color"), prevTr = el.style.getPropertyValue("transition")
            el.style.setProperty("transition", (prevTr ? prevTr + "," : "") + "background-color 1.2s " + EASE)
            restore.push(() => { el.style.setProperty("background-color", prevBg); el.style.setProperty("transition", prevTr) })
        }
        let current = -1
        const apply = () => {
            const mid = vh() / 2
            let idx = 0
            secs.forEach((s, i) => { const r = rectOf(s); if (r.top <= mid) idx = i })
            if (idx === current) return
            current = idx
            const color = idx % 2 === 0 ? SAND : SAGE
            for (const el of targets) el.style.setProperty("background-color", color, "important")
        }
        let raf = 0
        tintScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(apply) }
        window.addEventListener("scroll", tintScroll, { passive: true })
        apply()
    }

    function resetPage() {
        while (restore.length) restore.pop()!()
        if (tintScroll) { window.removeEventListener("scroll", tintScroll); tintScroll = null }
        parallaxOn.clear()
        parallax.clear()
    }

    // Rescan for content that arrives late (collection lists, code components), at most about once a second.
    let rescanTimer: any = 0, lastScan = 0
    const rescan = () => {
        if (rescanTimer) return
        const wait = Math.max(250, 1200 - (performance.now() - lastScan))
        rescanTimer = setTimeout(() => { rescanTimer = 0; lastScan = performance.now(); scan(false) }, wait)
    }

    function onRoute() {
        if (location.pathname === route) return
        const first = route === ""
        route = location.pathname
        resetPage()
        kind = kindFor(route)
        html.setAttribute("data-mm-page", kind || "none")
        if (!first && kind && kind !== "product") holdEntry(2600)
        setTimeout(() => scan(true), first ? 60 : 160)
    }

    // Framer navigates without reloading; follow it.
    const wrap = (k: "pushState" | "replaceState") => {
        const orig = history[k]
        history[k] = function (this: History, ...args: any[]) { const r = orig.apply(this, args as any); setTimeout(onRoute, 0); return r } as any
    }
    wrap("pushState"); wrap("replaceState")
    window.addEventListener("popstate", () => setTimeout(onRoute, 0))
    new MutationObserver((muts) => {
        for (const m of muts) for (const n of Array.from(m.addedNodes)) if (n.nodeType === 1 && !(n as Element).closest?.(CHROME_SEL)) return rescan()
    }).observe(document.getElementById("main") || document.body, { childList: true, subtree: true })
    window.addEventListener("resize", () => { sections.forEach((s) => s.hasAttribute("data-mm-sec") && placeLine(s, secBlocks.get(s) || [s])); tick() }, { passive: true })
    onRoute()

    // Safety net: never leave anything hidden that is on screen.
    const sweep = () => document.querySelectorAll<HTMLElement>('[data-mm="h"]').forEach((el) => { if (inView(el)) { el.setAttribute("data-mm", "in"); setTimeout(() => el.removeAttribute("data-mm"), 1200) } })
    let sweepTimer: any = 0
    window.addEventListener("scroll", () => { clearTimeout(sweepTimer); sweepTimer = setTimeout(sweep, 450) }, { passive: true })
}

// A12: touch feedback, site wide, instant and quiet. Never blocks a tap.
function touchFeedback() {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)")
    const isCard = (el: Element) => {
        if (/card|tile/i.test(el.getAttribute("data-framer-name") || "")) return true
        if (el.tagName !== "A") return false
        const r = el.getBoundingClientRect()
        return r.height > 140 && r.width > 120 && !!el.querySelector("img")
    }
    let pressed: HTMLElement | null = null
    const release = () => { if (pressed) { pressed.removeAttribute("data-mm-press"); pressed = null } }
    const mark = (el: HTMLElement) => {
        if (el.hasAttribute("data-mm-card") || el.hasAttribute("data-mm-btn")) return
        if (isCard(el)) el.setAttribute("data-mm-card", "")
        else el.setAttribute("data-mm-btn", "")
    }
    const target = (e: Event) => {
        const t = e.target as Element | null
        if (!t || !t.closest) return null
        const card = t.closest<HTMLElement>('[data-framer-name*="Card"],[data-framer-name*="Tile"]')
        const tap = t.closest<HTMLElement>('a,button,[role="button"],input[type="submit"],summary')
        if (card && (!tap || tap.contains(card) || (tap.tagName === "A" && card.contains(tap) && isCard(tap)))) return tap && tap.contains(card) ? tap : card
        return tap
    }
    document.addEventListener("pointerover", (e) => { if ((e as PointerEvent).pointerType !== "mouse") return; const el = target(e); if (el) mark(el) }, { passive: true })
    document.addEventListener("pointerdown", (e) => {
        if (reduce.matches) return
        const el = target(e)
        if (!el) return
        mark(el)
        release()
        pressed = el
        el.setAttribute("data-mm-press", "")
    }, { passive: true, capture: true })
    for (const ev of ["pointerup", "pointercancel", "dragstart", "scroll"]) document.addEventListener(ev, release, { passive: true, capture: true })
    // The saved heart answers with a small pulse.
    document.addEventListener("click", (e) => {
        if (reduce.matches) return
        const b = (e.target as Element | null)?.closest?.("button[aria-pressed]") as HTMLElement | null
        if (!b || !/save/i.test(b.textContent || "")) return
        const icon = (b.querySelector("svg") as unknown as HTMLElement) || b
        icon.removeAttribute("data-mm-pulse")
        void (icon as any).getBoundingClientRect()
        icon.setAttribute("data-mm-pulse", "")
        setTimeout(() => icon.removeAttribute("data-mm-pulse"), 500)
    }, { passive: true })
}

export default function MintMotion() {
    useEffect(() => {
        if (RenderTarget.current() === RenderTarget.canvas) return
        try { start() } catch (e) { document.documentElement.removeAttribute("data-mm-entry") }
    }, [])
    return <style data-mint-motion dangerouslySetInnerHTML={{ __html: buildCss() }} />
}
