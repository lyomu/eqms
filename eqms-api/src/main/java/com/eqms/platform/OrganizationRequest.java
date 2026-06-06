package com.eqms.platform;

public record OrganizationRequest(
        String code,
        String name,
        String legalName,
        String primaryContactName,
        String primaryContactEmail,
        String country,
        String timezone,
        String planCode
) {
    String timezoneOrDefault() {
        return timezone == null || timezone.isBlank() ? "UTC" : timezone;
    }
}
