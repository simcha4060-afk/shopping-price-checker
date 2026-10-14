import { OAuth2Client } from 'google-auth-library';
import { SignJWT, jwtVerify } from 'jose';

const encoder = new TextEncoder();
const cookieName = 'shopping_session';

export function allowEmails() {
  return new Set((process.env.ALLOWED_EMAILS || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean));
}
function signingKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters');
  return encoder.encode(secret);
}
export async function verifyGoogleCredential(credential) {
  if (!process.env.GOOGLE_CLIENT_ID) throw new Error('GOOGLE_CLIENT_ID not set');
  const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  const ticket = await client.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
  const payload = ticket.getPayload();
  const email = String(payload?.email || '').toLowerCase();
  if (!payload?.email_verified || !allowEmails().has(email)) return null;
  return { email, sub: payload.sub };
}
export async function sessionToken(user) {
  return new SignJWT({ email: user.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.sub).setIssuedAt().setExpirationTime('8h')
    .setIssuer('shopping-price-checker').sign(signingKey());
}
export function readCookie(req) {
  const header = req.headers.cookie || '';
  const item = header.split(';').map(x => x.trim()).find(x => x.startsWith(cookieName + '='));
  return item ? item.substring(cookieName.length + 1) : null;
}
export async function requireUser(req) {
  const token = readCookie(req);
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, signingKey(), { algorithms: ['HS256'], issuer: 'shopping-price-checker' });
    const email = String(payload.email || '').toLowerCase();
    return payload.sub && allowEmails().has(email) ? { email, sub: payload.sub } : null;
  } catch { return null; }
}
export function setCookie(res, token) {
  res.setHeader('Set-Cookie', `${cookieName}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=28800`);
}
export function clearCookie(res) {
  res.setHeader('Set-Cookie', `${cookieName}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`);
}
export function json(res, status, data) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(data);
}
