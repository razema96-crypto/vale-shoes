import type { ReactNode } from "react";
import { Link } from "react-router-dom";

/** Section heading: Amiri title + latin italic subtitle + thin yellow rule. */
export function SectionTitle({ title, latin, sub, link, id, align = "start" }: {
  title: ReactNode; latin?: string; sub?: string; link?: { to: string; label: string }; id?: string; align?: "start" | "center";
}) {
  const center = align === "center";
  return (
    <div data-reveal className={`flex items-end gap-6 mb-10 md:mb-14 ${center ? "justify-center text-center" : "justify-between"}`}>
      <div className={center ? "flex flex-col items-center" : ""}>
        {latin && <p className="latin text-[19px] text-gold mb-1">{latin}</p>}
        <h2 id={id} className="h-display text-[2.3rem] md:text-[3.2rem] leading-[1.3]">{title}</h2>
        <span className="rule mt-4" aria-hidden="true" />
        {sub && <p className="mt-5 text-ash max-w-md">{sub}</p>}
      </div>
      {link && !center && (
        <Link to={link.to} className="hidden sm:inline-flex shrink-0 items-center gap-2 text-[15px] border-b border-ink pb-1 hover:border-vale transition-colors">
          {link.label}
        </Link>
      )}
    </div>
  );
}
