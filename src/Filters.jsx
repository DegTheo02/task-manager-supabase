export default function Filters({ onChange }) {
  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
      <input placeholder="Search title" onChange={e => onChange({ search: e.target.value })} />
      <select onChange={e => onChange({ owner: e.target.value })}>
        <option value="">Owner</option>
        {["AURELLE","CHRISTIAN","SERGEA","FABRICE","FLORIAN","JOSIAS","ESTHER","MARIUS","THEOPHANE"].map(o =>
          <option key={o}>{o}</option>
        )}
      </select>
      <select onChange={e => onChange({ status: e.target.value })}>
        <option value="">Status</option>
        {["OPEN","ONGOING","OVERDUE","ON HOLD","CLOSED ON TIME","CLOSED PAST DUE"].map(s =>
          <option key={s}>{s}</option>
        )}
      </select>
    </div>
  );
}
