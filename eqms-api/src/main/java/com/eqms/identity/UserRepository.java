package com.eqms.identity;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    Optional<User> findByUsername(String username);

    /**
     * Active users who hold the given permission code through any of their (non-revoked) roles.
     * Used to target notifications at "reviewers" / "approvers" by authority (M10).
     */
    @Query("""
            select distinct u from User u
            join UserRole ur on ur.user = u
            join RolePermission rp on rp.role = ur.role
            where rp.permission.code = :permissionCode
              and u.status = com.eqms.identity.User$UserStatus.ACTIVE
            """)
    List<User> findActiveByPermissionCode(@Param("permissionCode") String permissionCode);
}
