
let currentUser = null;

const message = document.getElementById('message');
const uploadSection = document.getElementById('upload-section');
const adminUsers = document.getElementById('admin-users');
const auditSection = document.getElementById('audit-section');

function showMessage(text, type) {
  message.textContent = text;
  message.className = `message ${type}`;
  setTimeout(() => {
    message.className = 'message';
  }, 5000);
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'include',
    ...options
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

// Role-based sidebar visibility
function updateSidebar(role) {
  const navUpload = document.getElementById('nav-upload');
  const navUsers = document.getElementById('nav-users');
  const navAudit = document.getElementById('nav-audit');

  if (role === 'admin') {
    navUpload.classList.add('hidden');
  }

  else if (role === 'uploader') {
    navUsers.classList.add('hidden');
    navAudit.classList.add('hidden');
  }

  else if (role === 'viewer') {
    navUpload.classList.add('hidden');
    navUsers.classList.add('hidden');
    navAudit.classList.add('hidden');
  }
}

async function loadMe() {
  try {
    const data = await api('/api/auth/me');

    currentUser = data.user;

    document.getElementById('user-info').textContent =
      `— ${currentUser.name} (${currentUser.role})`;

    // Update sidebar according to user role
    updateSidebar(currentUser.role);

    // Uploader permissions
    if (currentUser.role === 'uploader') {
      uploadSection.classList.remove('hidden');
    }

    // Admin permissions
    if (currentUser.role === 'admin') {
      adminUsers.classList.remove('hidden');
      auditSection.classList.remove('hidden');

      loadUsers();
      loadAudit();
    }

    loadDocuments();

  } catch (error) {
    window.location.href = '/';
  }
}

async function loadDocuments() {
  const params = new URLSearchParams();

  for (const [key, id] of [
    ['name', 'filter-name'],
    ['owner', 'filter-owner'],
    ['category', 'filter-category'],
    ['from', 'filter-from'],
    ['to', 'filter-to']
  ]) {
    const value = document.getElementById(id).value;

    if (value) {
      params.set(key, value);
    }
  }

  const data = await api(`/api/documents?${params}`);

  const rows = data.documents.map((doc) => `
    <tr>
      <td>${esc(doc.name)}</td>
      <td>${esc(doc.category)}</td>
      <td>${esc(doc.permission || '—')}</td>
      <td>${new Date(doc.created_at).toLocaleString()}</td>
      <td>${(doc.size_bytes / 1024).toFixed(1)} KB</td>

      <td class="actions">
        <button onclick="downloadDoc('${doc.id}')">
          Download
        </button>

        ${['owner', 'admin', 'edit'].includes(doc.permission)
          ? `<button class="secondary" onclick="renameDoc('${doc.id}')">Edit</button>`
          : ''}

        ${['owner', 'admin'].includes(doc.permission)
          ? `<button class="secondary" onclick="shareDoc('${doc.id}')">Share</button>`
          : ''}

        ${['owner', 'admin'].includes(doc.permission)
          ? `<button class="danger" onclick="deleteDoc('${doc.id}')">Delete</button>`
          : ''}
      </td>
    </tr>
  `).join('');

  document.getElementById('documents').innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Category</th>
          <th>Your access</th>
          <th>Uploaded</th>
          <th>Size</th>
          <th>Actions</th>
        </tr>
      </thead>

      <tbody>
        ${rows || '<tr><td colspan="6">No documents found.</td></tr>'}
      </tbody>
    </table>
  `;
}

async function loadUsers() {
  const data = await api('/api/admin/users');

  document.getElementById('users').innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Role</th>
          <th>Change role</th>
        </tr>
      </thead>

      <tbody>
        ${data.users.map((user) => `
          <tr>
            <td>${esc(user.name)}</td>
            <td>${esc(user.email)}</td>
            <td>${esc(user.role)}</td>

            <td>
              <select onchange="changeRole('${user.id}', this.value)">
                <option value="viewer" ${user.role === 'viewer' ? 'selected' : ''}>
                  Viewer
                </option>

                <option value="uploader" ${user.role === 'uploader' ? 'selected' : ''}>
                  Uploader
                </option>

                <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>
                  Admin
                </option>
              </select>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

async function loadAudit() {
  const action = document.getElementById('audit-action').value;
  const success = document.getElementById('audit-success').value;

  const params = new URLSearchParams();

  if (action) params.set('action', action);
  if (success) params.set('success', success);

  const data = await api(`/api/audit?${params}`);

  document.getElementById('audit').innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Time</th>
          <th>User</th>
          <th>Action</th>
          <th>Result</th>
          <th>Document</th>
          <th>Details</th>
        </tr>
      </thead>

      <tbody>
        ${data.logs.map((log) => `
          <tr>
            <td>${new Date(log.created_at).toLocaleString()}</td>
            <td>${esc(log.user_email || 'Unknown')}</td>
            <td>${esc(log.action)}</td>
            <td>${log.success ? 'Success' : 'Failure'}</td>
            <td>${esc(log.document_id || '—')}</td>
            <td>${esc(JSON.stringify(log.details || {}))}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

async function uploadDoc(event) {
  event.preventDefault();

  const body = new FormData();

  body.append('name', document.getElementById('doc-name').value);
  body.append('category', document.getElementById('doc-category').value);
  body.append('file', document.getElementById('doc-file').files[0]);

  try {
    const data = await api('/api/documents', {
      method: 'POST',
      body
    });

    showMessage(data.message, 'success');

    document.getElementById('upload-form').reset();

    loadDocuments();

  } catch (error) {
    showMessage(error.message, 'error');
  }
}

async function downloadDoc(id) {
  try {
    const response = await fetch(
      `/api/documents/${id}/download`,
      { credentials: 'include' }
    );

    if (!response.ok) {
      throw new Error('Download failed');
    }

    const blob = await response.blob();

    const link = document.createElement('a');

    link.href = URL.createObjectURL(blob);
    link.download = 'document';
    link.click();

    URL.revokeObjectURL(link.href);

    loadDocuments();

  } catch (error) {
    showMessage(error.message, 'error');
  }
}

async function renameDoc(id) {
  const name = prompt('New document name:');

  if (!name) return;

  try {
    const body = new FormData();

    body.append('name', name);

    const data = await api(`/api/documents/${id}`, {
      method: 'PATCH',
      body
    });

    showMessage(data.message, 'success');

    loadDocuments();

  } catch (error) {
    showMessage(error.message, 'error');
  }
}

async function shareDoc(id) {
  const email = prompt('User email to share with:');

  const permission = prompt(
    'Permission (read or edit):',
    'read'
  );

  if (!email || !permission) return;

  try {
    const data = await api(`/api/documents/${id}/access`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, permission })
    });

    showMessage(data.message, 'success');

  } catch (error) {
    showMessage(error.message, 'error');
  }
}

async function deleteDoc(id) {
  if (!confirm('Delete this document?')) return;

  try {
    const data = await api(`/api/documents/${id}`, {
      method: 'DELETE'
    });

    showMessage(data.message, 'success');

    loadDocuments();

  } catch (error) {
    showMessage(error.message, 'error');
  }
}

async function changeRole(id, role) {
  try {
    const data = await api(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ role })
    });

    showMessage(data.message, 'success');

    loadUsers();

  } catch (error) {
    showMessage(error.message, 'error');

    loadUsers();
  }
}

// Event listeners
document.getElementById('upload-form')
  .addEventListener('submit', uploadDoc);

document.getElementById('search')
  .addEventListener('click', loadDocuments);

document.getElementById('audit-search')
  .addEventListener('click', loadAudit);

document.getElementById('logout')
  .addEventListener('click', async () => {
    await api('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  });

// Start application
loadMe();
