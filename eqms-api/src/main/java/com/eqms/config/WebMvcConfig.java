package com.eqms.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import com.eqms.licensing.LicenseEnforcementInterceptor;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    private final LicenseEnforcementInterceptor licenseEnforcementInterceptor;
    private final boolean licenseInterceptorEnabled;

    public WebMvcConfig(LicenseEnforcementInterceptor licenseEnforcementInterceptor,
                        @Value("${eqms.licensing.interceptor.enabled:true}") boolean licenseInterceptorEnabled) {
        this.licenseEnforcementInterceptor = licenseEnforcementInterceptor;
        this.licenseInterceptorEnabled = licenseInterceptorEnabled;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        if (licenseInterceptorEnabled) {
            registry.addInterceptor(licenseEnforcementInterceptor);
        }
    }
}
