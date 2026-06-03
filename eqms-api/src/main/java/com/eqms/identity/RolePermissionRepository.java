package com.eqms.identity;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface RolePermissionRepository extends JpaRepository<RolePermission, Long> {

    /** Active permission grants for the given roles, with the permission eagerly fetched. */
    @Query("select rp from RolePermission rp join fetch rp.permission where rp.role.id in :roleIds")
    List<RolePermission> findActiveByRoleIds(@Param("roleIds") List<Long> roleIds);
}
