# Accessible Modal with Focus Trap + Escape Handling

## Component spec

Build a reusable `<Modal>` for React:

- Controlled via `open` + `onClose`; renders nothing when closed.
- **Focus trap:** Tab / Shift+Tab cycles only within the modal while open.
- **Escape** closes the modal; clicking the backdrop closes (configurable).
- **Focus management:** moves focus into the dialog on open, restores it to
  the previously focused element on close.
- Renders into a **portal** so it escapes ancestor `overflow` / stacking
  contexts.
- Locks **body scroll** while open; supports `aria-modal`, labelled-by and
  described-by wiring.
- Animates in/out without breaking focus semantics.

```tsx
<Modal open={open} onClose={() => setOpen(false)} title="Delete item">
  <p>Are you sure? This can't be undone.</p>
  <button onClick={confirm}>Delete</button>
</Modal>
```

## Complete implementation (TSX)

```tsx
import {
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
  type MouseEvent,
} from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** Close when the backdrop is clicked. Default true. */
  closeOnBackdropClick?: boolean;
  /** Initial element to receive focus. Defaults to the dialog itself. */
  initialFocusRef?: React.RefObject<HTMLElement>;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, ' +
  '[tabindex]:not([tabindex="-1"])';

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  closeOnBackdropClick = true,
  initialFocusRef,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const handleBackdropClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (closeOnBackdropClick && e.target === e.currentTarget) onClose();
    },
    [closeOnBackdropClick, onClose]
  );

  // Escape key → close
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // Focus trap: keep Tab cycling inside the dialog
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusables = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
      ).filter(
        (el) => !el.hasAttribute("disabled") && el.offsetParent !== null
      );
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (active === first || !dialogRef.current.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open ]);

  // Move focus in on open; restore on close; lock body scroll
  useEffect(() => {
    if (!open) return;
    previouslyFocusedRef.current =
      (document.activeElement as HTMLElement | null) ?? null;

    const target =
      initialFocusRef?.current ??
      dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE) ??
      dialogRef.current;
    // Wait a frame so the portal is painted before focusing.
    const raf = requestAnimationFrame(() => target?.focus());

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = prevOverflow;
      previouslyFocusedRef.current?.focus?.();
    };
  }, [open, initialFocusRef]);

  if (!open) return null;

  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={handleBackdropClick}
      aria-hidden={false}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby={description ? "modal-desc" : undefined}
        tabIndex={-1}
        className="modal-dialog"
      >
        <div className="modal-header">
          <h2 id="modal-title">{title}</h2>
          <button
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
            className="modal-close"
          >
            ×
          </button>
        </div>
        {description && (
          <p id="modal-desc" className="modal-description">
            {description}
          </p>
        )}
        <div className="modal-body">{children}</div>
      </div>
    </div>,
    document.body
  );
}
```

**Minimal CSS** (layout + animation; adapt to your design system):

```css
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgb(0 0 0 / 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fade-in 150ms ease-out;
}
.modal-dialog {
  background: #fff;
  border-radius: 12px;
  max-width: min(520px, calc(100vw - 2rem));
  max-height: calc(100dvh - 4rem);
  overflow: auto;
  padding: 1.25rem;
  animation: pop-in 180ms ease-out;
}
.modal-dialog:focus { outline: none; }
.modal-dialog:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }
@keyframes fade-in { from { opacity: 0; } }
@keyframes pop-in { from { opacity: 0; transform: translateY(8px) scale(0.98); } }
```

## Design decisions

- **Portal to `document.body`** — avoids `overflow: hidden`, `transform`,
  and z-index traps from ancestors. SSR-safe because the portal only
  renders when `open` (client-side state).
- **Trap on `document` keydown, not the dialog** — focus can momentarily
  land on the backdrop or body during re-renders; listening globally keeps
  the trap airtight.
- **Backdrop click on `onMouseDown` with target check** — `e.target ===
  e.currentTarget` distinguishes backdrop clicks from drags that start
  inside the dialog; avoids closing when text selection spills out.
- **Scroll lock via `body.style.overflow`** — simple and effective; for
  stacked modals, use a counter so the first close doesn't unlock while a
  second modal is open.
- **Restore focus on unmount** — returning focus to the trigger is what
  makes the modal feel native to keyboard and screen-reader users; it also
  satisfies WCAG 2.4.3 (focus order).

## Accessibility notes

- `role="dialog"` + `aria-modal="true"` tells assistive tech everything
  outside is inert. For full inertness, add the `inert` attribute (or
  `aria-hidden`) to the app root while open.
- Every dialog needs an accessible name: `aria-labelledby` pointing at the
  title (required here via the `title` prop).
- Focus the dialog (or its first control) on open; never leave focus on the
  element behind the overlay.
- Escape must always close — it's the expected dismissal gesture.
- Visible focus styles are mandatory (`:focus-visible`); never remove the
  outline without a replacement.
- Announce async content changes inside the modal with `aria-live` regions
  rather than moving focus unexpectedly.
- Keep the tab order logical: close button placement (header vs footer)
  should match the visual order.

## Edge cases

- **No focusable children** (pure text dialog): trap falls back to the
  dialog itself via `tabIndex={-1}` so Tab doesn't escape to the page.
- **Dynamically added controls** (lazy-loaded form): the focusable list is
  queried on every Tab press, so late-mounted elements join the cycle
  automatically.
- **Nested modals:** stack them with a counter for scroll-lock and Escape;
  only the topmost should trap focus — track an open-modal stack.
- **Unmount while open:** the cleanup effect restores focus and scroll even
  if the parent removes the modal without calling `onClose`.
- **iOS Safari:** `position: fixed` backdrop + body scroll lock needs
  `overscroll-behavior: contain` on the dialog to stop scroll chaining.
- **Animation + focus:** focusing before paint can scroll oddly — the
  `requestAnimationFrame` defers focus until the portal is laid out.