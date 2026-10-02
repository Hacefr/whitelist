const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS so your GitHub Pages frontend can send requests here
app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.send('Whitelist backend is running.');
});

// Whitelist application endpoint
app.post('/api/apply', async (req, res) => {
  const { username, reason } = req.body;

  if (!username || !reason) {
    return res.status(400).json({ error: 'Username and reason are required.' });
  }

  // 1. Always log to the Render console
  console.log(`[NEW APPLICATION] User: ${username} | Reason: ${reason}`);

  // 2. Optional: Forward directly to a Discord Webhook if configured
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [
            {
              title: 'New Whitelist Application',
              color: 0x3e3e3e,
              fields: [
                { name: 'Username', value: username, inline: true },
                { name: 'Reason', value: reason }
              ],
              timestamp: new Date().toISOString()
            }
          ]
        })
      });
    } catch (err) {
      console.error('Failed to post to Discord webhook:', err);
    }
  }

  return res.json({ success: true, message: 'Application received.' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
