package com.eqms.oosmanagement.dto;
import com.eqms.oosmanagement.OosContainmentStatus;
import com.eqms.oosmanagement.OosHoldTarget;
public record SaveContainmentRequest(
    boolean holdRequired,
    String holdType,
    OosHoldTarget holdTarget,
    String targetReference,
    String holdReason,
    String immediateActions,
    boolean notificationIssued,
    boolean regulatoryNotificationRequired,
    boolean customerNotificationRequired,
    String notes,
    OosContainmentStatus containmentStatus
) {}
