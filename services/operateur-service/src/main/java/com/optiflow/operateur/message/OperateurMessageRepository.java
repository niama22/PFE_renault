package com.optiflow.operateur.message;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface OperateurMessageRepository extends JpaRepository<OperateurMessage, UUID> {

    List<OperateurMessage> findByMissionIdOrderByCreatedAtAsc(String missionId);

    @Query("""
        SELECT m FROM OperateurMessage m
        WHERE m.id IN (
            SELECT MAX(m2.id) FROM OperateurMessage m2 GROUP BY m2.missionId
        )
        ORDER BY m.createdAt DESC
    """)
    List<OperateurMessage> findLatestPerMission();

    long countByMissionIdAndSenderAndReadAtIsNull(String missionId, MessageSender sender);
}
