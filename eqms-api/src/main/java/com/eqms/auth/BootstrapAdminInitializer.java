package com.eqms.auth;

import java.time.Clock;
import java.time.Instant;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.eqms.identity.Role;
import com.eqms.identity.RoleRepository;
import com.eqms.identity.User;
import com.eqms.identity.UserRepository;
import com.eqms.identity.UserRole;
import com.eqms.identity.UserRoleRepository;

/**
 * Creates a single bootstrap ADMIN user on startup if it does not already exist, so a freshly
 * provisioned system is usable. The password is Argon2id-hashed at runtime (never committed to
 * source); supply it via {@code EQMS_BOOTSTRAP_ADMIN_PASSWORD}. The admin is created with MFA not
 * yet enrolled — it must enroll TOTP on first login, like everyone else.
 *
 * <p>Roles/permissions themselves are seeded declaratively by Liquibase (v004); only the admin
 * <em>user</em> is created here because its password must be hashed at runtime.</p>
 */
@Component
public class BootstrapAdminInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(BootstrapAdminInitializer.class);

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final PasswordEncoder passwordEncoder;
    private final Clock clock;

    @Value("${eqms.bootstrap.admin-email:admin@eqms.local}")
    private String adminEmail;

    @Value("${eqms.bootstrap.admin-username:admin}")
    private String adminUsername;

    @Value("${EQMS_BOOTSTRAP_ADMIN_PASSWORD:ChangeMe!Admin123}")
    private String adminPassword;

    public BootstrapAdminInitializer(UserRepository userRepository, RoleRepository roleRepository,
                                     UserRoleRepository userRoleRepository, PasswordEncoder passwordEncoder,
                                     Clock utcClock) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.userRoleRepository = userRoleRepository;
        this.passwordEncoder = passwordEncoder;
        this.clock = utcClock;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (userRepository.findByEmail(adminEmail).isPresent()) {
            return; // already bootstrapped
        }
        Role adminRole = roleRepository.findByName("ADMIN")
                .orElseThrow(() -> new IllegalStateException("ADMIN role not seeded (check Liquibase v004)"));

        User admin = new User();
        admin.setEmail(adminEmail);
        admin.setUsername(adminUsername);
        admin.setFullName("System Administrator");
        admin.setPasswordHash(passwordEncoder.encode(adminPassword));
        admin.setMfaEnabled(false);
        admin.setStatus(User.UserStatus.ACTIVE);
        admin = userRepository.save(admin);

        UserRole assignment = new UserRole();
        assignment.setUser(admin);
        assignment.setRole(adminRole);
        assignment.setGrantedAt(Instant.now(clock));
        userRoleRepository.save(assignment);

        log.info("Bootstrap admin user created: {} (must enroll MFA on first login)", adminEmail);
    }
}
