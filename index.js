const http = require('http');

// In-memory database
const users = [
  { username: 'admin', role: 'Admin', password: '123' },
  { username: 'user1', role: 'Regular User', password: '123' }
];

const documents = [
  { id: 1, title: 'Q4 Financial Report.pdf', restrictedTo: 'Admin', uploader: 'admin' },
  { id: 2, title: 'Employee Handbook.pdf', restrictedTo: 'Regular User', uploader: 'admin' },
  { id: 3, title: 'Project Roadmap.docx', restrictedTo: 'Regular User', uploader: 'user1' }
];

const auditLogs = [
  { timestamp: new Date().toISOString(), user: 'System', action: 'TrustVault Server Started' }
];

// Helper to parse URL and query parameters
const parseUrl = (urlStr) => {
  const parts = urlStr.split('?');
  const path = parts[0];
  const query = {};
  if (parts[1]) {
    parts[1].split('&').forEach(param => {
      const [key, val] = param.split('=');
      query[key] = decodeURIComponent(val || '');
    });
  }
  return { path, query };
};

const server = http.createServer((req, res) => {
  const { path, query } = parseUrl(req.url);

  // Handle Login
  if (path === '/login') {
    const { username, password } = query;
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
      auditLogs.push({ timestamp: new Date().toISOString(), user: user.username, action: `Logged in as ${user.role}` });
      res.writeHead(302, { 'Set-Cookie': `user=${user.username}; Path=/`, 'Location': '/' });
      res.end();
      return;
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<h3>Invalid Credentials. <a href="/">Try Again</a></h3>');
      return;
    }
  }

  // Handle Logout
  if (path === '/logout') {
    auditLogs.push({ timestamp: new Date().toISOString(), user: 'Guest', action: 'User logged out' });
    res.writeHead(302, { 'Set-Cookie': 'user=; Path=/; Max-Age=0', 'Location': '/' });
    res.end();
    return;
  }

  // Check login cookie
  let currentUser = null;
  const cookieHeader = req.headers.cookie || '';
  const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
    const [key, val] = cookie.trim().split('=');
    if (key && val) acc[key] = val;
    return acc;
  }, {});

  if (cookies.user) {
    currentUser = users.find(u => u.username === cookies.user);
  }

  // Render UI
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>TrustVault - Secure Document Sharing & RBAC</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 30px; background: #f4f6f9; color: #333; }
        .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px; }
        h1 { color: #2c3e50; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
        th { background-color: #2c3e50; color: white; }
        .badge { background: #3498db; color: white; padding: 3px 8px; border-radius: 4px; font-size: 12px; }
        input, button { padding: 8px 12px; margin-right: 5px; border: 1px solid #ccc; border-radius: 4px; }
        button { background: #2c3e50; color: white; cursor: pointer; }
        button:hover { background: #34495e; }
        .logout { background: #e74c3c; }
      </style>
    </head>
    <body>
      <h1>🔒 TrustVault Secure Dashboard</h1>

      <!-- Sign In -->
      <div class="card">
        ${currentUser ? `
          <p>Welcome back, <strong>${currentUser.username}</strong> (<span class="badge">${currentUser.role}</span>)!</p>
          <a href="/logout"><button class="logout">Logout</button></a>
        ` : `
          <h3>Sign In</h3>
          <form action="/login" method="GET">
            <input type="text" name="username" placeholder="Username (admin or user1)" required />
            <input type="password" name="password" placeholder="Password (123)" required />
            <button type="submit">Login</button>
          </form>
          <p style="font-size: 12px; color: #666; margin-top: 5px;">Hint: Try username: <strong>admin</strong> (Password: 123) or <strong>user1</strong> (Password: 123)</p>
        `}
      </div>

      <!-- Protected Documents -->
      <div class="card">
        <h2>📁 Secure Document Sharing (RBAC Protected)</h2>
        <table>
          <tr><th>ID</th><th>Document Title</th><th>Access Level</th><th>Uploader</th><th>Action</th></tr>
          ${documents.map(doc => {
            const canAccess = !currentUser || currentUser.role === 'Admin' || doc.restrictedTo === currentUser.role;
            return `
              <tr>
                <td>${doc.id}</td>
                <td>${doc.title}</td>
                <td><span class="badge">${doc.restrictedTo}</span></td>
                <td>${doc.uploader}</td>
                <td>
                  ${canAccess ? `<button style="background: #27ae60;">Download / View</button>` : `<span style="color: #e74c3c; font-weight: bold;">Access Denied</span>`}
                </td>
              </tr>
            `;
          }).join('')}
        </table>
      </div>

      <!-- Real-Time Audit Trail -->
      <div class="card">
        <h2>📋 Real-Time Audit Trail</h2>
        <table>
          <tr><th>Timestamp</th><th>User</th><th>Action</th></tr>
          ${auditLogs.slice(-6).reverse().map(log => `
            <tr>
              <td>${log.timestamp}</td>
              <td>${log.user}</td>
              <td>${log.action}</td>
            </tr>
          `).join('')}
        </table>
      </div>
    </body>
    </html>
  `);
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`TrustVault server is running on port ${PORT}`);
});
