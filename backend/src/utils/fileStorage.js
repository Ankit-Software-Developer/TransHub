// src/utils/fileStorage.js
const fs = require('fs');
const path = require('path');
const multer = require('multer');

// Root uploads folder: backend/uploads
const UPLOAD_ROOT = path.resolve(__dirname, '../../uploads');

// Ensure root and subfolders exist
const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Map MIME types to common extensions
const MIME_EXTENSIONS = {
  'image/jpeg': '.jpg',
  'image/pjpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'application/pdf': '.pdf',
};

/**
 * Saves a base64 Data URL to a disk file in /uploads/{folder}
 * Returns the public web URL path (e.g. /uploads/pods/pod_1728472918_a1b2c3.jpg)
 * If input is already a URL or empty, it returns the input unchanged.
 */
const saveMediaFile = async (dataString, folder = 'pods', prefix = 'pod') => {
  if (!dataString || typeof dataString !== 'string') {
    return '';
  }

  const trimmed = dataString.trim();

  // If already a regular relative or absolute URL, return as-is
  if (!trimmed.startsWith('data:')) {
    return trimmed;
  }

  try {
    const match = trimmed.match(/^data:([a-zA-Z0-9\/\-+.]+);base64,(.+)$/);
    if (!match) {
      return trimmed;
    }

    const mimeType = match[1].toLowerCase();
    const base64Data = match[2];
    const ext = MIME_EXTENSIONS[mimeType] || '.jpg';

    const targetDir = path.join(UPLOAD_ROOT, folder);
    ensureDir(targetDir);

    const filename = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}${ext}`;
    const filePath = path.join(targetDir, filename);

    const buffer = Buffer.from(base64Data, 'base64');
    await fs.promises.writeFile(filePath, buffer);

    // Return the clean public URL path (served by express.static('/uploads'))
    return `/uploads/${folder}/${filename}`;
  } catch (err) {
    console.error(`[fileStorage] Error saving base64 to /uploads/${folder}:`, err.message);
    return trimmed;
  }
};

/**
 * Multer storage instance configured for specific upload category
 */
const getMulterUploader = (folder = 'pods', maxSizeBytes = 10 * 1024 * 1024) => {
  const targetDir = path.join(UPLOAD_ROOT, folder);
  ensureDir(targetDir);

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      ensureDir(targetDir);
      cb(null, targetDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      const cleanName = `${folder}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}${ext}`;
      cb(null, cleanName);
    },
  });

  return multer({
    storage,
    limits: { fileSize: maxSizeBytes },
    fileFilter: (req, file, cb) => {
      const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf'];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, WEBP and PDF documents are allowed.'));
      }
    },
  });
};

module.exports = {
  saveMediaFile,
  getMulterUploader,
  UPLOAD_ROOT,
};
