package com.eqms.auth;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "password_reset_requests")
@Getter
@Setter
public class PasswordResetRequestLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "requested_email", nullable = false, length = 320)
    private String requestedEmail;

    @Column(name = "request_ip", nullable = false, length = 80)
    private String requestIp;

    @Column(name = "user_agent", length = 500)
    private String userAgent;

    @Column(name = "requested_at", nullable = false)
    private Instant requestedAt;
}
