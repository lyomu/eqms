package com.eqms.documents;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.eqms.auth.UserPrincipal;
import com.eqms.common.ResourceNotFoundException;
import com.eqms.documents.dto.DocumentFolderResponse;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@RestController
@RequestMapping("/api/document-folders")
public class DocumentFolderController {

    private final DocumentFolderRepository folderRepository;

    public DocumentFolderController(DocumentFolderRepository folderRepository) {
        this.folderRepository = folderRepository;
    }

    /** Returns the full folder tree, roots first. */
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public List<DocumentFolderResponse> tree() {
        List<DocumentFolder> all = folderRepository.findAllByOrderByNameAsc();
        Map<Long, List<DocumentFolder>> byParent = all.stream()
                .filter(f -> f.getParentId() != null)
                .collect(Collectors.groupingBy(DocumentFolder::getParentId));
        return all.stream()
                .filter(f -> f.getParentId() == null)
                .map(f -> buildNode(f, byParent))
                .toList();
    }

    @PostMapping
    @PreAuthorize("hasAuthority('DOCUMENT_CREATE')")
    public ResponseEntity<DocumentFolderResponse> create(
            @Valid @RequestBody CreateFolderRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        DocumentFolder folder = new DocumentFolder();
        folder.setName(request.name());
        folder.setParentId(request.parentId());
        folder.setCreatedBy(principal.getId());
        folder = folderRepository.save(folder);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(DocumentFolderResponse.of(folder, List.of()));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('DOCUMENT_CREATE')")
    public DocumentFolderResponse rename(@PathVariable Long id,
                                          @Valid @RequestBody CreateFolderRequest request) {
        DocumentFolder folder = folderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Folder not found: " + id));
        folder.setName(request.name());
        folder = folderRepository.save(folder);
        return DocumentFolderResponse.of(folder, List.of());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('DOCUMENT_CREATE')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        DocumentFolder folder = folderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Folder not found: " + id));
        folderRepository.delete(folder);
        return ResponseEntity.noContent().build();
    }

    private DocumentFolderResponse buildNode(DocumentFolder folder, Map<Long, List<DocumentFolder>> byParent) {
        List<DocumentFolderResponse> children = byParent.getOrDefault(folder.getId(), List.of())
                .stream().map(child -> buildNode(child, byParent)).toList();
        return DocumentFolderResponse.of(folder, children);
    }

    public record CreateFolderRequest(
            @NotBlank @Size(max = 255) String name,
            Long parentId) {}
}
