const express = require('express');
const multer  = require('multer');
const { authenticate } = require('../middleware/auth');
const {
  processOcr,
  verifyFace,
  uploadImages,
  completeRegistration,
} = require('../controllers/kycController');

const router = express.Router();

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) return cb(null, true);
    cb(new Error('Only image files are accepted for KYC'), false);
  },
});

// POST /api/kyc/ocr  — send up to 2 images (passport: 1, licence: 2)
router.post(
  '/ocr',
  authenticate,
  imageUpload.array('images', 2),
  processOcr
);

// POST /api/kyc/verify-face  — fields: documentImage, selfieImage
router.post(
  '/verify-face',
  authenticate,
  imageUpload.fields([
    { name: 'documentImage', maxCount: 1 },
    { name: 'selfieImage',   maxCount: 1 },
  ]),
  verifyFace
);

// POST /api/kyc/upload  — fields: documentImages (1-2), selfieImage
router.post(
  '/upload',
  authenticate,
  imageUpload.fields([
    { name: 'documentImages', maxCount: 2 },
    { name: 'selfieImage',    maxCount: 1 },
  ]),
  uploadImages
);

// POST /api/kyc/complete  — JSON body, saves profile + KYC data
router.post('/complete', authenticate, completeRegistration);

module.exports = router;
