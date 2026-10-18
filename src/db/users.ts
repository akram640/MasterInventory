import { db } from './index.ts';
import { users } from './schema.ts';
import { eq } from 'drizzle-orm';

export async function getOrCreateUser(uid: string, email: string, displayName?: string, photoUrl?: string) {
  try {
    const normalizedEmail = (email || '').trim().toLowerCase();

    // If a user with this email already exists in PostgreSQL, return their canonical UID
    // so logging in across phone and laptop with the same email always shares the exact same vault.
    if (normalizedEmail && !normalizedEmail.endsWith('@omnivault.internal')) {
      const existingByEmail = await db
        .select()
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);

      if (existingByEmail.length > 0) {
        return existingByEmail[0];
      }
    }

    const result = await db
      .insert(users)
      .values({
        uid,
        email: normalizedEmail || email,
        displayName: displayName || null,
        photoUrl: photoUrl || null,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: normalizedEmail || email,
          displayName: displayName || null,
          photoUrl: photoUrl || null,
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('getOrCreateUser database error:', error);
    throw new Error('Database user sync failed.', { cause: error });
  }
}
