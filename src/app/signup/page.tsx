"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/signup", {
      method: "POST",
      body: JSON.stringify(form),
    });
    if (res.ok) router.push("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-subtle">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-center">Join DayPlanner</h1>
        <input type="text" placeholder="Name" className="w-full p-2 border rounded" onChange={e => setForm({...form, name: e.target.value})} />
        <input type="email" placeholder="Email" className="w-full p-2 border rounded" onChange={e => setForm({...form, email: e.target.value})} />
        <input type="password" placeholder="Password" className="w-full p-2 border rounded" onChange={e => setForm({...form, password: e.target.value})} />
        <button className="w-full bg-violet-600 text-white p-2 rounded">Sign Up</button>
      </form>
    </div>
  );
}
