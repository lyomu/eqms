package com.eqms.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;

import jakarta.servlet.http.HttpServletResponse;

/**
 * Central Spring Security configuration (CLAUDE.md compliance rule 8 — authorization is enforced
 * on the backend).
 *
 * <ul>
 *   <li><b>Password hashing</b>: Argon2id ({@link Argon2PasswordEncoder}, backed by BouncyCastle).</li>
 *   <li><b>Sessions</b>: stateful server-side session + HttpOnly cookie; idle timeout is configured
 *       via {@code server.servlet.session.timeout}. The {@link SecurityContextRepository} is the
 *       HTTP-session one so the authenticated context survives across requests.</li>
 *   <li><b>Method security</b>: {@code @EnableMethodSecurity} activates {@code @PreAuthorize} guards
 *       on REST endpoints.</li>
 * </ul>
 *
 * <p><b>CSRF</b> is disabled for now: the API is consumed by tests and (later) the Next.js client.
 * Before the web client ships, CSRF protection (token + SameSite cookie) must be enabled — tracked
 * as a Milestone-1.x follow-up.</p>
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    /** Argon2id password encoder (compliance: strong, memory-hard hashing). */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8();
    }

    /** Persists the authenticated {@code SecurityContext} in the HTTP session. */
    @Bean
    public SecurityContextRepository securityContextRepository() {
        return new HttpSessionSecurityContextRepository();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http,
                                                   SecurityContextRepository securityContextRepository)
            throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(reg -> reg
                        // Public: the first leg of login, and health probes.
                        .requestMatchers("/api/auth/login").permitAll()
                        .requestMatchers("/api/platform/auth/login").permitAll()
                        .requestMatchers("/actuator/health", "/actuator/info").permitAll()
                        // Everything else (incl. MFA step, /me, business endpoints) requires a session.
                        .anyRequest().authenticated())
                .securityContext(sc -> sc.securityContextRepository(securityContextRepository))
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
                .exceptionHandling(eh -> eh.authenticationEntryPoint(
                        (request, response, ex) -> response.sendError(HttpServletResponse.SC_UNAUTHORIZED)))
                .httpBasic(basic -> basic.disable())
                .formLogin(form -> form.disable())
                .logout(logout -> logout.disable());
        return http.build();
    }
}
