const [rows, setRows] = useState([]);

const [filters, setFilters] = useState({
  owners: [],
  teams: [],
  statuses: [],
  date_from: "",
  date_to: ""
});


const loadData = async () => {
  let query = supabase
    .from("task_daily_status")
    .select("status_day, status, owner, team");

  if (filters.owners.length)
    query = query.in("owner", filters.owners);

  if (filters.teams.length)
    query = query.in("team", filters.teams);

  if (filters.statuses.length)
    query = query.in("status", filters.statuses);

  if (filters.date_from)
    query = query.gte("status_day", filters.date_from);

  if (filters.date_to)
    query = query.lte("status_day", filters.date_to);

  const { data, error } = await query;
  if (!error) setRows(data || []);
};


useEffect(() => {
  loadData();
}, [filters]);


const chartData = useMemo(() => {
  const days = [...new Set(rows.map(r => r.status_day))].sort();

  const datasets = ["CLOSED ON TIME", "CLOSED PAST DUE", "ON TRACK", "OVERDUE"]
    .map(status => ({
      label: status,
      data: days.map(day =>
        rows.filter(r => r.status_day === day && r.status === status).length
      ),
      backgroundColor: STATUS_COLORS[status]
    }));

  return {
    labels: days,
    datasets
  };
}, [rows]);


<Bar
  data={chartData}
  options={{
    responsive: true,
    scales: {
      x: { stacked: true },
      y: { stacked: true, beginAtZero: true }
    },
    plugins: {
      legend: {
        labels: { font: { size: 14, weight: "600" } }
      }
    }
  }}
/>
