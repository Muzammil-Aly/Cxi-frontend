"use client";
import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  IconButton,
  CircularProgress,
  Tooltip,
  Divider,
  Chip,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import CloseIcon from "@mui/icons-material/Close";
import AddCommentOutlinedIcon from "@mui/icons-material/AddCommentOutlined";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import HistoryIcon from "@mui/icons-material/History";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import ThumbUpOutlinedIcon from "@mui/icons-material/ThumbUpOutlined";
import ThumbDownOutlinedIcon from "@mui/icons-material/ThumbDownOutlined";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import ThumbDownIcon from "@mui/icons-material/ThumbDown";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import {
  useStartConversationMutation,
  useSendMessageMutation,
  useGetMyConversationsQuery,
  useLazyGetConversationMessagesQuery,
  useSubmitFeedbackMutation,
  useDeleteMessageMutation,
  useDeleteConversationMutation,
} from "@/redux/services/genieApi";

interface TableData {
  columns: string[];
  rows: string[][];
}

interface Message {
  role: "user" | "assistant";
  content: string;
  id?: string;
  rating?: "POSITIVE" | "NEGATIVE" | "NONE";
  suggestions?: string[];
  tableData?: TableData | null;
}

interface GenieChatbotProps {
  open: boolean;
  onClose: () => void;
  sidebarWidth?: number;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function extractTableData(attachment: any): TableData | null {
  const sr = attachment?.query_result?.statement_response;
  if (!sr) return null;
  const columns: string[] =
    sr.manifest?.schema?.columns?.map((c: any) => c.name) ?? [];
  const rows: string[][] = sr.result?.data_array ?? [];
  if (columns.length === 0 || rows.length === 0) return null;
  return { columns, rows };
}

function extractGenieResponse(data: any): {
  content: string;
  suggestions: string[];
  tableData: TableData | null;
  messageId: string | null;
} {
  const result = data?.message_result;
  const messageId = data?.message_id ?? null;
  if (!result)
    return {
      content: "No response received.",
      suggestions: [],
      tableData: null,
      messageId,
    };

  const attachments: any[] = result.attachments ?? [];
  const parts: string[] = [];
  const suggestions: string[] = [];
  let tableData: TableData | null = null;

  for (const attachment of attachments) {
    if (attachment.text?.content) parts.push(attachment.text.content);
    if (attachment.query?.description) parts.push(attachment.query.description);
    if (Array.isArray(attachment.suggested_questions?.questions)) {
      suggestions.push(...attachment.suggested_questions.questions);
    }
    if (!tableData) tableData = extractTableData(attachment);
  }
  const rawContent =
    parts.join("\n\n") || "Received a response but there was no text content.";

  return {
    content: rawContent || "Received a response but there was no text content.",
    suggestions,
    tableData,
    messageId,
  };
}

/**
 * Each Databricks message object contains BOTH the user question (content)
 * AND the assistant answer (attachments). Sort oldest-first then flatten.
 */
function parseDbxMessages(raw: any): Message[] {
  const list: any[] = raw?.messages ?? raw?.data ?? [];

  // sort ascending by created_timestamp so oldest message is first
  const sorted = [...list].sort(
    (a, b) => (a.created_timestamp ?? 0) - (b.created_timestamp ?? 0),
  );

  const result: Message[] = [];

  for (const m of sorted) {
    // user turn
    if (m.content) {
      result.push({ role: "user", content: m.content });
    }

    // assistant turn — pull text + suggestions + table from attachments
    const attachments: any[] = m.attachments ?? [];
    const parts: string[] = [];
    const suggestions: string[] = [];
    let tableData: TableData | null = null;

    for (const att of attachments) {
      if (att.text?.content) parts.push(att.text.content);
      if (att.query?.description) parts.push(att.query.description);
      if (Array.isArray(att.suggested_questions?.questions)) {
        suggestions.push(...att.suggested_questions.questions);
      }
      if (!tableData) tableData = extractTableData(att);
    }

    if (parts.length > 0 || suggestions.length > 0 || tableData) {
      const rawContent = parts.join("\n\n");

      result.push({
        role: "assistant",
        id: m.message_id,
        rating: m.feedback?.rating ?? "NONE",
        content: rawContent,
        suggestions,
        tableData,
      });
    }
  }

  return result;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    const m = part.match(/^\*\*(.+)\*\*$/);
    if (m)
      return (
        <strong key={i} style={{ fontWeight: 700, color: "#131C55" }}>
          {m[1]}
        </strong>
      );
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

function renderContent(text: string): React.ReactNode {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];

  lines.forEach((line, i) => {
    if (line.trim() === "") {
      nodes.push(<Box key={i} sx={{ height: 6 }} />);
      return;
    }

    // Full-line bold → section header
    const headerMatch = line.match(/^\*\*(.+)\*\*\s*:?\s*$/);
    if (headerMatch) {
      nodes.push(
        <Typography
          key={i}
          sx={{
            fontWeight: 700,
            fontSize: 13,
            color: "#131C55",
            mt: 1.25,
            mb: 0.25,
            lineHeight: 1.5,
          }}
        >
          {headerMatch[1]}
        </Typography>,
      );
      return;
    }

    // Bullet list: lines starting with - or •
    const bulletMatch = line.match(/^[-•]\s+(.+)/);
    if (bulletMatch) {
      nodes.push(
        <Box
          key={i}
          sx={{ display: "flex", gap: 0.75, alignItems: "flex-start", ml: 0.5 }}
        >
          <Typography
            component="span"
            sx={{
              color: "#4658AC",
              fontSize: 15,
              lineHeight: 1.5,
              flexShrink: 0,
            }}
          >
            ◦
          </Typography>
          <Typography
            sx={{
              fontSize: 13,
              lineHeight: 1.6,
              color: "#0D0D12",
              wordBreak: "break-word",
            }}
          >
            {renderInline(bulletMatch[1])}
          </Typography>
        </Box>,
      );
      return;
    }

    // Numbered list: lines starting with 1. 2. etc
    const numMatch = line.match(/^(\d+)\.\s+(.+)/);
    if (numMatch) {
      nodes.push(
        <Box
          key={i}
          sx={{ display: "flex", gap: 0.75, alignItems: "flex-start", ml: 0.5 }}
        >
          <Typography
            component="span"
            sx={{
              color: "#4658AC",
              fontWeight: 700,
              fontSize: 12,
              lineHeight: 1.6,
              flexShrink: 0,
              minWidth: 16,
            }}
          >
            {numMatch[1]}.
          </Typography>
          <Typography
            sx={{
              fontSize: 13,
              lineHeight: 1.6,
              color: "#0D0D12",
              wordBreak: "break-word",
            }}
          >
            {renderInline(numMatch[2])}
          </Typography>
        </Box>,
      );
      return;
    }

    // Regular line
    nodes.push(
      <Typography
        key={i}
        sx={{
          fontSize: 13,
          lineHeight: 1.6,
          color: "#0D0D12",
          wordBreak: "break-word",
        }}
      >
        {renderInline(line)}
      </Typography>,
    );
  });

  return <>{nodes}</>;
}

const ROWS_PER_PAGE = 8;

function getPageRange(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  const pages: (number | "...")[] = [0];
  if (current > 3) pages.push("...");
  const start = Math.max(1, current - 2);
  const end = Math.min(total - 2, current + 2);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 4) pages.push("...");
  pages.push(total - 1);
  return pages;
}


const PageBtn: React.FC<{
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ active, disabled, onClick, children }) => (
  <Box
    onClick={disabled ? undefined : onClick}
    sx={{
      minWidth: 28,
      height: 28,
      px: 0.5,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "7px",
      fontSize: 12,
      fontWeight: active ? 700 : 400,
      cursor: disabled ? "default" : "pointer",
      userSelect: "none",
      transition: "background 0.15s, color 0.15s",
      bgcolor: active ? "#131C55" : "transparent",
      color: active ? "#fff" : disabled ? "#D0D4E8" : "#4658AC",
      "&:hover": disabled ? {} : { bgcolor: active ? "#1a2570" : "#EEF0FA" },
    }}
  >
    {children}
  </Box>
);

const TableWithPagination: React.FC<{ data: TableData }> = ({ data }) => {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(data.rows.length / ROWS_PER_PAGE);
  const startRow = page * ROWS_PER_PAGE + 1;
  const endRow = Math.min((page + 1) * ROWS_PER_PAGE, data.rows.length);
  const visibleRows = data.rows.slice(
    page * ROWS_PER_PAGE,
    (page + 1) * ROWS_PER_PAGE,
  );

  return (
    <Box
      sx={{
        mt: 1.5,
        borderRadius: "10px",
        border: "1px solid #E0E4F0",
        overflow: "hidden",
        boxShadow: "0 1px 4px rgba(19,28,85,0.06)",
      }}
    >
      {/* ── Info bar ── */}
      <Box
        sx={{
          px: 1.5,
          py: 0.6,
          bgcolor: "#F4F6FB",
          borderBottom: "1px solid #E0E4F0",
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <Typography sx={{ fontSize: 10.5, color: "#8E92AD", fontWeight: 500 }}>
          {data.rows.length} rows
        </Typography>
        <Box
          sx={{ width: 3, height: 3, borderRadius: "50%", bgcolor: "#C8CDF0" }}
        />
        <Typography sx={{ fontSize: 10.5, color: "#8E92AD", fontWeight: 500 }}>
          {data.columns.length} columns
        </Typography>
      </Box>

      {/* ── Scrollable table ── */}
      <Box
        sx={{
          overflowX: "auto",
          "&::-webkit-scrollbar": { height: 5 },
          "&::-webkit-scrollbar-track": { bgcolor: "#F4F6FB" },
          "&::-webkit-scrollbar-thumb": {
            bgcolor: "#C8CDF0",
            borderRadius: 4,
            "&:hover": { bgcolor: "#9BA3D4" },
          },
        }}
      >
        <Table
          size="small"
          sx={{ minWidth: "max-content", width: "100%", borderCollapse: "collapse" }}
        >
          <TableHead>
            <TableRow>
              {data.columns.map((col) => (
                <TableCell
                  key={col}
                  sx={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#4658AC",
                    py: 0.9,
                    px: 1.5,
                    bgcolor: "#EEF0FA",
                    borderBottom: "2px solid #C8CDF0",
                    whiteSpace: "nowrap",
                    letterSpacing: "0.02em",
                  }}
                >
                  {col}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleRows.map((row, ri) => (
              <TableRow
                key={ri}
                sx={{
                  bgcolor: ri % 2 === 0 ? "#fff" : "#FAFBFF",
                  transition: "background 0.1s",
                  "&:last-child td": { border: 0 },
                  "&:hover td": { bgcolor: "#EEF0FA" },
                }}
              >
                {row.map((cell, ci) => (
                  <TableCell
                    key={ci}
                    sx={{
                      fontSize: 12,
                      py: 0.65,
                      px: 1.5,
                      color: cell === null || cell === "" ? "#C0C4D6" : "#0D0D12",
                      borderBottom: "1px solid #F0F2F8",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {cell === null || cell === "" ? "—" : cell}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>

      {/* ── Pagination footer ── */}
      {totalPages > 1 && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 1.5,
            py: 0.75,
            borderTop: "1px solid #E0E4F0",
            bgcolor: "#F8F9FD",
          }}
        >
          <Typography sx={{ fontSize: 11, color: "#8E92AD", whiteSpace: "nowrap" }}>
            {startRow}–{endRow} of {data.rows.length}
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
            <PageBtn disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              ‹
            </PageBtn>
            {getPageRange(page, totalPages).map((item, idx) =>
              item === "..." ? (
                <Typography
                  key={`el-${idx}`}
                  sx={{ fontSize: 12, color: "#C0C4D6", px: 0.25, lineHeight: "28px" }}
                >
                  …
                </Typography>
              ) : (
                <PageBtn
                  key={item}
                  active={item === page}
                  onClick={() => setPage(item as number)}
                >
                  {(item as number) + 1}
                </PageBtn>
              ),
            )}
            <PageBtn
              disabled={page === totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              ›
            </PageBtn>
          </Box>
        </Box>
      )}
    </Box>
  );
};

function formatDate(ts: number): string {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

// ── component ─────────────────────────────────────────────────────────────────

const GenieChatbot: React.FC<GenieChatbotProps> = ({
  open,
  onClose,
  sidebarWidth = 200,
}) => {
  const [view, setView] = useState<"chat" | "history">("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [feedback, setFeedback] = useState<
    Record<string, "POSITIVE" | "NEGATIVE">
  >({});
  const [deletedConvIds, setDeletedConvIds] = useState<Set<string>>(new Set());
  const [confirmDeleteConvId, setConfirmDeleteConvId] = useState<string | null>(
    null,
  );
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [startConversation, { isLoading: isStarting }] =
    useStartConversationMutation();
  const [sendMessage, { isLoading: isSending }] = useSendMessageMutation();
  const [fetchMessages] = useLazyGetConversationMessagesQuery();
  const [submitFeedback] = useSubmitFeedbackMutation();
  const [deleteMessage] = useDeleteMessageMutation();
  const [deleteConversation] = useDeleteConversationMutation();

  const {
    data: historyData,
    isLoading: isLoadingConversations,
    refetch: refetchHistory,
  } = useGetMyConversationsQuery(undefined, { skip: !open });

  const isLoading = isStarting || isSending;

  useEffect(() => {
    if (open) {
      setIsVisible(true);
      setIsClosing(false);
    } else if (isVisible) {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setIsClosing(false);
      }, 380);
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  const handleSend = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || isLoading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content }]);

    try {
      let data: any;
      if (!conversationId) {
        data = await startConversation({ content }).unwrap();
        if (data?.conversation_id) setConversationId(data.conversation_id);
      } else {
        data = await sendMessage({ conversationId, content }).unwrap();
      }

      const {
        content: reply,
        suggestions,
        tableData,
        messageId,
      } = extractGenieResponse(data);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          id: messageId ?? undefined,
          content: reply,
          suggestions,
          tableData,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
          suggestions: [],
        },
      ]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setConversationId(null);
    setInput("");
    setFeedback({});
    setView("chat");
  };

  const handleOpenHistory = () => {
    refetchHistory();
    setView("history");
  };

  const handleSelectConversation = async (convId: string) => {
    setLoadingHistory(true);
    setView("chat");
    setConversationId(convId);
    setMessages([]);
    setFeedback({});
    try {
      const raw = await fetchMessages(convId).unwrap();
      const parsed = parseDbxMessages(raw);
      setMessages(parsed);
      const seeded: Record<string, "POSITIVE" | "NEGATIVE"> = {};
      for (const msg of parsed) {
        if (msg.id && msg.rating && msg.rating !== "NONE") {
          seeded[msg.id] = msg.rating;
        }
      }
      setFeedback(seeded);
    } catch {
      setMessages([
        {
          role: "assistant",
          content:
            "Could not load this conversation. You can continue chatting here.",
          suggestions: [],
        },
      ]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleFeedback = async (
    msgId: string,
    rating: "POSITIVE" | "NEGATIVE",
  ) => {
    if (!conversationId) return;
    // toggle off if same rating clicked again
    if (feedback[msgId] === rating) {
      setFeedback((prev) => {
        const next = { ...prev };
        delete next[msgId];
        return next;
      });
      return;
    }
    setFeedback((prev) => ({ ...prev, [msgId]: rating }));
    try {
      await submitFeedback({
        conversationId,
        messageId: msgId,
        rating,
      }).unwrap();
    } catch {
      // revert on failure
      setFeedback((prev) => {
        const next = { ...prev };
        delete next[msgId];
        return next;
      });
    }
  };

  const handleDeleteMessage = async (msgIndex: number, msgId: string) => {
    if (!conversationId) return;
    // optimistically remove both the assistant message and the preceding user message
    setMessages((prev) => {
      const next = [...prev];
      next.splice(msgIndex - 1, 2); // remove user + assistant pair
      return next;
    });
    try {
      await deleteMessage({ conversationId, messageId: msgId }).unwrap();
    } catch {
      // silently ignore — message already removed from UI
    }
  };

  const handleDeleteConversation = async () => {
    const convId = confirmDeleteConvId;
    if (!convId) return;
    setConfirmDeleteConvId(null);
    setDeletedConvIds((prev) => new Set([...prev, convId]));
    if (conversationId === convId) {
      setMessages([]);
      setConversationId(null);
      setFeedback({});
    }
    try {
      await deleteConversation(convId).unwrap();
    } catch {
      setDeletedConvIds((prev) => {
        const next = new Set(prev);
        next.delete(convId);
        return next;
      });
    }
  };

  if (!isVisible) return null;

  const conversations = (historyData?.conversations ?? []).filter(
    (c) => !deletedConvIds.has(c.conversation_id),
  );

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: sidebarWidth,
        width: 560,
        height: "100vh",
        bgcolor: "#fff",
        borderRight: "2px solid #E0E4F0",
        display: "flex",
        flexDirection: "column",
        zIndex: 1199,
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
      {/* ── Header ── */}
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
          {view === "history" && (
            <IconButton
              size="small"
              onClick={() => setView("chat")}
              sx={{ color: "#8E92AD", "&:hover": { color: "#fff" }, mr: 0.5 }}
            >
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          )}
          <AutoAwesomeIcon sx={{ color: "#A78BFA", fontSize: 20 }} />
          <Typography sx={{ fontWeight: 700, fontSize: 15, color: "#fff" }}>
            {view === "history" ? "Past Conversations" : "Genie AI"}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center" }}>
          {view === "chat" && (
            <>
              <Tooltip title="Conversation history">
                <IconButton
                  size="small"
                  onClick={handleOpenHistory}
                  sx={{ color: "#8E92AD", "&:hover": { color: "#fff" } }}
                >
                  <HistoryIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="New chat">
                <IconButton
                  size="small"
                  onClick={handleNewChat}
                  sx={{ color: "#8E92AD", "&:hover": { color: "#fff" } }}
                >
                  <AddCommentOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
          <IconButton
            size="small"
            onClick={onClose}
            sx={{ color: "#8E92AD", "&:hover": { color: "#fff" } }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* ── HISTORY VIEW ── */}
      {view === "history" && (
        <Box
          sx={{
            flexGrow: 1,
            overflowY: "auto",
            "&::-webkit-scrollbar": { width: 4 },
            "&::-webkit-scrollbar-thumb": {
              bgcolor: "#E0E4F0",
              borderRadius: 2,
            },
          }}
        >
          {isLoadingConversations ? (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
              <CircularProgress size={24} sx={{ color: "#131C55" }} />
            </Box>
          ) : conversations.length === 0 ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                pt: 8,
                gap: 1.5,
                opacity: 0.5,
              }}
            >
              <ChatBubbleOutlineIcon sx={{ fontSize: 36, color: "#131C55" }} />
              <Typography sx={{ fontSize: 13, color: "#555" }}>
                No past conversations
              </Typography>
            </Box>
          ) : (
            <Box sx={{ py: 1 }}>
              {conversations.map((conv, idx) => (
                <React.Fragment key={conv.conversation_id}>
                  <Box
                    sx={{
                      px: 2,
                      py: 1.5,
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 1.5,
                      bgcolor:
                        conv.conversation_id === conversationId
                          ? "#EEF0FA"
                          : "transparent",
                      "&:hover": { bgcolor: "#F4F6FB" },
                      "&:hover .delete-conv-btn": { opacity: 1 },
                    }}
                  >
                    <ChatBubbleOutlineIcon
                      sx={{
                        fontSize: 16,
                        color: "#8E92AD",
                        mt: 0.3,
                        flexShrink: 0,
                      }}
                    />
                    <Box
                      sx={{ minWidth: 0, flexGrow: 1, cursor: "pointer" }}
                      onClick={() =>
                        handleSelectConversation(conv.conversation_id)
                      }
                    >
                      <Typography
                        sx={{
                          fontSize: 13,
                          fontWeight:
                            conv.conversation_id === conversationId ? 600 : 400,
                          color: "#0D0D12",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {conv.title || "Untitled conversation"}
                      </Typography>
                      {conv.created_timestamp > 0 && (
                        <Typography
                          sx={{ fontSize: 11, color: "#aaa", mt: 0.25 }}
                        >
                          {formatDate(conv.created_timestamp)}
                        </Typography>
                      )}
                    </Box>
                    <Tooltip title="Delete conversation">
                      <IconButton
                        className="delete-conv-btn"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteConvId(conv.conversation_id);
                        }}
                        sx={{
                          opacity: 0,
                          transition: "opacity 0.15s",
                          color: "#aaa",
                          flexShrink: 0,
                          "&:hover": { color: "#d32f2f" },
                        }}
                      >
                        <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  {idx < conversations.length - 1 && (
                    <Divider sx={{ mx: 2, borderColor: "#F0F0F0" }} />
                  )}
                </React.Fragment>
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* ── CHAT VIEW ── */}
      {view === "chat" && (
        <>
          <Box
            sx={{
              flexGrow: 1,
              overflowY: "auto",
              px: 2,
              py: 2,
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
              "&::-webkit-scrollbar": { width: 4 },
              "&::-webkit-scrollbar-thumb": {
                bgcolor: "#E0E4F0",
                borderRadius: 2,
              },
            }}
          >
            {/* Empty state */}
            {!loadingHistory && messages.length === 0 && (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  gap: 1.5,
                  opacity: 0.6,
                }}
              >
                <AutoAwesomeIcon sx={{ fontSize: 36, color: "#131C55" }} />
                <Typography
                  sx={{
                    fontSize: 14,
                    color: "#555",
                    textAlign: "center",
                    px: 2,
                  }}
                >
                  Ask Genie anything about your data
                </Typography>
              </Box>
            )}

            {/* Loading previous conversation */}
            {loadingHistory && (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  gap: 1.5,
                }}
              >
                <CircularProgress size={28} sx={{ color: "#131C55" }} />
                <Typography sx={{ fontSize: 13, color: "#888" }}>
                  Loading conversation…
                </Typography>
              </Box>
            )}

            {/* Message bubbles */}
            {!loadingHistory &&
              messages.map((msg, idx) => (
                <Box key={idx}>
                  {/* Bubble */}
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent:
                        msg.role === "user" ? "flex-end" : "flex-start",
                    }}
                  >
                    <Box
                      sx={{
                        maxWidth:
                          msg.role === "assistant" && msg.tableData
                            ? "100%"
                            : "85%",
                        width:
                          msg.role === "assistant" && msg.tableData
                            ? "100%"
                            : undefined,
                        px: 1.5,
                        py: 1,
                        borderRadius:
                          msg.role === "user"
                            ? "12px 12px 2px 12px"
                            : "12px 12px 12px 2px",
                        bgcolor: msg.role === "user" ? "#F4F4F4" : "#ffff",
                        color: msg.role === "user" ? "#fff" : "#0D0D12",
                      }}
                    >
                      {msg.content &&
                        (msg.role === "assistant" ? (
                          <Box sx={{ wordBreak: "break-word" }}>
                            {renderContent(msg.content)}
                          </Box>
                        ) : (
                          <Typography
                            sx={{
                              fontSize: 13,
                              lineHeight: 1.6,
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-word",
                              color: "#0D0D12",
                            }}
                          >
                            {msg.content}
                          </Typography>
                        ))}
                      {msg.tableData && (
                        <TableWithPagination data={msg.tableData} />
                      )}
                    </Box>
                  </Box>

                  {/* Feedback + delete row — only on assistant messages with an ID */}
                  {msg.role === "assistant" && msg.id && (
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.25,
                        mt: 0.25,
                        pl: 0.5,
                      }}
                    >
                      <Tooltip title="Helpful">
                        <IconButton
                          size="small"
                          onClick={() => handleFeedback(msg.id!, "POSITIVE")}
                          sx={{
                            p: 0.5,
                            color:
                              feedback[msg.id] === "POSITIVE"
                                ? "#131C55"
                                : "#C0C4D6",
                            "&:hover": { color: "#131C55" },
                          }}
                        >
                          {feedback[msg.id] === "POSITIVE" ? (
                            <ThumbUpIcon sx={{ fontSize: 14 }} />
                          ) : (
                            <ThumbUpOutlinedIcon sx={{ fontSize: 14 }} />
                          )}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Not helpful">
                        <IconButton
                          size="small"
                          onClick={() => handleFeedback(msg.id!, "NEGATIVE")}
                          sx={{
                            p: 0.5,
                            color:
                              feedback[msg.id] === "NEGATIVE"
                                ? "#d32f2f"
                                : "#C0C4D6",
                            "&:hover": { color: "#d32f2f" },
                          }}
                        >
                          {feedback[msg.id] === "NEGATIVE" ? (
                            <ThumbDownIcon sx={{ fontSize: 14 }} />
                          ) : (
                            <ThumbDownOutlinedIcon sx={{ fontSize: 14 }} />
                          )}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete message">
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteMessage(idx, msg.id!)}
                          sx={{
                            p: 0.5,
                            color: "#C0C4D6",
                            "&:hover": { color: "#d32f2f" },
                          }}
                        >
                          <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  )}

                  {/* Suggested questions — only on the last assistant message */}
                  {msg.role === "assistant" &&
                    msg.suggestions &&
                    msg.suggestions.length > 0 &&
                    idx === messages.length - 1 && (
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 0.75,
                          mt: 1,
                          pl: 0.5,
                        }}
                      >
                        <Typography
                          sx={{ fontSize: 11, color: "#888", mb: 0.25 }}
                        >
                          Suggested follow-ups
                        </Typography>
                        {msg.suggestions.map((q, qi) => (
                          <Chip
                            key={qi}
                            label={q}
                            size="small"
                            onClick={() => handleSend(q)}
                            sx={{
                              fontSize: 11,
                              height: "auto",
                              py: 0.5,
                              px: 0.5,
                              bgcolor: "#EEF0FA",
                              color: "#131C55",
                              border: "1px solid #C8CDF0",
                              borderRadius: "8px",
                              cursor: "pointer",
                              whiteSpace: "normal",
                              "& .MuiChip-label": { whiteSpace: "normal" },
                              "&:hover": {
                                bgcolor: "#131C55",
                                color: "#fff",
                                border: "1px solid #131C55",
                              },
                            }}
                          />
                        ))}
                      </Box>
                    )}
                </Box>
              ))}

            {/* Thinking indicator */}
            {isLoading && (
              <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
                <Box
                  sx={{
                    px: 1.5,
                    py: 1,
                    borderRadius: "12px 12px 12px 2px",
                    bgcolor: "#F4F6FB",
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <CircularProgress
                    size={12}
                    thickness={5}
                    sx={{ color: "#131C55" }}
                  />
                  <Typography sx={{ fontSize: 12, color: "#666" }}>
                    Thinking…
                  </Typography>
                </Box>
              </Box>
            )}

            <div ref={messagesEndRef} />
          </Box>

          {/* Input */}
          <Box
            sx={{
              px: 2,
              py: 1.5,
              borderTop: "1px solid #E0E4F0",
              flexShrink: 0,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "flex-end",
                gap: 1,
                bgcolor: "#F4F6FB",
                borderRadius: 2,
                px: 1.5,
                py: 0.5,
              }}
            >
              <TextField
                multiline
                maxRows={8}
                fullWidth
                placeholder="Ask Genie…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                variant="standard"
                slotProps={{ input: { disableUnderline: true } }}
                sx={{
                  "& .MuiInputBase-root": {
                    fontSize: 13,
                    py: 0.75,
                    bgcolor: "transparent",
                  },
                }}
              />
              <IconButton
                size="small"
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                sx={{
                  mb: 0.5,
                  color: input.trim() && !isLoading ? "#131C55" : "#C0C4D6",
                  "&:hover": { bgcolor: "transparent" },
                }}
              >
                <SendIcon fontSize="small" />
              </IconButton>
            </Box>
            <Typography
              sx={{
                fontSize: 10,
                color: "#aaa",
                textAlign: "center",
                mt: 0.75,
              }}
            >
              Powered by Databricks Genie · Press Enter to send
            </Typography>
          </Box>
        </>
      )}

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog
        open={!!confirmDeleteConvId}
        onClose={() => setConfirmDeleteConvId(null)}
        slotProps={{ paper: { sx: { borderRadius: 2, minWidth: 280 } } }}
      >
        <DialogTitle sx={{ fontSize: 15, fontWeight: 700, pb: 1 }}>
          Delete conversation?
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontSize: 13, color: "#555" }}>
            This conversation will be permanently deleted and cannot be
            recovered.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2, gap: 1 }}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => setConfirmDeleteConvId(null)}
            sx={{
              color: "#555",
              borderColor: "#ccc",
              textTransform: "none",
              fontSize: 13,
              minWidth: 80,
              "&:hover": {
                borderColor: "#999",
                bgcolor: "#f5f5f5",
                color: "#555",
              },
            }}
          >
            Cancel
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={handleDeleteConversation}
            sx={{
              bgcolor: "#d32f2f",
              textTransform: "none",
              fontSize: 13,
              "&:hover": { bgcolor: "#b71c1c" },
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GenieChatbot;
