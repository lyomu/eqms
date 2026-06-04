package com.eqms.dashboard.dto;

/** A light, actionable summary of the current user's outstanding work for the home dashboard. */
public record MyWork(
        long pendingApprovals,
        long myDueDatedTasks,
        long unreadNotifications
) {
}
