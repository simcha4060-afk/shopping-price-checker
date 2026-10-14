import { verifyGoogleCredential, sessionToken, requireUser, setCookie, clearCookie, json } from './_security.js';

export default async function handler(req, res) {
  try {
    const action = req.query.action;
    if (action === 'config' && req.method === 'GET') {
      if (!process.env.GOOGLE_CLIENT_ID) return json(res, 503, { error: 'OAuth not configured' });
      return json(res, 200, { clientId: process.env.GOOGLE_CLIENT_ID });
    }
    if (action === 'session' && req.method === 'GET') {
      const user = await requireUser(req);
      return user ? json(res, 200, { authenticated: true, email: user.email }) : json(res, 401, { authenticated: false });
    }
    if (action === 'login' && req.method === 'POST') {
      const credential = req.body?.credential;
      if (typeof credential !== 'string' || credential.length > 10000) return json(res, 400, { error: 'Invalid credential' });
      const user = await verifyGoogleCredential(credential);
      if (!user) return json(res, 403, { error: 'Google account not approved' });
      setCookie(res, await sessionToken(user));
      return json(res, 200, { authenticated: true, email: user.email });
    }
    if (action === 'logout' && req.method === 'POST') {
      clearCookie(res);
      return json(res, 200, { ok: true });
    }
    return json(res, 404, { error: 'Not found' });
  } catch (error) {
    console.error('Auth failure:', error.message);
    return json(res, 500, { error: 'Authentication service error' });
  }
}
