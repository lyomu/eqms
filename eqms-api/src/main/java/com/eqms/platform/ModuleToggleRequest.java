package com.eqms.platform;

import java.time.OffsetDateTime;

public record ModuleToggleRequest(String moduleCode, OffsetDateTime expiresAt) {
}
