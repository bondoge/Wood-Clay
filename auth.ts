import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import * as argon2 from "argon2";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";

const credentialsSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1),
});

// Coarse, defense-in-depth: catches one IP spraying attempts across many
// accounts. The tighter, more meaningful guard is per-email below.
const loginLimiterByIp = createRateLimiter(10 * 60 * 1000, 20);
// Protects one account against brute-force regardless of the attacker's IP.
const loginLimiterByEmail = createRateLimiter(10 * 60 * 1000, 5);

// Verified once against a real hash on module load, then reused: comparing
// against a stable dummy hash on the "no such user" path costs roughly the
// same time as a real password check, so responses don't leak via timing
// whether an email exists.
const dummyHash = argon2.hash(crypto.randomUUID());

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Credentials provider only persists via JWTs — Auth.js does not run
  // Credentials sign-ins through an adapter (no createUser/linkAccount call),
  // so database sessions aren't available here; that's a library constraint,
  // not a choice. See node_modules/next-auth's own Credentials provider docs.
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  trustHost: true, // no fixed domain yet — site is still served by bare IP
  useSecureCookies: process.env.COOKIE_SECURE === "true",
  pages: { signIn: "/account/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email" },
        password: { label: "Пароль", type: "password" },
      },
      authorize: async (credentials, request) => {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const ip = getClientIp(request);
        if (loginLimiterByIp(ip) || loginLimiterByEmail(email)) return null;

        const [user] = await db.select().from(users).where(eq(users.email, email));
        if (!user) {
          await argon2.verify(await dummyHash, password).catch(() => false);
          return null;
        }

        const valid = await argon2.verify(user.passwordHash, password).catch(() => false);
        if (!valid) return null;

        return { id: user.id, email: user.email };
      },
    }),
  ],
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) token.sub = user.id;
      return token;
    },
    session: ({ session, token }) => {
      if (token.sub && session.user) session.user.id = token.sub;
      return session;
    },
  },
});
