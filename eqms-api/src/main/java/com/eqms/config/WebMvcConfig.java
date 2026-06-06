package com.eqms.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import com.eqms.licensing.LicenseEnforcementInterceptor;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    private final LicenseEnforcementInterceptor licenseEnforcementInterceptor;

    public WebMvcConfig(LicenseEnforcementInterceptor licenseEnforcementInterceptor) {
        this.licenseEnforcementInterceptor = licenseEnforcementInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(licenseEnforcementInterceptor);
    }
}
