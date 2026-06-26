-- Run after schema.sql (GVPCEW ERP modifications)
USE mark_list_analysis;

ALTER TABLE faculty
  ADD COLUMN faculty_code VARCHAR(20) NULL UNIQUE AFTER id,
  ADD INDEX idx_faculty_code (faculty_code);

ALTER TABLE students
  ADD COLUMN study_year VARCHAR(10) NOT NULL DEFAULT '1' AFTER academic_year_id,
  ADD COLUMN upload_id INT NULL AFTER section_id,
  ADD INDEX idx_students_mapping (academic_year_id, study_year, branch, semester, section_id);

ALTER TABLE subjects
  ADD COLUMN study_year VARCHAR(10) NOT NULL DEFAULT '1' AFTER semester;

CREATE TABLE IF NOT EXISTS excel_uploads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  upload_type ENUM('student', 'faculty') NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_hash VARCHAR(64) NOT NULL,
  academic_year VARCHAR(30) NULL,
  row_count INT DEFAULT 0,
  uploaded_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uk_upload_dedup (upload_type, file_hash)
);

ALTER TABLE students
  ADD CONSTRAINT fk_students_upload FOREIGN KEY (upload_id) REFERENCES excel_uploads(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS faculty_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  upload_id INT NULL,
  academic_year_id INT NOT NULL,
  study_year VARCHAR(10) NOT NULL,
  branch VARCHAR(50) NOT NULL,
  semester VARCHAR(20) NOT NULL,
  section VARCHAR(10) NOT NULL,
  faculty_db_id INT NOT NULL,
  faculty_code VARCHAR(20) NOT NULL,
  faculty_name VARCHAR(150) NOT NULL,
  subject_name VARCHAR(150) NOT NULL,
  subject_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (upload_id) REFERENCES excel_uploads(id) ON DELETE CASCADE,
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE,
  FOREIGN KEY (faculty_db_id) REFERENCES faculty(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
  UNIQUE KEY uk_faculty_assignment (academic_year_id, study_year, branch, semester, section, faculty_code, subject_name)
);
