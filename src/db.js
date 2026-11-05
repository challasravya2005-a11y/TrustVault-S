const { createClient } = require('@supabase/supabase-js');
const { HttpError } = require('./errors');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'documents';

function fail(error) {
  throw new HttpError(500, error.message || 'Database error');
}

async function findUserByEmail(email) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', String(email).toLowerCase())
    .maybeSingle();
  if (error) fail(error);
  return data;
}

async function getUserById(id) {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, role, created_at')
    .eq('id', id)
    .maybeSingle();
  if (error) fail(error);
  return data;
}

async function listUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, role, created_at')
    .order('created_at', { ascending: false });
  if (error) fail(error);
  return data || [];
}

async function updateUserRole(id, role) {
  const { data, error } = await supabase
    .from('users')
    .update({ role })
    .eq('id', id)
    .select('id, email, name, role')
    .single();
  if (error) fail(error);
  return data;
}

async function insertAudit(entry) {
  const { error } = await supabase.from('audit_logs').insert(entry);
  if (error) {
    console.error('Audit write failed:', error.message);
  }
}

async function listAudit(filters = {}) {
  let query = supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);
  if (filters.action) query = query.eq('action', filters.action);
  if (filters.success !== undefined && filters.success !== '') {
    query = query.eq('success', filters.success === 'true');
  }
  if (filters.email) query = query.ilike('user_email', `%${filters.email}%`);
  const { data, error } = await query;
  if (error) fail(error);
  return data || [];
}

async function insertDocument(doc) {
  const { data, error } = await supabase
    .from('documents')
    .insert(doc)
    .select('*')
    .single();
  if (error) fail(error);
  return data;
}

async function getDocument(id) {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) fail(error);
  return data;
}

async function listDocuments(filters, user) {
  let query = supabase.from('documents').select('*');

  if (user.role !== 'admin') {
    const { data: shared, error } = await supabase
      .from('document_access')
      .select('document_id')
      .eq('user_id', user.id);
    if (error) fail(error);
    const ids = (shared || []).map((row) => row.document_id);

    if (user.role === 'viewer') {
      if (!ids.length) return [];
      query = query.in('id', ids);
    } else if (ids.length) {
      query = query.or(`owner_id.eq.${user.id},id.in.(${ids.join(',')})`);
    } else {
      query = query.eq('owner_id', user.id);
    }
  }

  if (filters.name) query = query.ilike('name', `%${filters.name}%`);
  if (filters.category) query = query.ilike('category', `%${filters.category}%`);
  if (filters.from) query = query.gte('created_at', filters.from);
  if (filters.to) query = query.lte('created_at', `${filters.to}T23:59:59.999Z`);

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) fail(error);

  let rows = data || [];
  if (filters.owner) {
    const needle = filters.owner.toLowerCase();
    const ownerIds = new Set();
    for (const row of rows) {
      const owner = await getUserById(row.owner_id);
      if (
        owner &&
        (owner.name || '').toLowerCase().includes(needle) ||
        (owner.email || '').toLowerCase().includes(needle)
      ) {
        ownerIds.add(row.id);
      }
    }
    rows = rows.filter((row) => ownerIds.has(row.id));
  }

  if (user.role !== 'admin' && rows.length) {
    const { data: access, error } = await supabase
      .from('document_access')
      .select('document_id, permission')
      .eq('user_id', user.id)
      .in('document_id', rows.map((row) => row.id));
    if (error) fail(error);
    const map = new Map((access || []).map((row) => [row.document_id, row.permission]));
    rows = rows.map((row) => ({
      ...row,
      is_owner: row.owner_id === user.id,
      permission: row.owner_id === user.id ? 'owner' : map.get(row.id) || null
    }));
  } else {
    rows = rows.map((row) => ({ ...row, is_owner: row.owner_id === user.id, permission: 'admin' }));
  }

  return rows;
}

async function updateDocument(id, patch) {
  const { data, error } = await supabase
    .from('documents')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) fail(error);
  return data;
}

async function deleteDocument(id) {
  const { error } = await supabase.from('documents').delete().eq('id', id);
  if (error) fail(error);
}

async function getAccess(documentId, userId) {
  const { data, error } = await supabase
    .from('document_access')
    .select('*')
    .eq('document_id', documentId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) fail(error);
  return data;
}

async function listAccess(documentId) {
  const { data, error } = await supabase
    .from('document_access')
    .select('id, document_id, user_id, permission, created_at, user:users!document_access_user_id_fkey(id,email,name)')
    .eq('document_id', documentId)
    .order('created_at', { ascending: false });
  if (error) fail(error);
  return data || [];
}

async function grantAccess(documentId, userId, permission, grantedBy) {
  const { data, error } = await supabase
    .from('document_access')
    .upsert(
      { document_id: documentId, user_id: userId, permission, granted_by: grantedBy },
      { onConflict: 'document_id,user_id' }
    )
    .select('*')
    .single();
  if (error) fail(error);
  return data;
}

async function revokeAccess(documentId, userId) {
  const { error } = await supabase
    .from('document_access')
    .delete()
    .eq('document_id', documentId)
    .eq('user_id', userId);
  if (error) fail(error);
}

async function uploadFile(path, buffer, contentType) {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType, upsert: true });
  if (error) fail(error);
  return path;
}

async function downloadFile(path) {
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error) fail(error);
  return Buffer.from(await data.arrayBuffer());
}

async function deleteFile(path) {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) fail(error);
}

module.exports = {
  BUCKET,
  findUserByEmail,
  getUserById,
  listUsers,
  updateUserRole,
  insertAudit,
  listAudit,
  insertDocument,
  getDocument,
  listDocuments,
  updateDocument,
  deleteDocument,
  getAccess,
  listAccess,
  grantAccess,
  revokeAccess,
  uploadFile,
  downloadFile,
  deleteFile
};
