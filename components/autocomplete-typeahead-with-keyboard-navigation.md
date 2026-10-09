# Autocomplete / Typeahead with Keyboard Navigation

A production-style typeahead: debounced input, async suggestions, full keyboard
navigation, mouse support, and ARIA wiring — the machine-coding round staple.

## Spec

- Text input with a suggestion dropdown.
- `↑` / `↓` to move the active option, `Enter` to select, `Escape` to close.
- Mouse hover highlights; click selects.
- Debounced fetching (300ms), stale-response guard so out-of-order results are ignored.
- Loading + empty states. Closes on outside click or selection.

## Implementation (React + TypeScript)

```tsx
import { useEffect, useId, useRef, useState } from "react";

type Option = { id: string; label: string };

const DEBOUNCE_MS = 300;

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function Autocomplete({
  fetchOptions,
  onSelect,
  placeholder = "Search…",
}: {
  fetchOptions: (query: string) => Promise<Option[]>;
  onSelect: (option: Option) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<Option[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);

  const debouncedQuery = useDebouncedValue(query, DEBOUNCE_MS);
  const requestId = useRef(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  // Fetch suggestions for the debounced query; ignore stale responses.
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setOptions([]);
      setOpen(false);
      return;
    }
    const id = ++requestId.current;
    setLoading(true);
    fetchOptions(debouncedQuery)
      .then((result) => {
        if (id !== requestId.current) return; // stale — discard
        setOptions(result);
        setActiveIndex(-1);
        setOpen(true);
      })
      .catch(() => {
        if (id === requestId.current) setOptions([]);
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
  }, [debouncedQuery, fetchOptions]);

  // Close on outside click.
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const select = (option: Option) => {
    setQuery(option.label);
    setOpen(false);
    onSelect(option);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      if (open && activeIndex >= 0) {
        e.preventDefault();
        select(options[activeIndex]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="autocomplete">
      <input
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={
          activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined
        }
        aria-autocomplete="list"
        value={query}
        placeholder={placeholder}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => options.length > 0 && setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {open && (
        <ul role="listbox" id={listId} className="autocomplete-list">
          {loading && <li className="status">Loading…</li>}
          {!loading && options.length === 0 && (
            <li className="status">No results</li>
          )}
          {options.map((opt, i) => (
            <li
              key={opt.id}
              id={`${listId}-option-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              className={i === activeIndex ? "active" : ""}
              onMouseEnter={() => setActiveIndex(i)}
              onMouseDown={(e) => e.preventDefault()} // keep focus for click
              onClick={() => select(opt)}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

## Design decisions

- **Debounce in the parent of fetch:** `useDebouncedValue` keeps the fetch
  effect clean; 300ms is the standard perceived-responsiveness sweet spot.
- **Stale-response guard via `requestId`:** a slow earlier response must never
  overwrite a newer one. (An `AbortController` per request is the alternative;
  the guard is simpler and sufficient when the backend has no cancellation.)
- **`onMouseDown` preventDefault:** without it, the input blurs before `onClick`
  fires and the option never registers — the classic typeahead bug.
- **Controlled query text:** the selected label fills the input; the parent owns
  selection via `onSelect`, keeping this component reusable.

## Accessibility

- `combobox` + `listbox`/`option` roles with `aria-expanded`, `aria-controls`,
  `aria-activedescendant`, and `aria-selected` — screen readers announce the
  highlighted option as you arrow through.
- Full keyboard parity: every mouse action (hover/click) has a keyboard path.
- `Escape` restores focus context without changing the query.

## Edge cases

- Empty query → dropdown closes; no request fires.
- Rapid typing → only the latest debounced query fetches; older results discarded.
- Fetch failure → options cleared, dropdown shows "No results" (could surface an
  error row instead — note the choice).
- Long lists → add `max-height` + scroll, and scroll the active option into view
  (`scrollIntoView({ block: "nearest" })`) so keyboard nav stays visible.
- Duplicate option labels → keyed by stable `id`, never by label or index.
