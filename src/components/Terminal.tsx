import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react'

/* ==========================================================================
   Terminal animado.

   `lines` describe una sesión: comandos ("cmd") que se "tipean" y salidas
   ("out", "ok", "err", "dim") que aparecen línea a línea. Un reproductor
   (useTerminalPlayer) avanza automáticamente; también se puede controlar
   desde un usePlayer externo pasando `upTo`.
   ========================================================================== */

export type TermLine = {
  kind: 'cmd' | 'out' | 'ok' | 'err' | 'dim' | 'warn' | 'blank' | 'comment'
  text: string
  /** pausa extra (ms) después de esta línea */
  wait?: number
}

export const cmd = (text: string, wait?: number): TermLine => ({ kind: 'cmd', text, wait })
export const out = (text: string, wait?: number): TermLine => ({ kind: 'out', text, wait })
export const ok = (text: string, wait?: number): TermLine => ({ kind: 'ok', text, wait })
export const err = (text: string, wait?: number): TermLine => ({ kind: 'err', text, wait })
export const dim = (text: string, wait?: number): TermLine => ({ kind: 'dim', text, wait })
export const warn = (text: string, wait?: number): TermLine => ({ kind: 'warn', text, wait })
export const comment = (text: string): TermLine => ({ kind: 'comment', text })
export const blank = (): TermLine => ({ kind: 'blank', text: '' })

export type TermPlayer = {
  /** líneas completamente visibles */
  upTo: number
  /** caracteres tipeados de la línea en curso (si es cmd) */
  typed: number
  playing: boolean
  done: boolean
  play: () => void
  pause: () => void
  toggle: () => void
  reset: () => void
  skip: () => void
}

export function useTerminalPlayer(lines: TermLine[], opts: { autoplay?: boolean; cps?: number; lineMs?: number } = {}): TermPlayer {
  const { autoplay = false, cps = 38, lineMs = 110 } = opts
  const [upTo, setUpTo] = useState(0)
  const [typed, setTyped] = useState(0)
  const [playing, setPlaying] = useState(autoplay)
  const done = upTo >= lines.length

  useEffect(() => {
    setUpTo(0)
    setTyped(0)
    setPlaying(autoplay)
  }, [lines, autoplay])

  useEffect(() => {
    if (!playing || done) {
      if (done) setPlaying(false)
      return
    }
    const line = lines[upTo]
    let t: ReturnType<typeof setTimeout>
    if (line.kind === 'cmd' && typed < line.text.length) {
      t = setTimeout(() => setTyped((x) => x + 1), 1000 / cps)
    } else {
      const base = line.kind === 'cmd' ? 420 : line.kind === 'blank' ? 40 : lineMs
      t = setTimeout(() => {
        setUpTo((x) => x + 1)
        setTyped(0)
      }, base + (line.wait ?? 0))
    }
    return () => clearTimeout(t)
  }, [playing, upTo, typed, lines, cps, lineMs, done])

  const play = useCallback(() => {
    if (upTo >= lines.length) {
      setUpTo(0)
      setTyped(0)
    }
    setPlaying(true)
  }, [upTo, lines.length])
  const pause = useCallback(() => setPlaying(false), [])
  const toggle = useCallback(() => (playing ? pause() : play()), [playing, play, pause])
  const reset = useCallback(() => {
    setPlaying(false)
    setUpTo(0)
    setTyped(0)
  }, [])
  const skip = useCallback(() => {
    setPlaying(false)
    setUpTo(lines.length)
    setTyped(0)
  }, [lines.length])

  return { upTo, typed, playing, done, play, pause, toggle, reset, skip }
}

export function Terminal({
  lines,
  upTo,
  typed = 0,
  title = 'bash',
  prompt = '$',
  maxHeight = 360,
  player,
  footer,
  autoStart = true,
}: {
  lines: TermLine[]
  /** cantidad de líneas visibles; si se omite, se muestran todas */
  upTo?: number
  typed?: number
  title?: ReactNode
  prompt?: string
  maxHeight?: number
  /** si se pasa, muestra controles de reproducción */
  player?: TermPlayer
  footer?: ReactNode
  /** con `player`: arranca solo la primera vez que el terminal entra en pantalla */
  autoStart?: boolean
}) {
  const n = upTo ?? lines.length
  const ref = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const started = useRef(false)

  useEffect(() => {
    if (!player || !autoStart || started.current || !rootRef.current) return
    if (typeof IntersectionObserver === 'undefined') return
    const el = rootRef.current
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !started.current) {
          started.current = true
          if (player.upTo === 0 && !player.playing) player.play()
          io.disconnect()
        }
      },
      { threshold: 0.5 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [player, autoStart])
  const visible = useMemo(() => lines.slice(0, n), [lines, n])
  const current = n < lines.length ? lines[n] : null
  const typing = current && current.kind === 'cmd' && (player ? player.playing || typed > 0 : typed > 0) ? current : null

  useEffect(() => {
    const el = ref.current
    if (el) el.scrollTop = el.scrollHeight
  }, [n, typed])

  return (
    <div className="term" ref={rootRef}>
      <div className="term-head">
        <span className="term-dots">
          <i />
          <i />
          <i />
        </span>
        <span className="term-title">{title}</span>
        {player && (
          <span className="term-ctl">
            <button className="icon-btn" onClick={player.reset} aria-label="Reiniciar" title="Reiniciar">
              <RotateCcw size={14} />
            </button>
            <button className="icon-btn play" onClick={player.toggle} aria-label={player.playing ? 'Pausar' : 'Reproducir'} title={player.playing ? 'Pausar' : 'Reproducir'}>
              {player.playing ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <button className="icon-btn" onClick={player.skip} aria-label="Mostrar todo" title="Mostrar todo">
              <SkipForward size={14} />
            </button>
          </span>
        )}
      </div>
      <div className="term-body" ref={ref} style={{ maxHeight }}>
        {visible.map((l, i) => (
          <div key={i} className={`term-line k-${l.kind}`}>
            {l.kind === 'cmd' && <span className="term-prompt">{prompt} </span>}
            {l.kind === 'comment' ? `# ${l.text}` : l.text}
          </div>
        ))}
        {typing && (
          <div className="term-line k-cmd">
            <span className="term-prompt">{prompt} </span>
            {typing.text.slice(0, typed)}
            <span className="term-caret" />
          </div>
        )}
        {!typing && n < lines.length && (
          <div className="term-line k-cmd">
            <span className="term-prompt">{prompt} </span>
            <span className="term-caret" />
          </div>
        )}
      </div>
      {footer && <div className="term-foot">{footer}</div>}
    </div>
  )
}
