export default function Avatar({ name }) {
  return (
    <div style={{
      width: 28,
      height: 28,
      borderRadius: "50%",
      background: "#2563eb",
      color: "white",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 12,
      fontWeight: "bold"
    }}>
      {name?.[0]}
    </div>
  );
}
