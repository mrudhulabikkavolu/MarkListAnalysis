import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import facultyRoutes from './routes/facultyRoutes.js';
import pool from './config/db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'], credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

let dbReady = false;

const waitForDb = async (retries = 10, delayMs = 500) => {
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query('SELECT 1');
      console.log('Database connection established');
      dbReady = true;
      return;
    } catch (err) {
      console.warn(`Database connection attempt ${i + 1} failed, retrying in ${delayMs}ms...`);
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  console.error('Unable to connect to database after multiple attempts');
};

app.use('/api', (req, res, next) => {
  if (req.path === '/health') return next();
  if (!dbReady) {
    return res.status(503).json({ message: 'Server is starting. Please wait a moment and try again.' });
  }
  return next();
});

app.get('/api/health', (req, res) => {
  if (!dbReady) {
    return res.status(503).json({ status: 'starting', message: 'Server is starting. Please wait.' });
  }
  res.json({ status: 'ok', message: 'Mark List Analysis API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/faculty', facultyRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Mark List Analysis server running on port ${PORT}`);
});

waitForDb();
