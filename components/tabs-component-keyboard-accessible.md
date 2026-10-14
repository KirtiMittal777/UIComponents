# Tabs Component (Keyboard Accessible)

## Component Spec

Build a reusable, accessible `Tabs` component for a machine-coding round:

- Renders a tab list with associated tab panels (one visible at a time).
- **Keyboard support per WAI-ARIA Authoring Practices**: Arrow keys move between
  tabs, `Home`/`End` jump to first/last, `Enter`/`Space` activates (manual
  activation mode) or arrows auto-activate (automatic mode — choose one and
  document it).
- Correct ARIA wiring: `role="tablist"`, `role="tab"`, `role="tabpanel"`,
  `aria-selected`, `aria-controls` / `aria-labelledby`, `tabindex` roving.
- Supports controlled (`activeIndex` + `onChange`) and uncontrolled
  (`defaultActiveIndex`) usage.
- Disabled tabs are skippable (not focusable, not activatable).
- Lazy panel rendering option: only mount the active panel's content.

## Complete Implementation (TSX)

```tsx
import {
  useCallback,
  useId,
  useRef,
  useState,
  type ReactNode,
  type KeyboardEvent,
} from "react";

export interface TabItem {
  id: string;
  label: ReactNode;
  content: ReactNode;
  disabled?: boolean;
}

interface TabsProps {
  tabs: TabItem[];
  /** Controlled mode. */
  activeIndex?: number;
  onChange?: (index: number) => void;
  /** Uncontrolled initial tab. Default 0. */
  defaultActiveIndex?: number;
  /** "automatic" (default): arrows select. "manual": arrows move focus, Enter/Space selects. */
  activation?: "automatic" | "manual";
  /** Only render the active panel's content. Default true. */
  lazy?: boolean;
}

export function Tabs({
  tabs,
  activeIndex: controlledIndex,
  onChange,
  defaultActiveIndex = 0,
  activation = "automatic",
  lazy = true,
}: TabsProps) {
  const [uncontrolledIndex, setUncontrolledIndex] = useState(defaultActiveIndex);
  const activeIndex = controlledIndex ?? uncontrolledIndex;
  const baseId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const select = useCallback(
    (index: number) => {
      if (tabs[index]?.disabled) return;
      setUncontrolledIndex(index);
      onChange?.(index);
    },
    [tabs, onChange]
  );

  const focusTab = useCallback((index: number) => {
    tabRefs.current[index]?.focus();
  }, []);

  /** Next enabled tab in `direction` (+1 / -1), wrapping around. */
  const nextEnabled = useCallback(
    (from: number, direction: 1 | -1): number => {
      const n = tabs.length;
      let i = from;
      for (let step = 0; step < n; step++) {
        i = (i + direction + n) % n;
        if (!tabs[i].disabled) return i;
      }
      return from; // all disabled — stay put
    },
    [tabs]
  );

  const firstEnabled = tabs.findIndex((t) => !t.disabled);
  const lastEnabled = tabs.length - 1 - [...tabs].reverse().findIndex((t) => !t.disabled);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    let target: number | null = null;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        target = nextEnabled(activeIndex, 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        target = nextEnabled(activeIndex, -1);
        break;
      case "Home":
        target = firstEnabled === -1 ? null : firstEnabled;
        break;
      case "End":
        target = lastEnabled;
        break;
      case "Enter":
      case " ":
        if (activation === "manual") {
          event.preventDefault();
          // In manual mode, focus may sit on a non-active tab; find it.
          const focused = tabRefs.current.findIndex((el) => el === document.activeElement);
          if (focused !== -1) select(focused);
        }
        return;
      default:
        return;
    }
    if (target === null) return;
    event.preventDefault();
    focusTab(target);
    if (activation === "automatic") select(target);
  };

  return (
    <div className="tabs">
      <div
        role="tablist"
        aria-label="Content sections"
        onKeyDown={handleKeyDown}
        className="tabs-list"
      >
        {tabs.map((tab, i) => {
          const selected = i === activeIndex;
          const tabId = `${baseId}-tab-${tab.id}`;
          const panelId = `${baseId}-panel-${tab.id}`;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              role="tab"
              id={tabId}
              aria-selected={selected}
              aria-controls={panelId}
              disabled={tab.disabled}
              // Roving tabindex: only the active tab is in the tab order.
              tabIndex={selected ? 0 : -1}
              onClick={() => select(i)}
              className={`tabs-tab${selected ? " tabs-tab--active" : ""}`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {tabs.map((tab, i) => {
        const selected = i === activeIndex;
        const tabId = `${baseId}-tab-${tab.id}`;
        const panelId = `${baseId}-panel-${tab.id}`;
        if (lazy && !selected) return null;
        return (
          <div
            key={tab.id}
            role="tabpanel"
            id={panelId}
            aria-labelledby={tabId}
            hidden={!selected}
            tabIndex={0} // panels with overflow content must be scrollable by keyboard
            className="tabs-panel"
          >
            {selected || !lazy ? tab.content : null}
          </div>
        );
      })}
    </div>
  );
}
```

Usage:

```tsx
<Tabs
  tabs={[
    { id: "overview", label: "Overview", content: <Overview /> },
    { id: "reviews", label: "Reviews", content: <Reviews /> },
    { id: "specs", label: "Specs", content: <Specs />, disabled: true },
  ]}
  defaultActiveIndex={0}
/>
```

Minimal CSS:

```css
.tabs-list { display: flex; gap: 4px; border-bottom: 2px solid #e5e5e5; }
.tabs-tab {
  padding: 8px 16px; border: none; background: none; cursor: pointer;
  border-bottom: 2px solid transparent; margin-bottom: -2px;
}
.tabs-tab--active { border-bottom-color: #2563eb; font-weight: 600; }
.tabs-tab:disabled { opacity: 0.4; cursor: not-allowed; }
.tabs-panel { padding: 16px 0; }
.tabs-panel:focus { outline: 2px solid #2563eb; outline-offset: 2px; }
```

## Design Decisions

1. **Roving `tabindex`**: only the active tab is tabbable (`tabIndex=0`); the
   rest are `tabIndex=-1` and reached via arrow keys. This is the APG pattern —
   Tab enters the widget once, arrows move within it.
2. **Automatic activation by default**: arrows both move focus and select.
   Manual mode is supported for cases where switching panels is expensive
   (network fetch per tab) — documented via the `activation` prop.
3. **Keyboard handler on the tablist**: a single delegated `onKeyDown` instead
   of per-tab handlers; `preventDefault` stops arrow keys from scrolling.
4. **Disabled tabs skipped** in keyboard navigation (wrapping search for the
   next enabled tab) and can't be selected by click.
5. **Lazy panels** (`lazy` prop): unmount inactive panels so heavy tab content
   (charts, tables) doesn't pay render/data costs until viewed.

## Accessibility Notes

- `role="tablist/tab/tabpanel"` + `aria-selected` + `aria-controls` /
  `aria-labelledby` give screen readers the full tab semantics.
- `tabIndex={0}` on the panel: any panel with scrollable overflow must be
  keyboard-focusable, otherwise keyboard users can't scroll its content.
- Visible focus styles are mandatory — never remove the outline without a
  replacement.
- Arrow-key direction: `ArrowLeft/Right` for horizontal tab lists (also accept
  `Up/Down` for robustness); in RTL locales, Left/Right should flip — noted as
  a follow-up, not implemented here.
- Honest gap: no `aria-orientation` handling or RTL flipping; both are
  straightforward additions (`dir` check swapping arrow meaning).

## Edge Cases

1. **All tabs disabled**: `nextEnabled` returns the current index — focus and
   selection don't move, no crash.
2. **Controlled + uncontrolled**: `activeIndex ?? uncontrolledIndex` pattern;
   `onChange` fires in both modes so parents can observe uncontrolled changes.
3. **`tabs` array changes length**: if the active index goes out of range,
   clamp it (`Math.min(activeIndex, tabs.length - 1)`) — add a guard in
   production code.
4. **Focus after tab removal**: if the focused tab unmounts, move focus to the
   nearest enabled tab rather than dropping it to `<body>`.
5. **Manual mode + click**: clicking always selects immediately (only keyboard
   arrows defer selection in manual mode).
6. **SSR**: `useId` is SSR-safe; no `document` access during render (only in
   event handlers).
