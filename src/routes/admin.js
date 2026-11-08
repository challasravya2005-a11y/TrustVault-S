const express = require('express');
const db = require('../db');
const { record } = require('../audit');
const { requireAuth, requireRole, loadDocument } = require('../middleware');
const { HttpError } = require('../errors');

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

router.get('/users', async (req, res, next) => {
  try {
    res.json({ users: await db.listUsers() });
  } catch (error) {
    next(error);
  }
});

router.patch('/users/:id', async (req, res, next) => {
  try {
    const role = String(req.body.role || '').toLowerCase();
    if (!['admin', 'uploader', 'viewer'].includes(role)) {
      throw new HttpError(400, 'Role must be admin, uploader, or viewer');
    }
    if (req.params.id === req.user.id) {
      throw new HttpError(400, 'You cannot change your own role');
    }
    const user = await db.updateUserRole(req.params.id, role);
    await record(req.user, 'EDIT', null, true, { action: 'USER_ROLE_UPDATED', target: user.email, role });
    res.json({ user, message: 'User role updated' });
  } catch (error) {
    next(error);
  }
});

router.get('/documents', async (req, res, next) => {
  try {
    res.json({ documents: await db.listDocuments({}, req.user) });
  } catch (error) {
    next(error);
  }
});

router.delete('/documents/:id', loadDocument, async (req, res, next) => {
  try {
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

module.exports = router;
