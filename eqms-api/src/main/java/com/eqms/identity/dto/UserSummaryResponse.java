package com.eqms.identity.dto;

import com.eqms.identity.User;

/**
 * Lightweight, read-only user directory entry. Exposes only non-sensitive identity fields
 * (never password hash, MFA secret, lockout state) so the client can resolve owner/assignee
 * names and populate assignment dropdowns.
 */
public record UserSummaryResponse(
        Long id,
        String fullName,
        String email,
        String status
) {
    public static UserSummaryResponse from(User u) {
        return new UserSummaryResponse(u.getId(), u.getFullName(), u.getEmail(), u.getStatus().name());
    }
}
