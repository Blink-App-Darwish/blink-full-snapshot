import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Play, CalendarDays, Wallet } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function EnablerFloatingMenu({ isOpen, onClose }) {
  const navigate = useNavigate();

  const menuItems = [
    {
      id: "reels",
      icon: Play,
      path: "ReelsViewer",
      color: "text-pink-500"
    },
    {
      id: "calendar",
      icon: CalendarDays,
      path: "EnablerCalendar",
      color: "text-blue-500"
    },
    {
      id: "finance",
      icon: Wallet,
      path: "EnablerFinance",
      color: "text-emerald-500"
    }
  ];

  const handleItemClick = (path) => {
    navigate(createPageUrl(path));
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Ultra Subtle Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="fixed inset-0 z-30"
            style={{
              background: 'radial-gradient(circle at bottom center, rgba(0, 0, 0, 0.08), rgba(0, 0, 0, 0.02))',
              backdropFilter: 'blur(2px)',
              WebkitBackdropFilter: 'blur(2px)'
            }}
            onClick={onClose}
          />

          {/* Vertical Floating Menu */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
            className="fixed bottom-24 right-6 z-40 flex flex-col gap-2"
          >
            {menuItems.map((item, index) => (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, x: 20, scale: 0.8 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.8 }}
                transition={{ 
                  delay: index * 0.05,
                  duration: 0.3,
                  ease: [0.34, 1.56, 0.64, 1]
                }}
                onClick={() => handleItemClick(item.path)}
                className="group relative"
              >
                {/* Simple Glass Button - Matching Bottom Nav Style */}
                <div 
                  className="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 active:scale-90"
                  style={{
                    background: 'rgba(255, 255, 255, 0.7)',
                    backdropFilter: 'blur(16px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                    border: '1px solid rgba(0, 0, 0, 0.06)',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.5)'
                  }}
                >
                  <item.icon 
                    className={`w-5 h-5 ${item.color} transition-all duration-200 group-hover:scale-110 group-active:scale-95`}
                    strokeWidth={1.5}
                  />
                </div>

                {/* Subtle hover glow */}
                <div 
                  className={`absolute inset-0 rounded-full ${item.color.replace('text-', 'bg-')} opacity-0 group-hover:opacity-10 blur-lg transition-opacity duration-300 -z-10`}
                />
              </motion.button>
            ))}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}