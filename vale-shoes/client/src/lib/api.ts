import { t } from "../i18n";
import { PREVIEW, previewApi } from "./preview";

export class ApiError extends Error {
  constructor(message: string, public status: number, public data?: unknown) {
    super(message);
  }
}

export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  if (PREVIEW) {
    const r = await previewApi(path, (rest.method || "GET").toUpperCase());
    if (r.status >= 400) throw new ApiError((r.data as { error?: string })?.error || t("خطأ {n}", { n: r.status }), r.status, r.data);
    return r.data as T;
  }
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      credentials: "same-origin",
      ...rest,
      headers: { ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...headers },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
  } catch {
    throw new ApiError(t("تعذر الاتصال بالخادم. تحقق من اتصالك بالإنترنت ثم حاول مجدداً."), 0);
  }
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON */
  }
  if (!res.ok) throw new ApiError(data?.error || t("خطأ {n}", { n: res.status }), res.status, data);
  return data as T;
}
