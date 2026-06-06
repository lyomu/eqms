package com.eqms.auth.dto;

import java.util.List;

/** Current authenticated user, for the client to render identity + drive UX-level permission hints. */
public record MeResponse(Long id, Long organizationId, String email, String fullName, List<String> authorities) {
}
