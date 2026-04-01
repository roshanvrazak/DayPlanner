"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await signIn("credentials", { email, password, redirectTo: "/" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-subtle">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-center">Login</h1>
        <input type="email" placeholder="Email" className="w-full p-2 border rounded" onChange={e => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" className="w-full p-2 border rounded" onChange={e => setPassword(e.target.value)} />
        <button className="w-full bg-violet-600 text-white p-2 rounded">Login</button>
      </form>
    </div>
  );
}
