"use client";

// IMPORTANT: A Databricks admin must whitelist this frontend domain in the Genie Space embed settings:
// https://frontend-mdb-1l1j.vercel.app
// Without this, the iframe will be blocked by Databricks' Content-Security-Policy.

import React, { useState } from "react";
import { Box, CircularProgress, Typography, Alert } from "@mui/material";

const GENIE_URL = process.env.NEXT_PUBLIC_DATABRICKS_GENIE_EMBED_URL;

const GeniePage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  if (!GENIE_URL) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "calc(100vh - 70px)",
          p: 4,
        }}
      >
        <Alert severity="warning" sx={{ maxWidth: 520 }}>
          Genie embed URL is not configured. Please set the{" "}
          <code>NEXT_PUBLIC_DATABRICKS_GENIE_EMBED_URL</code> environment
          variable and redeploy.
        </Alert>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        position: "relative",
        height: "calc(100vh - 70px)",
        width: "100%",
        overflow: "hidden",
      }}
    >
      {/* Loading overlay */}
      {loading && !error && (
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

      {/* Error fallback */}
      {error && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            p: 4,
          }}
        >
          <Alert severity="error" sx={{ maxWidth: 520 }}>
            Failed to load the Genie embed. Verify the embed URL is correct and
            that <strong>https://frontend-mdb-1l1j.vercel.app</strong> is
            whitelisted in your Databricks Genie Space settings.
          </Alert>
        </Box>
      )}

      {/* Embedded Genie iframe */}
      <iframe
        src={GENIE_URL}
        title="Databricks Genie"
        allow="clipboard-write"
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          display: error ? "none" : "block",
          padding: 50,
        }}
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
      />
    </Box>
  );
};

export default GeniePage;
