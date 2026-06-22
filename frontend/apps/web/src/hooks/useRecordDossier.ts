"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface RecordAttachmentResponse {
  id: number;
  recordType: string;
  recordId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  sha256: string;
  uploadedBy: number | null;
  uploadedAt: string;
}

export interface RecordCommentResponse {
  id: number;
  recordType: string;
  recordId: string;
  content: string;
  createdBy: number | null;
  createdByName: string | null;
  createdAt: string;
}

export const dossierKeys = {
  attachments: (recordType: string, recordId: string | number) =>
    ["attachments", recordType, String(recordId)] as const,
  comments: (recordType: string, recordId: string | number) =>
    ["comments", recordType, String(recordId)] as const,
};

export function useRecordAttachments(recordType: string, recordId: string | number) {
  const id = String(recordId);
  return useQuery({
    queryKey: dossierKeys.attachments(recordType, id),
    queryFn: async (): Promise<RecordAttachmentResponse[]> =>
      (await api.get(`/api/attachments/${recordType}/${id}`)).data,
    enabled: Boolean(recordType) && Boolean(id),
  });
}

export function useUploadRecordAttachment(recordType: string, recordId: string | number) {
  const qc = useQueryClient();
  const id = String(recordId);
  return useMutation({
    mutationFn: async (file: File): Promise<RecordAttachmentResponse> => {
      const form = new FormData();
      form.append("file", file);
      return (
        await api.post(`/api/attachments/${recordType}/${id}`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        })
      ).data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: dossierKeys.attachments(recordType, id) }),
  });
}

export function useRecordComments(recordType: string, recordId: string | number) {
  const id = String(recordId);
  return useQuery({
    queryKey: dossierKeys.comments(recordType, id),
    queryFn: async (): Promise<RecordCommentResponse[]> =>
      (await api.get(`/api/comments/${recordType}/${id}`)).data,
    enabled: Boolean(recordType) && Boolean(id),
  });
}

export function useAddRecordComment(recordType: string, recordId: string | number) {
  const qc = useQueryClient();
  const id = String(recordId);
  return useMutation({
    mutationFn: async (content: string): Promise<RecordCommentResponse> =>
      (await api.post(`/api/comments/${recordType}/${id}`, { content })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: dossierKeys.comments(recordType, id) }),
  });
}

export function useDeleteRecordComment(recordType: string, recordId: string | number) {
  const qc = useQueryClient();
  const id = String(recordId);
  return useMutation({
    mutationFn: async (commentId: number) =>
      api.delete(`/api/comments/${recordType}/${id}/${commentId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: dossierKeys.comments(recordType, id) }),
  });
}
