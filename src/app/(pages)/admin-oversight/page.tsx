"use client";

import { useState } from "react";
import { ToggleButtonGroup, ToggleButton } from "@mui/material";
import ProfileLayout from "@/views/Profile/ProfileLayout";
import AdminDashboard from "@/views/Profile/AdminDashboard";
import OrderHistory from "@/views/Profile/OrderHistory";

const AdminOversightPage = () => {
  const [tab, setTab] = useState(0);

  const tabSwitcher = (
    <ToggleButtonGroup
      value={tab}
      exclusive
      onChange={(_, newValue) => {
        if (newValue !== null) setTab(newValue);
      }}
      sx={{
        bgcolor: "#F4F6FB",
        borderRadius: "10px",
        p: 0.5,
        "& .MuiToggleButton-root": {
          border: "none",
          borderRadius: "8px !important",
          px: 2.5,
          py: 0.75,
          fontSize: 13,
          fontWeight: 600,
          textTransform: "none",
          color: "#667085",
          "&.Mui-selected": {
            bgcolor: "#fff",
            color: "#4658AC",
            boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
          },
          "&.Mui-selected:hover": {
            bgcolor: "#fff",
          },
        },
      }}
    >
      <ToggleButton value={0}>Sessions</ToggleButton>
      <ToggleButton value={1}>Order History</ToggleButton>
    </ToggleButtonGroup>
  );

  return (
    <ProfileLayout activeMenu="Admin Oversight" noHeaderGap>
      {tab === 0 && <AdminDashboard headerActions={tabSwitcher} />}
      {tab === 1 && <OrderHistory headerActions={tabSwitcher} />}
    </ProfileLayout>
  );
};

export default AdminOversightPage;
