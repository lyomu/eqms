package com.eqms.auth;

import java.util.Optional;

import org.springframework.data.domain.AuditorAware;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/**
 * Supplies the acting user id for JPA auditing ({@code @CreatedBy}/{@code @LastModifiedBy}),
 * resolving it from the authenticated Spring Security principal. Replaces the Milestone 0 stub.
 *
 * <p>Returns empty when there is no authenticated {@link UserPrincipal} (e.g. system bootstrap,
 * or the unauthenticated login request), in which case the audit columns are left null.</p>
 */
@Component
public class SecurityAuditorAware implements AuditorAware<Long> {

    @Override
    public Optional<Long> getCurrentAuditor() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return Optional.empty();
        }
        if (authentication.getPrincipal() instanceof UserPrincipal principal) {
            return Optional.ofNullable(principal.getId());
        }
        return Optional.empty();
    }
}
