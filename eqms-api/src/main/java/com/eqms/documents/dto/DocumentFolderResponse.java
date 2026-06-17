package com.eqms.documents.dto;

import java.util.List;

import com.eqms.documents.DocumentFolder;

public record DocumentFolderResponse(
        Long id,
        String name,
        Long parentId,
        List<DocumentFolderResponse> children
) {
    public static DocumentFolderResponse of(DocumentFolder f, List<DocumentFolderResponse> children) {
        return new DocumentFolderResponse(f.getId(), f.getName(), f.getParentId(), children);
    }
}
