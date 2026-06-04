package com.eqms.notifications;

import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.eqms.auth.UserPrincipal;
import com.eqms.common.dto.PageResponse;
import com.eqms.notifications.dto.CreateNotificationRequest;
import com.eqms.notifications.dto.NotificationResponse;

import jakarta.validation.Valid;

/**
 * Notification REST API. Recipients see and manage only their own notifications; ownership is
 * enforced in the service layer (CLAUDE.md rule 8 — backend authorization).
 */
@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService service;

    public NotificationController(NotificationService service) {
        this.service = service;
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<NotificationResponse> create(@Valid @RequestBody CreateNotificationRequest request) {
        Notification n = service.create(request.recipientUserId(), request.type(), request.title(),
                request.message(), request.recordType(), request.recordId());
        return ResponseEntity.status(HttpStatus.CREATED).body(NotificationResponse.from(n));
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public PageResponse<NotificationResponse> list(@RequestParam(defaultValue = "false") boolean unreadOnly,
                                                   @AuthenticationPrincipal UserPrincipal principal,
                                                   Pageable pageable) {
        Page<Notification> page = service.list(principal.getId(), unreadOnly, pageable);
        return PageResponse.from(page, page.getContent().stream().map(NotificationResponse::from).toList());
    }

    @GetMapping("/unread-count")
    @PreAuthorize("isAuthenticated()")
    public Map<String, Long> unreadCount(@AuthenticationPrincipal UserPrincipal principal) {
        return Map.of("unread", service.unreadCount(principal.getId()));
    }

    @PostMapping("/{id}/mark-read")
    @PreAuthorize("isAuthenticated()")
    public NotificationResponse markRead(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal principal) {
        return NotificationResponse.from(service.markRead(id, principal.getId()));
    }

    @PostMapping("/mark-all-read")
    @PreAuthorize("isAuthenticated()")
    public Map<String, Integer> markAllRead(@AuthenticationPrincipal UserPrincipal principal) {
        return Map.of("updated", service.markAllRead(principal.getId()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> delete(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal principal) {
        service.delete(id, principal.getId());
        return ResponseEntity.noContent().build();
    }
}
