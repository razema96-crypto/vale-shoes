/* Minimal line icons. Direction-neutral icons are used as-is; directional ones flip in RTL via `rtl-flip`. */
type P = { className?: string; strokeWidth?: number };
const base = (cls = "", sw = 1.5) => ({
  className: `shrink-0 ${cls}`,
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: sw,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});
export const SearchIcon = ({ className, strokeWidth }: P) => (
  <svg {...base(className, strokeWidth)}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></svg>
);
export const BagIcon = ({ className, strokeWidth }: P) => (
  <svg {...base(className, strokeWidth)}><path d="M5 8h14l-1 12H6L5 8Z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></svg>
);
export const MenuIcon = ({ className, strokeWidth }: P) => (
  <svg {...base(className, strokeWidth)}><path d="M4 8h16M4 16h16" /></svg>
);
export const CloseIcon = ({ className, strokeWidth }: P) => (
  <svg {...base(className, strokeWidth)}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const ArrowIcon = ({ className, strokeWidth }: P) => (
  // points "forward" in reading direction (left in RTL)
  <svg {...base(className, strokeWidth)}><path d="M19 12H5m0 0 6-6m-6 6 6 6" /></svg>
);
export const ChevronIcon = ({ className, strokeWidth }: P) => (
  <svg {...base(className, strokeWidth)}><path d="m9 6 6 6-6 6" /></svg>
);
export const MinusIcon = ({ className, strokeWidth }: P) => (
  <svg {...base(className, strokeWidth)}><path d="M5 12h14" /></svg>
);
export const PlusIcon = ({ className, strokeWidth }: P) => (
  <svg {...base(className, strokeWidth)}><path d="M12 5v14M5 12h14" /></svg>
);
export const TrashIcon = ({ className, strokeWidth }: P) => (
  <svg {...base(className, strokeWidth)}><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13" /></svg>
);
export const FilterIcon = ({ className, strokeWidth }: P) => (
  <svg {...base(className, strokeWidth)}><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></svg>
);
export const EyeIcon = ({ className, strokeWidth }: P) => (
  <svg {...base(className, strokeWidth)}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="2.8" /></svg>
);
export const StarIcon = ({ className, filled }: P & { filled?: boolean }) => (
  <svg className={`shrink-0 ${className ?? ""}`} width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
    <path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8l-5.4 2.9 1.1-6.1L3.2 9.4l6.1-.8L12 3Z" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
  </svg>
);
export const WhatsappIcon = ({ className }: P) => (
  <svg className={`shrink-0 ${className ?? ""}`} width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12.04 2a9.9 9.9 0 0 0-8.5 15l-1.5 5 5.2-1.4A9.9 9.9 0 1 0 12.04 2Zm0 18.1a8.2 8.2 0 0 1-4.2-1.15l-.3-.18-3.1.82.83-3-.2-.31a8.2 8.2 0 1 1 6.97 3.82Zm4.5-6.1c-.25-.12-1.46-.72-1.69-.8-.23-.09-.39-.13-.56.12-.16.25-.64.8-.78.97-.14.16-.29.18-.53.06a6.7 6.7 0 0 1-3.34-2.92c-.25-.43.25-.4.72-1.34.08-.16.04-.3-.02-.43l-.76-1.83c-.2-.48-.4-.41-.56-.42h-.48a.92.92 0 0 0-.66.31 2.8 2.8 0 0 0-.87 2.07 4.85 4.85 0 0 0 1.02 2.58 11.1 11.1 0 0 0 4.25 3.76c1.58.68 2.2.74 2.99.62.48-.07 1.46-.6 1.67-1.18.2-.58.2-1.07.14-1.18-.06-.1-.22-.16-.47-.29Z" />
  </svg>
);
export const CheckIcon = ({ className, strokeWidth }: P) => (
  <svg {...base(className, strokeWidth)}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
);
