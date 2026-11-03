
const express = require("express");
const multer = require("multer");
const session = require("express-session");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = 3000;

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || "change-this-demo-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production"
  }
}));

const users = [
  { id: 1, username: "admin", password: "admin123", role: "Admin" },
  { id: 2, username: "uploader", password: "upload123", role: "Uploader" },
  { id: 3, username: "viewer", password: "view123", role: "Viewer" }
];

const documents = [];
const auditLogs = [];

function log(user, action, fileId, status) {
  auditLogs.push({
    id: crypto.randomUUID(),
    user: user ? user.username : "Guest",
    action,
    fileId: fileId || "-",
    timestamp: new Date().toISOString(),
    status
  });
}

function auth(req, res, next) {
  if (!req.session.user) return res.redirect("/");
  next();
}

function canManage(user, doc) {
  return user.role === "Admin" ||
    (user.role === "Uploader" && doc.uploaderId === user.id);
}

function canAccess(user, doc) {
  return user.role === "Admin" ||
    doc.sharedWith.includes(user.id);
}

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    cb(null, crypto.randomUUID() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

function page(title, body) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: Arial; background:#f1f4f9; margin:25px; color:#263445; }
        .card { background:white; padding:20px; margin:15px 0;
                border-radius:10px; box-shadow:0 2px 8px #ddd; }
        input,select,button { padding:10px; margin:6px 3px; }
        button { background:#243b55; color:white; border:0; border-radius:5px; }
        table { width:100%; border-collapse:collapse; }
        td,th { border:1px solid #ddd; padding:9px; text-align:left; }
        th { background:#243b55; color:white; }
        a { color:#1769aa; }
        .danger { background:#b83232; }
      </style>
    </head>
    <body>${body}</body>
    </html>`;
}

app.get("/", (req, res) => {
  if (req.session.user) return res.redirect("/dashboard");

  res.send(page("TrustVault Login", `
    <div class="card">
      <h1>🔐 TrustVault</h1>
      <h3>Secure Document Sharing</h3>
      <form method="POST" action="/login">
        <input name="username" placeholder="Username" required>
        <input name="password" type="password" placeholder="Password" required>
        <button>Login</button>
      </form>
      <p>Demo accounts:</p>
      <p>Admin: admin / admin123</p>
      <p>Uploader: uploader / upload123</p>
      <p>Viewer: viewer / view123</p>
    </div>
  `));
});

app.post("/login", (req, res) => {
  const user = users.find(u =>
    u.username === req.body.username &&
    u.password === req.body.password
  );

  if (!user) {
    log(null, "LOGIN", "-", "Denied");
    return res.send("Invalid login. <a href='/'>Try again</a>");
  }

  req.session.regenerate(err => {
    if (err) return res.status(500).send("Session error");
    req.session.user = user;
    log(user, "LOGIN", "-", "Success");
    res.redirect("/dashboard");
  });
});

app.get("/logout", auth, (req, res) => {
  log(req.session.user, "LOGOUT", "-", "Success");
  req.session.destroy(() => res.redirect("/"));
});

app.get("/dashboard", auth, (req, res) => {
  const user = req.session.user;

  const visibleDocs = documents.filter(doc =>
    canManage(user, doc) || canAccess(user, doc)
  );

  let body = `
    <h1>🔐 TrustVault Dashboard</h1>
    <div class="card">
      Welcome <b>${user.username}</b> (${user.role})
      <a href="/logout">Logout</a>
    </div>`;

  if (user.role !== "Viewer") {
    body += `
      <div class="card">
        <h2>Upload Document</h2>
        <form action="/upload" method="POST" enctype="multipart/form-data">
          <input type="file" name="document" required>
          <button>Upload</button>
        </form>
        <small>Maximum file size: 5 MB</small>
      </div>`;
  }

  body += `<div class="card"><h2>Documents</h2>
    <table>
      <tr><th>File</th><th>Uploader</th><th>Action</th></tr>`;

  for (const doc of visibleDocs) {
    body += `
      <tr>
        <td>${escapeHtml(doc.originalName)}</td>
        <td>${escapeHtml(doc.uploader)}</td>
        <td><a href="/download/${doc.id}">Download</a></td>
      </tr>`;
  }

  body += `</table></div>`;

  if (user.role === "Admin" || user.role === "Uploader") {
    const manageable = documents.filter(d => canManage(user, d));

    body += `<div class="card"><h2>Share / Revoke Access</h2>`;

    for (const doc of manageable) {
      body += `<h3>${escapeHtml(doc.originalName)}</h3>
        <form method="POST" action="/share/${doc.id}">
          <select name="username" required>
            ${users.filter(u => u.role !== "Admin")
              .map(u => `<option value="${u.username}">${u.username}</option>`).join("")}
          </select>
          <button>Share</button>
        </form>
        <p>Shared with: ${doc.sharedWith.map(id =>
          users.find(u => u.id === id)?.username || "Unknown"
        ).join(", ") || "Nobody"}</p>
        <form method="POST" action="/revoke/${doc.id}">
          <select name="username" required>
            ${users.filter(u => doc.sharedWith.includes(u.id))
              .map(u => `<option value="${u.username}">${u.username}</option>`).join("")}
          </select>
          <button class="danger">Revoke</button>
        </form>`;
    }

    body += `</div>`;
  }

  if (user.role === "Admin") {
    body += `<div class="card"><h2>Audit Logs</h2>
      <table><tr><th>User</th><th>Action</th><th>File ID</th>
      <th>Time</th><th>Status</th></tr>`;

    for (const entry of [...auditLogs].reverse()) {
      body += `<tr>
        <td>${escapeHtml(entry.user)}</td>
        <td>${entry.action}</td>
        <td>${entry.fileId}</td>
        <td>${entry.timestamp}</td>
        <td>${entry.status}</td>
      </tr>`;
    }

    body += `</table></div>`;
  }

  res.send(page("TrustVault Dashboard", body));
});

app.post("/upload", auth, upload.single("document"), (req, res) => {
  const user = req.session.user;

  if (user.role === "Viewer") {
    if (req.file) fs.unlinkSync(req.file.path);
    log(user, "UPLOAD", "-", "Denied");
    return res.status(403).send("Access denied");
  }

  if (!req.file) return res.status(400).send("Choose a file");

  const doc = {
    id: crypto.randomUUID(),
    originalName: req.file.originalname,
    storedName: req.file.filename,
    uploaderId: user.id,
    uploader: user.username,
    sharedWith: []
  };

  documents.push(doc);
  log(user, "UPLOAD", doc.id, "Success");
  res.redirect("/dashboard");
});

app.post("/share/:id", auth, (req, res) => {
  const user = req.session.user;
  const doc = documents.find(d => d.id === req.params.id);

  if (!doc || !canManage(user, doc)) {
    log(user, "SHARE", req.params.id, "Denied");
    return res.status(403).send("Access denied");
  }

  const target = users.find(u => u.username === req.body.username);
  if (!target || target.id === user.id) {
    return res.status(400).send("Invalid user");
  }

  if (!doc.sharedWith.includes(target.id)) {
    doc.sharedWith.push(target.id);
  }

  log(user, "SHARE", doc.id, "Success");
  res.redirect("/dashboard");
});

app.post("/revoke/:id", auth, (req, res) => {
  const user = req.session.user;
  const doc = documents.find(d => d.id === req.params.id);

  if (!doc || !canManage(user, doc)) {
    log(user, "REVOKE", req.params.id, "Denied");
    return res.status(403).send("Access denied");
  }

  const target = users.find(u => u.username === req.body.username);
  if (target) {
    doc.sharedWith = doc.sharedWith.filter(id => id !== target.id);
  }

  log(user, "REVOKE", doc.id, "Success");
  res.redirect("/dashboard");
});

app.get("/download/:id", auth, (req, res) => {
  const user = req.session.user;
  const doc = documents.find(d => d.id === req.params.id);

  if (!doc || !canAccess(user, doc)) {
    log(user, "DOWNLOAD", req.params.id, "Denied");
    return res.status(403).send("Access denied");
  }

  const filePath = path.join(uploadDir, doc.storedName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send("File not found");
  }

  log(user, "DOWNLOAD", doc.id, "Success");
  res.download(filePath, doc.originalName);
});

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  })[ch]);
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(400).send("Upload failed. Check the file size and try again.");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`TrustVault running on port ${PORT}`);
});


