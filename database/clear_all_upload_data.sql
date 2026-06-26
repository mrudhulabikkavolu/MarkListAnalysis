-- Clears ALL upload-derived ERP data (keeps user login accounts)
USE mark_list_analysis;

SET FOREIGN_KEY_CHECKS = 0;
DELETE FROM marks;
DELETE FROM reports;
DELETE FROM submissions;
DELETE FROM faculty_subject_mapping;
DELETE FROM faculty_assignments;
DELETE FROM students;
DELETE FROM subjects;
DELETE FROM sections;
DELETE FROM academic_years;
DELETE FROM excel_uploads;
DELETE FROM faculty WHERE user_id IS NULL;
SET FOREIGN_KEY_CHECKS = 1;
