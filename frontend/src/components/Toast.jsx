import { useState, useEffect } from "react";

export default function Toast({ message, type = "success", onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed",
        top: "20px",
        right: "20px",
        backgroundColor: type === "success" ? "#2e7d32" : "#c62828",
        color: "white",
        padding: "12px 20px",
        borderRadius: "8px",
        boxShadow: "0px 4px 12px rgba(0,0,0,0.2)",
        zIndex: 9999,
        fontSize: "16px",
        animation: "fadeIn 0.5s",
      }}
    >
      {message}
    </div>
  );
}
