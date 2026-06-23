package com.eqms.deviations.dto;

import java.time.Instant;
import java.time.LocalDate;

import com.eqms.deviations.DeviationCategory;
import com.eqms.deviations.DeviationRiskLevel;
import com.eqms.deviations.DeviationSeverity;
import com.eqms.deviations.DeviationType;

import jakarta.validation.constraints.NotNull;

public record UpdateDeviationDetailsRequest(
        @NotNull Integer expectedVersion,
        String title,
        String description,
        DeviationType deviationType,
        DeviationCategory category,
        String relatedModule,
        String department,
        String site,
        String location,
        Instant dateDiscovered,
        Instant dateReported,
        Long reportedById,
        Long ownerId,
        Long qaOwnerId,
        DeviationSeverity severity,
        DeviationRiskLevel initialRiskLevel,
        String whatHappened,
        String whereHappened,
        String howDetected,
        String whoInvolved,
        String immediateAction,
        Boolean productAffected,
        Boolean materialAffected,
        Boolean batchAffected,
        Boolean equipmentAffected,
        Boolean supplierInvolved,
        Boolean customerImpactPossible,
        Boolean regulatoryImpactPossible,
        Boolean dataIntegrityImpactPossible,
        Boolean containmentRequired,
        Boolean investigationRequired,
        Boolean capaRequired,
        Boolean changeControlRequired,
        LocalDate targetInvestigationDueDate,
        LocalDate targetClosureDueDate,
        String reason
) {
}
