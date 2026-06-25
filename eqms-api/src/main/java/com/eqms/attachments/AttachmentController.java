package com.eqms.attachments;

import java.io.IOException;
import java.util.List;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import com.eqms.auth.UserPrincipal;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Attachment upload / download / list.
 *
 * <p>Endpoints follow the pattern {@code /api/attachments/{recordType}/{recordId}} so any module
 * can attach files to any regulated record without per-module controllers.</p>
 *
 * <p>Downloads stream the object storage bytes directly to the client without buffering the
 * entire file in heap — important for large calibration certificates or batch-record PDFs.</p>
 */
@RestController
@RequestMapping("/api/attachments")
public class AttachmentController {

    private final AttachmentService service;

    public AttachmentController(AttachmentService service) {
        this.service = service;
    }

    /** List all attachments for a regulated record. */
    @GetMapping("/{recordType}/{recordId}")
    @PreAuthorize("isAuthenticated()")
    public List<AttachmentResponse> list(@PathVariable String recordType, @PathVariable String recordId) {
        return service.listForRecord(recordType, recordId).stream()
                .map(AttachmentResponse::from).toList();
    }

    /** Upload a file and attach it to a regulated record. */
    @PostMapping("/{recordType}/{recordId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<AttachmentResponse> upload(@PathVariable String recordType,
                                                     @PathVariable String recordId,
                                                     @RequestParam("file") MultipartFile file,
                                                     @RequestParam(value = "role", defaultValue = "SUPPORTING") String role,
                                                     @AuthenticationPrincipal UserPrincipal p,
                                                     HttpServletRequest http) {
        Attachment attachment = service.upload(recordType, recordId, file, role,
                p.getId(), p.getFullName(), ip(http), ua(http));
        return ResponseEntity.status(HttpStatus.CREATED).body(AttachmentResponse.from(attachment));
    }

    /** Download a single attachment by its id — streams bytes from object storage. */
    @GetMapping("/{id}/download")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<StreamingResponseBody> download(@PathVariable Long id,
                                                          @AuthenticationPrincipal UserPrincipal p,
                                                          HttpServletRequest http) {
        AttachmentService.AttachmentDownload dl = service.download(id, p.getId(), p.getFullName(),
                ip(http), ua(http));
        Attachment meta = dl.metadata();

        StreamingResponseBody body = out -> {
            try (var in = dl.stream()) {
                in.transferTo(out);
            } catch (IOException e) {
                throw new StorageException("Error streaming attachment " + id, e);
            }
        };

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + meta.getFileName() + "\"")
                .header(HttpHeaders.CONTENT_LENGTH, String.valueOf(meta.getSizeBytes()))
                .contentType(MediaType.parseMediaType(meta.getContentType()))
                .body(body);
    }

    private static String ip(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        return (forwarded != null && !forwarded.isBlank()) ? forwarded.split(",")[0].trim() : request.getRemoteAddr();
    }

    private static String ua(HttpServletRequest request) {
        return request.getHeader("User-Agent");
    }
}
