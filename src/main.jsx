// DEBUG: Check if we even get here
alert("🚀 App Starting!");
console.log("🚀 App Starting!");

import React from "react"
import ReactDOM from "react-dom/client"
import Pages from "./pages"
import "./index.css"

// CRITICAL: Redirect mobile devices to /mobilelogin on app launch
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const isCapacitor = window.location.protocol === "capacitor:";

console.log("🔧 App Starting:", {
  isMobile,
  isCapacitor,
  path: window.location.pathname
});

if ((isMobile || isCapacitor) && window.location.pathname === "/") {
  console.log("📱 Mobile device at root - redirecting to /mobilelogin");
  window.history.replaceState({}, "", "/mobilelogin");
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Pages />
  </React.StrictMode>,
)
