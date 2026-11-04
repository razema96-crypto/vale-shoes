import { t } from "../i18n";
import { usePageMeta } from "../lib/meta";
import { EmptyState } from "../components/States";

export default function NotFound() {
  usePageMeta({ title: t("الصفحة غير موجودة"), noindex: true });
  return (
    <div className="pt-32 container-lux min-h-[70vh]">
      <EmptyState title={t("هذه الصفحة غير موجودة")} body={t("ربما تغيّر الرابط. يمكنك متابعة التسوق من المتجر.")} action={{ to: "/shop", label: t("الذهاب إلى المتجر") }} />
    </div>
  );
}
