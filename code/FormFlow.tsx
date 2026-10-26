import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react"
import { createPortal } from "react-dom"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { wizard } from "./FormWizard.tsx"

/**
 * Step guide for stepped forms (Script 19 Part B: Brez step list, Randstad answer cards, Almaris calm).
 * Placed once inside a stepped form, under the Progress bar. Turning it on changes nothing about the
 * form's fields, names, destinations or sending: it only paces what the client sees.
 *
 * - A numbered list of steps beside the form on desktop (brass for the current step, a check for done steps,
 *   done steps tap back without losing answers). On phones: one header line with a brass progress line,
 *   tap for the full list in a sheet.
 * - One decision, or one short group of fields, per screen. A lone single choice advances on its own.
 * - Choice questions become large answer cards.
 * - Gentle validation in plain ink, under the answer that is missing.
 * - A final Review and send step lists every answer; each line taps back to its step.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight auto
 */

const INK = "rgb(49, 54, 48)"
const SAND = "#f8f5f0"
const SAGE_TINT = "#eef3ea"
const SAGE = "#dde5d8"
const BRASS = "#a56f18"
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)"
const FONT = "'Bricolage Grotesque', system-ui, sans-serif"

interface Props {
    reviewTitle: string
    reviewNote: string
    style?: CSSProperties
}

type Unit = { el: HTMLElement; choice: boolean; single: boolean; weight: number; hint: boolean }

const useWizard = () => useSyncExternalStore(wizard.subscribe, wizard.get, wizard.get)

const nameOf = (el: Element | null) => (el && el.getAttribute("data-framer-name")) || ""
const SKIP_UNIT = /^(Section Header|Step Navigation|Badge)$/
const CONTROL = "input:not([type=hidden]), select, textarea"

function isContents(el: Element) {
    return el.children.length > 0 && getComputedStyle(el).display === "contents"
}
function kids(el: Element): HTMLElement[] {
    const out: HTMLElement[] = []
    for (const c of Array.from(el.children) as HTMLElement[]) {
        if (c.tagName === "STYLE" || c.tagName === "SCRIPT") continue
        if (isContents(c)) out.push(...kids(c))
        else out.push(c)
    }
    return out
}
function titleOf(section: Element | null): string {
    const el = section ? section.querySelector('[data-framer-name="Section Title"]') : null
    const raw = ((el && el.textContent) || "").trim().replace(/\s+/g, " ")
    if (!raw) return ""
    const low = raw.toLowerCase().replace(/’/g, "'")
    return low.charAt(0).toUpperCase() + low.slice(1)
}
function labelOf(unit: Element): string {
    const p = unit.querySelector("p, span")
    return ((p && p.textContent) || "").replace(/\(optional\)/i, "").replace(/\*/g, "").trim()
}
function valueOf(unit: HTMLElement): string {
    const vals: string[] = []
    const seen = new Set<string>()
    unit.querySelectorAll<HTMLInputElement>(CONTROL).forEach((f) => {
        if (f.disabled) return
        if (f.type === "radio") { if (f.checked && !seen.has(f.name)) { vals.push(f.value); seen.add(f.name) } return }
        if (f.type === "checkbox") { if (f.checked) vals.push(f.value && f.value !== "on" ? f.value : labelOf(f.closest("label") || f.parentElement || f) || "Yes"); return }
        const v = String(f.value || "").trim()
        if (!v) return
        vals.push(/^https?:\/\//i.test(v) ? "Link added" : v)
    })
    return vals.join(", ")
}

// Units are the visible blocks of a section between its header and its step buttons.
function unitsOf(section: HTMLElement): Unit[] {
    const out: Unit[] = []
    for (const k of kids(section)) {
        const n = nameOf(k)
        if (SKIP_UNIT.test(n) || k.querySelector('[data-framer-name="Next Button"]') || k.querySelector('[data-framer-name="Back Button"]')) continue
        if (k.getClientRects().length === 0 && !k.hasAttribute("data-flow-off")) continue
        const hint = /Hint/.test(n) || (!k.querySelector(CONTROL) && !k.querySelector("div[data-mint-chips]") && !/Upload/i.test(n) && !!k.textContent?.trim() && k.getBoundingClientRect().height < 120)
        const chips = k.querySelector<HTMLElement>("div[data-mint-chips]")
        const radios = k.querySelectorAll("input[type=radio]").length
        const checks = k.querySelectorAll("input[type=checkbox]").length
        const choice = !!chips || radios > 0 || checks > 1 || !!k.querySelector("select")
        const single = (chips ? chips.getAttribute("role") === "radiogroup" : radios > 0) && !k.querySelector("input[type=text]:not([data-mint-chips=\"1\"]), textarea") && kids(k).length <= 3
        const fields = k.querySelectorAll(CONTROL).length
        out.push({ el: k, choice, single, weight: choice ? 3 : /Row/.test(n) ? 2 : Math.max(1, Math.min(fields, 3)), hint })
    }
    return out
}
function groupsOf(units: Unit[]): Unit[][] {
    const groups: Unit[][] = []
    let cur: Unit[] = []
    let w = 0
    let pendingHints: Unit[] = []
    const flush = () => { if (cur.length) groups.push(cur); cur = []; w = 0 }
    for (const u of units) {
        if (u.hint) { pendingHints.push(u); continue }
        if (u.choice) { flush(); groups.push([...pendingHints, u]); pendingHints = []; continue }
        if (w + u.weight > 3) flush()
        if (pendingHints.length) { cur.push(...pendingHints); pendingHints = [] }
        cur.push(u)
        w += u.weight
    }
    flush()
    if (pendingHints.length) { if (groups.length) groups[groups.length - 1].push(...pendingHints); else groups.push(pendingHints) }
    return groups.length ? groups : [[]]
}

function missingIn(units: Unit[]): HTMLElement[] {
    const out: HTMLElement[] = []
    for (const u of units) {
        let bad = false
        u.el.querySelectorAll<HTMLInputElement>(CONTROL).forEach((f) => {
            if (bad || f.disabled) return
            const holder = (f.closest("label") as HTMLElement | null) || f.parentElement
            const chipped = f.dataset.mintChips === "1"
            if (!chipped && holder && holder.getClientRects().length === 0) return
            if (!f.checkValidity()) bad = true
        })
        if (bad) out.push(u.el)
    }
    return out
}
function noteFor(unit: HTMLElement, show: boolean) {
    let n = unit.nextElementSibling as HTMLElement | null
    if (!n || !n.hasAttribute("data-flow-note")) {
        if (!show) return
        n = document.createElement("div")
        n.setAttribute("data-flow-note", "")
        n.setAttribute("role", "status")
        unit.insertAdjacentElement("afterend", n)
    }
    if (!show) { n.style.display = "none"; return }
    const label = labelOf(unit)
    const isChoice = !!unit.querySelector("div[data-mint-chips], input[type=radio], input[type=checkbox], select")
    const lower = label ? label.charAt(0).toLowerCase() + label.slice(1).replace(/\?$/, "") : ""
    n.textContent = isChoice ? "Choose an answer to continue." : lower ? "Add " + (/^(your|a|an|the)\b/.test(lower) ? "" : "your ") + lower + " to continue." : "This answer is needed to continue."
    n.style.display = "flex"
}

const CSS = (scope: string) => `
${scope} [data-flow-note]{display:none;align-items:center;gap:8px;margin:2px 0 4px;font-family:${FONT};font-size:13px;font-weight:500;line-height:1.4;color:${INK}}
${scope} [data-flow-note]::before{content:"";width:5px;height:5px;border-radius:5px;background:${BRASS};flex:none}
${scope} [data-mint-blocked]{background:transparent!important;color:${INK}!important;font-weight:500!important;padding:0!important}
${scope} div[data-mint-chips] + div{color:${INK}!important}
${scope} div[data-mint-chips]{display:grid!important;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px!important}
${scope} div[data-mint-chips] > button{position:relative!important;display:flex!important;align-items:center!important;justify-content:flex-start!important;min-height:58px!important;padding:16px 44px 16px 18px!important;border-radius:16px!important;background:${SAND}!important;border:1px solid rgba(49,54,48,0.14)!important;color:${INK}!important;font-family:${FONT}!important;font-size:15px!important;font-weight:600!important;text-align:left!important;line-height:1.3!important;cursor:pointer!important;transition:background .35s ${EASE},border-color .35s ${EASE},box-shadow .35s ${EASE}!important;-webkit-tap-highlight-color:transparent}
${scope} div[data-mint-chips] > button[aria-checked="true"],${scope} div[data-mint-chips] > button[aria-pressed="true"]{background:${SAGE_TINT}!important;border-color:${BRASS}!important;box-shadow:inset 0 0 0 1px ${BRASS}!important}
${scope} div[data-mint-chips] > button::after{content:"";position:absolute;right:16px;top:50%;width:18px;height:18px;margin-top:-9px;border-radius:18px;border:1px solid rgba(49,54,48,0.18);box-sizing:border-box;transition:all .35s ${EASE}}
${scope} div[data-mint-chips] > button[aria-checked="true"]::after,${scope} div[data-mint-chips] > button[aria-pressed="true"]::after{border-color:${BRASS};background:${BRASS} url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M6 12.5l4 4 8-9' fill='none' stroke='white' stroke-width='2.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center/12px no-repeat}
${scope} [data-framer-name="Category Chips"]{display:grid!important;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px!important;width:100%!important}
${scope} [data-framer-name="Category Chips"] > [data-framer-name$=" Chip"]{min-height:58px!important;padding:14px 18px!important;border-radius:16px!important;background:${SAND}!important;border:1px solid rgba(49,54,48,0.14)!important;box-shadow:none!important;width:auto!important;transition:background .35s ${EASE},border-color .35s ${EASE},box-shadow .35s ${EASE}!important}
${scope} [data-framer-name="Category Chips"] > [data-framer-name$=" Chip"]:has(input:checked){background:${SAGE_TINT}!important;border-color:${BRASS}!important;box-shadow:inset 0 0 0 1px ${BRASS}!important}
${scope} [data-framer-name="Category Chips"] p{font-family:${FONT}!important;font-size:15px!important;font-weight:600!important;color:${INK}!important}
@media (max-width: 767.98px){${scope} div[data-mint-chips],${scope} [data-framer-name="Category Chips"]{grid-template-columns:1fr!important}}
`

export default function FormFlow(props: Props) {
    const { reviewTitle = "Review and send", reviewNote = "Tap any line to change it. Nothing is sent until you press send.", style } = props
    const canvas = RenderTarget.current() === RenderTarget.canvas
    const ws = useWizard()
    const root = useRef<HTMLDivElement>(null)
    const form = useRef<HTMLFormElement | null>(null)
    const [screen, setScreen] = useState(0)
    const screenRef = useRef(0)
    const [names, setNames] = useState<string[]>([])
    const [counts, setCounts] = useState<number[]>([])
    const [done, setDone] = useState<Set<number>>(new Set())
    const [rail, setRail] = useState<HTMLElement | null>(null)
    const [sheet, setSheet] = useState(false)
    const [review, setReview] = useState<Array<{ step: number; screen: number; label: string; value: string }[]>>([])
    const reduce = typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const total = ws.total
    const step = ws.step
    const inReview = total > 0 && step > total
    screenRef.current = screen

    // Turn the flow on for this form only, and off again when the page changes.
    useEffect(() => {
        if (canvas) return
        const f = (root.current && root.current.closest("form")) as HTMLFormElement | null
        form.current = f
        if (!f) return
        f.setAttribute("data-flow", "")
        wizard.emit({ flow: true })
        return () => { f.removeAttribute("data-flow"); wizard.emit({ flow: false }) }
    }, [canvas])

    const sections = () => (form.current ? wizard.activeFor(form.current, wizard.get().category) : [])

    // Show only the current screen's units inside the current section.
    const apply = (animate: boolean) => {
        const f = form.current
        if (!f) return
        f.querySelectorAll<HTMLElement>("[data-flow-off]").forEach((el) => { el.style.display = ""; el.removeAttribute("data-flow-off") })
        const secs = sections()
        const allCounts = secs.map((s) => (s.getClientRects().length || s === secs[wizard.get().step - 1] ? groupsOf(unitsOf(s)).length : 1))
        setNames(secs.map(titleOf).concat([reviewTitle]))
        const sec = secs[wizard.get().step - 1]
        if (!sec) { setCounts(allCounts); return }
        const groups = groupsOf(unitsOf(sec))
        allCounts[wizard.get().step - 1] = groups.length
        setCounts(allCounts)
        const s = Math.min(screenRef.current, groups.length - 1)
        if (s !== screenRef.current) { screenRef.current = s; setScreen(s) }
        groups.forEach((g, i) => g.forEach((u) => { if (i !== s) { u.el.style.display = "none"; u.el.setAttribute("data-flow-off", "") } }))
        // On the first step, Back still steps back through screens.
        const back = sec.querySelector<HTMLElement>('[data-framer-name="Back Button"]')
        if (back && wizard.get().step === 1) back.style.display = s > 0 ? "flex" : "none"
        if (animate && !reduce) groups[s].forEach((u) => u.el.animate([{ opacity: 0, transform: "translateX(18px)" }, { opacity: 1, transform: "none" }], { duration: 480, easing: EASE }))
    }

    useEffect(() => {
        if (canvas || !form.current) return
        const t = setTimeout(() => apply(true), 30)
        return () => clearTimeout(t)
    }, [step, screen, ws.category, total, canvas])

    // Late fields (photo upload, revealed follow ups, chips) re-pace the screen.
    useEffect(() => {
        if (canvas || !form.current) return
        let t: any = 0
        const mo = new MutationObserver((m) => {
            if (m.every((x) => (x.target as Element).closest?.("[data-flow-note]"))) return
            clearTimeout(t)
            t = setTimeout(() => apply(false), 120)
        })
        mo.observe(form.current, { childList: true, subtree: true, attributes: true, attributeFilter: ["style"] })
        return () => { mo.disconnect(); clearTimeout(t) }
    }, [canvas])

    const goScreen = (n: number) => { screenRef.current = n; setScreen(n) }
    const currentGroup = () => { const sec = sections()[wizard.get().step - 1]; return sec ? groupsOf(unitsOf(sec)) : [[]] }
    const validateScreen = (): boolean => {
        const f = form.current
        if (!f) return true
        f.querySelectorAll<HTMLElement>("[data-flow-note]").forEach((n) => (n.style.display = "none"))
        // Measure with this screen's units in place.
        const sec = sections()[wizard.get().step - 1]
        if (!sec) return true
        const groups = groupsOf(unitsOf(sec))
        const g = groups[Math.min(screenRef.current, groups.length - 1)] || []
        const missing = missingIn(g)
        if (!missing.length) return true
        missing.forEach((m) => noteFor(m, true))
        const first = missing[0]
        first.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" })
        const focusable = first.querySelector<HTMLElement>("div[data-mint-chips] button, input:not([type=hidden]), select, textarea")
        if (focusable) setTimeout(() => focusable.focus({ preventScroll: true }), 300)
        return false
    }

    // Next and Back: pace through screens first, then hand over to the wizard for the step change.
    useEffect(() => {
        if (canvas) return
        const onClick = (e: MouseEvent) => {
            const f = form.current
            const t = e.target as Element | null
            if (!f || !t || !f.contains(t)) return
            const next = t.closest('[data-framer-name="Next Button"]')
            const back = t.closest('[data-framer-name="Back Button"]')
            if (!next && !back) return
            const groups = currentGroup()
            if (next) {
                if (!validateScreen()) { e.preventDefault(); e.stopPropagation(); return }
                if (screenRef.current < groups.length - 1) { e.preventDefault(); e.stopPropagation(); goScreen(screenRef.current + 1); scrollTop(); return }
                // Last screen of the step: let the wizard check the whole step with every unit in place.
                f.querySelectorAll<HTMLElement>("[data-flow-off]").forEach((el) => { el.style.display = ""; el.removeAttribute("data-flow-off") })
                const stepNow = wizard.get().step
                setDone((d) => new Set(d).add(stepNow))
                setTimeout(() => { if (wizard.get().step !== stepNow) goScreen(0); else apply(false) }, 0)
                return
            }
            if (back) {
                if (screenRef.current > 0) { e.preventDefault(); e.stopPropagation(); goScreen(screenRef.current - 1); scrollTop(); return }
                const stepNow = wizard.get().step
                setTimeout(() => {
                    const s = wizard.get().step
                    if (s !== stepNow) { const sec = sections()[s - 1]; goScreen(sec ? Math.max(0, groupsOf(unitsOf(sec)).length - 1) : 0) }
                }, 0)
            }
        }
        document.addEventListener("click", onClick, true)
        return () => document.removeEventListener("click", onClick, true)
    }, [canvas])

    // A lone single choice moves on by itself, softly.
    useEffect(() => {
        if (canvas || !form.current) return
        const f = form.current
        let t: any = 0
        const onPick = (e: Event) => {
            const el = e.target as Element | null
            const chip = el && el.closest && el.closest('div[data-mint-chips][role="radiogroup"] > button, input[type=radio]')
            if (!chip) return
            const g = currentGroup()[screenRef.current] || []
            const real = g.filter((u) => !u.hint)
            if (real.length !== 1 || !real[0].single || !real[0].el.contains(chip)) return
            clearTimeout(t)
            t = setTimeout(() => {
                if (missingIn(real).length) return
                const sec = sections()[wizard.get().step - 1]
                const next = sec ? sec.querySelector<HTMLElement>('[data-framer-name="Next Button"]') : null
                if (next && next.getClientRects().length) next.click()
            }, reduce ? 120 : 420)
        }
        f.addEventListener("click", onPick)
        f.addEventListener("change", onPick)
        const clearNote = (e: Event) => { const u = (e.target as Element).closest?.("[data-framer-name$=' Field'], [data-framer-name='Field Row']"); const n = u && u.nextElementSibling; if (n && n.hasAttribute("data-flow-note")) (n as HTMLElement).style.display = "none" }
        f.addEventListener("input", clearNote)
        f.addEventListener("click", clearNote)
        return () => { f.removeEventListener("click", onPick); f.removeEventListener("change", onPick); f.removeEventListener("input", clearNote); f.removeEventListener("click", clearNote); clearTimeout(t) }
    }, [canvas])

    const scrollTop = () => { const f = form.current; if (f) { const r = f.getBoundingClientRect(); if (r.top < 0 || r.top > window.innerHeight * 0.5) f.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }) } }

    // Jump to a done step (or a review line) without losing any answer.
    const jump = (toStep: number, toScreen = 0) => {
        if (toStep < 1) return
        setSheet(false)
        const f = form.current
        if (f) f.querySelectorAll<HTMLElement>("[data-flow-off]").forEach((el) => { el.style.display = ""; el.removeAttribute("data-flow-off") })
        wizard.emit({ step: toStep })
        goScreen(toScreen)
        setTimeout(scrollTop, 40)
    }

    // Review and send: every answer in plain lines.
    useEffect(() => {
        if (canvas || !inReview || !form.current) return
        const secs = sections()
        const out = secs.map((sec, i) => {
            const prev = sec.style.display
            sec.style.display = ""
            sec.querySelectorAll<HTMLElement>("[data-flow-off]").forEach((el) => { el.style.display = ""; el.removeAttribute("data-flow-off") })
            const groups = groupsOf(unitsOf(sec))
            const lines: { step: number; screen: number; label: string; value: string }[] = []
            groups.forEach((g, gi) => g.forEach((u) => {
                if (u.hint) return
                const sub = /Row/.test(nameOf(u.el)) ? kids(u.el) : [u.el]
                sub.forEach((s) => { const v = valueOf(s); if (v) lines.push({ step: i + 1, screen: gi, label: labelOf(s) || titleOf(sec), value: v }) })
            }))
            sec.style.display = prev
            return lines
        })
        setReview(out)
    }, [inReview, canvas])

    // Rail beside the form on wide screens: the column that sits next to the form inside its card.
    useEffect(() => {
        if (canvas) return
        const find = () => {
            const f = form.current
            if (!f || window.innerWidth < 810) return setRail(null)
            let card: HTMLElement | null = f.parentElement
            while (card && card !== document.body) {
                const cols = kids(card).filter((k) => !k.contains(f) && k.getClientRects().length && k.getBoundingClientRect().width > 200)
                const fr = f.getBoundingClientRect()
                const side = cols.find((c) => { const r = c.getBoundingClientRect(); return r.right <= fr.left + 4 && r.bottom > fr.top && r.top < fr.bottom })
                if (side) {
                    let host = side.querySelector<HTMLElement>(":scope > [data-flow-rail]")
                    if (!host) { host = document.createElement("div"); host.setAttribute("data-flow-rail", ""); host.style.cssText = "width:100%;margin-top:28px"; side.appendChild(host) }
                    return setRail(host)
                }
                card = card.parentElement
            }
            setRail(null)
        }
        const t = setTimeout(find, 60)
        window.addEventListener("resize", find)
        return () => { clearTimeout(t); window.removeEventListener("resize", find) }
    }, [canvas])

    if (canvas) {
        return <div style={{ width: "100%", padding: "10px 0", fontFamily: FONT, fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: BRASS, ...style }}>Step guide and review</div>
    }

    const allSteps = names.length ? names : []
    const n = allSteps.length
    const cur = Math.min(step, Math.max(1, n))
    const curName = allSteps[cur - 1] || ""
    const doneStep = (i: number) => done.has(i) || i < cur
    const subCount = counts[cur - 1] || 1
    const fraction = n ? (cur - 1 + (inReview ? 1 : (screen + 1) / subCount)) / n : 0

    const list = (
        <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 2, fontFamily: FONT }}>
            {allSteps.map((label, i) => {
                const idx = i + 1
                const isCur = idx === cur
                const isDone = !isCur && doneStep(idx)
                const can = isDone
                return (
                    <li key={i}>
                        <button type="button" disabled={!can} onClick={() => can && jump(idx)} aria-current={isCur ? "step" : undefined}
                            style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", padding: "11px 0", background: "none", border: 0, borderBottom: `1px solid ${SAGE}`, cursor: can ? "pointer" : "default", textAlign: "left", fontFamily: FONT, color: INK, opacity: isCur || isDone ? 1 : 0.45, transition: `opacity .5s ${EASE}` }}>
                            <span style={{ flex: "none", width: 26, height: 26, borderRadius: 26, display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700, background: isCur ? BRASS : isDone ? SAGE_TINT : "transparent", color: isCur ? "#fff" : INK, border: isCur ? `1px solid ${BRASS}` : `1px solid ${isDone ? SAGE : "rgba(49,54,48,0.18)"}`, transition: `all .5s ${EASE}` }}>
                                {isDone ? <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12.5l4 4 8-9" fill="none" stroke={BRASS} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg> : idx}
                            </span>
                            <span style={{ fontSize: 15, fontWeight: isCur ? 600 : 500, color: isCur ? BRASS : INK }}>{label}</span>
                            {isCur && subCount > 1 && !inReview ? <span style={{ marginLeft: "auto", fontSize: 12, opacity: 0.55 }}>{screen + 1} of {subCount}</span> : null}
                        </button>
                    </li>
                )
            })}
        </ol>
    )

    const header = (
        <button type="button" onClick={() => setSheet(true)} aria-label={`Step ${cur} of ${n}, ${curName}. Show all steps`}
            style={{ display: "block", width: "100%", background: "none", border: 0, padding: "2px 0 0", cursor: "pointer", textAlign: "left", fontFamily: FONT, color: INK, WebkitTapHighlightColor: "transparent" }}>
            <span style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: BRASS, whiteSpace: "nowrap" }}>Step {cur} of {n}</span>
                <span style={{ fontSize: 14, fontWeight: 600, textAlign: "right" }}>{curName} <svg aria-hidden="true" width="10" height="10" viewBox="0 0 24 24" style={{ marginLeft: 4, opacity: 0.5, verticalAlign: "middle" }}><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
            </span>
            <span style={{ display: "block", height: 1, marginTop: 12, background: "rgba(165,111,24,0.18)", position: "relative", overflow: "hidden" }}>
                <span style={{ position: "absolute", inset: 0, transformOrigin: "0 50%", transform: `scaleX(${fraction})`, background: BRASS, transition: reduce ? "none" : `transform .9s ${EASE}` }} />
            </span>
        </button>
    )

    const reviewPanel = inReview ? (
        <div style={{ fontFamily: FONT, color: INK, marginTop: 8 }}>
            <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" }}>{reviewTitle}</div>
            <div style={{ fontSize: 14, opacity: 0.65, marginTop: 6 }}>{reviewNote}</div>
            <button type="button" onClick={() => { const last = total; const sec = sections()[last - 1]; jump(last, sec ? Math.max(0, groupsOf(unitsOf(sec)).length - 1) : 0) }}
                style={{ marginTop: 12, padding: "6px 0", background: "none", border: 0, cursor: "pointer", fontFamily: FONT, fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: BRASS }}>← Back</button>
            <div style={{ height: 1, background: BRASS, opacity: 0.4, margin: "18px 0 4px" }} />
            {review.map((lines, i) => lines.length ? (
                <div key={i} style={{ padding: "10px 0 4px" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: BRASS, margin: "6px 0 4px" }}>{allSteps[i]}</div>
                    {lines.map((l, j) => (
                        <button key={j} type="button" onClick={() => jump(l.step, l.screen)}
                            style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16, width: "100%", padding: "10px 0", background: "none", border: 0, borderBottom: `1px solid ${SAGE}`, cursor: "pointer", textAlign: "left", fontFamily: FONT, color: INK }}>
                            <span style={{ fontSize: 13, opacity: 0.6, flex: "0 0 42%" }}>{l.label}</span>
                            <span style={{ fontSize: 15, fontWeight: 500, textAlign: "right", overflowWrap: "anywhere" }}>{l.value}</span>
                        </button>
                    ))}
                </div>
            ) : null)}
        </div>
    ) : null

    const sheetEl = sheet && typeof document !== "undefined" ? createPortal(
        <div role="dialog" aria-modal="true" aria-label="All steps" style={{ position: "fixed", inset: 0, zIndex: 2147483000, display: "flex", alignItems: "flex-end" }}>
            <div onClick={() => setSheet(false)} style={{ position: "absolute", inset: 0, background: "rgba(29,33,28,0.4)" }} />
            <div style={{ position: "relative", width: "100%", background: "#fff", borderRadius: "22px 22px 0 0", padding: "22px 22px calc(22px + env(safe-area-inset-bottom))", animation: reduce ? "none" : `flowSheetIn .5s ${EASE}` }}>
                <style>{`@keyframes flowSheetIn{from{transform:translateY(30px);opacity:0}to{transform:none;opacity:1}}`}</style>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, fontFamily: FONT }}>
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: BRASS }}>Your steps</span>
                    <button type="button" onClick={() => setSheet(false)} style={{ background: "none", border: 0, fontFamily: FONT, fontSize: 14, fontWeight: 600, color: INK, padding: 8, cursor: "pointer" }}>Close</button>
                </div>
                {list}
            </div>
        </div>, document.body) : null

    return (
        <div ref={root} data-flow-guide style={{ width: "100%", ...style }}>
            <style>{CSS("form[data-flow]")}</style>
            {rail ? createPortal(<div style={{ fontFamily: FONT }}><div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: BRASS, marginBottom: 6 }}>Your steps</div>{list}</div>, rail) : header}
            {reviewPanel}
            {sheetEl}
        </div>
    )
}

addPropertyControls(FormFlow, {
    reviewTitle: { type: ControlType.String, title: "Review title", defaultValue: "Review and send" },
    reviewNote: { type: ControlType.String, title: "Review note", defaultValue: "Tap any line to change it. Nothing is sent until you press send." },
})
