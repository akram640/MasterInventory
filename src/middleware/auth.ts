import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { DecodedIdToken } from 'firebase-admin/auth';
import { getOrCreateUser } from '../db/users.ts';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const fallbackUid = (req.headers['x-user-uid'] as string | undefined)?.trim();
  const fallbackEmail = (req.headers['x-user-email'] as string | undefined)?.trim();

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1];
    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      // Resolve canonical user by email so phone and laptop always share the same vault UID
      const emailToResolve = decodedToken.email || fallbackEmail || `${decodedToken.uid}@omnivault.internal`;
      const dbUser = await getOrCreateUser(decodedToken.uid, emailToResolve, decodedToken.name, decodedToken.picture);
      req.user = {
        ...decodedToken,
        uid: dbUser?.uid || decodedToken.uid,
        email: dbUser?.email || decodedToken.email,
      };
      return next();
    } catch (error) {
      console.warn('Error verifying Firebase ID token, checking fallback headers:', error);
    }
  }

  // Fallback for initial session hydration or email login fallback across devices
  if (fallbackUid && fallbackUid !== 'demo-user-omnivault') {
    try {
      const emailToResolve = fallbackEmail || `${fallbackUid}@omnivault.internal`;
      const dbUser = await getOrCreateUser(fallbackUid, emailToResolve);
      req.user = {
        uid: dbUser?.uid || fallbackUid,
        email: dbUser?.email || emailToResolve,
      } as DecodedIdToken;
      return next();
    } catch (err) {
      console.warn('Fallback user lookup failed:', err);
    }
  }

  return res.status(401).json({ error: 'Unauthorized: Missing or invalid session' });
};
