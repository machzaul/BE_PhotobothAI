require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { getDatabase } = require('./database');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'PB-JWT-KEY-SECRET-999';

// Configure body-parser limit to handle high-resolution image/video base64 transfers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

// Serve Static CMS interface
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to check Client API Key (secures VPS from unauthorized third-party requests)
async function verifyClientApiKey(req, res, next) {
  const clientKey = req.headers['x-api-key'] || req.query.api_key;
  if (!clientKey) {
    return res.status(401).json({ error: 'Client API Key is missing. Include x-api-key header.' });
  }

  try {
    const db = await getDatabase();
    const settings = await db.get('SELECT backend_api_key FROM settings WHERE id = 1');
    if (clientKey !== settings.backend_api_key) {
      return res.status(403).json({ error: 'Forbidden: Invalid Client API Key.' });
    }
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Database verification failed: ' + err.message });
  }
}

// Middleware to verify JWT tokens for Admin CMS routes
function verifyAdminToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. Administrator token missing.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired administrator token.' });
  }
}

// ==========================================
// PUBLIC CLIENT GENERATION API ENDPOINTS
// ==========================================

// 0. Fetch Active Filters list (exposing name, subtitle, gradient; hiding raw prompt_text for security)
app.get('/api/filters', verifyClientApiKey, async (req, res) => {
  try {
    const db = await getDatabase();
    // Exclude 'Video Snap' since frontend is focusing on AI Image Lookbook
    const filters = await db.all(
      "SELECT name, subtitle, gradient FROM prompts WHERE name != 'Video Snap'"
    );
    res.json(filters);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch filters: ' + err.message });
  }
});

// 1. Generate Sticker (Photo) Endpoint
app.post('/api/generate-sticker', verifyClientApiKey, async (req, res) => {
  const { photoBase64, filterName, userId } = req.body;

  if (!photoBase64 || !filterName) {
    return res.status(400).json({ error: 'Missing required parameters: photoBase64 or filterName.' });
  }

  try {
    const db = await getDatabase();
    const settings = await db.get('SELECT * FROM settings WHERE id = 1');
    const promptConfig = await db.get('SELECT prompt_text FROM prompts WHERE name = ?', [filterName]);

    if (!promptConfig) {
      return res.status(404).json({ error: `Prompt configuration for filter "${filterName}" not found.` });
    }

    let resultBase64 = '';

    if (settings.mock_ai_generation === 1) {
      // Mock generation fallback
      await new Promise(resolve => setTimeout(resolve, 2000));
      // Return original image prefixed correctly as simulation
      resultBase64 = photoBase64; 
    } else {
      if (!settings.gemini_api_key) {
        return res.status(500).json({ error: 'Gemini API key is not configured in the settings.' });
      }

      const cleanImageBase64 = photoBase64.replace(/^data:image\/\w+;base64,/, '');
      const requestUrl = `${settings.gemini_api_endpoint}/v1beta/interactions?key=${settings.gemini_api_key}`;

      const apiResponse = await fetch(requestUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini-3.1-flash-image',
          input: [
            { type: 'text', text: promptConfig.prompt_text },
            { type: 'image', mime_type: 'image/png', data: cleanImageBase64 }
          ]
        })
      });

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        throw new Error(`Google API returned status ${apiResponse.status}: ${errorText}`);
      }

      const resData = await apiResponse.json();
      let extractedBase64 = '';
      if (resData.steps) {
        for (const step of resData.steps) {
          if (step.type === 'model_output' && step.content) {
            for (const block of step.content) {
              if (block.type === 'image' && block.data) {
                extractedBase64 = block.data;
                break;
              }
            }
          }
          if (extractedBase64) break;
        }
      }

      if (!extractedBase64) {
        throw new Error('Google API responded successfully but did not contain the sticker image output.');
      }

      resultBase64 = `data:image/png;base64,${extractedBase64}`;
    }

    // Save generation transaction history log
    await db.run(
      `INSERT INTO generations (user_id, booth_mode, filter_name, captured_frame, generated_output) 
       VALUES (?, ?, ?, ?, ?)`,
      [userId || 'guest_client', 'sticker', filterName, photoBase64, resultBase64]
    );

    res.json({ status: 'success', data: resultBase64 });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'AI generation pipeline failed.' });
  }
});

// 2. Generate Video Endpoint
app.post('/api/generate-video', verifyClientApiKey, async (req, res) => {
  const { photoBase64, channelName, userId } = req.body;

  if (!photoBase64) {
    return res.status(400).json({ error: 'Missing required parameter: photoBase64.' });
  }

  const finalChannelName = channelName || '@CODX';

  try {
    const db = await getDatabase();
    const settings = await db.get('SELECT * FROM settings WHERE id = 1');
    const promptConfig = await db.get('SELECT prompt_text FROM prompts WHERE name = ?', ['Video Snap']);

    if (!promptConfig) {
      return res.status(404).json({ error: 'Video Snap prompt template is missing in database.' });
    }

    let resultVideoData = '';

    if (settings.mock_ai_generation === 1) {
      // Mock generation fallback
      await new Promise(resolve => setTimeout(resolve, 3500));
      resultVideoData = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4';
    } else {
      if (!settings.gemini_api_key) {
        return res.status(500).json({ error: 'Gemini API key is not configured in the settings.' });
      }

      const cleanImageBase64 = photoBase64.replace(/^data:image\/\w+;base64,/, '');
      const requestUrl = `${settings.gemini_api_endpoint}/v1beta/interactions?key=${settings.gemini_api_key}`;

      const finalPromptText = promptConfig.prompt_text
        .replace(/\$\{channelName\}/g, finalChannelName)
        .replace(/\${channelName}/g, finalChannelName)
        .replace(/@CODX/g, finalChannelName);

      const apiResponse = await fetch(requestUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/gemini-omni-flash-preview',
          input: [
            { type: 'text', text: finalPromptText },
            { type: 'image', mime_type: 'image/jpeg', data: cleanImageBase64 }
          ],
          generation_config: {
            max_output_tokens: 65536,
            thinking_level: 'high',
            video_config: {
              task: 'image_to_video'
            }
          },
          response_modalities: ['video'],
          response_format: {
            type: 'video',
            aspect_ratio: '9:16',
            duration: '5s'
          }
        })
      });

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        throw new Error(`Google API returned status ${apiResponse.status}: ${errorText}`);
      }

      const resData = await apiResponse.json();
      let extractedVideoBase64 = '';
      if (resData.steps) {
        for (const step of resData.steps) {
          if (step.type === 'model_output' && step.content) {
            for (const block of step.content) {
              if (block.type === 'video' && block.data) {
                extractedVideoBase64 = block.data;
                break;
              }
            }
          }
          if (extractedVideoBase64) break;
        }
      }

      if (!extractedVideoBase64) {
        throw new Error('Google API responded successfully but did not contain the video output.');
      }

      resultVideoData = `data:video/mp4;base64,${extractedVideoBase64}`;
    }

    // Save generation transaction history log
    await db.run(
      `INSERT INTO generations (user_id, booth_mode, filter_name, captured_frame, generated_output) 
       VALUES (?, ?, ?, ?, ?)`,
      [userId || finalChannelName, 'video', 'Video Snap', photoBase64, resultVideoData]
    );

    res.json({ status: 'success', data: resultVideoData });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Video generation pipeline failed.' });
  }
});


// ==========================================
// ADMINISTRATOR CMS ENDPOINTS
// ==========================================

// Admin Login
app.post('/api/admin/login', async (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'Password is required.' });
  }

  try {
    const db = await getDatabase();
    const settings = await db.get('SELECT admin_password_hash FROM settings WHERE id = 1');
    const isMatch = await bcrypt.compare(password, settings.admin_password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid password credentials.' });
    }

    const token = jwt.sign({ admin: true }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ success: true, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch Settings
app.get('/api/admin/settings', verifyAdminToken, async (req, res) => {
  try {
    const db = await getDatabase();
    const settings = await db.get('SELECT gemini_api_key, gemini_api_endpoint, mock_ai_generation, backend_api_key FROM settings WHERE id = 1');
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save Settings
app.post('/api/admin/settings', verifyAdminToken, async (req, res) => {
  const { gemini_api_key, gemini_api_endpoint, mock_ai_generation, backend_api_key, new_password } = req.body;

  try {
    const db = await getDatabase();
    
    await db.run(
      `UPDATE settings 
       SET gemini_api_key = ?, gemini_api_endpoint = ?, mock_ai_generation = ?, backend_api_key = ? 
       WHERE id = 1`,
      [gemini_api_key, gemini_api_endpoint, mock_ai_generation ? 1 : 0, backend_api_key]
    );

    if (new_password && new_password.trim() !== '') {
      const hash = await bcrypt.hash(new_password, 10);
      await db.run('UPDATE settings SET admin_password_hash = ? WHERE id = 1', [hash]);
    }

    res.json({ success: true, message: 'Settings saved successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch All Prompts (Admin complete details)
app.get('/api/admin/prompts', verifyAdminToken, async (req, res) => {
  try {
    const db = await getDatabase();
    const prompts = await db.all('SELECT * FROM prompts');
    res.json(prompts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save / Update a Prompt (Admin CMS edit)
app.post('/api/admin/prompts', verifyAdminToken, async (req, res) => {
  const { name, subtitle, gradient, prompt_text } = req.body;
  if (!name || prompt_text === undefined) {
    return res.status(400).json({ error: 'Missing name or prompt_text.' });
  }

  try {
    const db = await getDatabase();
    await db.run(
      'INSERT OR REPLACE INTO prompts (name, subtitle, gradient, prompt_text) VALUES (?, ?, ?, ?)', 
      [name, subtitle || '', gradient || '', prompt_text]
    );
    res.json({ success: true, message: `Prompt template "${name}" updated.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Prompt Filter (Admin CMS delete)
app.delete('/api/admin/prompts/:name', verifyAdminToken, async (req, res) => {
  const { name } = req.params;
  try {
    const db = await getDatabase();
    await db.run('DELETE FROM prompts WHERE name = ?', [name]);
    res.json({ success: true, message: `Prompt template "${name}" deleted.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch Generations History Logs
app.get('/api/admin/generations', verifyAdminToken, async (req, res) => {
  try {
    const db = await getDatabase();
    const logs = await db.all('SELECT * FROM generations ORDER BY id DESC LIMIT 200');
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Generation Log
app.delete('/api/admin/generations/:id', verifyAdminToken, async (req, res) => {
  const { id } = req.params;
  try {
    const db = await getDatabase();
    await db.run('DELETE FROM generations WHERE id = ?', [id]);
    res.json({ success: true, message: 'Log entry deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`BE_PhotobothAI server is running on port ${PORT}`);
  console.log(`Admin Dashboard CMS available at: http://localhost:${PORT}`);
  console.log(`=================================================`);
});
