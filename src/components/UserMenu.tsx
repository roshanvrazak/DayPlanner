"use client";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface UserMenuProps {
  streak: number;
  completedCount: number;
  totalCount: number;
}

export default function UserMenu({ streak, completedCount, totalCount }: UserMenuProps) {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  if (!session?.user) return null;

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center 
                   text-stone-500 hover:bg-stone-200 transition-colors duration-200"
      >
        <span className="text-xs font-bold uppercase">
          {session.user.name?.charAt(0) || session.user.email?.charAt(0)}
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl 
                         border border-stone-100 p-4 z-50 overflow-hidden"
            >
              <div className="mb-4">
                <p className="text-sm font-semibold text-stone-800">{session.user.name}</p>
                <p className="text-[11px] text-stone-400 truncate">{session.user.email}</p>
              </div>

              <div className="space-y-4 mb-4">
                <div>
                  <div className="flex justify-between text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">
                    <span>Daily Progress</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      className="h-full bg-violet-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-amber-50 border border-amber-100">
                  <span className="text-[11px] font-semibold text-amber-700">Current Streak</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs">🔥</span>
                    <span className="text-xs font-bold text-amber-700">{streak}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => signOut()}
                className="w-full py-2 rounded-xl text-xs font-semibold text-red-500 
                           hover:bg-red-50 transition-colors duration-200"
              >
                Sign Out
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
