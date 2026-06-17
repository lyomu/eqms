"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  AuditEntry,
  DocumentFolder,
  DocumentNote,
  DocumentResponse,
  DocumentStatus,
  DocumentTypeKey,
  DocumentVersion,
  PageResponse,
  SignatureEntry,
  UserSummary,
} from "@/types/documents";

const FIVE_MIN = 5 * 60 * 1000;

export interface DocumentListParams {
  status?: DocumentStatus | "";
  folderId?: number | null;
  page?: number;
  size?: number;
  sort?: string;
}

export const documentKeys = {
  all: ["documents"] as const,
  list: (params: DocumentListParams) => ["documents", "list", params] as const,
  detail: (id: number) => ["documents", "detail", id] as const,
  versions: (id: number) => ["documents", id, "versions"] as const,
  audit: (id: number) => ["documents", id, "audit"] as const,
  approvals: (id: number) => ["documents", id, "approvals"] as const,
  notes: (id: number) => ["documents", id, "notes"] as const,
  changeRequests: (id: number) => ["documents", id, "change-requests"] as const,
};

export function useDocumentList(params: DocumentListParams) {
  const { status, page = 0, size = 10, sort = "createdAt,desc" } = params;
  return useQuery({
    queryKey: documentKeys.list({ status, page, size, sort }),
    queryFn: async (): Promise<PageResponse<DocumentResponse>> => {
      const search = new URLSearchParams();
      if (status) search.set("status", status);
      search.set("page", String(page));
      search.set("size", String(size));
      search.set("sort", sort);
      return (await api.get(`/api/documents?${search.toString()}`)).data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useDocumentFolders() {
  return useQuery({
    queryKey: ["document-folders"],
    queryFn: async (): Promise<DocumentFolder[]> =>
      (await api.get("/api/document-folders")).data,
    staleTime: FIVE_MIN,
  });
}

export function useCreateFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; parentId?: number | null }) =>
      (await api.post("/api/document-folders", input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["document-folders"] }),
  });
}

export function useRenameFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) =>
      (await api.put(`/api/document-folders/${id}`, { name })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["document-folders"] }),
  });
}

export function useDeleteFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => api.delete(`/api/document-folders/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["document-folders"] }),
  });
}

export function useDocument(id: number) {
  return useQuery({
    queryKey: documentKeys.detail(id),
    queryFn: async (): Promise<DocumentResponse> => (await api.get(`/api/documents/${id}`)).data,
    staleTime: FIVE_MIN,
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useDocumentVersions(id: number) {
  return useQuery({
    queryKey: documentKeys.versions(id),
    queryFn: async (): Promise<DocumentVersion[]> =>
      (await api.get(`/api/documents/${id}/versions`)).data,
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useDocumentAudit(id: number, enabled = true) {
  return useQuery({
    queryKey: documentKeys.audit(id),
    queryFn: async (): Promise<AuditEntry[]> =>
      (await api.get(`/api/documents/${id}/audit-trail`)).data,
    enabled: enabled && Number.isFinite(id) && id > 0,
  });
}

export function useDocumentApprovals(id: number) {
  return useQuery({
    queryKey: documentKeys.approvals(id),
    queryFn: async (): Promise<SignatureEntry[]> =>
      (await api.get(`/api/documents/${id}/approvals`)).data,
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useDocumentNotes(id: number) {
  return useQuery({
    queryKey: documentKeys.notes(id),
    queryFn: async (): Promise<DocumentNote[]> =>
      (await api.get(`/api/documents/${id}/notes`)).data,
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useDocumentChangeRequests(id: number) {
  return useQuery({
    queryKey: documentKeys.changeRequests(id),
    queryFn: async (): Promise<DocumentNote[]> =>
      (await api.get(`/api/documents/${id}/change-requests`)).data,
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useAddNote(documentId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (content: string) =>
      (await api.post(`/api/documents/${documentId}/notes`, { content })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: documentKeys.notes(documentId) }),
  });
}

export function useAddChangeRequest(documentId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (content: string) =>
      (await api.post(`/api/documents/${documentId}/change-requests`, { content })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: documentKeys.changeRequests(documentId) }),
  });
}

export function useDeleteNote(documentId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (noteId: number) =>
      api.delete(`/api/documents/${documentId}/notes/${noteId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: documentKeys.notes(documentId) });
      qc.invalidateQueries({ queryKey: documentKeys.changeRequests(documentId) });
    },
  });
}

export function useCheckOut(documentId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () =>
      (await api.post(`/api/documents/${documentId}/check-out`, {})).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: documentKeys.detail(documentId) }),
  });
}

export function useCheckIn(documentId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () =>
      (await api.post(`/api/documents/${documentId}/check-in`, {})).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: documentKeys.detail(documentId) }),
  });
}

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: async (): Promise<UserSummary[]> => (await api.get("/api/users")).data,
    staleTime: FIVE_MIN,
  });
}

/* ------------------------------- mutations -------------------------------- */

export interface CreateDocumentInput {
  title: string;
  type: DocumentTypeKey;
  content: string;
  reviewPeriodMonths?: number | null;
  folderId?: number | null;
}

export function useCreateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateDocumentInput): Promise<DocumentResponse> =>
      (await api.post("/api/documents", input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: documentKeys.all }),
  });
}

export interface UpdateDocumentInput {
  id: number;
  expectedVersion: number;
  title: string;
  type: DocumentTypeKey;
  content: string;
  reviewPeriodMonths?: number | null;
  folderId?: number | null;
  reason?: string;
}

export function useUpdateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: UpdateDocumentInput): Promise<DocumentResponse> =>
      (await api.put(`/api/documents/${id}`, body)).data,
    onSuccess: (doc) => {
      qc.invalidateQueries({ queryKey: documentKeys.detail(doc.id) });
      qc.invalidateQueries({ queryKey: documentKeys.all });
    },
  });
}

export type DocumentAction =
  | "submit-for-review"
  | "submit-for-approval"
  | "reject"
  | "make-effective"
  | "obsolete";

export function useDocumentAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      id: number;
      action: DocumentAction;
      expectedVersion: number;
      reason?: string;
    }): Promise<DocumentResponse> =>
      (
        await api.post(`/api/documents/${vars.id}/${vars.action}`, {
          expectedVersion: vars.expectedVersion,
          reason: vars.reason,
        })
      ).data,
    onSuccess: (doc) => {
      qc.invalidateQueries({ queryKey: documentKeys.detail(doc.id) });
      qc.invalidateQueries({ queryKey: documentKeys.all });
      qc.invalidateQueries({ queryKey: documentKeys.audit(doc.id) });
    },
  });
}

export interface ApproveDocumentInput {
  id: number;
  expectedVersion: number;
  reason?: string;
  password: string;
  totpCode?: string;
  meaningStatement: string;
}

export function useApproveDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: ApproveDocumentInput): Promise<DocumentResponse> =>
      (await api.post(`/api/documents/${id}/approve`, body)).data,
    onSuccess: (doc) => {
      qc.invalidateQueries({ queryKey: documentKeys.detail(doc.id) });
      qc.invalidateQueries({ queryKey: documentKeys.all });
      qc.invalidateQueries({ queryKey: documentKeys.audit(doc.id) });
      qc.invalidateQueries({ queryKey: documentKeys.approvals(doc.id) });
      qc.invalidateQueries({ queryKey: documentKeys.versions(doc.id) });
    },
  });
}

export function useUploadAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { documentId: number; file: File }) => {
      const form = new FormData();
      form.append("file", vars.file);
      return (
        await api.post(`/api/attachments/Document/${vars.documentId}`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        })
      ).data;
    },
    onSuccess: (_d, vars) =>
      qc.invalidateQueries({ queryKey: ["attachments", "Document", vars.documentId] }),
  });
}

export function useDocumentAttachments(id: number) {
  return useQuery({
    queryKey: ["attachments", "Document", id],
    queryFn: async () => (await api.get(`/api/attachments/Document/${id}`)).data,
    enabled: Number.isFinite(id) && id > 0,
  });
}
