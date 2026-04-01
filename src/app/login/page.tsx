"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await signIn("credentials", { email, password, redirectTo: "/" });
      if (res?.error) setError("Invalid email or password");
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-8"
      >
        <div className="text-center">
          <h1 className="text-3xl font-bold text-stone-800 tracking-tight">DayPlanner</h1>
          <p className="text-sm text-stone-400 mt-2">Simplify your day. One block at a time.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <input
              type="email"
              placeholder="Email"
              className="w-full px-4 py-3 rounded-2xl border-0 bg-white shadow-sm ring-1 ring-stone-200 focus:ring-2 focus:ring-violet-500 transition-all outline-none"
              onChange={e => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              className="w-full px-4 py-3 rounded-2xl border-0 bg-white shadow-sm ring-1 ring-stone-200 focus:ring-2 focus:ring-violet-500 transition-all outline-none"
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <p className="text-xs text-red-500 text-center font-medium">{error}</p>
          )}

          <button 
            disabled={loading}
            className="w-full py-3 rounded-2xl bg-stone-900 text-white font-semibold hover:bg-stone-800 transition-all disabled:opacity-50 shadow-lg shadow-stone-200"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="text-center text-sm text-stone-500">
          New here? <Link href="/signup" className="text-violet-600 font-semibold hover:underline">Create account</Link>
        </p>
      </motion.div>
    </div>
  );
}
