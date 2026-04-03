"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface OverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOverride: () => void;
}

export default function OverrideModal({ isOpen, onClose, onOverride }: OverrideModalProps) {
  const [phrase, setPhrase] = useState("");
  const [requiredPhrase, setRequiredPhrase] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Fetch the user's override phrase when modal opens
  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.overridePhrase) setRequiredPhrase(data.overridePhrase);
      })
      .catch(() => {});
  }, [isOpen]);

  const isMatch = phrase === requiredPhrase && requiredPhrase.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMatch) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmationPhrase: phrase }),
      });

      if (res.ok) {
        setPhrase("");
        onOverride();
        onClose();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to override");
      }
    } catch {
      setError("Failed to override lock");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center
                     focus-backdrop bg-stone-900/20"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4
                       shadow-2xl shadow-stone-900/10"
          >
            {/* Warning icon */}
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>

            <h3 className="text-base font-semibold text-stone-800 text-center mb-2">
              Emergency Override
            </h3>
            <p className="text-sm text-stone-500 text-center mb-4">
              Unlocking today&apos;s schedule will <span className="font-semibold text-red-500">break your streak</span>.
              This cannot be undone.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider block mb-1.5">
                  {requiredPhrase
                    ? <>Type &quot;<span className="text-red-400">{requiredPhrase}</span>&quot; to confirm</>
                    : "Loading your override phrase..."}
                </label>
                <input
                  type="text"
                  value={phrase}
                  onChange={(e) => {
                    setPhrase(e.target.value.toUpperCase());
                    setError("");
                  }}
                  placeholder={requiredPhrase || "Loading..."}
                  autoFocus
                  disabled={!requiredPhrase}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200
                             bg-stone-50/50 text-sm text-stone-800 text-center
                             placeholder:text-stone-300 uppercase tracking-wider
                             focus:outline-none focus:ring-2 focus:ring-red-200
                             focus:border-red-300 transition-all duration-200
                             disabled:opacity-50"
                />
                {error && (
                  <p className="text-xs text-red-500 mt-1 text-center">{error}</p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPhrase("");
                    setError("");
                    onClose();
                  }}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold
                             bg-stone-100 text-stone-500 hover:bg-stone-200
                             transition-colors duration-200"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={isMatch ? { scale: 1.02 } : {}}
                  whileTap={isMatch ? { scale: 0.98 } : {}}
                  type="submit"
                  disabled={!isMatch || submitting}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold
                             bg-red-500 text-white
                             disabled:opacity-30 disabled:cursor-not-allowed
                             transition-all duration-200"
                >
                  {submitting ? "Unlocking..." : "Unlock Schedule"}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
