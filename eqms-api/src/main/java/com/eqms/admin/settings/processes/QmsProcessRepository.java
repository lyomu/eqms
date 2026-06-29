package com.eqms.admin.settings.processes;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface QmsProcessRepository extends JpaRepository<QmsProcess, Long> {

    List<QmsProcess> findByOrganizationIdOrderByNameAsc(Long organizationId);
}
