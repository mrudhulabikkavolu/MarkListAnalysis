import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: 'localhost',
  port: 3307,
  user: 'root',
  password: '',
  database: 'mark_list_analysis',
});

(async () => {
  try {
    const [studentGroups] = await pool.query(
      `SELECT academic_year_id, study_year, branch, semester, section_id, COUNT(*) AS cnt
       FROM students
       GROUP BY academic_year_id, study_year, branch, semester, section_id
       ORDER BY academic_year_id, branch, study_year, semester, section_id
       LIMIT 50`
    );
    console.log('STUDENT GROUPS:', JSON.stringify(studentGroups, null, 2));

    const [sections] = await pool.query(
      `SELECT id, name, branch, semester, academic_year_id
       FROM sections
       WHERE branch IN ('CSM','CSE')
       ORDER BY academic_year_id, branch, semester, name
       LIMIT 50`
    );
    console.log('SECTIONS:', JSON.stringify(sections, null, 2));
  } catch (err) {
    console.error('QUERY ERROR:', err);
  } finally {
    await pool.end();
  }
})();
