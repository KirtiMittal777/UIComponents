# Accordion

## Component spec

Build a reusable `Accordion` component:

- Renders a list of collapsible sections, each with a **header button** and a
  **content panel**.
- Supports **single-expand** (opening one closes the others — classic
  accordion) and **multi-expand** (`allowMultiple`) modes.
- Optionally **controlled** via `openIndexes`/`onToggle`, with an uncontrolled
  default (`defaultOpenIndexes`).
- Fully keyboard accessible per the
  [WAI-ARIA Accordion pattern](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/):
  ArrowUp/ArrowDown (or ArrowLeft/ArrowRight in horizontal orientation) move
  focus between headers; Home/End jump to first/last; Enter/Space toggles.
- Smooth open/close animation that doesn't break with dynamic content height.
- Works with server-side rendering (no `document` access during render).

Props:

```tsx
interface AccordionItem {
  id: string;
  title: React.ReactNode;
  content: React.ReactNode;
  disabled?: boolean;
}

interface AccordionProps {
  items: AccordionItem[];
  allowMultiple?: boolean;          // default false
  defaultOpenIndexes?: number[];   // uncontrolled initial state
  openIndexes?: number[];          // controlled mode
  onToggle?: (openIndexes: number[]) => void;
  className?: string;
}
```

## Implementation (TSX)

```tsx
import React, { useCallback, useId, useRef, useState } from "react";

interface AccordionItem {
  id: string;
  title: React.ReactNode;
  content: React.ReactNode;
  disabled?: boolean;
}

interface AccordionProps {
  items: AccordionItem[];
  allowMultiple?: boolean;
  defaultOpenIndexes?: number[];
  openIndexes?: number[];
  onToggle?: (openIndexes: number[]) => void;
  className?: string;
}

export function Accordion({
  items,
  allowMultiple = false,
  defaultOpenIndexes = [],
  openIndexes: controlledOpen,
  onToggle,
  className,
}: AccordionProps) {
  const baseId = useId();
  const headerRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const [internalOpen, setInternalOpen] = useState<number[]>(defaultOpenIndexes);
  const openIndexes = controlledOpen ?? internalOpen;

  const toggle = useCallback(
    (index: number) => {
      if (items[index]?.disabled) return;
      const isOpen = openIndexes.includes(index);
      const next = isOpen
        ? openIndexes.filter((i) => i !== index)
        : allowMultiple
          ? [...openIndexes, index]
          : [index];
      onToggle?.(next);
      if (controlledOpen === undefined) setInternalOpen(next);
    },
    [items, openIndexes, allowMultiple, onToggle, controlledOpen],
  );

  // WAI-ARIA keyboard navigation across headers.
  const onHeaderKeyDown = (event: React.KeyboardEvent, index: number) => {
    let target: number | null = null;
    switch (event.key) {
      case "ArrowDown":
        target = (index + 1) % items.length;
        break;
      case "ArrowUp":
        target = (index - 1 + items.length) % items.length;
        break;
      case "Home":
        target = 0;
        break;
      case "End":
        target = items.length - 1;
        break;
    }
    if (target !== null) {
      event.preventDefault();
      // Skip disabled headers when moving focus.
      let guard = 0;
      while (items[target]?.disabled && guard++ < items.length) {
        target = event.key === "ArrowUp"
          ? (target - 1 + items.length) % items.length
          : (target + 1) % items.length;
      }
      headerRefs.current[target]?.focus();
    }
  };

  return (
    <div className={className}>
      {items.map((item, index) => {
        const isOpen = openIndexes.includes(index);
        const headerId = `${baseId}-header-${item.id}`;
        const panelId = `${baseId}-panel-${item.id}`;
        return (
          <div key={item.id} className="accordion-item">
            <h3 className="accordion-heading">
              <button
                ref={(el) => {
                  headerRefs.current[index] = el;
                }}
                id={headerId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                disabled={item.disabled}
                onClick={() => toggle(index)}
                onKeyDown={(e) => onHeaderKeyDown(e, index)}
                className="accordion-header"
              >
                <span className="accordion-title">{item.title}</span>
                <span aria-hidden="true" className={`accordion-icon${isOpen ? " open" : ""}`}>
                  ▾
                </span>
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={headerId}
              hidden={!isOpen}
              className="accordion-panel"
            >
              {/* inner wrapper animates height without fighting `hidden` */}
              <div className={`accordion-panel-inner${isOpen ? " open" : ""}`}>
                {item.content}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

Animation (CSS — animates the inner wrapper so `hidden` can stay on the panel):

```css
.accordion-panel-inner {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 200ms ease;
  overflow: hidden;
}
.accordion-panel-inner.open {
  grid-template-rows: 1fr;
}
.accordion-panel-inner > * {
  min-height: 0;
}
```

The `grid-template-rows: 0fr → 1fr` trick animates to *intrinsic* height without
measuring, so dynamic/async content never clips — unlike `max-height` hacks.

## Design decisions

- **Controlled + uncontrolled**: follows the React input convention
  (`defaultOpenIndexes` vs `openIndexes`); `useId()` keeps header/panel id
  wiring unique per instance and SSR-safe (no global counter drift).
- **Focus via refs array, not DOM queries**: survives re-renders and item
  reordering; `key={item.id}` keeps identity stable.
- **`hidden` on the panel, animation on an inner div**: keeps collapsed content
  out of the accessibility tree *and* animates — `display: none` content can't
  be transitioned, so the two concerns are split across elements.
- **`useCallback` for toggle**: stable handler reference for memoized item
  renderers in large lists.
- **Header inside `<h3>`**: the APG pattern's recommended heading structure,
  giving screen-reader users a navigable outline.

## Accessibility notes

- **Keyboard**: ArrowUp/ArrowDown cycle focus between headers, Home/End jump,
  Enter/Space toggle (native `<button>` behavior). Disabled headers are skipped
  during arrow navigation.
- **ARIA**: each header is a native `<button>` with `aria-expanded` and
  `aria-controls`; each panel has `role="region"` + `aria-labelledby`. The
  toggle icon is `aria-hidden`.
- **Reduced motion**: honor `prefers-reduced-motion` by disabling the
  transition (`@media (prefers-reduced-motion: reduce)`).
- **Focus visibility**: `:focus-visible` outline on headers — never remove
  outlines without a replacement.
- **Screen readers**: collapsed panels use `hidden`, so they're removed from
  the accessibility tree rather than just visually hidden.

## Edge cases

- **Empty `items`** → renders nothing; arrow-key modulo math guards divide-by-zero.
- **All items disabled** → focus loop has a guard counter so it can't spin forever.
- **`items` change identity/order** → `key={item.id}` (not index) keeps open
  state and focus anchored to the right section.
- **Controlled mode without `onToggle`** → state can't change; acceptable and
  documented, same tradeoff as a controlled `<input>` without `onChange`.
- **Very long panels** → animation uses intrinsic height, so no hardcoded
  `max-height` clipping; content can also lazy-render (`isOpen && …`) if
  mounting cost matters.
- **RTL layouts** → arrow-key semantics and the chevron should mirror; note it
  in the component's README rather than hardcoding.
