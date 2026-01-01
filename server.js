
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

// 配置文件存储路径
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR);
}

// 存储文件信息的简易内存数据库 (生产环境建议使用 SQLite/JSON)
let filesDb = [];
const DB_FILE = path.join(__dirname, 'files_db.json');
if (fs.existsSync(DB_FILE)) {
  filesDb = JSON.parse(fs.readFileSync(DB_FILE));
}

const saveDb = () => fs.writeFileSync(DB_FILE, JSON.stringify(filesDb));

// 配置 Multer 存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage });

app.use(express.json());
app.use(express.static(__dirname)); // 托管前端文件
app.use('/uploads', express.static(UPLOADS_DIR)); // 托管上传的文件

// API: 获取文件列表
app.get('/api/files', (req, res) => {
  res.json(filesDb);
});

// API: 上传文件
app.post('/api/upload', upload.single('file'), (req, res) => {
  const newFile = {
    id: Math.random().toString(36).substr(2, 9),
    name: req.file.originalname,
    size: req.file.size,
    type: req.file.mimetype,
    serverPath: `/uploads/${req.file.filename}`,
    uploadDate: Date.now(),
  };
  filesDb.unshift(newFile);
  saveDb();
  res.status(201).json(newFile);
});

// API: 删除文件
app.delete('/api/files/:id', (req, res) => {
  const fileIndex = filesDb.findIndex(f => f.id === req.params.id);
  if (fileIndex !== -1) {
    const file = filesDb[fileIndex];
    const fullPath = path.join(__dirname, file.serverPath);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    filesDb.splice(fileIndex, 1);
    saveDb();
    res.status(204).end();
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

app.listen(PORT, () => {
  console.log(`极简云U盘服务器运行在 http://localhost:${PORT}`);
});
