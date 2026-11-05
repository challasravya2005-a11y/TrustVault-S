const bcrypt = require('bcryptjs');
const crypto = require('crypto');

let users = [];
let documents = [];
let access = [];
let audit = [];
let files = new Map();

function reset() {
  users = [
    {
      id: crypto.randomUUID(),
      email: 'admin@trustvault.test',
      name: 'Admin User',
      role: 'admin',
      password_hash: bcrypt.hashSync('Admin@12345', 10)
    },
    {
      id: crypto.randomUUID(),
      email: 'uploader@trustvault.test',
      name: 'Uploader User',
      role: 'uploader',
      password_hash: bcrypt.hashSync('Uploader@12345', 10)
    },
    {
      id: crypto.randomUUID(),
      email: 'viewer@trustvault.test',
      name: 'Viewer User',
      role: 'viewer',
      password_hash: bcrypt.hashSync('Viewer@12345', 10)
    },
    {
      id: crypto.randomUUID(),
      email: 'other@trustvault.test',
      name: 'Other Viewer',
      role: 'viewer',
      password_hash: bcrypt.hashSync('Other@12345', 10)
    }
  ];
  documents = [];
  access = [];
  audit = [];
  files = new Map();
}

function byEmail(email) {
  return users.find((user) => user.email === String(email).toLowerCase());
}

module.exports = {
  reset,
  get state() {
    return { users, documents, access, audit, files };
  },
  async findUserByEmail(email) {
    return byEmail(email) || null;
  },
  async getUserById(id) {
    const user = users.find((item) => item.id === id);
    if (!user) return null;
    const { password_hash, ...safe } = user;
    return safe;
  },
  async listUsers() {
    return users.map(({ password_hash, ...safe }) => safe);
  },
  async updateUserRole(id, role) {
    const user = users.find((item) => item.id === id);
    user.role = role;
    const { password_hash, ...safe } = user;
    return safe;
  },
  async insertAudit(entry) {
    audit.push({ id: audit.length + 1, created_at: new Date().toISOString(), ...entry });
  },
  async listAudit() {
    return [...audit].reverse();
  },
  async insertDocument(doc) {
    const document = { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...doc };
    documents.push(document);
    return document;
  },
  async getDocument(id) {
    return documents.find((doc) => doc.id === id) || null;
  },
  async listDocuments(filters, user) {
    let rows = [...documents];
    if (user.role === 'viewer') {
      const ids = access.filter((row) => row.user_id === user.id).map((row) => row.document_id);
      rows = rows.filter((doc) => ids.includes(doc.id));
    } else if (user.role === 'uploader') {
      const ids = access.filter((row) => row.user_id === user.id).map((row) => row.document_id);
      rows = rows.filter((doc) => doc.owner_id === user.id || ids.includes(doc.id));
    }
    if (filters.name) rows = rows.filter((doc) => doc.name.toLowerCase().includes(filters.name.toLowerCase()));
    if (filters.category) rows = rows.filter((doc) => doc.category.toLowerCase().includes(filters.category.toLowerCase()));
    if (filters.owner) {
      const needle = filters.owner.toLowerCase();
      rows = rows.filter((doc) => {
        const owner = users.find((user2) => user2.id === doc.owner_id);
        return owner && (owner.name.toLowerCase().includes(needle) || owner.email.toLowerCase().includes(needle));
      });
    }
    return rows.map((doc) => ({
      ...doc,
      is_owner: doc.owner_id === user.id,
      permission: doc.owner_id === user.id ? 'owner' : (access.find((a) => a.document_id === doc.id && a.user_id === user.id) || {}).permission || null
    }));
  },
  async updateDocument(id, patch) {
    const doc = documents.find((item) => item.id === id);
    Object.assign(doc, patch, { updated_at: new Date().toISOString() });
    return doc;
  },
  async deleteDocument(id) {
    documents = documents.filter((doc) => doc.id !== id);
    access = access.filter((row) => row.document_id !== id);
  },
  async getAccess(documentId, userId) {
    return access.find((row) => row.document_id === documentId && row.user_id === userId) || null;
  },
  async listAccess(documentId) {
    return access
      .filter((row) => row.document_id === documentId)
      .map((row) => ({ ...row, user: users.find((user) => user.id === row.user_id) }));
  },
  async grantAccess(documentId, userId, permission, grantedBy) {
    const existing = access.find((row) => row.document_id === documentId && row.user_id === userId);
    if (existing) {
      existing.permission = permission;
      return existing;
    }
    const row = { id: crypto.randomUUID(), document_id: documentId, user_id: userId, permission, granted_by: grantedBy, created_at: new Date().toISOString() };
    access.push(row);
    return row;
  },
  async revokeAccess(documentId, userId) {
    access = access.filter((row) => !(row.document_id === documentId && row.user_id === userId));
  },
  async uploadFile(path, buffer, contentType) {
    files.set(path, { buffer, contentType });
    return path;
  },
  async downloadFile(path) {
    const file = files.get(path);
    if (!file) throw new Error('File not found');
    return file.buffer;
  },
  async deleteFile(path) {
    files.delete(path);
  }
};
