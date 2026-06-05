"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Trash2, ExternalLink } from "lucide-react";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllRead,
  useDeleteNotification,
} from "@/hooks/useNotifications";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { ErrorAlert } from "@/components/ui/error-alert";
import { formatDateTime } from "@/lib/format";
import { RECORD_TYPE_ROUTES } from "@/types/notification";
import { cn } from "@/lib/utils";

export default function NotificationsPage() {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(0);
  const list = useNotifications(unreadOnly, page);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllRead();
  const del = useDeleteNotification();

  const items = list.data?.content ?? [];

  function recordLink(recordType: string | null, recordId: string | null) {
    if (!recordType || !recordId) return null;
    const base = RECORD_TYPE_ROUTES[recordType];
    return base ? `${base}/${recordId}` : null;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-h1 text-brand-primary">Notifications</h1>
        <div className="ml-auto flex items-center gap-2">
          <Button variant={unreadOnly ? "outline" : "default"} size="sm" onClick={() => { setUnreadOnly(false); setPage(0); }}>All</Button>
          <Button variant={unreadOnly ? "default" : "outline"} size="sm" onClick={() => { setUnreadOnly(true); setPage(0); }}>Unread</Button>
          <Button variant="outline" size="sm" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
            <Check className="h-4 w-4" /> Mark all read
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {list.isLoading ? (
            <LoadingScreen label="Loading notifications…" />
          ) : list.isError ? (
            <div className="p-4"><ErrorAlert title="Error" message="Failed to load notifications." /></div>
          ) : items.length === 0 ? (
            <p className="p-8 text-center text-body text-muted-foreground">
              {unreadOnly ? "No unread notifications." : "No notifications."}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((n) => {
                const link = recordLink(n.recordType, n.recordId);
                return (
                  <li key={n.id} className={cn("flex items-start gap-3 p-4", !n.read && "bg-brand-light/30")}>
                    {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-secondary" aria-label="unread" />}
                    <div className={cn("min-w-0", n.read && "pl-5")}>
                      <p className="text-body font-medium">{n.title}</p>
                      <p className="text-label text-muted-foreground">{n.message}</p>
                      <p className="mt-0.5 text-label text-muted-foreground">{formatDateTime(n.createdAt)}</p>
                      {link && (
                        <Link href={link} className="mt-1 inline-flex items-center gap-1 text-label text-brand-secondary hover:underline">
                          <ExternalLink className="h-3.5 w-3.5" /> View record
                        </Link>
                      )}
                    </div>
                    <div className="ml-auto flex shrink-0 items-center gap-1">
                      {!n.read && (
                        <Button variant="ghost" size="sm" onClick={() => markRead.mutate(n.id)} disabled={markRead.isPending} aria-label="Mark read">
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => del.mutate(n.id)} disabled={del.isPending} aria-label="Delete">
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-error" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {!list.isLoading && !list.isError && items.length > 0 && (
            <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
              <p className="text-label text-muted-foreground">
                Page {(list.data?.page ?? 0) + 1} of {Math.max(list.data?.totalPages ?? 1, 1)} · {list.data?.totalElements ?? 0} total
              </p>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page <= 0}>Prev</Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={(page + 1) >= (list.data?.totalPages ?? 0)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
