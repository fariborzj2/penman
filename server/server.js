import express from 'express';
import multer from 'multer';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

const app = express();
app.use(cors());

// 👇 مسیر درست و ثابت
const uploadDir = path.resolve('uploads');

// 👇 اطمینان از وجود پوشه
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, '-');
    cb(null, Date.now() + '-' + safeName);
  }
});

const upload = multer({ storage });

app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  res.json({
    url: `http://localhost:3000/uploads/${req.file.filename}`
  });
});

// 👇 سرو کردن فایل‌ها از همان پوشه واقعی
app.use('/uploads', express.static(uploadDir));

app.get('/gallery', (req, res) => {
  try {
    const files = fs.readdirSync(uploadDir);
    const images = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(ext);
    });

    const items = images.map((file, index) => ({
      id: file,
      url: `http://localhost:3000/uploads/${file}`,
      thumbnailUrl: `http://localhost:3000/uploads/${file}`,
      title: file,
      width: 0,
      height: 0
    }));

    res.json({
      items: items,
      nextCursor: null
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to read gallery' });
  }
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});