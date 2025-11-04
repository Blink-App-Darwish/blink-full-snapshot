import React from "react";
import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";

export default function ChangeDetectionIndicator({ show, message, onClick }) {
  if (!show) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="relative inline-flex items-center gap-2 cursor-pointer group"
      onClick={onClick}
    >
      {/* Animated pulse ring */}
      <div className="relative">
        <motion.div
          className="absolute inset-0 rounded-full bg-yellow-400"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.5, 0, 0.5]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* Icon */}
        <div className="relative w-5 h-5 rounded-full bg-yellow-400 flex items-center justify-center">
          <AlertCircle className="w-3 h-3 text-white" strokeWidth={3} />
        </div>
      </div>

      {/* Message */}
      {message && (
        <span className="text-xs font-medium text-yellow-700 group-hover:text-yellow-800 transition-colors">
          {message}
        </span>
      )}
    </motion.div>
  );
}