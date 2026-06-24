package com.eqms.audits.dto;

import jakarta.validation.constraints.NotBlank;

public record CloseFindingRequest(@NotBlank String closureComments) {
}
