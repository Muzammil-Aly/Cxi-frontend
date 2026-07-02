"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Typography,
  Avatar,
  Popover,
  Divider,
} from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import HistoryIcon from "@mui/icons-material/History";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { useRouter } from "next/navigation";
import { useLogoutMutation } from "@/redux/services/authApi";
import UserActivityLog from "./UserActivityLog";
import { clearAuthData } from "@/utils/auth/tokenManager";

interface SidebarItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  path?: string;
  onClick?: () => void;
}

interface SidebarProps {
  menuItems: SidebarItem[];
  activeMenu: string;
  onLogout: () => void;
  genieOpen?: boolean;
  onGenieToggle?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  menuItems,
  activeMenu,
  onLogout,
  genieOpen = false,
  onGenieToggle,
}) => {
  const router = useRouter();
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [logout] = useLogoutMutation();

  // Popover state
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [activityLogOpen, setActivityLogOpen] = useState(false);

  // Check if current user is admin (mdb1)
  // const isAdmin = userId === "kav1";
  const isAdmin = userId === "v1" || userId === "b1";

  useEffect(() => {
    const loadUser = () => {
      const storedName = localStorage.getItem("userName");
      const storedEmail = localStorage.getItem("userEmail");
      const storedUserId = localStorage.getItem("userId");
      setUserName(storedName);
      setUserEmail(storedEmail);
      setUserId(storedUserId);
    };

    loadUser();
    const timer = setTimeout(loadUser, 300);
    return () => clearTimeout(timer);
  }, []);
  // useEffect(() => {
  //   // Check if this is a refresh (marker persists) vs new tab (marker cleared)
  //   const wasRefreshing = sessionStorage.getItem("is_refreshing");
  //   const hadActiveSession = localStorage.getItem("had_active_session");

  //   if (wasRefreshing) {
  //     // This was a refresh, not a tab close - clear the marker, keep user logged in
  //     sessionStorage.removeItem("is_refreshing");
  //   } else if (hadActiveSession && !sessionStorage.getItem("session_active")) {
  //     // Had a session before, but sessionStorage is fresh = tab was closed and reopened
  //     // Clear auth data and redirect to sign-in
  //     localStorage.removeItem("had_active_session");
  //     clearAuthData();
  //     window.location.href = "/sign-in";
  //     return;
  //   }

  //   // Mark session as active in both storages
  //   sessionStorage.setItem("session_active", "true");
  //   localStorage.setItem("had_active_session", "true");

  //   const handleBeforeUnload = () => {
  //     // Set a marker before unload - will persist if refresh, cleared if tab close
  //     sessionStorage.setItem("is_refreshing", "true");

  //     // Call logout API using fetch with keepalive (works reliably during page unload)
  //     const refreshToken = localStorage.getItem("refresh_token");
  //     const accessToken = localStorage.getItem("access_token");
  //     if (refreshToken) {
  //       const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  //       const logoutUrl = `${baseUrl}/auth/logout`;

  //       fetch(logoutUrl, {
  //         method: "POST",
  //         body: JSON.stringify({ refresh_token: refreshToken }),
  //         headers: {
  //           "Content-Type": "application/json",
  //           Authorization: `Bearer ${accessToken}`,
  //         },
  //         keepalive: true,
  //       });
  //     }
  //   };

  //   window.addEventListener("beforeunload", handleBeforeUnload);

  //   return () => {
  //     window.removeEventListener("beforeunload", handleBeforeUnload);
  //   };
  // }, []);

  const handleUserClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const handleLogout = () => {
    const refreshToken = localStorage.getItem("refresh_token");

    // Clear session markers and auth data before redirecting
    localStorage.removeItem("had_active_session");
    sessionStorage.removeItem("session_active");
    sessionStorage.removeItem("is_refreshing");
    clearAuthData();
    handleClose();

    // Fire-and-forget: tell backend to revoke, don't wait for response
    if (refreshToken) {
      logout({ refresh_token: refreshToken }).catch(() => {});
    }

    // Redirect immediately – auth data is already cleared
    router.push("/sign-in");
  };

  return (
    <Box
      sx={{
        position: "fixed",
        width: 200,
        height: "100vh",
        borderRight: "1px solid #ddd",
        bgcolor: "#131C55",
        transition: "width 0.3s ease",
        overflow: "hidden",
        zIndex: 1200,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      {/* Logo */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          marginBottom: "20px",
        }}
      >
        <Box
          sx={{
            textAlign: "center",
            borderRadius: "16px",
          }}
        >
          <Box
            sx={{
              width: 256,
              height: 64,
              padding: 1.25, // 10px
              backgroundColor: " #0E1B6B",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography
              sx={{
                fontFamily: "Inter, sans-serif",
                fontWeight: 900,
                fontStyle: "normal",
                fontSize: "24px",
                lineHeight: "100%",
                letterSpacing: 0,
                color: "#ffff",
              }}
            >
              CXi
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Menu Items */}
      {menuItems.map((item) => {
        const isActive = activeMenu === item.key;
        return (
          <Box
            key={item.key}
            onClick={() => {
              item.onClick
                ? item.onClick()
                : item.path && router.push(item.path);
            }}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              p: 1.5,
              cursor: "pointer",
              fontSize: 14,
              fontWeight: isActive ? "bold" : "normal",
              color: isActive ? "#FFFFFF" : "#8E92AD",
              borderRadius: "10px",
              bgcolor: "transparent",
              justifyContent: "flex-start",
              transition: "all 0.2s",
              "&:hover": { color: "#F3F4F6" },
            }}
          >
            {item.icon}
            {item.label}
          </Box>
        );
      })}

      {/* Genie AI Toggle */}
      <Box
        onClick={onGenieToggle}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          p: 1.5,
          cursor: "pointer",
          fontSize: 14,
          fontWeight: genieOpen ? "bold" : "normal",
          color: genieOpen ? "#A78BFA" : "#8E92AD",
          borderRadius: "10px",
          bgcolor: genieOpen ? "rgba(167,139,250,0.12)" : "transparent",
          "&:hover": { color: "#A78BFA" },
          transition: "all 0.2s",
        }}
      >
        <AutoAwesomeIcon sx={{ fontSize: 20 }} />
        Genie AI
      </Box>

      {/* User Box */}
      <Box
        sx={{
          mt: "auto",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Box
          onClick={handleUserClick} // opens popover
          sx={{
            padding: "10px",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            maxWidth: 300,
            cursor: "pointer",
            "&:hover": {}, // nothing changes on hover
          }}
        >
          <Avatar
            alt="Tim Cook"
            src="https://www.example.com/tim-cook.jpg"
            sx={{
              marginRight: "10px",
              width: 40,
              height: 40,
            }}
          />
          <Box sx={{ color: "#fff" }}>
            <Typography
              sx={{ fontWeight: 700, fontSize: "16px", color: "#fff" }}
            >
              {userName || "Guest User"}
            </Typography>
            <Typography sx={{ fontSize: "10px", color: "#fff", mt: "-9px" }}>
              {userEmail || "No email found"}
            </Typography>
          </Box>
        </Box>

        {/* Logout Popover */}
        {/* <Popover
          open={open}
          anchorEl={anchorEl}
          onClose={handleClose}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
          transformOrigin={{ vertical: "bottom", horizontal: "center" }}
          PaperProps={{
            sx: {
              p: 1,
              borderRadius: "12px", // slightly more rounded for glass look
              bgcolor: "rgba(255, 255, 255, 0.1)", // semi-transparent
              backdropFilter: "blur(10px)", // blur effect
              border: "1px solid rgba(255, 255, 255, 0.2)", // subtle border
              boxShadow: "0 4px 30px rgba(0, 0, 0, 0.1)", // subtle shadow
            },
          }}
        >
          <Button
            fullWidth
            onClick={() => {
              handleClose();
              onLogout();
            }}
            startIcon={<LogoutIcon />}
            variant="text"
            disableRipple
            disableElevation
            sx={{
              textTransform: "none",
              fontWeight: 600,
              color: "#fff",
              justifyContent: "flex-start",
              padding: "8px 16px",
              minHeight: "40px",
              lineHeight: "1.2",
              "&:hover": {
                backgroundColor: "transparent",
                transform: "none",
                padding: "8px 16px",
              },
              "&:focus": {
                backgroundColor: "transparent",
                transform: "none",
              },
              "&:active": {
                backgroundColor: "transparent",
                transform: "none",
              },
            }}
          >
            Logout
          </Button>
        </Popover> */}
        <Popover
          open={open}
          anchorEl={anchorEl}
          onClose={handleClose}
          anchorOrigin={{
            vertical: "top",
            horizontal: "center",
          }}
          transformOrigin={{
            vertical: "bottom",
            horizontal: "center",
          }}
          PaperProps={{
            sx: {
              mt: -1,
              ml: -1,
              bgcolor: "#1E2A78",
              color: "#fff",
              borderRadius: "12px",
              p: 1.5,
              minWidth: 180,
            },
          }}
        >
          <Typography
            sx={{
              fontSize: "14px",
              fontWeight: 600,
              color: "#fff",
              mb: 1,
              textAlign: "center",
            }}
          >
            {userName || "Guest User"}
          </Typography>
          {isAdmin && (
            <>
              <Button
                fullWidth
                variant="text"
                onClick={() => {
                  handleClose();
                  setActivityLogOpen(true);
                }}
                startIcon={<HistoryIcon />}
                disableRipple
                disableElevation
                sx={{
                  textTransform: "none",
                  fontWeight: 600,
                  borderRadius: "8px",
                  color: "#fff",
                  justifyContent: "flex-start",
                  mb: 1,
                  padding: "8px 16px",
                  "&:hover": {
                    bgcolor: "transparent",
                    transform: "none",
                    padding: "8px 16px",
                  },
                  "&:focus": {
                    bgcolor: "transparent",
                    transform: "none",
                  },
                  "&:active": {
                    bgcolor: "transparent",
                    transform: "none",
                  },
                }}
              >
                Activity Log
              </Button>
              <Divider sx={{ bgcolor: "rgba(255,255,255,0.1)", mb: 1 }} />
            </>
          )}
          <Button
            fullWidth
            variant="contained"
            color="error"
            onClick={handleLogout}
            startIcon={<LogoutIcon />}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              borderRadius: "8px",
              bgcolor: "#0e1b6b",
              "&:hover": { bgcolor: "#5767c1" },
            }}
          >
            Logout
          </Button>
        </Popover>

        {isAdmin && (
          <UserActivityLog
            open={activityLogOpen}
            onClose={() => setActivityLogOpen(false)}
          />
        )}
      </Box>
    </Box>
  );
};

export default Sidebar;
