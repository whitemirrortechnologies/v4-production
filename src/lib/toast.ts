export type ToastTone = "success" | "error" | "info";
export type ToastMsg = { id: number; tone: ToastTone; text: string };

/** Fire a toast from any client component. The <Toaster/> in the root layout shows it. */
export function toast(text: string, tone: ToastTone = "success") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<Omit<ToastMsg, "id">>("v4:toast", { detail: { text, tone } }));
}
