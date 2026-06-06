package com.eqms.platform;

public record PlanRequest(
        String code,
        String name,
        String description,
        Integer userLimit,
        Integer siteLimit,
        Boolean custom
) {
}
