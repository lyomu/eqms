package com.eqms.comments;

import java.util.List;

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
import org.springframework.web.bind.annotation.RestController;

import com.eqms.auth.UserPrincipal;
import com.eqms.comments.dto.AddRecordCommentRequest;
import com.eqms.comments.dto.RecordCommentResponse;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/comments")
public class RecordCommentController {
    private final RecordCommentService service;

    public RecordCommentController(RecordCommentService service) {
        this.service = service;
    }

    @GetMapping("/{recordType}/{recordId}")
    @PreAuthorize("isAuthenticated()")
    public List<RecordCommentResponse> list(@PathVariable String recordType, @PathVariable String recordId) {
        return service.list(recordType, recordId).stream().map(RecordCommentResponse::from).toList();
    }

    @PostMapping("/{recordType}/{recordId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<RecordCommentResponse> add(@PathVariable String recordType,
                                                     @PathVariable String recordId,
                                                     @Valid @RequestBody AddRecordCommentRequest request,
                                                     @AuthenticationPrincipal UserPrincipal principal,
                                                     HttpServletRequest http) {
        RecordComment comment = service.add(recordType, recordId, request.content(),
                principal.getId(), principal.getFullName(), ip(http), ua(http));
        return ResponseEntity.status(HttpStatus.CREATED).body(RecordCommentResponse.from(comment));
    }

    @DeleteMapping("/{recordType}/{recordId}/{commentId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> delete(@PathVariable String recordType,
                                       @PathVariable String recordId,
                                       @PathVariable Long commentId,
                                       @AuthenticationPrincipal UserPrincipal principal,
                                       HttpServletRequest http) {
        service.delete(recordType, recordId, commentId, principal.getId(), principal.getFullName(), ip(http), ua(http));
        return ResponseEntity.noContent().build();
    }

    private static String ip(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        return (forwarded != null && !forwarded.isBlank()) ? forwarded.split(",")[0].trim() : request.getRemoteAddr();
    }

    private static String ua(HttpServletRequest request) {
        return request.getHeader("User-Agent");
    }
}
