import jwt from 'jsonwebtoken';

const cookieName = 'budgetzen_session';
const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export function setSessionCookie(response, userId) {
  const token = jwt.sign({ sub: String(userId) }, process.env.JWT_SECRET, { expiresIn: '7d' });
  response.cookie(cookieName, token, cookieOptions);
}

export function clearSessionCookie(response) {
  response.clearCookie(cookieName, { ...cookieOptions, maxAge: undefined });
}

export function requireAuth(request, response, next) {
  const token = request.cookies[cookieName];
  if (!token) {
    return response.status(401).json({ error: 'Tsy maintsy miditra aloha ianao.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (typeof payload.sub !== 'string' || !/^\d+$/.test(payload.sub)) {
      return response.status(401).json({ error: 'Tsy manan-kery intsony ny fidirana.' });
    }
    request.userId = Number(payload.sub);
    return next();
  } catch {
    return response.status(401).json({ error: 'Tsy manan-kery intsony ny fidirana.' });
  }
}
