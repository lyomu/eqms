package com.eqms.identity;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRoleRepository extends JpaRepository<UserRole, Long> {

    /** Active (non-revoked) role assignments for a user, with the role eagerly fetched. */
    @Query("select ur from UserRole ur join fetch ur.role where ur.user.id = :userId")
    List<UserRole> findActiveByUserId(@Param("userId") Long userId);
}
