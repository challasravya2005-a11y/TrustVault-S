const db = require('./db');
const { HttpError } = require('./errors');

async function requireAuth(req, res, next) {
  try {
    if (!req.session || !req.session.userId) {
      return next(new HttpError(401, 'Authentication required'));
    }
    const user = await db.getUserById(req.session.userId);
    if (!user) {
      req.session.destroy(() => {});
      return next(new HttpError(401, 'Session is no longer valid'));
    }
    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new HttpError(403, 'You do not have permission to perform this action'));
    }
    return next();
  };
}

async function loadDocument(req, res, next) {
  try {
    const doc = await db.getDocument(req.params.id);
    if (!doc) return next(new HttpError(404, 'Document not found'));
    req.document = doc;
    return next();
  } catch (error) {
    return next(error);
  }
}

function effectiveAccess(user, document, access) {
  if (!user) return null;
  if (user.role === 'admin') return 'admin';
  if (document.owner_id === user.id) return 'owner';
  if (access) return access.permission;
  return null;
}

module.exports = { requireAuth, requireRole, loadDocument, effectiveAccess };
