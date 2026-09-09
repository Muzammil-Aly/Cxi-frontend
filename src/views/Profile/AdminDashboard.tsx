"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Chip,
  IconButton,
  CircularProgress,
  Pagination,
  Tooltip,
  Select,
  MenuItem,
  Avatar,
} from "@mui/material";
import Timeline from "@mui/lab/Timeline";
import TimelineItem from "@mui/lab/TimelineItem";
import TimelineSeparator from "@mui/lab/TimelineSeparator";
import TimelineConnector from "@mui/lab/TimelineConnector";
import TimelineContent from "@mui/lab/TimelineContent";
import TimelineDot from "@mui/lab/TimelineDot";
import TimelineOppositeContent from "@mui/lab/TimelineOppositeContent";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import LoginIcon from "@mui/icons-material/Login";
import LogoutIcon from "@mui/icons-material/Logout";
import PeopleIcon from "@mui/icons-material/People";
import PersonIcon from "@mui/icons-material/Person";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import dayjs, { Dayjs } from "dayjs";
import {
  useGetCxiUsersQuery,
  useGetSessionsQuery,
  useGetSessionInteractionsQuery,
  useGetSessionStatsQuery,
  useGetActiveSessionsQuery,
} from "@/redux/services/authApi";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import CustomDateRangePicker from "@/components/Common/DatePicker/CustomDateRangePicker";

// ── Colors ──
const COLORS = {
  bg: "#F8F6F1",
  bgCard: "#FFFFFF",
  bgHover: "#F5F3EE",
  border: "#E5E5E5",
  textPrimary: "#1A1A1A",
  textSecondary: "#6B7280",
  accent: "#4F46E5",
  accentHover: "#4338CA",
};

// ── Helpers ──
const formatDate = (dateString: string | null) => {
  if (!dateString) return "N/A";
  return dayjs(dateString).format("MMM D, YYYY h:mm A");
};

const formatTimeOnly = (dateString: string | null) => {
  if (!dateString) return "";
  return dayjs(dateString).format("h:mm:ss A");
};

const formatDurationHMS = (ms: number) => {
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

const truncateSessionId = (sessionId: string) => {
  if (sessionId.length <= 16) return sessionId;
  return `${sessionId.slice(0, 8)}...${sessionId.slice(-8)}`;
};

const parseQueryParams = (queryParams: string | null) => {
  if (!queryParams) return { tab: "-", params: "-" };
  try {
    const parsed = JSON.parse(queryParams);
    const tabParts: string[] = [];
    if (parsed.tab) tabParts.push(parsed.tab);
    if (parsed.source) tabParts.push(parsed.source);
    const tab = tabParts.length > 0 ? tabParts.join(" / ") : "-";
    const entries = Object.entries(parsed)
      .filter(
        ([key]) =>
          key !== "source" &&
          key !== "tab" &&
          key !== "page" &&
          key !== "page_size",
      )
      .filter(
        ([, value]) =>
          value !== undefined &&
          value !== null &&
          value !== "null" &&
          value !== "",
      )
      .map(([key, value]) => `${key}=${value}`);
    return { tab, params: entries.length > 0 ? entries.join(" | ") : "-" };
  } catch {
    const decoded = decodeURIComponent(queryParams.replace(/\+/g, " "));
    const parts = decoded.split("&");
    const tabParts: string[] = [];
    const filtered = parts.filter((param) => {
      if (param.startsWith("source=") || param.startsWith("tab=")) {
        const [, value] = param.split("=");
        if (value) tabParts.push(value);
        return false;
      }
      if (param.startsWith("page=") || param.startsWith("page_size="))
        return false;
      return true;
    });
    const tab = tabParts.length > 0 ? tabParts.join(" / ") : "-";
    return { tab, params: filtered.length > 0 ? filtered.join(" | ") : "-" };
  }
};

const ENDPOINT_LABEL_MAP: Record<string, string> = {
  customer_order_items: "Order Items",
  customer_orders_return: "Returns",
  customer_orders_refund: "Refunds",
  customer_orders: "Orders",
  support_ticket_comments: "Support Ticket Comments",
  support_tickets: "Support Tickets",
  customer_events: "Marketing Events",
  customer_profiles: "Customer Profiles",
  customer_segments: "Customer Segments",
  inventory_Availability: "Inventory",
  qty_so_pop_up: "Qty on SO",
  qty_po_pop_up: "Qty on PO",
  qty_available_pop_up2: "Qty Available 2",
  qty_available_pop_up1: "Qty Available",
  touchup_part: "Touchup Part",
  touchup_pen: "Touchup Pen",
  item_tracking_comments: "Item Tracking Comments",
  location_item_lot: "Location Item Lot",
  nav_eta: "Nav ETA",
};

const getActionLabel = (endpoint: string, tab: string) => {
  if (endpoint.includes("preferences/upsert")) return "Updated Preferences";
  for (const [key, label] of Object.entries(ENDPOINT_LABEL_MAP)) {
    if (endpoint.includes(key)) return `Viewed ${label}`;
  }
  return tab !== "-" ? `Viewed ${tab}` : endpoint.split("/").pop() || endpoint;
};

const prepareTimelineGroups = (interactions: any[]) => {
  if (!interactions.length) return [];
  const sorted = [...interactions].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  // Attach duration to each action = time until next action
  const withDuration = sorted.map((interaction, i) => {
    const next = sorted[i + 1];
    const _duration = next
      ? new Date(next.created_at).getTime() - new Date(interaction.created_at).getTime()
      : null;
    return { ...interaction, _duration };
  });
  // Group consecutive same-tab interactions (run-length encoding).
  // A new group starts whenever the tab changes, so "Orders → Inventory → Orders"
  // produces three groups instead of merging both Orders runs together.
  const groups: Array<{ tab: string; actions: any[] }> = [];
  withDuration.forEach((interaction) => {
    const { tab } = parseQueryParams(interaction.query_params);
    const key =
      tab || ENDPOINT_LABEL_MAP[interaction.endpoint] || interaction.endpoint;
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.tab === key) {
      lastGroup.actions.push(interaction);
    } else {
      groups.push({ tab: key, actions: [interaction] });
    }
  });
  return groups;
};

const formatDuration = (minutes: number | null | undefined) => {
  if (minutes == null) return "-";
  const totalMins = Math.floor(minutes);
  const d = Math.floor(totalMins / 1440);
  const h = Math.floor((totalMins % 1440) / 60);
  const m = totalMins % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return "0s";
};

const formatDurationHM = (minutes: number | null | undefined) => {
  if (minutes == null) return "-";
  const totalMins = Math.floor(minutes);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return "0s";
};

const SESSION_PAGE_SIZE_OPTIONS = [10, 20, 50];

const STAT_CARDS = [
  { key: "total_sessions", label: "Total Sessions", color: "#4F46E5" },
  { key: "unique_sessions", label: "Unique Sessions", color: "#0EA5E9" },
  { key: "unique_users", label: "Unique Users", color: "#8B5CF6" },
  {
    key: "avg_session_time_minutes",
    label: "Avg Session Time",
    color: "#F59E0B",
    format: formatDurationHM,
  },
  {
    key: "total_session_duration_minutes",
    label: "Total Duration",
    color: "#10B981",
    format: formatDuration,
  },
];

// ── Reusable stat cards ──
const StatsCards = ({
  stats,
  loading,
}: {
  stats: any;
  loading: boolean;
}) => (
  <Box
    sx={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
      gap: 2,
      mb: 3,
    }}
  >
    {STAT_CARDS.map((card) => (
      <Box
        key={card.key}
        sx={{
          bgcolor: COLORS.bgCard,
          borderRadius: "12px",
          p: 2.5,
          border: `1px solid ${COLORS.border}`,
          textAlign: "center",
          transition: "box-shadow 0.2s",
          "&:hover": { boxShadow: "0 2px 12px rgba(0,0,0,0.08)" },
        }}
      >
        <Typography
          sx={{
            fontSize: "11px",
            fontWeight: 600,
            color: COLORS.textSecondary,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            mb: 0.5,
          }}
        >
          {card.label}
        </Typography>
        {loading ? (
          <CircularProgress size={22} sx={{ color: card.color, mt: 0.5 }} />
        ) : (
          <Typography
            sx={{ fontSize: "24px", fontWeight: 700, color: card.color }}
          >
            {card.format
              ? card.format(stats?.[card.key])
              : stats?.[card.key] ?? "-"}
          </Typography>
        )}
      </Box>
    ))}
  </Box>
);

// ── Main Component ──
interface AdminDashboardProps {
  headerActions?: React.ReactNode;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ headerActions }) => {
  // Date filter
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);
  const [dateFilter, setDateFilter] = useState<string | undefined>(undefined);

  // Navigation state
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [interactionsTransitioning, setInteractionsTransitioning] = useState(false);

  // Pagination
  const [sessionsPage, setSessionsPage] = useState(1);
  const [sessionsPageSize, setSessionsPageSize] = useState(20);
  const [interactionPage, setInteractionPage] = useState(1);
  const [interactionPageSize, setInteractionPageSize] = useState(50);

  // Column sort
  const [sortCol, setSortCol] = useState<string>("active_sessions");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const handleColSort = (col: string) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("desc");
    }
  };

  const parsedDates = dateFilter?.split(",") || [];
  const dateFrom = parsedDates[0] || undefined;
  const dateTo = parsedDates[1] || undefined;

  // ── API Queries ──
  const { data: usersData, isLoading: usersLoading } =
    useGetCxiUsersQuery(undefined);

  const { data: activeSessionsData } = useGetActiveSessionsQuery();

  // Global stats (all users)
  const { data: globalStatsData, isLoading: globalStatsLoading } =
    useGetSessionStatsQuery({
      date_from: dateFrom,
      date_to: dateTo,
    });

  // Per-user stats (when a user is selected)
  const { data: userStatsData, isLoading: userStatsLoading } =
    useGetSessionStatsQuery(
      {
        user_id: selectedUserId || undefined,
        date_from: dateFrom,
        date_to: dateTo,
      },
      { skip: !selectedUserId },
    );

  // Sessions for selected user
  const {
    data: sessionsData,
    isLoading: sessionsLoading,
    isFetching: sessionsFetching,
  } = useGetSessionsQuery(
    {
      user_id: selectedUserId || "",
      page: sessionsPage,
      page_size: sessionsPageSize,
      date_from: dateFrom,
      date_to: dateTo,
    },
    { skip: !selectedUserId },
  );

  // Interactions for selected session
  const {
    data: interactionsData,
    isLoading: interactionsLoading,
    isFetching: interactionsFetching,
  } = useGetSessionInteractionsQuery(
    {
      user_id: selectedUserId || "",
      session_id: selectedSessionId || "",
      page: interactionPage,
      page_size: interactionPageSize,
    },
    { skip: !selectedSessionId || !selectedUserId },
  );

  useEffect(() => {
    if (selectedUserId && !sessionsLoading && !sessionsFetching && sessionsData) {
      const t = setTimeout(() => setLoadedUserId(selectedUserId), 400);
      return () => clearTimeout(t);
    }
  }, [selectedUserId, sessionsLoading, sessionsFetching, sessionsData]);

  useEffect(() => {
    if (!interactionsLoading && !interactionsFetching && interactionsData) {
      setInteractionsTransitioning(false);
    }
  }, [interactionsLoading, interactionsFetching, interactionsData]);

  const rawUsers = usersData?.data || [];
  const activeMap: Record<string, { active_sessions: number; total_sessions: number }> =
    activeSessionsData?.data || {};

  const users = [...rawUsers].sort((a: any, b: any) => {
    let aVal: any;
    let bVal: any;
    if (sortCol === "active_sessions") {
      aVal = activeMap[a.user_id]?.active_sessions ?? 0;
      bVal = activeMap[b.user_id]?.active_sessions ?? 0;
    } else if (sortCol === "total_sessions") {
      aVal = activeMap[a.user_id]?.total_sessions ?? 0;
      bVal = activeMap[b.user_id]?.total_sessions ?? 0;
    } else if (sortCol === "user_name") {
      aVal = (a.user_name || "").toLowerCase();
      bVal = (b.user_name || "").toLowerCase();
    } else if (sortCol === "email") {
      aVal = (a.email || "").toLowerCase();
      bVal = (b.email || "").toLowerCase();
    } else if (sortCol === "user_id") {
      aVal = (a.user_id || "").toLowerCase();
      bVal = (b.user_id || "").toLowerCase();
    } else {
      aVal = 0; bVal = 0;
    }
    if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const totalActiveUsers = Object.values(activeMap).filter((v) => v.active_sessions > 0).length;
  const totalActiveSessions = Object.values(activeMap).reduce((sum, v) => sum + v.active_sessions, 0);

  const sessions = sessionsData?.data?.sessions || [];
  const totalSessions = sessionsData?.data?.total || 0;
  const totalSessionPages = Math.ceil(totalSessions / sessionsPageSize);
  const interactions = interactionsData?.data?.interactions || [];
  const totalInteractions = interactionsData?.data?.total || 0;
  const totalInteractionPages = Math.ceil(
    totalInteractions / interactionPageSize,
  );

  // ── Handlers ──
  const handleUserClick = (userId: string) => {
    setLoadedUserId(null);
    setSelectedUserId(userId);
    setSelectedSessionId(null);
    setSessionsPage(1);
    setInteractionPage(1);
  };

  const handleSessionClick = (sessionId: string) => {
    setInteractionsTransitioning(true);
    setSelectedSessionId(sessionId);
    setInteractionPage(1);
  };

  const handleBack = () => {
    if (selectedSessionId) {
      setSelectedSessionId(null);
      setInteractionPage(1);
    } else {
      setSelectedUserId(null);
      setLoadedUserId(null);
      setSessionsPage(1);
      setStartDate(null);
      setEndDate(null);
      setDateFilter(undefined);
    }
  };

  const handleDatePageReset = (page: number) => {
    setSessionsPage(page);
  };

  const selectedUser = users.find(
    (u: any) => u.user_id === selectedUserId,
  );

  // ── Shared styles ──
  const selectStyles = {
    color: COLORS.textPrimary,
    bgcolor: COLORS.bgCard,
    ".MuiOutlinedInput-notchedOutline": { borderColor: COLORS.border },
    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#D1D5DB" },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
      borderColor: COLORS.accent,
    },
    ".MuiSvgIcon-root": { color: COLORS.textSecondary },
  };

  const menuProps = {
    PaperProps: {
      sx: {
        bgcolor: COLORS.bgCard,
        color: COLORS.textPrimary,
        maxHeight: 300,
        boxShadow:
          "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)",
        border: `1px solid ${COLORS.border}`,
      },
    },
  };

  const menuItemStyles = {
    "&:hover": { bgcolor: COLORS.bgHover },
    "&.Mui-selected": { bgcolor: "rgba(79, 70, 229, 0.08)" },
    "&.Mui-selected:hover": { bgcolor: "rgba(79, 70, 229, 0.12)" },
  };

  return (
    <Box sx={{ p: 3, pl: 8, bgcolor: COLORS.bg, minHeight: "100%" }}>
      {/* ── Header ── */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 3,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          {(selectedUserId || selectedSessionId) && (
            <IconButton
              onClick={handleBack}
              sx={{
                bgcolor: COLORS.bgCard,
                border: `1px solid ${COLORS.border}`,
                "&:hover": { bgcolor: COLORS.bgHover },
              }}
            >
              <ArrowBackIcon />
            </IconButton>
          )}
          <Box>
            <Typography
              variant="h5"
              sx={{ fontWeight: 700, color: COLORS.textPrimary }}
            >
              {selectedSessionId
                ? "Session Activity"
                : selectedUserId
                  ? `${selectedUser?.user_name || selectedUserId}'s Sessions`
                  : "Admin Dashboard"}
            </Typography>
            <Typography
              sx={{ fontSize: "13px", color: COLORS.textSecondary, mt: 0.25 }}
            >
              {selectedSessionId
                ? `Session: ${truncateSessionId(selectedSessionId)}`
                : selectedUserId
                  ? `${selectedUser?.email || ""}`
                  : "Monitor user activity and sessions"}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1 }}>
          {headerActions}
          <Box sx={{ width: 280 }}>
            <CustomDateRangePicker
              startDate={startDate}
              endDate={endDate}
              setStartDate={setStartDate}
              setEndDate={setEndDate}
              setFilter={setDateFilter}
              setPage={handleDatePageReset}
              width={280}
            />
          </Box>
        </Box>
      </Box>

      {/* ── Stats Cards ── */}
      <StatsCards
        stats={
          selectedUserId ? userStatsData?.data : globalStatsData?.data
        }
        loading={selectedUserId ? userStatsLoading : globalStatsLoading}
      />

      {/* ── Content ── */}
      <Box
        sx={{
          bgcolor: COLORS.bgCard,
          borderRadius: "12px",
          border: `1px solid ${COLORS.border}`,
          overflow: "hidden",
        }}
      >
        {!selectedUserId ? (
          /* ─── USERS LIST ─── */
          <>
            {/* Live Now Banner */}
            <Box
              sx={{
                px: 3,
                py: 2,
                borderBottom: `1px solid ${COLORS.border}`,
                bgcolor: totalActiveSessions > 0 ? "rgba(16, 185, 129, 0.05)" : COLORS.bgCard,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <PeopleIcon sx={{ color: COLORS.accent, fontSize: 20 }} />
                <Typography
                  sx={{
                    fontWeight: 600,
                    fontSize: "15px",
                    color: COLORS.textPrimary,
                  }}
                >
                  Users ({users.length})
                </Typography>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.75,
                    bgcolor: totalActiveSessions > 0 ? "rgba(16, 185, 129, 0.1)" : "rgba(107,114,128,0.08)",
                    px: 2,
                    py: 0.75,
                    borderRadius: "20px",
                  }}
                >
                  <FiberManualRecordIcon
                    sx={{
                      fontSize: 10,
                      color: totalActiveSessions > 0 ? "#10b981" : COLORS.textSecondary,
                      ...(totalActiveSessions > 0 && {
                        animation: "pulse 2s infinite",
                        "@keyframes pulse": {
                          "0%, 100%": { opacity: 1 },
                          "50%": { opacity: 0.4 },
                        },
                      }),
                    }}
                  />
                  <Typography
                    sx={{
                      fontSize: "13px",
                      fontWeight: 600,
                      color: totalActiveSessions > 0 ? "#10b981" : COLORS.textSecondary,
                    }}
                  >
                    {totalActiveUsers} user{totalActiveUsers !== 1 ? "s" : ""} online
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.75,
                    bgcolor: totalActiveSessions > 0 ? "rgba(79,70,229,0.08)" : "rgba(107,114,128,0.08)",
                    px: 2,
                    py: 0.75,
                    borderRadius: "20px",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "13px",
                      fontWeight: 600,
                      color: totalActiveSessions > 0 ? COLORS.accent : COLORS.textSecondary,
                    }}
                  >
                    {totalActiveSessions} live session{totalActiveSessions !== 1 ? "s" : ""}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {usersLoading ? (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  p: 6,
                }}
              >
                <CircularProgress sx={{ color: COLORS.accent }} size={32} />
              </Box>
            ) : (
              <Box>
                {/* Header */}
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "50px 1fr 1fr 140px 120px 120px",
                    gap: 2,
                    px: 3,
                    py: 1.5,
                    borderBottom: `1px solid ${COLORS.border}`,
                  }}
                >
                  {(
                    [
                      { label: "", col: null },
                      { label: "Name", col: "user_name" },
                      { label: "Email", col: "email" },
                      { label: "Active Sessions", col: "active_sessions" },
                      { label: "Total Sessions", col: "total_sessions" },
                      { label: "User ID", col: "user_id" },
                    ] as { label: string; col: string | null }[]
                  ).map(({ label, col }) =>
                    col ? (
                      <Box
                        key={col}
                        onClick={() => handleColSort(col)}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.25,
                          cursor: "pointer",
                          userSelect: "none",
                          "&:hover .sort-icon": { opacity: 1 },
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: "11px",
                            fontWeight: 600,
                            color: sortCol === col ? COLORS.accent : COLORS.textSecondary,
                            textTransform: "uppercase",
                          }}
                        >
                          {label}
                        </Typography>
                        {sortCol === col ? (
                          sortDir === "asc" ? (
                            <KeyboardArrowUpIcon sx={{ fontSize: 16, color: COLORS.accent }} />
                          ) : (
                            <KeyboardArrowDownIcon sx={{ fontSize: 16, color: COLORS.accent }} />
                          )
                        ) : (
                          <UnfoldMoreIcon
                            className="sort-icon"
                            sx={{ fontSize: 16, color: COLORS.textSecondary, opacity: 0.4, transition: "opacity 0.15s" }}
                          />
                        )}
                      </Box>
                    ) : (
                      <Box key="avatar" />
                    ),
                  )}
                </Box>

                {/* Rows */}
                {users.map((user: any) => (
                  <Box
                    key={user.user_id}
                    onClick={() => handleUserClick(user.user_id)}
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "50px 1fr 1fr 140px 120px 120px",
                      gap: 2,
                      px: 3,
                      py: 2,
                      alignItems: "center",
                      cursor: "pointer",
                      transition: "background 0.15s",
                      "&:hover": { bgcolor: COLORS.bgHover },
                      borderBottom: `1px solid ${COLORS.border}`,
                      "&:last-child": { borderBottom: "none" },
                    }}
                  >
                    <Avatar
                      sx={{
                        width: 36,
                        height: 36,
                        bgcolor: COLORS.accent,
                        fontSize: "14px",
                        fontWeight: 600,
                      }}
                    >
                      {user.user_name?.charAt(0)?.toUpperCase() || "U"}
                    </Avatar>
                    <Box>
                      <Typography
                        sx={{
                          fontSize: "14px",
                          fontWeight: 600,
                          color: COLORS.textPrimary,
                        }}
                      >
                        {user.user_name}
                      </Typography>
                    </Box>
                    <Typography
                      sx={{ fontSize: "13px", color: COLORS.textSecondary }}
                    >
                      {user.email}
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.75,
                      }}
                    >
                      {activeMap[user.user_id]?.active_sessions > 0 ? (
                        <>
                          <FiberManualRecordIcon
                            sx={{
                              fontSize: 10,
                              color: "#10b981",
                              animation: "pulse 2s infinite",
                              "@keyframes pulse": {
                                "0%, 100%": { opacity: 1 },
                                "50%": { opacity: 0.4 },
                              },
                            }}
                          />
                          <Typography
                            sx={{
                              fontSize: "13px",
                              fontWeight: 600,
                              color: "#10b981",
                            }}
                          >
                            {activeMap[user.user_id].active_sessions} active
                          </Typography>
                        </>
                      ) : (
                        <Typography
                          sx={{
                            fontSize: "13px",
                            color: COLORS.textSecondary,
                          }}
                        >
                          Offline
                        </Typography>
                      )}
                    </Box>
                    <Typography
                      sx={{ fontSize: "13px", color: COLORS.textSecondary }}
                    >
                      {activeMap[user.user_id]?.total_sessions ?? "-"}
                    </Typography>
                    <Chip
                      label={user.user_id}
                      size="small"
                      sx={{
                        fontSize: "12px",
                        fontWeight: 500,
                        bgcolor: "rgba(79,70,229,0.08)",
                        color: COLORS.accent,
                      }}
                    />
                  </Box>
                ))}
              </Box>
            )}
          </>
        ) : !selectedSessionId ? (
          /* ─── USER SESSIONS LIST ─── */
          <>
            {sessionsLoading || sessionsFetching || loadedUserId !== selectedUserId ? (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 1.5,
                  minHeight: 280,
                }}
              >
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    border: `4px solid ${COLORS.accent}25`,
                    borderTopColor: COLORS.accent,
                    borderRightColor: COLORS.accent,
                    animation: "spin 0.7s linear infinite",
                    "@keyframes spin": {
                      from: { transform: "rotate(0deg)" },
                      to: { transform: "rotate(360deg)" },
                    },
                  }}
                />
                <Typography
                  sx={{
                    color: COLORS.textPrimary,
                    fontSize: "14px",
                    fontWeight: 600,
                    mt: 1,
                  }}
                >
                  Loading sessions
                </Typography>
                <Typography
                  sx={{
                    color: COLORS.textSecondary,
                    fontSize: "12px",
                  }}
                >
                  Fetching activity for this user…
                </Typography>
              </Box>
            ) : sessions.length === 0 ? (
              <Box sx={{ textAlign: "center", p: 6 }}>
                <Typography sx={{ color: COLORS.textSecondary }}>
                  No sessions found for this user
                </Typography>
              </Box>
            ) : (
              <>
                <Box sx={{ p: 2 }}>
                  {/* Table header */}
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "200px 180px 180px 100px 120px",
                      gap: 2,
                      px: 2,
                      py: 1.5,
                      borderBottom: `1px solid ${COLORS.border}`,
                      mb: 1,
                    }}
                  >
                    {[
                      "Session ID",
                      "Login Time",
                      "Logout Time",
                      "Duration",
                      "Logout Type",
                    ].map((h) => (
                      <Typography
                        key={h}
                        sx={{
                          fontSize: "12px",
                          fontWeight: 600,
                          color: COLORS.textSecondary,
                          textTransform: "uppercase",
                        }}
                      >
                        {h}
                      </Typography>
                    ))}
                  </Box>

                  {/* Session rows */}
                  {sessions.map((session: any) => (
                    <Box
                      key={session.session_id}
                      onClick={() => handleSessionClick(session.session_id)}
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "200px 180px 180px 100px 120px",
                        gap: 2,
                        px: 2,
                        py: 1.5,
                        alignItems: "center",
                        borderRadius: "8px",
                        cursor: "pointer",
                        "&:hover": { bgcolor: COLORS.bgHover },
                      }}
                    >
                      <Tooltip title={session.session_id} arrow>
                        <Typography
                          sx={{
                            fontSize: "13px",
                            color: COLORS.accent,
                            fontFamily: "monospace",
                            fontWeight: 500,
                          }}
                        >
                          {truncateSessionId(session.session_id)}
                        </Typography>
                      </Tooltip>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                        }}
                      >
                        <LoginIcon sx={{ color: "#10b981", fontSize: 16 }} />
                        <Typography
                          sx={{
                            fontSize: "13px",
                            color: COLORS.textSecondary,
                          }}
                        >
                          {formatDate(session.login_time)}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                        }}
                      >
                        {session.logout_time ? (
                          <>
                            <LogoutIcon
                              sx={{ color: "#f59e0b", fontSize: 16 }}
                            />
                            <Typography
                              sx={{
                                fontSize: "13px",
                                color: COLORS.textSecondary,
                              }}
                            >
                              {formatDate(session.logout_time)}
                            </Typography>
                          </>
                        ) : (
                          <Chip
                            label="Active"
                            size="small"
                            sx={{
                              bgcolor: "rgba(16, 185, 129, 0.1)",
                              color: "#10b981",
                              fontWeight: 600,
                              fontSize: "11px",
                              height: 22,
                            }}
                          />
                        )}
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                        }}
                      >
                        <AccessTimeIcon
                          sx={{ color: COLORS.textSecondary, fontSize: 16 }}
                        />
                        <Typography
                          sx={{
                            fontSize: "13px",
                            color: COLORS.textSecondary,
                          }}
                        >
                          {session.duration_minutes === null
                            ? "Ongoing"
                            : formatDuration(session.duration_minutes)}
                        </Typography>
                      </Box>
                      <Typography
                        sx={{
                          fontSize: "13px",
                          color: COLORS.textSecondary,
                          textTransform: "capitalize",
                        }}
                      >
                        {session.logout_type || "-"}
                      </Typography>
                    </Box>
                  ))}
                </Box>

                {/* Sessions pagination */}
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    px: 3,
                    py: 2,
                    borderTop: `1px solid ${COLORS.border}`,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                    }}
                  >
                    <Typography
                      sx={{ fontSize: "13px", color: COLORS.textSecondary }}
                    >
                      Rows per page
                    </Typography>
                    <Select
                      value={sessionsPageSize}
                      onChange={(e) => {
                        setSessionsPageSize(Number(e.target.value));
                        setSessionsPage(1);
                      }}
                      size="small"
                      sx={{
                        ...selectStyles,
                        minWidth: 70,
                        ".MuiSelect-select": { py: 0.5, px: 1.5 },
                      }}
                      MenuProps={menuProps}
                    >
                      {SESSION_PAGE_SIZE_OPTIONS.map((size) => (
                        <MenuItem
                          key={size}
                          value={size}
                          sx={menuItemStyles}
                        >
                          {size}
                        </MenuItem>
                      ))}
                    </Select>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                    }}
                  >
                    <Typography
                      sx={{ fontSize: "13px", color: COLORS.textSecondary }}
                    >
                      {(sessionsPage - 1) * sessionsPageSize + 1}–
                      {Math.min(
                        sessionsPage * sessionsPageSize,
                        totalSessions,
                      )}{" "}
                      of {totalSessions}
                    </Typography>
                    {totalSessionPages > 1 && (
                      <Pagination
                        count={totalSessionPages}
                        page={sessionsPage}
                        onChange={(_, v) => setSessionsPage(v)}
                        size="small"
                        sx={{
                          "& .Mui-selected": {
                            bgcolor: `${COLORS.accent} !important`,
                            color: "#fff !important",
                          },
                        }}
                      />
                    )}
                  </Box>
                </Box>
              </>
            )}
          </>
        ) : (
          /* ─── SESSION INTERACTIONS TIMELINE ─── */
          <>
            {interactionsLoading || interactionsFetching || interactionsTransitioning ? (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 1.5,
                  minHeight: 280,
                }}
              >
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    border: `4px solid ${COLORS.accent}25`,
                    borderTopColor: COLORS.accent,
                    borderRightColor: COLORS.accent,
                    animation: "spin 0.7s linear infinite",
                    "@keyframes spin": {
                      from: { transform: "rotate(0deg)" },
                      to: { transform: "rotate(360deg)" },
                    },
                  }}
                />
                <Typography
                  sx={{
                    color: COLORS.textPrimary,
                    fontSize: "14px",
                    fontWeight: 600,
                    mt: 1,
                  }}
                >
                  Loading activity
                </Typography>
                <Typography
                  sx={{
                    color: COLORS.textSecondary,
                    fontSize: "12px",
                  }}
                >
                  Fetching session interactions…
                </Typography>
              </Box>
            ) : interactions.length === 0 ? (
              <Box sx={{ textAlign: "center", p: 6 }}>
                <Typography sx={{ color: COLORS.textSecondary }}>
                  No interactions found for this session
                </Typography>
              </Box>
            ) : (
              <>
                <Box sx={{ p: 2, pb: 1 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{ color: COLORS.textSecondary }}
                  >
                    Session activity (oldest → newest) —{" "}
                    {interactions.length} events
                  </Typography>
                </Box>

                <Timeline
                  sx={{
                    p: 0,
                    m: 0,
                    [`& .MuiTimelineItem-missingOppositeContent`]: {
                      minHeight: 0,
                    },
                  }}
                  position="right"
                >
                  {prepareTimelineGroups(interactions).map((group, idx) => {
                    const { tab, actions } = group;
                    return (
                      <TimelineItem
                        key={tab + idx}
                        sx={{
                          minHeight: 60,
                          "&:hover": { bgcolor: COLORS.bgHover },
                          borderRadius: 1,
                          mx: 1,
                        }}
                      >
                        <TimelineOppositeContent
                          sx={{
                            flex: 0.2,
                            color: COLORS.textSecondary,
                            fontSize: "0.875rem",
                            pt: "6px",
                          }}
                        >
                          {formatDate(actions[0].created_at)}
                        </TimelineOppositeContent>

                        <TimelineSeparator>
                          <TimelineDot
                            sx={{
                              bgcolor: COLORS.accent,
                              width: 12,
                              height: 12,
                              mt: "10px",
                            }}
                          />
                          {idx <
                            prepareTimelineGroups(interactions).length - 1 && (
                            <TimelineConnector
                              sx={{ bgcolor: COLORS.border }}
                            />
                          )}
                        </TimelineSeparator>

                        <TimelineContent sx={{ py: "6px", px: 2 }}>
                          <Typography sx={{ fontWeight: 600, mb: 0.5 }}>
                            {tab}
                          </Typography>
                          {actions.map((action: any) => {
                            const { tab: innerTab, params } =
                              parseQueryParams(action.query_params);
                            const label = getActionLabel(
                              action.endpoint,
                              innerTab,
                            );
                            return (
                              <Box key={action.id} sx={{ mb: 0.5 }}>
                                <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, flexWrap: "wrap" }}>
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      color: COLORS.textSecondary,
                                      fontFamily: "monospace",
                                      fontSize: "0.72rem",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {formatTimeOnly(action.created_at)}
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    sx={{ color: COLORS.textPrimary }}
                                  >
                                    {label}
                                  </Typography>
                                  {action._duration != null && action._duration > 0 && (
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        color: "#10B981",
                                        fontFamily: "monospace",
                                        fontSize: "0.72rem",
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      ⏱ {formatDurationHMS(action._duration)}
                                    </Typography>
                                  )}
                                </Box>
                                {params !== "-" && (
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      color: COLORS.textSecondary,
                                      fontFamily: "monospace",
                                      fontSize: "0.75rem",
                                      display: "block",
                                      ml: 1,
                                    }}
                                  >
                                    Filters: {params}
                                  </Typography>
                                )}
                              </Box>
                            );
                          })}
                        </TimelineContent>
                      </TimelineItem>
                    );
                  })}
                </Timeline>

                {/* Interactions pagination */}
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    px: 3,
                    py: 2,
                    borderTop: `1px solid ${COLORS.border}`,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                    }}
                  >
                    <Typography
                      sx={{ fontSize: "13px", color: COLORS.textSecondary }}
                    >
                      Rows per page
                    </Typography>
                    <Select
                      value={interactionPageSize}
                      onChange={(e) => {
                        setInteractionPageSize(Number(e.target.value));
                        setInteractionPage(1);
                      }}
                      size="small"
                      sx={{
                        ...selectStyles,
                        minWidth: 70,
                        ".MuiSelect-select": { py: 0.5, px: 1.5 },
                      }}
                      MenuProps={menuProps}
                    >
                      {SESSION_PAGE_SIZE_OPTIONS.map((size) => (
                        <MenuItem
                          key={size}
                          value={size}
                          sx={menuItemStyles}
                        >
                          {size}
                        </MenuItem>
                      ))}
                    </Select>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                    }}
                  >
                    <Typography
                      sx={{ fontSize: "13px", color: COLORS.textSecondary }}
                    >
                      {(interactionPage - 1) * interactionPageSize + 1}–
                      {Math.min(
                        interactionPage * interactionPageSize,
                        totalInteractions,
                      )}{" "}
                      of {totalInteractions}
                    </Typography>
                    {totalInteractionPages > 1 && (
                      <Pagination
                        count={totalInteractionPages}
                        page={interactionPage}
                        onChange={(_, v) => setInteractionPage(v)}
                        size="small"
                        sx={{
                          "& .Mui-selected": {
                            bgcolor: `${COLORS.accent} !important`,
                            color: "#fff !important",
                          },
                        }}
                      />
                    )}
                  </Box>
                </Box>
              </>
            )}
          </>
        )}
      </Box>
    </Box>
  );
};

export default AdminDashboard;
