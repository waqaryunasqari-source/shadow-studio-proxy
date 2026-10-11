/**
 * Shadow Studio AI - WaveSpeed Backend Proxy Server
 * Seedance 2.0 Mini Image-to-Video Turbo API Integration
 */

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Documented WaveSpeedAI API Configuration
const WAVESPEED_BASE_URL = 'https://api.wavespeed.ai/api/v3';
const MODEL_NAME = 'bytedance/seedance-2.0-mini-image-to-video-turbo';

/**
 * Health check endpoint - Used by Android app to verify connection
 */
app.get('/health', (req, res) => {
  const apiKey = process.env.WAVESPEED_API_KEY;
  const isConfigured = Boolean(apiKey && apiKey.trim().length > 0);

  res.status(200).json({
    status: 'ok',
    proxy: 'Shadow Studio AI WaveSpeed Proxy',
    version: '1.0.0',
    model: MODEL_NAME,
    wavespeedConfigured: isConfigured,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/status', (req, res) => {
  res.redirect('/health');
});

/**
 * Generate Video Endpoint
 * Submits an Image-to-Video task to WaveSpeedAI
 */
app.post('/api/generate-video', async (req, res) => {
  try {
    const apiKey = process.env.WAVESPEED_API_KEY;
    if (!apiKey || apiKey.trim().length === 0) {
      return res.status(503).json({
        error: 'WAVESPEED_API_KEY is not configured on the backend server.',
        code: 'API_KEY_MISSING'
      });
    }

    const {
      prompt,
      image,
      duration = 5,
      aspect_ratio = '16:9',
      fps = 24,
      camera_movement = 'smooth zoom'
    } = req.body;

    if (!image || typeof image !== 'string' || image.trim().length === 0) {
      return res.status(400).json({
        error: 'A reference image (base64 data URI or public URL) is required.',
        code: 'MISSING_IMAGE'
      });
    }

    const payload = {
      prompt: prompt || 'Cinematic, smooth, high-quality camera motion with rich lighting and realistic shadows.',
      image: image.trim(),
      duration: Number(duration) === 10 ? 10 : 5,
      aspect_ratio: aspect_ratio === '9:16' ? '9:16' : '16:9',
      fps: Number(fps) || 24,
      camera_movement: camera_movement || 'smooth zoom'
    };

    const targetUrl = `${WAVESPEED_BASE_URL}/${MODEL_NAME}`;

    const wavespeedResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`
      },
      body: JSON.stringify(payload)
    });

    const responseData = await wavespeedResponse.json().catch(() => null);

    if (!wavespeedResponse.ok) {
      const errorMsg = responseData?.message || responseData?.error || `WaveSpeed API responded with HTTP ${wavespeedResponse.status}`;
      return res.status(wavespeedResponse.status).json({
        error: errorMsg,
        code: 'WAVESPEED_API_ERROR',
        details: responseData
      });
    }

    const taskId = responseData?.id || responseData?.task_id || responseData?.data?.id;
    const taskStatus = responseData?.status || responseData?.data?.status || 'created';

    return res.status(200).json({
      success: true,
      id: taskId,
      status: taskStatus,
      created_at: responseData?.created_at || new Date().toISOString(),
      raw: responseData
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || 'Internal proxy server error while initiating video generation.',
      code: 'PROXY_INTERNAL_ERROR'
    });
  }
});

/**
 * Task Status & Prediction Polling Endpoint
 */
app.get('/api/predictions/:id/result', async (req, res) => {
  try {
    const apiKey = process.env.WAVESPEED_API_KEY;
    if (!apiKey || apiKey.trim().length === 0) {
      return res.status(503).json({
        error: 'WAVESPEED_API_KEY is not configured on the backend server.',
        code: 'API_KEY_MISSING'
      });
    }

    const taskId = req.params.id;
    if (!taskId) {
      return res.status(400).json({
        error: 'Task ID is required.',
        code: 'MISSING_TASK_ID'
      });
    }

    const pollingUrl = `${WAVESPEED_BASE_URL}/predictions/${encodeURIComponent(taskId)}/result`;

    const wavespeedResponse = await fetch(pollingUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`
      }
    });

    const responseData = await wavespeedResponse.json().catch(() => null);

    if (!wavespeedResponse.ok) {
      return res.status(wavespeedResponse.status).json({
        error: responseData?.message || responseData?.error || `Failed to fetch status for task ${taskId}`,
        code: 'WAVESPEED_POLL_ERROR',
        details: responseData
      });
    }

    const status = responseData?.status || responseData?.data?.status || 'processing';
    let outputs = responseData?.outputs || responseData?.output || responseData?.data?.outputs || [];
    if (typeof outputs === 'string') {
      outputs = [outputs];
    }

    const taskError = responseData?.error || responseData?.data?.error || null;

    return res.status(200).json({
      id: taskId,
      status: status.toLowerCase(),
      outputs,
      error: taskError,
      raw: responseData
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || 'Internal proxy server error while polling task status.',
      code: 'PROXY_INTERNAL_ERROR'
    });
  }
});

// Start listener
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Shadow Studio WaveSpeed Proxy listening on port ${PORT}`);
  });
}

module.exports = app;
