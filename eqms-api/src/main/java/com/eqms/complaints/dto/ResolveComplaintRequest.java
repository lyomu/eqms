package com.eqms.complaints.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/** Document the resolution and move the complaint to RESOLVED. */
public record ResolveComplaintRequest(
        @NotNull Integer expectedVersion,
        @NotBlank String resolutionDescription,
        String reason
) {
}
