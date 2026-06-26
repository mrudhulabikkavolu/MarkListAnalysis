import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import {
  validateCollegeEmail,
  validateFacultyId,
  normalizeFacultyId,
} from '../utils/validators.js';

const generateToken = (user, extra = {}) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role, username: user.username, ...extra },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

export const signup = async (req, res) => {
  try {
    const { username, email, password, role, facultyId } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!username || !normalizedEmail || !password || !role) {
      return res.status(400).json({ message: 'All fields are required.' });
    }
    if (!['admin', 'faculty'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role selected.' });
    }

    const emailErr = validateCollegeEmail(normalizedEmail);
    if (emailErr) return res.status(400).json({ message: emailErr });

    if (role === 'faculty') {
      const facErr = validateFacultyId(facultyId, false);
      if (facErr) return res.status(400).json({ message: facErr });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ? OR username = ?',
      [normalizedEmail, username]
    );
    if (existing.length) {
      return res.status(409).json({ message: 'Email or username already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [result] = await pool.query(
      'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [username, normalizedEmail, passwordHash, role]
    );

    let facultyDbId = null;
    let facultyCode = null;

    if (role === 'faculty') {
      facultyCode = normalizeFacultyId(facultyId);
      const [facByCode] = await pool.query('SELECT id FROM faculty WHERE faculty_code = ?', [facultyCode]);
      if (facByCode.length) {
        await pool.query(
          'UPDATE faculty SET user_id = ?, name = ?, email = ? WHERE id = ?',
          [result.insertId, username, normalizedEmail, facByCode[0].id]
        );
        facultyDbId = facByCode[0].id;
      } else {
        const [facResult] = await pool.query(
          'INSERT INTO faculty (user_id, faculty_code, name, email) VALUES (?, ?, ?, ?)',
          [result.insertId, facultyCode, username, normalizedEmail]
        );
        facultyDbId = facResult.insertId;
      }
    }

    const user = {
      id: result.insertId,
      username,
      email: normalizedEmail,
      role,
      facultyId: facultyDbId,
      facultyCode,
    };
    const token = generateToken(user, { facultyCode, facultyId: facultyDbId });

    res.status(201).json({ message: 'Account created successfully.', token, user });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ message: 'Server error during signup.' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password, role, rememberMe, facultyId } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedEmail || !password || !role) {
      return res.status(400).json({ message: 'Email, password, and role are required.' });
    }

    const emailErr = validateCollegeEmail(normalizedEmail);
    if (emailErr) return res.status(400).json({ message: emailErr });

    if (role === 'faculty' && !facultyId) {
      return res.status(400).json({ message: 'Faculty ID is required.' });
    }

    const [users] = await pool.query(
      'SELECT id, username, email, password_hash, role FROM users WHERE email = ? AND role = ?',
      [normalizedEmail, role]
    );

    if (!users.length) {
      return res.status(401).json({ message: 'Invalid credentials or role mismatch.' });
    }

    const user = users[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    let facultyDbId = null;
    let facultyCode = null;
    let facultyName = null;

    if (user.role === 'faculty') {
      facultyCode = normalizeFacultyId(facultyId);
      const [fac] = await pool.query(
        'SELECT id, name, faculty_code FROM faculty WHERE user_id = ? AND faculty_code = ?',
        [user.id, facultyCode]
      );
      if (!fac.length) {
        const [facByCode] = await pool.query(
          'SELECT id, name, faculty_code, user_id FROM faculty WHERE faculty_code = ?',
          [facultyCode]
        );
        if (!facByCode.length) {
          return res.status(401).json({ message: 'Faculty ID not found. Contact admin to upload faculty Excel.' });
        }
        if (facByCode[0].user_id && facByCode[0].user_id !== user.id) {
          return res.status(401).json({ message: 'Faculty ID is linked to another account.' });
        }
        await pool.query('UPDATE faculty SET user_id = ?, email = ? WHERE id = ?', [
          user.id,
          normalizedEmail,
          facByCode[0].id,
        ]);
        facultyDbId = facByCode[0].id;
        facultyName = facByCode[0].name;
      } else {
        facultyDbId = fac[0].id;
        facultyName = fac[0].name;
      }
    }

    const expiresIn = rememberMe ? '30d' : (process.env.JWT_EXPIRES_IN || '7d');
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        username: user.username,
        facultyId: facultyDbId,
        facultyCode,
      },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn }
    );

    res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        facultyId: facultyDbId,
        facultyCode,
        facultyName: facultyName || user.username,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login.' });
  }
};

export const getProfile = async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, username, email, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!users.length) return res.status(404).json({ message: 'User not found.' });

    let faculty = null;
    if (req.user.role === 'faculty') {
      const [fac] = await pool.query(
        'SELECT id, name, email, faculty_code FROM faculty WHERE user_id = ?',
        [req.user.id]
      );
      faculty = fac[0] || null;
    }

    res.json({ user: users[0], faculty });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
};
