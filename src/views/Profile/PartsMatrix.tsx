"use client";

import { useState, useCallback, useEffect, useRef, ChangeEvent } from "react";
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  TablePagination,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import {
  useGetSectionsQuery,
  useGetSectionDataQuery,
  useSearchAllSectionsQuery,
} from "@/redux/services/partsMatrixApi";
import Loader from "@/components/Common/Loader";

// ─── section icons (frontend only) ──────────────────────────────────────────

const SECTION_ICONS: Record<string, string> = {
  bases:             "🪑",
  colors:            "🎨",
  casters:           "🛞",
  kits:              "🛏",
  glides:            "↔️",
  cords:             "🔌",
  usb:               "🔋",
  springframes:      "🔩",
  gliderfabric:      "🧵",
  fadresser:         "📦",
  multibox:          "📦",
  whitespringframes: "❤️",
  cribmeasure:       "📐",
};

// ─── helpers ────────────────────────────────────────────────────────────────

function fmtCol(col: string) {
  return col.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function highlight(text: string, query: string) {
  if (!query.trim()) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: "#fef08a", padding: 0 }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function CellContent({
  value,
  query,
}: {
  value: string | number | null;
  query: string;
}) {
  const str = value == null ? "" : String(value);
  return <>{query ? highlight(str, query) : str}</>;
}

// ─── DataTable ───────────────────────────────────────────────────────────────

function DataTable({
  columns,
  rows,
  query,
}: {
  columns: string[];
  rows: (string | number | null)[][];
  query: string;
}) {
  return (
    <TableContainer sx={{ maxHeight: 500, overflowY: "auto", border: "1px solid #ddd" }}>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            {columns.map((col) => (
              <TableCell
                key={col}
                sx={{
                  bgcolor: "#f5f5f5",
                  color: "#111",
                  fontWeight: 700,
                  fontSize: 12,
                  whiteSpace: "nowrap",
                  borderBottom: "2px solid #ddd",
                }}
              >
                {fmtCol(col)}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} align="center" sx={{ py: 4, color: "#999" }}>
                No results found
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, ri) => (
              <TableRow
                key={ri}
                hover
                sx={{ "&:nth-of-type(even)": { bgcolor: "#fafafa" } }}
              >
                {row.map((cell, ci) => (
                  <TableCell
                    key={ci}
                    sx={{
                      fontSize: 12,
                      whiteSpace: ci < 2 ? "nowrap" : "normal",
                      fontWeight: ci === 0 ? 600 : 400,
                      color: "#222",
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    <CellContent value={cell} query={query} />
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

// ─── LookupSearch (always-visible global search bar + results) ───────────────

function LookupSearch({
  query,
  setQuery,
}: {
  query: string;
  setQuery: (q: string) => void;
}) {
  const [input, setInput] = useState("");

  const { data: results, isFetching, isError } = useSearchAllSectionsQuery(
    { q: query },
    { skip: query.length < 2 }
  );

  const handleSearch = () => {
    if (input.trim().length >= 2) setQuery(input.trim());
  };

  const handleClear = () => {
    setInput("");
    setQuery("");
  };

  const totalMatches = results?.reduce((acc, r) => acc + r.match_count, 0) ?? 0;

  return (
    <Box sx={{ mb: 3 }}>
      {/* Search bar */}
      <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Search across all sections — item number, SKU, model name, part number…"
          value={input}
          disabled={isFetching}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: "#999" }} />
                </InputAdornment>
              ),
              endAdornment: input && !isFetching ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={handleClear}>
                    <ClearIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </InputAdornment>
              ) : null,
            },
          }}
        />
        <Box
          component="button"
          onClick={handleSearch}
          disabled={isFetching || input.trim().length < 2}
          sx={{
            px: 3,
            py: "7px",
            bgcolor: "#111",
            color: "#fff",
            border: "none",
            borderRadius: 1,
            fontWeight: 700,
            fontSize: 13,
            whiteSpace: "nowrap",
            display: "flex",
            alignItems: "center",
            gap: 1,
            cursor: isFetching ? "wait" : input.trim().length >= 2 ? "pointer" : "not-allowed",
            opacity: isFetching || input.trim().length >= 2 ? 1 : 0.5,
            "&:hover": { bgcolor: isFetching ? "#111" : "#000" },
          }}
        >
          {isFetching ? (
            <>
              <CircularProgress size={13} sx={{ color: "#fff" }} />
              Searching...
            </>
          ) : "Search All"}
        </Box>
      </Box>

      {/* Loading — covers the whole results area whenever fetching */}
      {isFetching && <Loader title="Searching..." />}

      {isError && !isFetching && (
        <Alert severity="error" sx={{ mt: 1 }}>Search failed. Please try again.</Alert>
      )}

      {/* Results — only shown when not fetching */}
      {query && results && !isFetching && (
        <Box>
          <Typography variant="body2" sx={{ mt: 1.5, mb: 2, color: "#555" }}>
            {totalMatches > 0
              ? `${totalMatches} result${totalMatches !== 1 ? "s" : ""} across ${results.length} section${results.length !== 1 ? "s" : ""} for "${query}"`
              : `No results found for "${query}"`}
          </Typography>

          {results.map((result) => (
            <Box key={result.section} sx={{ mb: 3 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  px: 2,
                  py: 1.25,
                  bgcolor: "#111",
                  borderRadius: "6px 6px 0 0",
                }}
              >
                <span style={{ fontSize: 16, lineHeight: 1 }}>
                  {SECTION_ICONS[result.section] ?? "📋"}
                </span>
                <Typography
                  sx={{
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 12,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    flex: 1,
                  }}
                >
                  {result.label}
                </Typography>
                <Chip
                  label={`${result.match_count} match${result.match_count !== 1 ? "es" : ""}`}
                  size="small"
                  sx={{ bgcolor: "#444", color: "#fff", fontSize: 10, fontWeight: 700, height: 20 }}
                />
              </Box>
              <DataTable columns={result.columns} rows={result.rows} query={query} />
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

// ─── MatrixView ──────────────────────────────────────────────────────────────

function MatrixView() {
  const { data: sections = [], isLoading: sectionsLoading } = useGetSectionsQuery();
  const [activeSection, setActiveSection] = useState<string>("");
  const [sectionSearch, setSectionSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [page, setPage] = useState(0); // 0-indexed for MUI TablePagination
  const [rowsPerPage, setRowsPerPage] = useState(300);

  const currentSection = activeSection || sections[0]?.key || "";

  const { data: sectionData, isFetching, isError } = useGetSectionDataQuery(
    { section: currentSection, q: debouncedSearch, page: page + 1, page_size: rowsPerPage },
    { skip: !currentSection }
  );

  // Clear transition once the fetch (or cache hit) settles
  useEffect(() => {
    if (isTransitioning && !isFetching) {
      setIsTransitioning(false);
    }
  }, [isTransitioning, isFetching]);

  // Jump back to page 1 whenever the section or search term changes
  useEffect(() => {
    setPage(0);
  }, [currentSection, debouncedSearch]);

  const showLoading = isFetching || isTransitioning;

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSectionClick = (key: string) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    setIsTransitioning(true);
    setActiveSection(key);
    setSectionSearch("");
    setDebouncedSearch("");
  };

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  const handleSearchChange = useCallback((val: string) => {
    setSectionSearch(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      const trimmed = val.trim();
      setDebouncedSearch(trimmed.length >= 2 ? trimmed : "");
    }, 5000);
  }, []);

  const handleChangePage = (_: unknown, newPage: number) => setPage(newPage);

  const handleChangeRowsPerPage = (e: ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  if (sectionsLoading) {
    return <Loader />;
  }

  const activeLabel = sections.find((s) => s.key === currentSection)?.label ?? "";

  return (
    <Box>
      {/* Wrapping tab buttons with emoji icons */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 3 }}>
        {sections.map((s) => {
          const isActive = s.key === currentSection;
          return (
            <Box
              key={s.key}
              component="button"
              onClick={() => handleSectionClick(s.key)}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                px: 1.5,
                py: 0.75,
                border: "1px solid",
                borderColor: isActive ? "#111" : "#ccc",
                bgcolor: isActive ? "#111" : "#f0f0f0",
                color: isActive ? "#fff" : "#333",
                borderRadius: "6px",
                fontWeight: 600,
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                cursor: "pointer",
                transition: "all 0.15s",
                "&:hover": { bgcolor: isActive ? "#000" : "#e0e0e0" },
              }}
            >
              <span style={{ fontSize: 14, lineHeight: 1 }}>
                {SECTION_ICONS[s.key] ?? "📋"}
              </span>
              {s.label}
            </Box>
          );
        })}
      </Box>

      {/* Dark section header bar */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          bgcolor: "#111",
          color: "#fff",
          px: 2,
          py: 1.25,
          borderRadius: "6px 6px 0 0",
        }}
      >
        <span style={{ fontSize: 16, lineHeight: 1 }}>
          {SECTION_ICONS[currentSection] ?? "📋"}
        </span>
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          {activeLabel}
        </Typography>
      </Box>

      {/* Section search */}
      <Box
        sx={{
          border: "1px solid #ddd",
          borderTop: "none",
          borderBottom: "none",
          px: 1.5,
          py: 1,
          bgcolor: "#fff",
        }}
      >
        <TextField
          fullWidth
          size="small"
          placeholder={`Search ${activeLabel.toLowerCase()}... (SKU, part number, name)`}
          value={sectionSearch}
          onChange={(e) => handleSearchChange(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: "#999" }} />
                </InputAdornment>
              ),
              endAdornment: sectionSearch ? (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => {
                      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
                      setSectionSearch("");
                      setDebouncedSearch("");
                    }}
                  >
                    <ClearIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </InputAdornment>
              ) : null,
            },
          }}
        />
        {sectionData && !showLoading && (
          <Typography variant="caption" sx={{ mt: 0.5, display: "block", color: "#999" }}>
            {sectionData.total_records} row{sectionData.total_records !== 1 ? "s" : ""} total
          </Typography>
        )}
      </Box>

      {/* Table */}
      {showLoading ? (
        <Loader />
      ) : isError ? (
        <Alert severity="error" sx={{ mt: 1 }}>Failed to load section data.</Alert>
      ) : sectionData ? (
        <>
          <DataTable columns={sectionData.columns} rows={sectionData.rows} query={debouncedSearch} />
          <TablePagination
            component="div"
            count={sectionData.total_records}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[50, 100, 300, 500]}
            sx={{ borderLeft: "1px solid #ddd", borderRight: "1px solid #ddd", borderBottom: "1px solid #ddd" }}
          />
        </>
      ) : null}
    </Box>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function PartsMatrix() {
  const [globalQuery, setGlobalQuery] = useState("");

  return (
    <Box sx={{ pt: 2, pr: 2, pb: 2, pl: "80px", height: "100%", display: "flex", flexDirection: "column" }}>
      <Box sx={{ flex: 1, overflowY: "auto" }}>
        {/* Global lookup search — always visible at top */}
        <LookupSearch query={globalQuery} setQuery={setGlobalQuery} />

        {/* Divider + matrix — hidden while a global search is active, instantly visible on clear */}
        <Box sx={{ display: globalQuery ? "none" : "block" }}>
          <Box sx={{ borderTop: "1px solid #e0e0e0", mb: 3 }} />
          <MatrixView />
        </Box>
      </Box>
    </Box>
  );
}
