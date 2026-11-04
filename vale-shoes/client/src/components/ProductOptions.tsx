import { t } from "../i18n";
import { useEffect, useId, useState } from "react";
import type { Product } from "../lib/types";
import { useCart, MAX_QTY } from "../store/cart";
import { imageFor } from "../lib/format";
import { QtyStepper } from "./CartParts";
import { CheckIcon } from "./Icons";

export function Availability({ p }: { p: Product }) {
  if (p.availability === "out_of_stock") return <p className="text-danger text-[14px]">{t("نفدت الكمية حالياً")}</p>;
  if (p.availability === "low_stock")
    return (
      <p className="text-[14px] text-[#8a5a12]">
        {t("متوفر — بقيت {n} {u} فقط", { n: p.stockLeft ?? 0, u: p.stockLeft === 1 ? t("قطعة") : t("قطع") })}
      </p>
    );
  return (
    <p className="text-[14px] text-ok flex items-center gap-1.5">
      <CheckIcon className="size-4" /> {t("متوفر")}
    </p>
  );
}

/** Colour, size, quantity selection with validation + add to cart. */
export function ProductOptions({ p, color, onColor, onAdded }: {
  p: Product; color: string; onColor: (c: string) => void; onAdded?: () => void;
}) {
  const add = useCart((s) => s.add);
  const [size, setSize] = useState<number | null>(null);
  const [qty, setQty] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const ids = { size: useId(), color: useId(), err: useId() };
  const out = p.availability === "out_of_stock";
  const max = Math.min(MAX_QTY, p.stockLeft ?? MAX_QTY);

  useEffect(() => {
    setSize(null);
    setQty(1);
    setError(null);
  }, [p.id]);

  const submit = () => {
    if (out) return;
    if (!color) return setError(t("يرجى اختيار اللون."));
    if (size == null) return setError(t("يرجى اختيار المقاس قبل الإضافة إلى السلة."));
    const c = p.colors.find((x) => x.name === color)!;
    add({
      productId: p.id,
      slug: p.slug,
      name: p.name,
      image: imageFor(p, color),
      price: p.price,
      size,
      color: c.name,
      colorHex: c.hex,
      qty,
      maxQty: p.stockLeft,
    });
    setError(null);
    setAdded(true);
    setTimeout(() => setAdded(false), 2200);
    onAdded?.();
  };

  return (
    <div className="space-y-7">
      <fieldset>
        <legend id={ids.color} className="text-[14px] mb-3">
          {t("اللون:")} <span className="text-ash">{color ? t(color) : t("اختاري لوناً")}</span>
        </legend>
        <div className="flex flex-wrap gap-3" role="radiogroup" aria-labelledby={ids.color}>
          {p.colors.map((c) => (
            <button
              key={c.name}
              type="button"
              role="radio"
              aria-checked={color === c.name}
              aria-label={t(c.name)}
              title={t(c.name)}
              onClick={() => {
                onColor(c.name);
                setError(null);
              }}
              className={`size-10 rounded-full ring-offset-2 ring-offset-paper transition ${color === c.name ? "ring-2 ring-ink" : "ring-1 ring-ink/20 hover:ring-ink/50"}`}
              style={{ background: c.hex }}
            />
          ))}
        </div>
      </fieldset>

      <fieldset aria-describedby={error ? ids.err : undefined}>
        <div className="flex items-center justify-between mb-3">
          <legend id={ids.size} className="text-[14px]">
            {t("المقاس (EU):")} <span className="text-ash num">{size ?? ""}</span>
            {size == null && <span className="text-ash">{t("اختاري مقاسك")}</span>}
          </legend>
        </div>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby={ids.size} aria-required="true">
          {p.sizes.map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={size === s}
              className="chip num"
              onClick={() => {
                setSize(s);
                setError(null);
              }}
              disabled={out}
            >
              {s}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-4">
        <QtyStepper value={qty} onChange={(n) => setQty(Math.max(1, Math.min(max, n)))} max={max} label={t("الكمية")} />
        <Availability p={p} />
      </div>

      {error && (
        <p id={ids.err} role="alert" className="text-danger text-[14px] -mt-2">
          {error}
        </p>
      )}

      <button type="button" className="btn-dark w-full" onClick={submit} disabled={out} aria-live="polite">
        {out ? t("غير متوفر حالياً") : added ? (<><CheckIcon className="size-5" /> {t("أُضيف إلى السلة")}</>) : t("أضف إلى السلة")}
      </button>
    </div>
  );
}
