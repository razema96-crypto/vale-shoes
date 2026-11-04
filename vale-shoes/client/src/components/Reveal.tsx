import { useEffect, useRef, useState, type ReactNode } from "react";

/** Reveals content once as it enters the viewport (used sparingly, for section titles only). */
export function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`${className} ${shown ? "anim-rise" : "opacity-0"}`} style={{ animationDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}
