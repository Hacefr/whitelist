const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Change this to whatever password you want for your admin page:
const ADMIN_KEY = process.env.ADMIN_KEY || "admin123";

const DATA_FILE = path.join(__dirname, 'applications.json');

// Helper to read applications from file
function getApplications() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify([]));
    }
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

// Helper to save applications to file
function saveApplications(apps) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(apps, null, 2));
}

app.use(cors());
app.use(express.json());

// Public API endpoint: Receives form from GitHub Pages
app.post('/api/apply', (req, res) => {
  const { username, reason } = req.body;

  if (!username || !reason) {
    return res.status(400).json({ error: 'Username and reason are required.' });
  }

  const applications = getApplications();

  // Add the new submission to the top of the list
  applications.unshift({
    id: Date.now(),
    username: username.trim(),
    reason: reason.trim(),
    date: new Date().toLocaleString()
  });

  saveApplications(applications);
  console.log(`[SAVED] New application from ${username}`);

  return res.json({ success: true });
});

// Private Admin Dashboard: View applications in your browser
app.get('/admin', (req, res) => {
  const accessKey = req.query.key;

  // Simple password check via URL query (?key=...)
  if (accessKey !== ADMIN_KEY) {
    return res.status(403).send(`
      <body style="background:#1c1c1c;color:#d4d4d4;font-family:sans-serif;padding:40px;">
        <h2 style="border-radius:0;">Access Denied</h2>
        <p>Please provide the correct key in the URL: <code>/admin?key=YOUR_PASSWORD</code></p>
      </body>
    `);
  }

  const applications = getApplications();

  // Generate table rows
  const rows = applications.map(app => `
    <tr>
      <td style="padding:10px;border:1px solid #3e3e3e;font-weight:600;">${escapeHtml(app.username)}</td>
      <td style="padding:10px;border:1px solid #3e3e3e;">${escapeHtml(app.reason)}</td>
      <td style="padding:10px;border:1px solid #3e3e3e;color:#888;">${app.date}</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Admin - Whitelist Applications</title>
      <style>
        * { box-sizing: border-box; border-radius: 0 !important; font-family: -apple-system, sans-serif; }
        body { background: #1c1c1c; color: #d4d4d4; padding: 30px; margin: 0; }
        .container { max-width: 900px; margin: 0 auto; background: #242424; border: 1px solid #3e3e3e; padding: 24px; }
        h1 { font-size: 1.2rem; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #3e3e3e; padding-bottom: 12px; margin-top: 0; color: #fff; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 0.9rem; }
        th { background: #181818; text-align: left; padding: 10px; border: 1px solid #3e3e3e; color: #888; text-transform: uppercase; font-size: 0.75rem; }
        .empty { padding: 20px; text-align: center; color: #888; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Whitelist Applications (${applications.length})</h1>
        ${applications.length === 0 ? '<div class="empty">No applications yet.</div>' : `
          <table>
            <thead>
              <tr>
                <th style="width: 25%;">Username</th>
                <th>Reason</th>
                <th style="width: 25%;">Submitted</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        `}
      </div>
    </body>
    </html>
  `;

  res.send(html);
});

// Basic XSS protection for displaying entries in HTML
function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
