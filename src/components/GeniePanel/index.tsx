"use client";
import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import InsightsIcon from "@mui/icons-material/Insights";

const GENIE_URL = process.env.NEXT_PUBLIC_DATABRICKS_GENIE_EMBED_URL;

interface GeniePanelProps {
  open: boolean;
  onClose: () => void;
  sidebarWidth?: number;
}

const GeniePanel: React.FC<GeniePanelProps> = ({
  open,
  onClose,
  sidebarWidth = 200,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [iframeError, setIframeError] = useState(false);

  useEffect(() => {
    if (open) {
      setIsVisible(true);
      setIsClosing(false);
      setIframeLoading(true);
      setIframeError(false);
    } else if (isVisible) {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setIsClosing(false);
      }, 380);
      return () => clearTimeout(timer);
    }
  }, [open]);

  if (!isVisible) return null;

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: sidebarWidth,
        width: 560,
        height: "100vh",
        bgcolor: "#fff",
        borderRight: "1px solid #E0E4F0",
        display: "flex",
        flexDirection: "column",
        zIndex: 1199,
        boxShadow: "4px 0 16px rgba(0,0,0,0.08)",
        transformOrigin: "bottom left",
        animation: isClosing
          ? "genieOut 0.38s cubic-bezier(0.4, 0, 0.6, 1) forwards"
          : "genieIn 0.44s cubic-bezier(0.34, 1.15, 0.64, 1) forwards",
        "@keyframes genieIn": {
          "0%": {
            clipPath: "polygon(5% 100%, 95% 100%, 80% 100%, 20% 100%)",
            opacity: 0,
          },
          "20%": {
            clipPath: "polygon(10% 78%, 90% 78%, 92% 100%, 8% 100%)",
            opacity: 0.6,
          },
          "55%": {
            clipPath: "polygon(2% 22%, 98% 22%, 100% 100%, 0% 100%)",
            opacity: 1,
          },
          "100%": {
            clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
            opacity: 1,
          },
        },
        "@keyframes genieOut": {
          "0%": {
            clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
            opacity: 1,
          },
          "45%": {
            clipPath: "polygon(2% 22%, 98% 22%, 100% 100%, 0% 100%)",
            opacity: 1,
          },
          "80%": {
            clipPath: "polygon(10% 78%, 90% 78%, 92% 100%, 8% 100%)",
            opacity: 0.5,
          },
          "100%": {
            clipPath: "polygon(50% 100%, 50% 100%, 50% 100%, 50% 100%)",
            opacity: 0,
          },
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
          py: 1.5,
          borderBottom: "1px solid #1e2a78",
          bgcolor: "#131C55",
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <InsightsIcon sx={{ color: "#A78BFA", fontSize: 20 }} />
          <Typography sx={{ fontWeight: 700, fontSize: 15, color: "#fff" }}>
            Open Genie
          </Typography>
        </Box>
        <IconButton
          size="small"
          onClick={onClose}
          sx={{ color: "#8E92AD", "&:hover": { color: "#fff" } }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Content */}
      <Box sx={{ flexGrow: 1, position: "relative", overflow: "hidden" }}>
        {!GENIE_URL ? (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              p: 3,
            }}
          >
            <Alert severity="warning" sx={{ maxWidth: 420 }}>
              Genie embed URL is not configured. Set{" "}
              <code>NEXT_PUBLIC_DATABRICKS_GENIE_EMBED_URL</code> and redeploy.
            </Alert>
          </Box>
        ) : (
          <>
            {iframeLoading && !iframeError && (
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 2,
                  bgcolor: "#f8f9fa",
                  zIndex: 1,
                }}
              >
                <CircularProgress sx={{ color: "#4658AC" }} />
                <Typography variant="body2" sx={{ color: "#666" }}>
                  Loading Genie...
                </Typography>
              </Box>
            )}
            {iframeError && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  p: 3,
                }}
              >
                <Alert severity="error" sx={{ maxWidth: 420 }}>
                  Failed to load Genie. Verify the embed URL and that this
                  domain is whitelisted in Databricks Genie Space settings.
                </Alert>
              </Box>
            )}
            <iframe
              src={GENIE_URL}
              title="Databricks Genie"
              allow="clipboard-write"
              style={{
                width: "calc(100% + 18px)",
                height: "100%",
                border: "none",
                display: iframeError ? "none" : "block",
                marginRight: "-18px",
              }}
              onLoad={() => setIframeLoading(false)}
              onError={() => {
                setIframeLoading(false);
                setIframeError(true);
              }}
            />
          </>
        )}
      </Box>
    </Box>
  );
};

export default GeniePanel;
