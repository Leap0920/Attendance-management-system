package com.attendease.repository;

import com.attendease.entity.CourseMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CourseMessageRepository extends JpaRepository<CourseMessage, Long> {
    List<CourseMessage> findByCourseIdOrderByCreatedAtAsc(Long courseId);
    List<CourseMessage> findByCourseIdAndIsPinnedOrderByCreatedAtDesc(Long courseId, Boolean isPinned);
}
