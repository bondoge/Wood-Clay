import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

/**
 * Single shared button, theme-agnostic — colour comes entirely from the
 * `--accent` / `--focus` tokens of whichever `data-theme` ancestor wraps it.
 * Implements MOTION-SPEC M3 (brush-underline): an SVG stroke drawn via
 * stroke-dashoffset on hover/focus/active, plus a real focus-visible ring
 * (M3 is never the sole focus indicator).
 */
export function Button({ children, className, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={className ? `wc-button ${className}` : "wc-button"}
    >
      <span className="wc-button-label type-utility">{children}</span>
      <svg
        className="wc-button-stroke"
        viewBox="0 0 100 8"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M1 4 H99" fill="none" strokeLinecap="round" pathLength={100} />
      </svg>
    </button>
  );
}
