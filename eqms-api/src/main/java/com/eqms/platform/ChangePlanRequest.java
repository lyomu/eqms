package com.eqms.platform;

import java.time.OffsetDateTime;

public record ChangePlanRequest(String planCode, OffsetDateTime expiresAt) {
}
