import express from 'express';
import multer from 'multer';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Configuration ────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3000', 10);
const BASE_URL = (process.env.BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || `http://localhost:5173`;
const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10);
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
]);

// ─── App Setup ────────────────────────────────────────────────────────────────
const app = express();

app.use(cors({
  origin: ALLOWED_ORIGIN,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));

// ─── Upload Directory ─────────────────────────────────────────────────────────
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ─── Multer Configuration ─────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    // Sanitize filename: keep only alphanumeric, dash, underscore, dot
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '');
    const base = path.basename(file.originalname, path.extname(file.originalname))
      .replace(/[^a-zA-Z0-9_-]/g, '-')
      .substring(0, 64);
    cb(null, `${Date.now()}-${base}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed: ${file.mimetype}`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_MB * 1024 * 1024,
    files: 1,
  },
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.post('/upload', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: `File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.` });
      }
      return res.status(400).json({ error: err.message || 'Upload failed.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    res.json({
      url: `${BASE_URL}/uploads/${req.file.filename}`,
    });
  });
});

app.use('/uploads', express.static(uploadDir));

app.get('/gallery', (_req, res) => {
  try {
    const files = fs.readdirSync(uploadDir);
    const images = files
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'].includes(ext);
      })
      .map(file => {
        const stats = fs.statSync(path.join(uploadDir, file));
        return { file, mtime: stats.mtime.getTime() };
      })
      .sort((a, b) => b.mtime - a.mtime)
      .map(f => f.file);

    const items = images.map(file => ({
      id: file,
      url: `${BASE_URL}/uploads/${file}`,
      thumbnailUrl: `${BASE_URL}/uploads/${file}`,
      title: file,
      width: 0,
      height: 0,
    }));

    res.json({ items, nextCursor: null });
  } catch (error) {
    res.status(500).json({ error: 'Failed to read gallery.' });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Server running on ${BASE_URL}`);
  console.log(`Allowed origin: ${ALLOWED_ORIGIN}`);
});
