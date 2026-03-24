package com.attendease.repository;

import com.attendease.entity.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CommentRepository extends JpaRepository<Comment, Long> {
    List<Comment> findByCourseIdOrderByCreatedAtDesc(Long courseId);
    List<Comment> findByMaterialIdOrderByCreatedAtAsc(Long materialId);
}
