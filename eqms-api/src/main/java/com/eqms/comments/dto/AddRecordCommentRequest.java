package com.eqms.comments.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AddRecordCommentRequest(
        @NotBlank @Size(max = 4000) String content
) {
}
