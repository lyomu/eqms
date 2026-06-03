package com.eqms.auth;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.eqms.identity.RolePermission;
import com.eqms.identity.RolePermissionRepository;
import com.eqms.identity.User;
import com.eqms.identity.UserRepository;
import com.eqms.identity.UserRole;
import com.eqms.identity.UserRoleRepository;

/**
 * Loads a {@link UserPrincipal} (with resolved role + permission authorities) for the full,
 * post-MFA session. Roles map to {@code ROLE_<name>} authorities; permissions map to their code.
 */
@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final RolePermissionRepository rolePermissionRepository;

    public CustomUserDetailsService(UserRepository userRepository,
                                    UserRoleRepository userRoleRepository,
                                    RolePermissionRepository rolePermissionRepository) {
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
        this.rolePermissionRepository = rolePermissionRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("No user for email: " + email));
        return UserPrincipal.of(user, loadAuthorities(user.getId()));
    }

    /** Resolve a user's authorities from their active roles and those roles' permissions. */
    @Transactional(readOnly = true)
    public Collection<GrantedAuthority> loadAuthorities(Long userId) {
        Set<GrantedAuthority> authorities = new HashSet<>();
        List<Long> roleIds = new ArrayList<>();

        for (UserRole userRole : userRoleRepository.findActiveByUserId(userId)) {
            authorities.add(new SimpleGrantedAuthority("ROLE_" + userRole.getRole().getName()));
            roleIds.add(userRole.getRole().getId());
        }
        if (!roleIds.isEmpty()) {
            for (RolePermission rolePermission : rolePermissionRepository.findActiveByRoleIds(roleIds)) {
                authorities.add(new SimpleGrantedAuthority(rolePermission.getPermission().getCode()));
            }
        }
        return authorities;
    }
}
