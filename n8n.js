import { requireUser, json } from './_security.js';

const allowedActions = {
  products: { method: 'GET', pathEnv: 'N8N_PRODUCTS_PATH' },
  upload: { method: 'POST', pathEnv: 'N8N_UPLOAD_PATH' },
  update: { method: 'POST', pathEnv: 'N8N_UPDATE_PATH' },
  delete: { method: 'DELETE', pathEnv: 'N8N_DELETE_PATH' }
};

export default async function handler(req, res) {
  const user = await requireUser(req);
  if (!user) return json(res, 401, { error: 'Unauthorized' });
  const action = req.query.action;
  const target = allowedActions[action];
  if (!target) return json(res, 404, { error: 'Not found' });
  if (req.method !== target.method) return json(res, 405, { error: 'Method not allowed' });
  const secret = process.env.N8N_SHARED_SECRET;
  const base = process.env.N8N_BASE_URL;
  const path = process.env[target.pathEnv];
  if (!secret || !base || !path) return json(res, 503, { error: 'Proxy configuration incomplete' });
  const upstreamUrl = new URL(path.replace(/^\/+/, ''), base.replace(/\/+$/, '') + '/');
  if (upstreamUrl.origin !== new URL(base).origin) return json(res, 500, { error: 'Invalid upstream configuration' });

  try {
    const headers = { 'X-Shopping-Secret': secret };
    let body;
    if (action === 'upload') {
      const { filename, mimeType, base64 } = req.body || {};
      if (typeof base64 !== 'string' || !/^[a-zA-Z0-9+/]*={0,2}$/.test(base64) || base64.length > 3400000) {
        return json(res, 413, { error: 'File too large or invalid (max approximately 2.5MB)' });
      }
      const buffer = Buffer.from(base64, 'base64');
      if (buffer.length > 2500000) return json(res, 413, { error: 'File exceeds 2.5MB' });
      const form = new FormData();
      form.append('file', new Blob([buffer], { type: mimeType || 'application/octet-stream' }), String(filename || 'receipt.jpg').slice(0, 150));
      body = form;
    } else if (action !== 'products') {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(req.body ?? {});
    }
    const response = await fetch(upstreamUrl, {
      method: target.method, headers, body,
      signal: AbortSignal.timeout(action === 'upload' ? 55000 : 20000)
    });
    const text = await response.text();
    res.setHeader('Cache-Control', 'no-store');
    res.status(response.status);
    const contentType = response.headers.get('content-type') || 'application/json';
    res.setHeader('Content-Type', contentType);
    return res.send(text);
  } catch (e) {
    console.error('Proxy error:', action, e.message);
    return json(res, 502, { error: 'Upstream request failed' });
  }
}
