package com.eqms.platform.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class PlatformAdminBootstrapInitializer implements ApplicationRunner {

    private final PlatformAuthService authService;

    @Value("${eqms.platform.admin-email:platform@eqms.local}")
    private String email;

    @Value("${eqms.platform.admin-name:Platform Administrator}")
    private String fullName;

    @Value("${EQMS_PLATFORM_ADMIN_PASSWORD:ChangeMe!Platform123}")
    private String password;

    public PlatformAdminBootstrapInitializer(PlatformAuthService authService) {
        this.authService = authService;
    }

    @Override
    public void run(ApplicationArguments args) {
        authService.createBootstrapAdmin(email, fullName, password);
    }
}
