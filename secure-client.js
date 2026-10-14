// Must be included before app.js; it intercepts only the four known n8n endpoints.
(() => {
  const originalFetch = window.fetch.bind(window);
  const base = 'https://sish4747.app.n8n.cloud/webhook/';
  const routeMap = new Map([
    [base + 'get-products', 'products'],
    [base + 'f799be46-abc5-415d-a556-eb1575457ea4', 'upload'],
    [base + 'update-product', 'update'],
    [base + 'delete-product', 'delete']
  ]);
  window.fetch = async (input, init = {}) => {
    const action = typeof input === 'string' ? routeMap.get(input) : null;
    if (!action) return originalFetch(input, init);
    const options = { ...init, credentials: 'same-origin' };
    if (action === 'upload') {
      const file = init.body?.get('file');
      if (!(file instanceof File)) throw new Error('No upload file');
      if (file.size > 2500000) throw new Error('הקובץ גדול מ-2.5MB. יש לכווץ אותו לפני העלאה מאובטחת.');
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1]);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      options.body = JSON.stringify({ filename: file.name, mimeType: file.type, base64 });
      options.headers = { 'Content-Type': 'application/json' };
    }
    return originalFetch('/api/n8n?action=' + action, options);
  };

  function showLogin(message = '') {
    document.getElementById('shopping-auth-overlay')?.remove();
    const cover = document.createElement('div');
    cover.id = 'shopping-auth-overlay';
    cover.style.cssText = 'position:fixed;inset:0;z-index:999999;background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-family:Arial,sans-serif;direction:rtl;';
    cover.innerHTML = '<section style="width:min(90vw,360px);padding:30px;border-radius:20px;background:white;box-shadow:0 8px 35px #0002;text-align:center"><img src="/icon-192.png" style="width:75px;height:75px"><h2>השוואת מחירי קניות</h2><p>כניסה באמצעות חשבון Google מורשה בלבד</p><div id="google-signin-button" style="display:flex;justify-content:center"></div><p id="shopping-auth-error" style="color:#b91c1c"></p></section>';
    document.body.append(cover);
    document.getElementById('shopping-auth-error').textContent = message;
  }
  async function request(action, data) {
    const response = await originalFetch('/api/auth?action=' + action, {
      method: data ? 'POST' : 'GET',
      credentials: 'same-origin',
      headers: data ? { 'Content-Type': 'application/json' } : {},
      body: data ? JSON.stringify(data) : undefined
    });
    return { ok: response.ok, data: await response.json() };
  }
  function addLogout(email) {
    const bar = document.createElement('div');
    bar.id = 'shopping-logout';
    bar.style.cssText = 'position:fixed;bottom:12px;left:12px;z-index:9999;background:white;padding:8px 12px;border-radius:8px;box-shadow:0 2px 10px #0002;font:12px Arial;direction:rtl';
    const label = document.createElement('span');
    label.textContent = email + ' ';
    const button = document.createElement('button');
    button.textContent = 'התנתקות';
    button.onclick = async () => {
      await originalFetch('/api/auth?action=logout', { method:'POST', credentials:'same-origin' });
      window.location.reload();
    };
    bar.append(label, button);
    document.body.append(bar);
  }
  function authorized(email) {
    document.getElementById('shopping-auth-overlay')?.remove();
    addLogout(email);
    // If app.js already displayed a 401 error, reload the products after sign-in.
    if (typeof window.loadProducts === 'function') window.loadProducts();
  }
  async function start() {
    const session = await request('session');
    if (session.ok && session.data.authenticated) { authorized(session.data.email); return; }
    showLogin();
    try {
      const config = await request('config');
      if (!config.ok) throw new Error('הגדרות Google OAuth חסרות ב-Vercel');
      await new Promise((resolve, reject) => {
        if (window.google?.accounts?.id) return resolve();
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.onload = resolve;
        script.onerror = reject;
        document.head.append(script);
      });
      google.accounts.id.initialize({
        client_id: config.data.clientId,
        callback: async ({ credential }) => {
          const login = await request('login', { credential });
          if (login.ok) authorized(login.data.email);
          else document.getElementById('shopping-auth-error').textContent = 'החשבון אינו מורשה להיכנס לאתר';
        }
      });
      google.accounts.id.renderButton(document.getElementById('google-signin-button'), {
        theme: 'outline', size: 'large', text: 'signin_with', shape: 'pill'
      });
    } catch (e) {
      document.getElementById('shopping-auth-error').textContent = e.message || 'לא ניתן לטעון התחברות Google';
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
