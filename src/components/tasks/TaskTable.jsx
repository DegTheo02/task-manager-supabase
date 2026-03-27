import React from "react";

export default function TaskTable({
  loading,
  sortedTasks,
  requestSort,
  arrow,
  editTask,
  deleteTask,
  darkMode,
  dark,
  STATUS_COLORS,
  table,
  th,
  td
}) {
  if (loading) {
    return <p>Loading…</p>;
  }

  return (


        <table style={{ ...table(darkMode), ...dark }}>
          {/* TASK TABLE */}
          <thead>
            <tr>
              <th
                style={{ ...th(darkMode), textAlign: "left", width: "25%" }}
                onClick={() => requestSort("title")}
              >
                Title{arrow("title")}</th>
              

              <th
                style={{ ...th(darkMode), width: "9%" }}
                onClick={() => requestSort("owner")}
              >
                Owner{arrow("owner")}
              </th>


              <th
                style={{ ...th(darkMode), width: "5%" }}
                onClick={() => requestSort("team")}
              >
                Team{arrow("team")}
              </th>

              
              <th style={{ ...th(darkMode), width: "10%" }}>
                Requester
              </th>


              <th
                style={{ ...th(darkMode), width: "8%" }}
                onClick={() => requestSort("status")}
              >
                Status{arrow("status")}
              </th>

              
              <th
                style={{ ...th(darkMode), width: "8%" }}
                onClick={() => requestSort("assigned_date")}
              >
                Assigned{arrow("assigned_date")}
              </th>


              <th
                style={{ ...th(darkMode), width: "8%" }}
                onClick={() => requestSort("initial_deadline")}
              >
                Intial Deadline{arrow("initial_deadline")}
              </th>

              <th
                style={{ ...th(darkMode), width: "8%" }}
                onClick={() => requestSort("new_deadline")}
              >
                New Deadline{arrow("new_deadline")}
              </th>


              <th
                style={{ ...th(darkMode), width: "8%" }}
                onClick={() => requestSort("closing_date")}
              >
                Closing Date{arrow("closing_date")}
              </th>
              <th
              style={{ ...th(darkMode), width: "7%" }}
              onClick={() => requestSort("creator")}
              >
                Created by
              </th>
              
              <th style={{ ...th(darkMode), width: "20%" }}>Comments</th>

              <th style={{ ...th(darkMode), width: "12%" }}>Actions</th>


            </tr>
          </thead>

          <tbody>
            {sortedTasks.map(t => (
              <tr key={t.id}>
                <td style={{ ...td(darkMode), textAlign: "left" ,fontSize: "14px"}}>{t.title}</td>
                <td style={td(darkMode)}>{t.owner}</td>
                <td style={td(darkMode)}>{t.team}</td>
                <td style={td(darkMode)}>{t.requester }</td>


                <td
                  style={{
                    ...td(darkMode),
                    color: STATUS_COLORS[t.status],
                    fontWeight: 700,
                    fontSize: "13px"
                  }}
                >
                  {t.status}
                </td>


                <td style={td(darkMode)}>{t.assigned_date}</td>
                <td style={td(darkMode)}>{t.initial_deadline}</td>
                <td style={td(darkMode)}>{t.new_deadline}</td>
                <td style={td(darkMode)}>{t.closing_date || "–"}</td>
                <td style={{ ...td(darkMode), fontSize: "10px" , textAlign: "center"}}>{t.creator_name}</td>

                <td style={{ ...td(darkMode), fontSize: "12px" , textAlign: "left", whiteSpace: "pre-wrap"}}>{ t.comments }</td>

                <td style={{ ...td(darkMode), fontSize: "5px"}}>    
                <button
                  onClick={() => editTask(t, false)}
                  style={{ fontSize: "10px" }}
                >
                  Edit
                </button>
              
                {t.recurrence_group_id && (
                  <>
                    <button
                      onClick={() => editTask(t, true)}
                      style={{ fontSize: "10px", marginLeft: 4 }}
                    >
                      Edit Series
                    </button>
              
                    <button
                      onClick={() => deleteTask(t, true)}
                      style={{ fontSize: "10px", marginLeft: 4 }}
                    >
                      Delete Series
                    </button>
                  </>
                )}
              
                <button
                  onClick={() => deleteTask(t, false)}
                  style={{ fontSize: "10px", marginLeft: 4 }}
                >
                  Delete
                </button>
              </td>


              </tr>
            ))}
          </tbody>
        </table>
      );
}
