import React from "react";

const LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68debc13e09ac863690db587/52cce7784_Untitleddesign-5.png";

export default function BlinkLogo({ size = "md", className = "" }) {
  const sizes = {
    xs: "w-5 h-5",
    sm: "w-8 h-8",
    md: "w-14 h-14",
    lg: "w-20 h-20",
    xl: "w-32 h-32"
  };
  
  return (
    <img
      src={LOGO_URL}
      alt="Blink Logo"
      className={`${sizes[size]} object-contain ${className}`}
      style={{ margin: 0, padding: 0, display: 'block' }}
    />
  );
}