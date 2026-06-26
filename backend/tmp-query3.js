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
    const [rows] = await pool.query(
      `SELECT academic_year_id, study_year, branch, semester, section_id, COUNT(*) AS cnt
       FROM students
       WHERE academic_year_id = 11 AND branch = 'CSM' AND semester = '1' AND study_year IN ('2','4')
       GROUP BY academic_year_id, study_year, branch, semester, section_id
       ORDER BY study_year, section_id`
    );
    console.log('CSM 11 / year 2/4 Students:', JSON.stringify(rows, null, 2));

    const [sections] = await pool.query(
      `SELECT id, name, branch, semester, academic_year_id
       FROM sections
       WHERE academic_year_id = 11 AND branch = 'CSM' AND semester = '1'
       ORDER BY name`
    );
    console.log('CSM 11 Sections:', JSON.stringify(sections, null, 2));
  } catch (err) {
    console.error('QUERY ERROR:', err);
  } finally {
    await pool.end();
  }
})();
