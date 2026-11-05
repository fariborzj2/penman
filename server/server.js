import express from 'express';
import multer from 'multer';
import cors from 'cors';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '127.0.0.1';
const BASE_URL = (process.env.BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:5173';
const MAX_FILE_SIZE_MB = Number(process.env.MAX_FILE_SIZE_MB || 10);
const uploadDir = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, 'uploads'));
const safeName = /^[a-f0-9]{32}\.webp$/;
const allowedFormats = new Set(['jpeg', 'png', 'gif', 'webp']);
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

fs.mkdirSync(uploadDir, { recursive: true, mode: 0o700 });
const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: ALLOWED_ORIGIN, methods: ['GET', 'POST'], allowedHeaders: ['Content-Type'] }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => cb(null, allowedMimeTypes.has(file.mimetype)),
});

app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Valid raster image required.' });
  try {
    const image = sharp(req.file.buffer, { limitInputPixels: 16_000_000, animated: false });
    const metadata = await image.metadata();
    if (!allowedFormats.has(metadata.format) || !metadata.width || !metadata.height ||
        metadata.width * metadata.height > 16_000_000) {
      return res.status(400).json({ error: 'Valid raster image required.' });
    }
    // Decode pixels and encode a new file. Never persist the submitted bytes or filename.
    const pixels = await image.rotate().webp({ quality: 85 }).toBuffer();
    const filename = `${randomBytes(16).toString('hex')}.webp`;
    await fs.promises.writeFile(path.join(uploadDir, filename), pixels, { flag: 'wx', mode: 0o600 });
    res.json({ url: `${BASE_URL}/uploads/${filename}` });
  } catch {
    res.status(400).json({ error: 'Valid raster image required.' });
  }
});

app.get('/uploads/:filename', async (req, res) => {
  const { filename } = req.params;
  if (!safeName.test(filename)) return res.sendStatus(404);
  res.set({ 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': 'sandbox', 'Cache-Control': 'public, max-age=31536000, immutable' });
  res.type('image/webp');
  res.sendFile(filename, { root: uploadDir, dotfiles: 'deny' });
});

app.get('/gallery', async (_req, res) => {
  try {
    const entries = await fs.promises.readdir(uploadDir, { withFileTypes: true });
    const files = await Promise.all(entries.filter(entry => entry.isFile() && safeName.test(entry.name))
      .map(async entry => ({ file: entry.name, mtime: (await fs.promises.stat(path.join(uploadDir, entry.name))).mtimeMs })));
    const items = files.sort((a, b) => b.mtime - a.mtime).map(({ file }) => ({
      id: file, url: `${BASE_URL}/uploads/${file}`, thumbnailUrl: `${BASE_URL}/uploads/${file}`,
      title: file, width: 0, height: 0,
    }));
    res.json({ items, nextCursor: null });
  } catch {
    res.status(500).json({ error: 'Failed to read gallery.' });
  }
});

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: `File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.` });
  }
  res.status(400).json({ error: 'Upload failed.' });
});

app.listen(PORT, HOST, () => {
  console.log(`Server running on ${HOST}:${PORT}`);
});
