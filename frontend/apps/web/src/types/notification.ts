/** Mirrors the backend Notification contract (com.eqms.notifications). Base: /api/notifications. */

export interface NotificationResponse {
  id: number;
  recipientUserId: number;
  type: string;
  title: string;
  message: string;
  recordType: string | null;
  recordId: string | null;
  read: boolean;
  readAt: string | null;
  createdAt: string;
}

/** Maps a notification's recordType to the in-app route for its record (best-effort deep link). */
export const RECORD_TYPE_ROUTES: Record<string, string> = {
  Document: "/documents",
  ChangeControl: "/change-control",
  Capa: "/capa",
  Deviation: "/deviations",
  Product: "/products",
  Material: "/materials",
  BatchRecord: "/batch-records",
};
