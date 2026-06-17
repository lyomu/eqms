"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Folder, FolderOpen, FolderPlus, Trash2 } from "lucide-react";
import {
  useDocumentList,
  useDocumentFolders,
  useCreateFolder,
  useDeleteFolder,
  useUsers,
} from "@/hooks/useDocuments";
import { ModuleListPage, type Column, type SortDirection } from "@/components/common/ModuleListPage";
import { StatusBadge, DOCUMENT_STATUS_LABELS } from "@/components/documents/StatusBadge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/format";
import type { DocumentFolder, DocumentResponse, DocumentStatus } from "@/types/documents";
import { DOCUMENT_TYPE_LABELS } from "@/types/documents";
import { toast } from "sonner";

const ALL_STATUSES = Object.keys(DOCUMENT_STATUS_LABELS) as DocumentStatus[];

export default function DocumentsListPage() {
  const router = useRouter();

  const [status, setStatus] = useState<DocumentStatus | "">("");
  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [ownerId, setOwnerId] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set());
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);

  const usersQuery = useUsers();
  const foldersQuery = useDocumentFolders();
  const createFolder = useCreateFolder();
  const deleteFolder = useDeleteFolder();

  const userName = useMemo(() => {
    const map = new Map<number, string>();
    usersQuery.data?.forEach((u) => map.set(u.id, u.fullName));
    return map;
  }, [usersQuery.data]);

  const listQuery = useDocumentList({ status, page, size: 10, sort: `${sortField},${sortDirection}` });

  const rows = useMemo(() => {
    let r = listQuery.data?.content ?? [];
    if (selectedFolderId !== null) r = r.filter((d) => d.folderId === selectedFolderId);
    if (ownerId) r = r.filter((d) => String(d.createdBy ?? "") === ownerId);
    if (dateFrom) r = r.filter((d) => d.updatedAt >= dateFrom);
    if (dateTo) r = r.filter((d) => d.updatedAt <= `${dateTo}T23:59:59Z`);
    return r;
  }, [listQuery.data, selectedFolderId, ownerId, dateFrom, dateTo]);

  function onSortChange(field: string, direction: SortDirection) {
    setSortField(field);
    setSortDirection(direction);
    setPage(0);
  }

  function toggleFolder(id: number) {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleCreateFolder() {
    const trimmed = newFolderName.trim();
    if (!trimmed) return;
    try {
      await createFolder.mutateAsync({ name: trimmed, parentId: selectedFolderId });
      setNewFolderName("");
      setCreatingFolder(false);
      toast.success("Folder created");
    } catch {
      toast.error("Failed to create folder");
    }
  }

  async function handleDeleteFolder(folder: DocumentFolder, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Delete folder "${folder.name}"? Documents inside will not be deleted.`)) return;
    try {
      await deleteFolder.mutateAsync(folder.id);
      if (selectedFolderId === folder.id) setSelectedFolderId(null);
      toast.success("Folder deleted");
    } catch {
      toast.error("Failed to delete folder");
    }
  }

  const columns: Column<DocumentResponse>[] = [
    {
      key: "documentNumber",
      header: "Doc Number",
      sortable: true,
      render: (d) => <span className="font-medium">{d.documentNumber}</span>,
    },
    {
      key: "title",
      header: "Title",
      sortable: true,
      render: (d) => (
        <div className="min-w-0">
          <p className="truncate">{d.title}</p>
          <p className="text-label text-muted-foreground">{DOCUMENT_TYPE_LABELS[d.type]}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (d) => <StatusBadge status={d.status} />,
    },
    {
      key: "owner",
      header: "Owner",
      hideOnMobile: true,
      render: (d) => userName.get(d.createdBy ?? -1) ?? (d.createdBy ? `User #${d.createdBy}` : "—"),
    },
    {
      key: "updatedAt",
      header: "Modified",
      sortable: true,
      hideOnMobile: true,
      render: (d) => formatDate(d.updatedAt),
    },
  ];

  const filterBar = (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-1.5">
        <Label htmlFor="f-status">Status</Label>
        <Select
          id="f-status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as DocumentStatus | "");
            setPage(0);
          }}
        >
          <option value="">All statuses</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{DOCUMENT_STATUS_LABELS[s]}</option>
          ))}
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="f-owner">Owner</Label>
        <Select id="f-owner" value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
          <option value="">All owners</option>
          {usersQuery.data?.map((u) => (
            <option key={u.id} value={String(u.id)}>{u.fullName}</option>
          ))}
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="f-from">Modified from</Label>
        <Input id="f-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="f-to">Modified to</Label>
        <Input id="f-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
      </div>
    </div>
  );

  return (
    <div className="flex min-h-0 gap-4">
      {/* Folder sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col gap-2 lg:flex">
        <div className="flex items-center justify-between">
          <span className="text-label font-medium text-muted-foreground uppercase tracking-wide">Folders</span>
          <button
            type="button"
            onClick={() => setCreatingFolder((v) => !v)}
            title="New folder"
            className="rounded p-1 hover:bg-muted"
          >
            <FolderPlus className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {creatingFolder && (
          <div className="flex gap-1">
            <Input
              autoFocus
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateFolder();
                if (e.key === "Escape") setCreatingFolder(false);
              }}
              className="h-7 text-sm"
            />
            <Button size="sm" className="h-7 shrink-0" onClick={handleCreateFolder}>
              Add
            </Button>
          </div>
        )}

        <nav className="space-y-0.5">
          <button
            type="button"
            onClick={() => setSelectedFolderId(null)}
            className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm ${
              selectedFolderId === null
                ? "bg-brand-primary/10 text-brand-primary font-medium"
                : "text-foreground hover:bg-muted"
            }`}
          >
            <Folder className="h-4 w-4 shrink-0" />
            All Documents
          </button>
          {foldersQuery.data?.map((f) => (
            <FolderNode
              key={f.id}
              folder={f}
              selected={selectedFolderId}
              expanded={expandedFolders}
              onSelect={setSelectedFolderId}
              onToggle={toggleFolder}
              onDelete={handleDeleteFolder}
              depth={0}
            />
          ))}
        </nav>
      </aside>

      {/* Main list */}
      <div className="min-w-0 flex-1">
        {selectedFolderId !== null && (
          <div className="mb-2 flex items-center gap-2 text-label text-muted-foreground">
            <button type="button" onClick={() => setSelectedFolderId(null)} className="hover:underline">
              All Documents
            </button>
            <ChevronRight className="h-3 w-3" />
            <span>{findFolderName(foldersQuery.data ?? [], selectedFolderId)}</span>
          </div>
        )}
        <ModuleListPage<DocumentResponse>
          title={selectedFolderId === null ? "Document Control" : (findFolderName(foldersQuery.data ?? [], selectedFolderId) ?? "Documents")}
          filterBar={filterBar}
          createLabel="New Document"
          onCreate={() => router.push("/documents/new")}
          columns={columns}
          rows={rows}
          getRowId={(d) => d.id}
          onRowClick={(d) => router.push(`/documents/${d.id}`)}
          rowActions={(d) => (
            <div className="flex justify-end gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`/documents/${d.id}`}>View</Link>
              </Button>
              {d.status === "DRAFT" && (
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/documents/${d.id}/edit`}>Edit</Link>
                </Button>
              )}
            </div>
          )}
          isLoading={listQuery.isLoading}
          isError={listQuery.isError}
          emptyText="No documents found"
          errorText="Failed to load documents"
          sortField={sortField}
          sortDirection={sortDirection}
          onSortChange={onSortChange}
          page={listQuery.data?.page ?? 0}
          totalPages={listQuery.data?.totalPages ?? 0}
          totalElements={listQuery.data?.totalElements ?? 0}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}

function FolderNode({
  folder,
  selected,
  expanded,
  onSelect,
  onToggle,
  onDelete,
  depth,
}: {
  folder: DocumentFolder;
  selected: number | null;
  expanded: Set<number>;
  onSelect: (id: number) => void;
  onToggle: (id: number) => void;
  onDelete: (folder: DocumentFolder, e: React.MouseEvent) => void;
  depth: number;
}) {
  const isOpen = expanded.has(folder.id);
  const hasChildren = folder.children.length > 0;
  const isSelected = selected === folder.id;

  return (
    <div>
      <div
        className={`group flex w-full items-center gap-1 rounded px-2 py-1.5 text-sm cursor-pointer ${
          isSelected ? "bg-brand-primary/10 text-brand-primary font-medium" : "text-foreground hover:bg-muted"
        }`}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={() => { onSelect(folder.id); if (hasChildren) onToggle(folder.id); }}
      >
        {hasChildren ? (
          <button type="button" onClick={(e) => { e.stopPropagation(); onToggle(folder.id); }} className="shrink-0">
            <ChevronRight className={`h-3 w-3 transition-transform ${isOpen ? "rotate-90" : ""}`} />
          </button>
        ) : (
          <span className="w-3 shrink-0" />
        )}
        {isOpen ? <FolderOpen className="h-4 w-4 shrink-0" /> : <Folder className="h-4 w-4 shrink-0" />}
        <span className="truncate flex-1">{folder.name}</span>
        <button
          type="button"
          onClick={(e) => onDelete(folder, e)}
          className="ml-auto shrink-0 opacity-0 group-hover:opacity-100 hover:text-error p-0.5"
          title="Delete folder"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      {isOpen && hasChildren && (
        <div>
          {folder.children.map((child) => (
            <FolderNode
              key={child.id}
              folder={child}
              selected={selected}
              expanded={expanded}
              onSelect={onSelect}
              onToggle={onToggle}
              onDelete={onDelete}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function findFolderName(folders: DocumentFolder[], id: number): string | null {
  for (const f of folders) {
    if (f.id === id) return f.name;
    const child = findFolderName(f.children, id);
    if (child) return child;
  }
  return null;
}
