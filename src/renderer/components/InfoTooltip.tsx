import { useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  text: ReactNode;
  /** Which side of the trigger the bubble opens toward — 'bottom' for anything near the top of its container (e.g. sticky grid headers), 'top' otherwise. */
  placement?: 'top' | 'bottom';
  /** If provided, this becomes the hover/focus target instead of a standalone icon — for making an already-visible value (like the SS column's dollar amount) the tooltip trigger, rather than bolting an icon onto it. */
  children?: ReactNode;
}

/**
 * A themed hover/focus tooltip, styled to match the app rather than the
 * browser's plain native title bubble. Portaled to document.body and
 * positioned from the trigger's viewport rect (not CSS-anchored to an
 * ancestor) so it always escapes clipping ancestors like the projection
 * grid's horizontally-scrolling wrapper.
 */
export default function InfoTooltip({ text, placement = 'top', children }: Props) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);

  const show = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setCoords({
      top: placement === 'bottom' ? rect.bottom + 8 : rect.top - 8,
      left: rect.left + rect.width / 2,
    });
    setOpen(true);
  };
  const hide = () => setOpen(false);

  return (
    <span
      ref={triggerRef}
      className="info-tooltip"
      tabIndex={children ? 0 : undefined}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children ?? (
        <button type="button" className="info-tooltip__icon" aria-label="More info" tabIndex={-1}>
          i
        </button>
      )}
      {open &&
        createPortal(
          <span
            className={`info-tooltip__bubble info-tooltip__bubble--${placement}`}
            style={{ top: coords.top, left: coords.left }}
            role="tooltip"
          >
            {text}
          </span>,
          document.body
        )}
    </span>
  );
}
