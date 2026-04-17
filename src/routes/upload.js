const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { upload, uploadToS3 } = require('../middleware/upload');

router.use(authenticate);

// POST /api/upload/dispute
// Body: multipart/form-data  { file: <file> }
router.post('/dispute', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }
    const url = await uploadToS3(req.file, 'disputes');
    return res.json({ url, name: req.file.originalname, size: req.file.size });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
