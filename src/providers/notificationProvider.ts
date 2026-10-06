import type { NotificationProvider, OpenNotificationParams } from "@refinedev/core";
import { showToast as defaultShowToast, type ShowToast } from "@/shared/feedback/uiFeedback";

export interface NotificationProviderDeps {
  showToast: ShowToast;
}

/**
 * Refine notificationProvider implementation for MOA v2.
 * Bridges Refine's internal CRUD & mutation notification lifecycle to MOA's unified toast system.
 */
export function createNotificationProvider(
  deps: NotificationProviderDeps = { showToast: defaultShowToast }
): NotificationProvider {
  return {
    open: ({ message, type, description }: OpenNotificationParams) => {
      const toastType = type === "progress" ? "info" : type;

      if (description && description.trim()) {
        // When description is present, description is the detailed message and message is the title
        deps.showToast(description.trim(), toastType, message.trim());
      } else {
        deps.showToast(message.trim(), toastType);
      }
    },

    close: (_key: string) => {
      // MOA toasts automatically auto-dismiss after duration or manually by user click
    },
  };
}

export const notificationProvider: NotificationProvider = createNotificationProvider();
