"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export default function SettingsModal({ isOpen, onClose, onSave }: SettingsModalProps) {
  const [dayStartTime, setDayStartTime] = useState("09:00");
  const [dayEndTime, setDayEndTime] = useState("17:00");
  const [strictMode, setStrictMode] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetch("/api/settings")
        .then((res) => res.json())
        .then((data) => {
          setDayStartTime(data.dayStartTime || "09:00");
          setDayEndTime(data.dayEndTime || "17:00");
          setStrictMode(data.strictMode ?? true);
        })
        .catch(console.error);
    }
  }, [isOpen]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dayStartTime, dayEndTime, strictMode }),
      });
      toast.success("Settings saved");
      onSave();
      onClose();
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
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
            <h3 className="text-base font-semibold text-stone-800 mb-4">Settings</h3>

            <div className="space-y-4">
              {/* Working Hours */}
              <div>
                <label className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider block mb-1.5">
                  Working Hours
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="time"
                    value={dayStartTime}
                    onChange={(e) => setDayStartTime(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-stone-200
                               bg-stone-50/50 text-sm text-stone-800
                               focus:outline-none focus:ring-2 focus:ring-violet-200
                               focus:border-violet-300 transition-all duration-200"
                  />
                  <span className="text-stone-400 text-sm">to</span>
                  <input
                    type="time"
                    value={dayEndTime}
                    onChange={(e) => setDayEndTime(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-stone-200
                               bg-stone-50/50 text-sm text-stone-800
                               focus:outline-none focus:ring-2 focus:ring-violet-200
                               focus:border-violet-300 transition-all duration-200"
                  />
                </div>
              </div>

              {/* Strict Mode */}
              <div>
                <label className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider block mb-1.5">
                  Strict Mode
                </label>
                <button
                  type="button"
                  onClick={() => setStrictMode(!strictMode)}
                  className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl
                             border border-stone-200 bg-stone-50/50 transition-all duration-200"
                >
                  <div
                    className={`w-10 h-6 rounded-full relative transition-colors duration-300 ${
                      strictMode ? "bg-violet-500" : "bg-stone-300"
                    }`}
                  >
                    <motion.div
                      animate={{ x: strictMode ? 18 : 2 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
                    />
                  </div>
                  <span className="text-sm text-stone-600">
                    {strictMode ? "Lock schedule when day starts" : "Schedule remains editable"}
                  </span>
                </button>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold
                             bg-stone-100 text-stone-500 hover:bg-stone-200
                             transition-colors duration-200"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold
                             bg-gradient-to-r from-violet-500 to-purple-500
                             text-white shadow-lg shadow-violet-200/40
                             disabled:opacity-50 transition-all duration-200"
                >
                  {saving ? "Saving..." : "Save"}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
