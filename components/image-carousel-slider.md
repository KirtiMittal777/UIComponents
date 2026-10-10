# Image Carousel / Slider

A production-style carousel: previous/next controls, dot indicators, full
keyboard support, swipe gestures, autoplay that respects the user, lazy-loaded
images, and ARIA wiring — the machine-coding round staple after typeahead.

## Spec

- One slide visible at a time; slides wrap around at both ends.
- Prev/Next buttons, clickable dot indicators.
- Keyboard: `←` / `→` to move, `Home` / `End` to jump.
- Touch swipe with a dead zone; mouse hover pauses autoplay.
- Autoplay (5s default) that pauses on hover, focus, hidden tab, and manual nav.
- Lazy-load offscreen images; reserve space so images never shift layout.
- Screen readers hear "Slide 2 of 5: <description>" on every change.

## Implementation (React + TypeScript)

```tsx
import { useCallback, useEffect, useId, useRef, useState } from "react";

type Slide = { src: string; alt: string; caption?: string };

export function Carousel({
  slides,
  autoPlayMs = 5000,
}: {
  slides: Slide[];
  autoPlayMs?: number;
}) {
  const count = slides.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const statusId = useId();

  const goTo = useCallback(
    (i: number) => setIndex(((i % count) + count) % count),
    [count]
  );
  const next = useCallback(() => setIndex((i) => (i + 1) % count), [count]);
  const prev = useCallback(
    () => setIndex((i) => (i - 1 + count) % count),
    [count]
  );

  // Clamp if the slide list shrinks under the current index.
  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [count, index]);

  // Autoplay: `index` in deps restarts the countdown after manual navigation.
  useEffect(() => {
    if (paused || count <= 1 || autoPlayMs <= 0) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), autoPlayMs);
    return () => clearInterval(t);
  }, [paused, count, autoPlayMs, index]);

  // Pause while the tab is hidden so the timer doesn't drift.
  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      next();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      prev();
    } else if (e.key === "Home") {
      e.preventDefault();
      goTo(0);
    } else if (e.key === "End") {
      e.preventDefault();
      goTo(count - 1);
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 40) return; // dead zone — taps, not swipes
    if (dx < 0) next();
    else prev();
  };

  if (count === 0) return null;

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Image carousel"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="carousel"
    >
      <div
        className="carousel-track"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {slides.map((s, i) => (
          <figure key={s.src} className="carousel-slide" aria-hidden={i !== index}>
            <img
              src={s.src}
              alt={s.alt}
              loading={i === 0 ? "eager" : "lazy"}
              draggable={false}
            />
            {s.caption && <figcaption>{s.caption}</figcaption>}
          </figure>
        ))}
      </div>

      {count > 1 && (
        <>
          <button type="button" aria-label="Previous slide" onClick={prev}>
            ‹
          </button>
          <button type="button" aria-label="Next slide" onClick={next}>
            ›
          </button>
          <div role="group" aria-label="Choose slide">
            {slides.map((s, i) => (
              <button
                key={s.src}
                type="button"
                aria-label={`Show slide ${i + 1} of ${count}`}
                aria-current={i === index}
                className={i === index ? "dot active" : "dot"}
                onClick={() => goTo(i)}
              />
            ))}
          </div>
        </>
      )}

      <p id={statusId} className="visually-hidden" aria-live="polite">
        Slide {index + 1} of {count}: {slides[index].alt}
      </p>
    </div>
  );
}
```

```css
/* The animation-critical CSS: GPU-composited, layout-stable. */
.carousel { overflow: hidden; position: relative; }
.carousel-track {
  display: flex;
  transition: transform 0.4s ease;
}
.carousel-slide { flex: 0 0 100%; aspect-ratio: 16 / 9; }
.carousel-slide img { width: 100%; height: 100%; object-fit: cover; }

@media (prefers-reduced-motion: reduce) {
  .carousel-track { transition: none; }
}
```

## Design decisions

- **Track `translateX` + flex row:** animating `transform` is GPU-composited — no
  layout or paint per frame. `flex: 0 0 100%` makes each slide exactly one
  viewport wide. Never animate `left`/`margin` for this.
- **Autoplay pauses aggressively:** hover, focus, hidden tab, and single-slide
  lists all disable it; including `index` in the effect deps restarts the
  countdown after manual navigation so the slide doesn't jump away mid-read.
- **Functional `setIndex` updates:** rapid clicks on Next stay consistent —
  each update is computed from the latest state, never a stale closure.
- **`aria-hidden` on offscreen slides + `tabIndex={0}` region:** keyboard users
  operate the carousel from one focus stop; offscreen content isn't in the
  accessibility tree.
- **`draggable={false}` on images:** prevents the browser's native drag ghost
  from fighting the swipe gesture.
- **Lazy loading + `aspect-ratio`:** `loading="lazy"` defers offscreen images;
  the fixed aspect-ratio box reserves space so images never cause layout shift
  (CLS) when they arrive.

## Accessibility

- `role="region"` with `aria-roledescription="carousel"` and an accessible
  name — screen readers announce the widget's purpose.
- Full keyboard parity: arrows move, `Home`/`End` jump; every mouse/touch action
  has a keyboard path. Keep a visible focus style on the region and buttons.
- Dots use `aria-current` on the active one; buttons carry "Previous slide" /
  "Next slide" / "Show slide N of M" labels.
- An `aria-live="polite"` status announces "Slide 2 of 5: <alt>" on every
  change — polite, so it never interrupts mid-sentence.
- `prefers-reduced-motion: reduce` kills the slide transition; consider also
  disabling autoplay for these users (note the choice).

## Edge cases

- **Zero slides** → render `null`; **one slide** → hide prev/next/dots and skip
  autoplay (nothing to rotate).
- **Slide list changes** (async fetch resolves): the clamp effect resets the
  index instead of pointing past the end.
- **Rapid navigation:** the transition retriggers cleanly since `transform` is
  recomputed from state each render.
- **Swipe vs. tap:** the 40px dead zone means tapping an image doesn't trigger a
  slide change; also avoids fighting vertical page scroll (only horizontal
  deltas act).
- **Image load failure:** the `alt` text remains and the aspect-ratio box holds
  the layout — add an `onError` fallback image for production.
- **SSR:** no `window`/`document` access during render; all listeners and
  timers live in effects.
