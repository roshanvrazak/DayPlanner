"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";

export default function SignupPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      
      if (res.ok) {
        router.push("/login");
      } else {
        const data = await res.json();
        setError(data.error || "Something went wrong. Please try again.");
      }
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
          <p className="text-sm text-stone-400 mt-2">Join us and start planning your perfect day.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Name"
              className="w-full px-4 py-3 rounded-2xl border-0 bg-white shadow-sm ring-1 ring-stone-200 focus:ring-2 focus:ring-violet-500 transition-all outline-none"
              onChange={e => setForm({ ...form, name: e.target.value })}
              required
            />
            <input
              type="email"
              placeholder="Email"
              className="w-full px-4 py-3 rounded-2xl border-0 bg-white shadow-sm ring-1 ring-stone-200 focus:ring-2 focus:ring-violet-500 transition-all outline-none"
              onChange={e => setForm({ ...form, email: e.target.value })}
              required
            />
            <input
              type="password"
              placeholder="Password"
              className="w-full px-4 py-3 rounded-2xl border-0 bg-white shadow-sm ring-1 ring-stone-200 focus:ring-2 focus:ring-violet-500 transition-all outline-none"
              onChange={e => setForm({ ...form, password: e.target.value })}
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
            {loading ? "Creating account..." : "Sign up"}
          </button>
        </form>

        <p className="text-center text-sm text-stone-500">
          Already have an account? <Link href="/login" className="text-violet-600 font-semibold hover:underline">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}
