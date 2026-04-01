import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

export default {
  providers: [
    Credentials({
      async authorize(credentials) {
        // This will be implemented in the main auth.ts to avoid prisma in edge
        return null;
      },
    }),
  ],
} satisfies NextAuthConfig;
