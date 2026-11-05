const db = require('./db');

async function record(user, action, documentId, success, details = {}) {
  try {
    await db.insertAudit({
      user_id: user ? user.id : null,
      user_email: user ? user.email : null,
      action,
      document_id: documentId || null,
      success: Boolean(success),
      details
    });
  } catch (error) {
    console.error('Unable to write audit log:', error.message);
  }
}

module.exports = { record };
