package com.optiflow.operateur.order;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface OrderRepository extends JpaRepository<Order, UUID> {

    Page<Order> findByStatus(OrderStatus status, Pageable pageable);

    Page<Order> findByClientCode(String clientCode, Pageable pageable);

    Page<Order> findByStatusAndClientCode(OrderStatus status, String clientCode, Pageable pageable);

    List<Order> findByTourneeId(UUID tourneeId);

    List<Order> findByStatusAndTourneeIdIsNull(OrderStatus status);

    long countByStatus(OrderStatus status);

    @Query("SELECT COUNT(o) FROM Order o WHERE o.orderNumber LIKE :prefix%")
    long countByOrderNumberPrefix(@Param("prefix") String prefix);

    boolean existsByIdAndTourneeIdIsNull(UUID id);
}
