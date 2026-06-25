package com.eqms.oosmanagement.dto;
import com.eqms.oosmanagement.OosImpactRiskLevel;
public record SaveImpactAssessmentRequest(
    String scopeOfImpact,
    String batchesPotentiallyAffected,
    String productsPotentiallyAffected,
    boolean releasedProductImpact,
    boolean customerImpact,
    boolean regulatoryImpact,
    OosImpactRiskLevel patientSafetyRisk,
    String riskJustification,
    boolean quarantineRequired,
    boolean recallRequired,
    boolean authorityNotificationRequired,
    Long assessedById,
    String reason
) {}
