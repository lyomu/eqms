package com.eqms.documents;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@RestController
@RequestMapping("/api/document-approval-profiles")
public class DocumentApprovalProfileController {

    private final DocumentApprovalProfileRepository repository;

    public DocumentApprovalProfileController(DocumentApprovalProfileRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public List<ProfileResponse> list() {
        return repository.findByActiveTrueOrderByNameAsc().stream().map(ProfileResponse::from).toList();
    }

    @PostMapping
    @PreAuthorize("hasAuthority('DOCUMENT_CREATE')")
    public ResponseEntity<ProfileResponse> create(@Valid @RequestBody CreateProfileRequest request) {
        DocumentApprovalProfile profile = new DocumentApprovalProfile();
        profile.setName(request.name().trim());
        profile.setDescription(request.description() == null || request.description().isBlank()
                ? null : request.description().trim());
        profile.setActive(true);
        return ResponseEntity.status(HttpStatus.CREATED).body(ProfileResponse.from(repository.save(profile)));
    }

    public record CreateProfileRequest(
            @NotBlank @Size(max = 200) String name,
            @Size(max = 500) String description) {}

    public record ProfileResponse(Long id, String name, String description) {
        static ProfileResponse from(DocumentApprovalProfile profile) {
            return new ProfileResponse(profile.getId(), profile.getName(), profile.getDescription());
        }
    }
}
