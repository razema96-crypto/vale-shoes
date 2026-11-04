import logoSvg from "../assets/vale-logo.svg?raw";

/**
 * The original VALE Shoes logo (stiletto + "Vale" script + SHOES + HAND MADE),
 * vectorised from the brand artwork. Uses currentColor, so it works on dark and light.
 */
export function Logo({ className = "", title = "VALE Shoes" }: { className?: string; title?: string }) {
  return (
    <span
      className={`inline-block align-middle aspect-[2564/1708] [&>svg]:block [&>svg]:size-full ${className}`}
      role="img"
      aria-label={title}
      dangerouslySetInnerHTML={{ __html: logoSvg.replace('role="img" aria-label="VALE Shoes — Hand Made"', 'aria-hidden="true"') }}
    />
  );
}
