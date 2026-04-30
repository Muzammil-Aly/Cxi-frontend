"use client";
import React, { useEffect, useState } from "react";
import { Box } from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import EventIcon from "@mui/icons-material/Event";
import InventoryIcon from "@mui/icons-material/Inventory";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import Sidebar from "./Sidebar";
import GenieChatbot from "@/components/GenieChatbot";
import { useRouter } from "next/navigation";
import {
  Typography,
  IconButton,
  Breadcrumbs,
  Link as MUILink,
} from "@mui/material";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import { clearAuthData } from "@/utils/auth";

interface ProfileLayoutProps {
  children: React.ReactNode;
  activeMenu: string;
}

const ProfileLayout: React.FC<ProfileLayoutProps> = ({
  children,
  activeMenu,
}) => {
  const router = useRouter();
  const [genieOpen, setGenieOpen] = useState(false);

  const handleLogout = () => {
    // Clear all authentication data (tokens, cookies, localStorage)
    clearAuthData();
    router.push("/sign-in");
  };
  // const userId = localStorage.getItem("user_id") || "";
  // const isAdmin = userId === "kav1" || userId === "mdb1";
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const menuItems = [
    {
      key: "Customer Profiles",
      label: "Customer Profiles",
      icon: <InfoIcon />,
      path: "/profile",
    },
    {
      key: "Orders",
      label: "Orders",
      icon: <ShoppingCartIcon />,
      path: "/orders",
    },
    {
      key: "Support Tickets",
      label: "Support Tickets",
      icon: <SupportAgentIcon />,
      path: "/support-tickets",
    },
    {
      key: "Marketing Events",
      label: "Marketing Events",
      icon: <EventIcon />,
      path: "/marketing-events",
    },
    {
      key: "Inventory",
      label: "Inventory",
      icon: <InventoryIcon />,
      path: "/inventory",
    },
    {
      key: "Admin Oversight",
      label: "Admin Oversight",
      icon: <AdminPanelSettingsIcon />,
      path: "/admin-oversight",
    },
  ];
  const [filteredMenuItems, setFilteredMenuItems] = useState(menuItems);
  useEffect(() => {
    const loadUser = () => {
      const storedUserId = localStorage.getItem("userId");

      setUserId(storedUserId);
    };

    loadUser();
    const timer = setTimeout(loadUser, 300);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!userId) return; // wait until userId is loaded

    const admin = userId === "kav1" || userId === "mdb1";
    setIsAdmin(admin);

    setFilteredMenuItems(
      menuItems.filter((item) => {
        if (item.key === "Admin Oversight") {
          return admin;
        }
        return true;
      }),
    );
  }, [userId]);

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#f8f9fa" }}>
      {/* Sidebar (fixed) */}
      <Box sx={{ width: 130, flexShrink: 0 }}>
        <Sidebar
          menuItems={filteredMenuItems}
          activeMenu={activeMenu}
          onLogout={handleLogout}
          genieOpen={genieOpen}
          onGenieToggle={() => setGenieOpen((v) => !v)}
        />
      </Box>

      {/* Genie Chatbot panel */}
      <GenieChatbot
        open={genieOpen}
        onClose={() => setGenieOpen(false)}
        sidebarWidth={200}
      />

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          pl: genieOpen ? "370px" : 3,
          transition: "padding-left 0.2s ease",
          overflowX: "hidden",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          height: "100vh",
        }}
      >
        {/* Header Section */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
            borderBottom: "1px solid #E0E0E0",
            bgcolor: "#fff",
            pl: { xs: 0, sm: "90px" },
            minHeight: "70px",
          }}
        >
          {/* Breadcrumbs */}
          <Breadcrumbs
            separator={<NavigateNextIcon fontSize="small" />}
            aria-label="breadcrumb"
            sx={{ color: "#555" }}
          >
            <MUILink
              underline="hover"
              color="inherit"
              sx={{ fontSize: 14, cursor: "pointer" }}
            >
              Dashboard
            </MUILink>
            <Typography
              sx={{ fontSize: 16, fontWeight: 600, color: "#4658AC" }}
            >
              {activeMenu}
            </Typography>
          </Breadcrumbs>

          {/* Notification Icon */}
          <IconButton
            sx={{
              color: "#131C55",
              bgcolor: "#F4F6FB",
              "&:hover": { bgcolor: "#E0E4F4" },
              marginRight: "10px",
            }}
          >
            <NotificationsNoneIcon />
          </IconButton>
        </Box>

        {/* Dynamic Page Content */}
        <Box sx={{ flexGrow: 1, overflowY: "auto" }}>{children}</Box>
      </Box>
    </Box>
  );
};

export default ProfileLayout;
