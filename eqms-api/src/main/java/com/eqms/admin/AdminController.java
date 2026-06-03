package com.eqms.admin;

import java.util.Map;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Minimal admin endpoint used to demonstrate and test backend-enforced authorization
 * (CLAUDE.md rule 8). Access requires the ADMIN role; a full method-security guard, not
 * UI hiding. Real admin features come in later milestones.
 */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    @GetMapping("/ping")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, String> ping() {
        return Map.of("status", "ok");
    }
}
