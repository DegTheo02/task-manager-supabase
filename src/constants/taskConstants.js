/* ===============================
   TASK DOMAIN CONSTANTS
================================ */

/* STATUSES */
export const STATUSES = [
  "CLOSED ON TIME",
  "CLOSED PAST DUE",
  "ON TRACK",
  "OVERDUE",
  "ON HOLD"
];

export const STATUS_COLORS = {
  "ON TRACK": "#3B82F6",
  "OVERDUE": "#DC2626",
  "ON HOLD": "#6B7280",
  "CLOSED ON TIME": "#16A34A",
  "CLOSED PAST DUE": "#F97316"
};

export const STATUS_ICONS = {
  "ON TRACK": "🔄",
  "OVERDUE": "⛔",
  "ON HOLD": "⏸",
  "CLOSED ON TIME": "✅",
  "CLOSED PAST DUE": "⚠️"
};

/* OWNERS */
export const OWNERS = [
  "AURELLE",
  "CHRISTIAN",
  "SERGEA",
  "FABRICE",
  "FLORIAN",
  "JOSIAS",
  "ESTHER",
  "MARIUS",
  "THEOPHANE",
  "FLYTXT",
  "IT",
  "OTHER"
];

/* TEAMS */
export const TEAMS = ["BI", "CVM", "SM", "FLYTXT", "IT", "OTHER"];

/* OWNER → TEAM */
export const OWNER_TEAM_MAP = {
  AURELLE: "BI",
  SERGEA: "BI",
  CHRISTIAN: "BI",
  FABRICE: "BI",
  FLORIAN: "CVM",
  ESTHER: "CVM",
  JOSIAS: "CVM",
  MARIUS: "CVM",
  THEOPHANE: "SM",
  FLYTXT: "FLYTXT",
  IT: "IT",
  OTHER: "OTHER"
};

/* RECURRENCE */
export const RECURRENCE_TYPES = [
  "Non-Recurring",
  "Recurring Weekly",
  "Recurring Monthly"
];

/* REQUESTERS */
export const REQUESTERS = [
  "BI&CVM",
  "BP",
  "BRAND&COM",
  "CEO",
  "CES",
  "CMDO",
  "CONSUMER",
  "DIGITAL",
  "EBU",
  "FINANCE",
  "HR",
  "INTERNAL AUDIT",
  "IT",
  "MFS",
  "OPS REVIEW",
  "PRM",
  "RISK&COMPLIANCE",
  "SD",
  "VP",
  "OTHER"
];
