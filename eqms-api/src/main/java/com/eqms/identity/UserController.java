package com.eqms.identity;

import java.util.Comparator;
import java.util.List;

import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.eqms.identity.dto.UserSummaryResponse;

/**
 * Read-only user directory. Any authenticated user can resolve identity names (for owner/assignee
 * display and assignment dropdowns); only non-sensitive fields are exposed (CLAUDE.md rule 8 — the
 * sensitive auth fields never leave the backend).
 */
@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public List<UserSummaryResponse> list() {
        return userRepository.findAll(Sort.by("fullName")).stream()
                .map(UserSummaryResponse::from)
                .sorted(Comparator.comparing(UserSummaryResponse::fullName, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }
}
