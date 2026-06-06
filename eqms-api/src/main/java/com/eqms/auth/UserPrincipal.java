package com.eqms.auth;

import java.util.Collection;
import java.util.List;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import com.eqms.identity.User;

/**
 * The authenticated principal stored in the security context / HTTP session.
 *
 * <p>Two shapes exist:</p>
 * <ul>
 *   <li><b>pre-auth</b> ({@link #preAuth}) — after a correct password but before the TOTP step;
 *       carries only {@code ROLE_PRE_AUTH} so it cannot reach business endpoints (MFA is mandatory).</li>
 *   <li><b>full</b> ({@link #of}) — after MFA verification; carries the user's roles
 *       ({@code ROLE_*}) and permission codes as authorities.</li>
 * </ul>
 */
public class UserPrincipal implements UserDetails {

    /** Authority held only between password success and TOTP verification. */
    public static final String PRE_AUTH_AUTHORITY = "ROLE_PRE_AUTH";

    private final Long id;
    private final Long organizationId;
    private final String email;
    private final String fullName;
    private final String passwordHash;
    private final boolean enabled;
    private final boolean accountNonLocked;
    private final Collection<? extends GrantedAuthority> authorities;

    public UserPrincipal(Long id, Long organizationId, String email, String fullName, String passwordHash,
                         boolean enabled, boolean accountNonLocked,
                         Collection<? extends GrantedAuthority> authorities) {
        this.id = id;
        this.organizationId = organizationId;
        this.email = email;
        this.fullName = fullName;
        this.passwordHash = passwordHash;
        this.enabled = enabled;
        this.accountNonLocked = accountNonLocked;
        this.authorities = authorities;
    }

    /** Full principal built from a loaded user plus its resolved authorities. */
    public static UserPrincipal of(User user, Collection<? extends GrantedAuthority> authorities) {
        return new UserPrincipal(user.getId(), user.getOrganizationId(), user.getEmail(), user.getFullName(),
                user.getPasswordHash(), user.getStatus() == User.UserStatus.ACTIVE, true, authorities);
    }

    /** Limited principal used between the password step and the TOTP step. */
    public static UserPrincipal preAuth(Long id, Long organizationId, String email, String fullName) {
        return new UserPrincipal(id, organizationId, email, fullName, null, true, true,
                List.of(new SimpleGrantedAuthority(PRE_AUTH_AUTHORITY)));
    }

    public Long getId() {
        return id;
    }

    public Long getOrganizationId() {
        return organizationId;
    }

    public String getEmail() {
        return email;
    }

    public String getFullName() {
        return fullName;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return accountNonLocked;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }
}
