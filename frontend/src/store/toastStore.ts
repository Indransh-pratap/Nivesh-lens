import { create } from "zustand";

export type ToastVariant = "success" | "error" | "info";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  /** Optional action button rendered on the toast, e.g. "Undo". */
  action?: { label: string; onClick: () => void };
}

interface ToastState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    // Auto-dismiss after 4 seconds (6s if there's an action button, so there's
    // time to actually click "Undo" before it disappears).
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, toast.action ? 6000 : 4000);
  },
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
