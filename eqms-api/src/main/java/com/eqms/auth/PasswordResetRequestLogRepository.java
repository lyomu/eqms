package com.eqms.auth;

import java.time.Instant;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PasswordResetRequestLogRepository extends JpaRepository<PasswordResetRequestLog, Long> {

    long countByRequestedEmailAndRequestedAtAfter(String requestedEmail, Instant requestedAfter);

    long countByRequestIpAndRequestedAtAfter(String requestIp, Instant requestedAfter);
}
