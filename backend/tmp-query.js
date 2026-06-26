import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: 'localhost',
  port: 3307,
  user: 'root',
  password: '',
  database: 'mark_list_analysis',
});

const query = `SELECT fa.id, fa.academic_year_id, fa.study_year, fa.branch, fa.semester, fa.section, fa.subject_name, fa.subject_id,
  sub.branch as sub_branch, sub.semester as sub_semester, sub.study_year as sub_study_year,
  (SELECT COUNT(*) FROM students st INNER JOIN sections st_sec ON st.section_id = st_sec.id WHERE st.academic_year_id = fa.academic_year_id AND UPPER(TRIM(COALESCE(st.study_year, ''))) = UPPER(TRIM(COALESCE(fa.study_year, ''))) AND UPPER(TRIM(st.branch)) = UPPER(TRIM(fa.branch)) AND UPPER(TRIM(st.semester)) = UPPER(TRIM(fa.semester)) AND UPPER(TRIM(st_sec.name)) = UPPER(TRIM(fa.section))) as count_by_assignment,
  (SELECT COUNT(*) FROM students st2 INNER JOIN subjects sub_cnt ON sub_cnt.id = fa.subject_id WHERE st2.section_id = sub_cnt.section_id AND st2.academic_year_id = fa.academic_year_id AND UPPER(TRIM(st2.branch)) = UPPER(TRIM(sub_cnt.branch)) AND UPPER(TRIM(st2.semester)) = UPPER(TRIM(sub_cnt.semester)) AND UPPER(TRIM(COALESCE(st2.study_year, ''))) = UPPER(TRIM(COALESCE(sub_cnt.study_year, '')))) as count_by_subject
FROM faculty_assignments fa
LEFT JOIN subjects sub ON fa.subject_id = sub.id
LIMIT 20`;

(async () => {
  try {
    const [rows] = await pool.query(query);
    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error('QUERY ERROR:', err.message || err);
  } finally {
    await pool.end();
  }
})();
