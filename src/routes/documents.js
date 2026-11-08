const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const db = require('../db');
const { record } = require('../audit');
const { requireAuth, loadDocument, effectiveAccess } = require('../middleware');
const { HttpError } = require('../errors');

const router = express.Router();
const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(['application/pdf', 'image/jpeg', 'image/png', 'text/plain']);
const ALLOWED_EXT = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.txt']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE, files: 1 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (ALLOWED_MIME.has(file.mimetype) && ALLOWED_EXT.has(ext)) {
      return cb(null, true);
    }
    return cb(new HttpError(400, 'Only PDF, JPG, PNG, and TXT files are allowed'));
  }
});

function cleanText(value, maxLength = 120) {
  return String(value || '').replace(/[<>]/g, '').trim().slice(0, maxLength);
}

function canRead(access) {
  return access === 'owner' || access === 'admin' || access === 'read' || access === 'edit';
}

function canEdit(access) {
  return access === 'owner' || access === 'admin' || access === 'edit';
}

async function accessFor(req, document) {
  const accessRow = await db.getAccess(document.id, req.user.id);
  return effectiveAccess(req.user, document, accessRow);
}

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const filters = {
      name: cleanText(req.query.name, 100),
      owner: cleanText(req.query.owner, 100),
      category: cleanText(req.query.category, 60),
      from: req.query.from || null,
      to: req.query.to || null
    };
    const documents = await db.listDocuments(filters, req.user);
    res.json({ documents });
  } catch (error) {
    next(error);
  }
});

router.post('/', requireAuth, upload.single('file'), async (req, res, next) => {
  try {
    const file = req.file;
    const name = cleanText(req.body.name, 120);
    const category = cleanText(req.body.category, 60) || 'General';

    if (!file) throw new HttpError(400, 'A document file is required');
    if (!name) throw new HttpError(400, 'Document name is required');
    if (file.size > MAX_SIZE) throw new HttpError(400, 'File exceeds the 5 MB limit');

    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${req.user.id}/${crypto.randomUUID()}-${safeName}`;
    await db.uploadFile(storagePath, file.buffer, file.mimetype);

    const doc = await db.insertDocument({
      owner_id: req.user.id,
      name,
      category,
      storage_path: storagePath,
      mime_type: file.mimetype,
      size_bytes: file.size
    });

    await record(req.user, 'UPLOAD', doc.id, true, { name, category, size: file.size });
    res.status(201).json({ document: doc, message: 'Document uploaded successfully' });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', requireAuth, loadDocument, async (req, res, next) => {
  try {
    const access = await accessFor(req, req.document);
    if (!canRead(access)) {
      await record(req.user, 'VIEW', req.document.id, false, { reason: 'Access denied' });
      throw new HttpError(403, 'You do not have access to this document');
    }
    await record(req.user, 'VIEW', req.document.id, true, {});
    res.json({ document: { ...req.document, permission: access } });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/download', requireAuth, loadDocument, async (req, res, next) => {
  try {
    const access = await accessFor(req, req.document);
    if (!canRead(access)) {
      await record(req.user, 'DOWNLOAD', req.document.id, false, { reason: 'Access denied' });
      throw new HttpError(403, 'You do not have permission to download this document');
    }
    const buffer = await db.downloadFile(req.document.storage_path);
    await record(req.user, 'DOWNLOAD', req.document.id, true, {});
    res.setHeader('Content-Type', req.document.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${req.document.name.replace(/"/g, '')}"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', requireAuth, loadDocument, upload.single('file'), async (req, res, next) => {
  try {
    const access = await accessFor(req, req.document);
    if (!canEdit(access)) {
      await record(req.user, 'EDIT', req.document.id, false, { reason: 'Edit permission denied' });
      throw new HttpError(403, 'You do not have permission to edit this document');
    }

    const patch = {};
    if (req.body.name !== undefined) {
      const name = cleanText(req.body.name, 120);
      if (!name) throw new HttpError(400, 'Document name cannot be empty');
      patch.name = name;
    }
    if (req.body.category !== undefined) patch.category = cleanText(req.body.category, 60) || 'General';

    if (req.file) {
      if (req.file.size > MAX_SIZE) throw new HttpError(400, 'File exceeds the 5 MB limit');
      const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${req.document.owner_id}/${crypto.randomUUID()}-${safeName}`;
      await db.uploadFile(storagePath, req.file.buffer, req.file.mimetype);
      await db.deleteFile(req.document.storage_path).catch(() => {});
      patch.storage_path = storagePath;
      patch.mime_type = req.file.mimetype;
      patch.size_bytes = req.file.size;
    }

    if (!Object.keys(patch).length) throw new HttpError(400, 'Nothing to update');

    const updated = await db.updateDocument(req.document.id, patch);
    await record(req.user, 'EDIT', req.document.id, true, { fields: Object.keys(patch) });
    res.json({ document: updated, message: 'Document updated successfully' });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', requireAuth, loadDocument, async (req, res, next) => {
  try {
    const access = await accessFor(req, req.document);
    if (access !== 'owner' && access !== 'admin') {
      await record(req.user, 'DELETE', req.document.id, false, { reason: 'Delete permission denied' });
      throw new HttpError(403, 'Only the owner or an administrator can delete this document');
    }
    await db.deleteFile(req.document.storage_path).catch(() => {});
await db.deleteDocument(req.document.id);

await record(req.user, 'DELETE', null, true, {
  deleted_document_id: req.document.id,
  document_name: req.document.name
});

res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/access', requireAuth, loadDocument, async (req, res, next) => {
  try {
    const access = await accessFor(req, req.document);
    if (access !== 'owner' && access !== 'admin') {
      throw new HttpError(403, 'Only the owner or an administrator can view sharing settings');
    }
    res.json({ access: await db.listAccess(req.document.id) });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/access', requireAuth, loadDocument, async (req, res, next) => {
  try {
    const access = await accessFor(req, req.document);
    if (access !== 'owner' && access !== 'admin') {
      await record(req.user, 'SHARE', req.document.id, false, { reason: 'Share permission denied' });
      throw new HttpError(403, 'Only the owner or an administrator can share this document');
    }

    const email = String(req.body.email || '').trim().toLowerCase();
    const permission = String(req.body.permission || '').toLowerCase();
    if (!['read', 'edit'].includes(permission)) {
      throw new HttpError(400, 'Permission must be read or edit');
    }

    const target = await db.findUserByEmail(email);
    if (!target) throw new HttpError(404, 'User not found');
    if (target.id === req.document.owner_id) throw new HttpError(400, 'The owner already has full access');

    await db.grantAccess(req.document.id, target.id, permission, req.user.id);
    await record(req.user, 'SHARE', req.document.id, true, { shared_with: email, permission });
    res.status(201).json({ message: `Granted ${permission} access to ${email}` });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id/access/:userId', requireAuth, loadDocument, async (req, res, next) => {
  try {
    const access = await accessFor(req, req.document);
    if (access !== 'owner' && access !== 'admin') {
      await record(req.user, 'REVOKE', req.document.id, false, { reason: 'Revoke permission denied' });
      throw new HttpError(403, 'Only the owner or an administrator can revoke access');
    }
    await db.revokeAccess(req.document.id, req.params.userId);
    await record(req.user, 'REVOKE', req.document.id, true, { revoked_user_id: req.params.userId });
    res.json({ message: 'Access revoked successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
