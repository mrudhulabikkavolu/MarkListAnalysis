/** Delete all ERP data from uploads (keeps users table) */
export const purgeAllUploadData = async (conn) => {
  await conn.query('SET FOREIGN_KEY_CHECKS = 0');
  const tables = [
    'marks',
    'reports',
    'submissions',
    'faculty_subject_mapping',
    'faculty_assignments',
    'students',
    'subjects',
    'sections',
    'academic_years',
    'excel_uploads',
  ];
  for (const table of tables) {
    try {
      await conn.query(`DELETE FROM ${table}`);
    } catch (e) {
      if (e.code !== 'ER_NO_SUCH_TABLE') throw e;
    }
  }
  try {
    await conn.query('DELETE FROM faculty WHERE user_id IS NULL');
  } catch {
    await conn.query('UPDATE faculty SET user_id = NULL');
  }
  await conn.query('SET FOREIGN_KEY_CHECKS = 1');
};

export const deleteSubjectsCascade = async (conn, subjectIds) => {
  if (!subjectIds.length) return;
  const ph = subjectIds.map(() => '?').join(',');
  await conn.query(
    `DELETE m FROM marks m INNER JOIN submissions sub ON m.submission_id = sub.id WHERE sub.subject_id IN (${ph})`,
    subjectIds
  );
  await conn.query(`DELETE FROM reports WHERE submission_id IN (SELECT id FROM submissions WHERE subject_id IN (${ph}))`, subjectIds);
  await conn.query(`DELETE FROM submissions WHERE subject_id IN (${ph})`, subjectIds);
  await conn.query(`DELETE FROM faculty_subject_mapping WHERE subject_id IN (${ph})`, subjectIds);
  await conn.query(`DELETE FROM subjects WHERE id IN (${ph})`, subjectIds);
};
