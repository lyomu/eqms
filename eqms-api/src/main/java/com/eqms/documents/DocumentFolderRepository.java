package com.eqms.documents;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface DocumentFolderRepository extends JpaRepository<DocumentFolder, Long> {
    List<DocumentFolder> findAllByOrderByNameAsc();
    List<DocumentFolder> findByParentIdIsNullOrderByNameAsc();
    List<DocumentFolder> findByParentIdOrderByNameAsc(Long parentId);
}
