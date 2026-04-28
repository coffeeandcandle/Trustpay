const { TextractClient, AnalyzeDocumentCommand } = require('@aws-sdk/client-textract');
const { RekognitionClient, CompareFacesCommand } = require('@aws-sdk/client-rekognition');
const { supabase } = require('../config/supabase');
const { uploadToS3 } = require('../middleware/upload');

const awsConfig = {
  region: 'us-east-1',
};

const textract = new TextractClient(awsConfig);
const rekognition = new RekognitionClient(awsConfig);

// ── Textract helpers ────────────────────────────────────────────────────────

function extractKvPairs(blocks) {
  const blockMap = {};
  const keyBlocks = {};
  const valueBlocks = {};

  for (const b of blocks) {
    blockMap[b.Id] = b;
    if (b.BlockType === 'KEY_VALUE_SET') {
      if (b.EntityTypes?.includes('KEY')) keyBlocks[b.Id] = b;
      else valueBlocks[b.Id] = b;
    }
  }

  const getText = (ids = []) =>
    ids
      .map(id => blockMap[id])
      .filter(b => b?.BlockType === 'WORD')
      .map(b => b.Text)
      .join(' ');

  const pairs = {};
  for (const kb of Object.values(keyBlocks)) {
    const keyText = getText(
      kb.Relationships?.find(r => r.Type === 'CHILD')?.Ids
    ).toLowerCase().trim();

    const valueId = kb.Relationships?.find(r => r.Type === 'VALUE')?.Ids?.[0];
    const valBlock = valueBlocks[valueId];
    const valText = getText(
      valBlock?.Relationships?.find(r => r.Type === 'CHILD')?.Ids
    ).trim();

    if (keyText && valText) pairs[keyText] = valText;
  }
  return pairs;
}

function findField(pairs, ...keywords) {
  for (const kw of keywords) {
    for (const [k, v] of Object.entries(pairs)) {
      if (k.includes(kw)) return v;
    }
  }
  return '';
}

function mapToOcrData(pairs, rawLines) {
  const rawText = rawLines.join('\n');
  const dates = rawText.match(/\b(\d{2}[/\-.]\d{2}[/\-.]\d{4}|\d{4}[/\-.]\d{2}[/\-.]\d{2})\b/g) || [];

  return {
    fullName:       findField(pairs, 'name', 'surname', 'given name', 'full name') || '',
    dateOfBirth:    findField(pairs, 'birth', 'dob', 'date of birth', 'born') || dates[0] || '',
    documentNumber: findField(pairs, 'number', 'document no', 'passport no', 'licence no', 'id no', 'no.') || '',
    expiryDate:     findField(pairs, 'expir', 'valid until', 'valid thru') || dates[1] || '',
    address:        findField(pairs, 'address', 'residence', 'street', 'city') || '',
  };
}

// ── POST /api/kyc/ocr ────────────────────────────────────────────────────────
exports.processOcr = async (req, res, next) => {
  try {
    const files = req.files;
    if (!files?.length) {
      return res.status(400).json({ error: 'No document images provided' });
    }

    let allPairs = {};
    const rawLines = [];

    for (const file of files) {
      const { Blocks = [] } = await textract.send(
        new AnalyzeDocumentCommand({
          Document: { Bytes: file.buffer },
          FeatureTypes: ['FORMS', 'TABLES'],
        })
      );

      rawLines.push(
        ...Blocks.filter(b => b.BlockType === 'LINE').map(b => b.Text || '')
      );

      Object.assign(allPairs, extractKvPairs(Blocks));
    }

    res.json(mapToOcrData(allPairs, rawLines));
  } catch (err) {
    next(err);
  }
};

// ── POST /api/kyc/verify-face ────────────────────────────────────────────────
exports.verifyFace = async (req, res, next) => {
  try {
    const docFile     = req.files?.documentImage?.[0];
    const selfieFile  = req.files?.selfieImage?.[0];

    if (!docFile || !selfieFile) {
      return res.status(400).json({ error: 'documentImage and selfieImage are required' });
    }

    let result;
    try {
      result = await rekognition.send(
        new CompareFacesCommand({
          SourceImage: { Bytes: docFile.buffer },
          TargetImage: { Bytes: selfieFile.buffer },
          SimilarityThreshold: 70,
        })
      );
    } catch (rekErr) {
      // No faces detected or invalid image — treat as no match
      if (
        rekErr.name === 'InvalidParameterException' ||
        rekErr.name === 'InvalidImageException' ||
        rekErr.name === 'ImageTooLargeException'
      ) {
        return res.json({ match: false, confidence: 0, reason: rekErr.message });
      }
      throw rekErr;
    }

    const top = result.FaceMatches?.[0];
    if (top) {
      return res.json({ match: true, confidence: Math.round(top.Similarity) });
    }
    return res.json({ match: false, confidence: 0 });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/kyc/upload ─────────────────────────────────────────────────────
exports.uploadImages = async (req, res, next) => {
  try {
    const docFiles    = req.files?.documentImages || [];
    const selfieFiles = req.files?.selfieImage    || [];

    if (!docFiles.length) {
      return res.status(400).json({ error: 'At least one document image is required' });
    }
    if (!selfieFiles.length) {
      return res.status(400).json({ error: 'selfieImage is required' });
    }

    const [documentImages, selfieUrl] = await Promise.all([
      Promise.all(docFiles.map(f => uploadToS3(f, 'kyc/documents'))),
      uploadToS3(selfieFiles[0], 'kyc/selfies'),
    ]);

    res.json({ documentImages, selfieUrl });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/kyc/complete ───────────────────────────────────────────────────
// Saves full profile + KYC data in one call.
// Requires DB columns: document_type, document_number, expiry_date,
//   document_images (jsonb/text[]), selfie_url, kyc_verified (bool).
exports.completeRegistration = async (req, res, next) => {
  try {
    const profileFields = [
      'full_name', 'phone', 'company', 'city', 'emirates_id', 'passport_number',
      'plan', 'plan_selected_at', 'date_of_birth', 'address', 'gender',
      'account_type', 'country', 'how_did_you_hear', 'vat_number', 'username',
    ];
    const kycFields = [
      'document_type', 'document_number', 'expiry_date',
      'document_images', 'selfie_url', 'kyc_verified',
    ];

    const updates = {};
    for (const k of [...profileFields, ...kycFields]) {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({ error: 'No valid fields provided' });
    }

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.json(data);
  } catch (err) {
    next(err);
  }
};
