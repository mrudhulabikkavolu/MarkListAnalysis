-- Mark List Analysis - MySQL Schema
CREATE DATABASE IF NOT EXISTS mark_list_analysis;
USE mark_list_analysis;

-- Users (Admin & Faculty authentication)
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'faculty') NOT NULL,
  remember_token VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_email (email),
  INDEX idx_users_role (role)
);

-- Academic Years
CREATE TABLE academic_years (
  id INT AUTO_INCREMENT PRIMARY KEY,
  year_label VARCHAR(20) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sections (name: 1, 2, 3, ... — not A, B, C)
CREATE TABLE sections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(10) NOT NULL,
  branch VARCHAR(50) NOT NULL,
  semester VARCHAR(20) NOT NULL,
  academic_year_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE,
  UNIQUE KEY uk_section (name, branch, semester, academic_year_id),
  INDEX idx_sections_branch (branch),
  INDEX idx_sections_semester (semester)
);

-- Faculty profiles
CREATE TABLE faculty (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_faculty_name (name),
  INDEX idx_faculty_user (user_id)
);

-- Subjects
CREATE TABLE subjects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  code VARCHAR(50) NOT NULL,
  branch VARCHAR(50) NOT NULL,
  semester VARCHAR(20) NOT NULL,
  section_id INT NOT NULL,
  faculty_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
  FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE SET NULL,
  UNIQUE KEY uk_subject (code, section_id),
  INDEX idx_subjects_branch (branch),
  INDEX idx_subjects_faculty (faculty_id)
);

-- Students (from Excel upload only)
CREATE TABLE students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  roll_number VARCHAR(50) NOT NULL,
  name VARCHAR(150) NOT NULL,
  academic_year_id INT NOT NULL,
  branch VARCHAR(50) NOT NULL,
  semester VARCHAR(20) NOT NULL,
  section_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE,
  FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
  UNIQUE KEY uk_student_roll (roll_number, academic_year_id),
  INDEX idx_students_branch (branch),
  INDEX idx_students_semester (semester),
  INDEX idx_students_section (section_id)
);

-- Faculty-Subject mapping (many-to-many)
CREATE TABLE faculty_subject_mapping (
  id INT AUTO_INCREMENT PRIMARY KEY,
  faculty_id INT NOT NULL,
  subject_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  UNIQUE KEY uk_faculty_subject (faculty_id, subject_id)
);

-- Submissions / Reports
CREATE TABLE submissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  faculty_id INT NOT NULL,
  subject_id INT NOT NULL,
  exam_type ENUM('mid1', 'mid2', 'lab1', 'lab2', 'final_mid', 'final_lab') NOT NULL,
  status ENUM('draft', 'submitted', 'approved') DEFAULT 'draft',
  submitted_at TIMESTAMP NULL,
  approved_at TIMESTAMP NULL,
  approved_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_submissions_status (status),
  INDEX idx_submissions_exam (exam_type)
);

-- Marks (only marks entered manually)
CREATE TABLE marks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  subject_id INT NOT NULL,
  submission_id INT NOT NULL,
  exam_type ENUM('mid1', 'mid2', 'lab1', 'lab2', 'final_mid', 'final_lab') NOT NULL,
  written_marks DECIMAL(5,2) NULL,
  assignment_marks DECIMAL(5,2) NULL,
  lab_marks DECIMAL(5,2) NULL,
  total_marks DECIMAL(5,2) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
  UNIQUE KEY uk_mark_entry (student_id, subject_id, submission_id),
  INDEX idx_marks_exam (exam_type)
);

-- Reports view alias (approved submissions tracked via submissions table)
CREATE TABLE reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  submission_id INT NOT NULL UNIQUE,
  report_data JSON NULL,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
);
