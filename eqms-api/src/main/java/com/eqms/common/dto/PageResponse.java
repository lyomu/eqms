package com.eqms.common.dto;

import java.util.List;

import org.springframework.data.domain.Page;

/** Lightweight, shared pagination envelope (avoids serializing Spring's Page directly). */
public record PageResponse<T>(
        List<T> content,
        int page,
        int size,
        long totalElements,
        int totalPages
) {
    public static <S, T> PageResponse<T> from(Page<S> page, List<T> content) {
        return new PageResponse<>(content, page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages());
    }
}
