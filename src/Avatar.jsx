import React from "react";

const colors = [
  "#3B82F6", "#0EA5A8", "#16A34A",
  "#F97316", "#DC2626", "#7C3AED"
];

export default function Avatar({ name, size = 32 }) {
  if (!name) return null;

  const letter = name.charAt(0).toUpperCase();
  const color = colors[name.length % colors.length];

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: color,
      color: "white",
      fontSize: size * 0.5,
      fontWeight: "bold",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }}>
      {letter}
    </div>
  );
}
