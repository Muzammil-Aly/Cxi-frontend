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

  const cleanedContent = rawContent.replace(/\*\*/g, "");

  return {
    content:
      cleanedContent || "Received a response but there was no text content.",
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

      const cleanedContent = rawContent.replace(/\*\*/g, "");

      result.push({
        role: "assistant",
        id: m.message_id,
        rating: m.feedback?.rating ?? "NONE",
        content: cleanedContent,
        suggestions,
        tableData,
      });
    }
  }

  return result;
}

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
  const [tableRowLimits, setTableRowLimits] = useState<Record<number, number>>({});
  const TABLE_PAGE_SIZE = 10;
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
    setTableRowLimits({});
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
    setTableRowLimits({});
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

  if (!open) return null;

  const conversations = (historyData?.conversations ?? []).filter(
    (c) => !deletedConvIds.has(c.conversation_id),
  );

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: sidebarWidth,
        width: 360,
        height: "100vh",
        bgcolor: "#fff",
        borderRight: "1px solid #E0E4F0",
        display: "flex",
        flexDirection: "column",
        zIndex: 1199,
        boxShadow: "4px 0 16px rgba(0,0,0,0.08)",
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
                        maxWidth: "85%",
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
                      {msg.content && (
                        <Typography
                          sx={{
                            fontSize: 13,
                            lineHeight: 1.6,
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                          }}
                        >
                          {msg.content}
                        </Typography>
                      )}
                      {msg.tableData && (
                        <Box
                          sx={{
                            mt: 1.5,
                            overflowX: "auto",
                            borderRadius: "8px",
                            border: "1px solid #E0E4F0",
                            "&::-webkit-scrollbar": { height: 4 },
                            "&::-webkit-scrollbar-thumb": {
                              bgcolor: "#C8CDF0",
                              borderRadius: 2,
                            },
                          }}
                        >
                          <Table size="small" sx={{ minWidth: "max-content" }}>
                            <TableHead>
                              <TableRow sx={{ bgcolor: "#EEF0FA" }}>
                                {msg.tableData.columns.map((col) => (
                                  <TableCell
                                    key={col}
                                    sx={{
                                      fontSize: 11,
                                      fontWeight: 700,
                                      color: "#131C55",
                                      py: 0.75,
                                      px: 1,
                                      borderBottom: "1px solid #C8CDF0",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {col}
                                  </TableCell>
                                ))}
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {msg.tableData.rows
                                .slice(0, tableRowLimits[idx] ?? TABLE_PAGE_SIZE)
                                .map((row, ri) => (
                                  <TableRow
                                    key={ri}
                                    sx={{
                                      "&:last-child td": { border: 0 },
                                      "&:hover": { bgcolor: "#F4F6FB" },
                                    }}
                                  >
                                    {row.map((cell, ci) => (
                                      <TableCell
                                        key={ci}
                                        sx={{
                                          fontSize: 11,
                                          py: 0.5,
                                          px: 1,
                                          color: "#0D0D12",
                                          whiteSpace: "nowrap",
                                          borderBottom: "1px solid #F0F0F0",
                                        }}
                                      >
                                        {cell}
                                      </TableCell>
                                    ))}
                                  </TableRow>
                                ))}
                            </TableBody>
                          </Table>
                          {msg.tableData.rows.length > (tableRowLimits[idx] ?? TABLE_PAGE_SIZE) && (
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "center",
                                py: 0.75,
                                borderTop: "1px solid #E0E4F0",
                              }}
                            >
                              <Button
                                size="small"
                                onClick={() =>
                                  setTableRowLimits((prev) => ({
                                    ...prev,
                                    [idx]: (prev[idx] ?? TABLE_PAGE_SIZE) + TABLE_PAGE_SIZE,
                                  }))
                                }
                                sx={{
                                  fontSize: 11,
                                  color: "#131C55",
                                  textTransform: "none",
                                  py: 0.25,
                                  "&:hover": { bgcolor: "#EEF0FA" },
                                }}
                              >
                                Show{" "}
                                {Math.min(
                                  TABLE_PAGE_SIZE,
                                  msg.tableData.rows.length - (tableRowLimits[idx] ?? TABLE_PAGE_SIZE),
                                )}{" "}
                                more rows
                              </Button>
                            </Box>
                          )}
                        </Box>
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
                maxRows={4}
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
        PaperProps={{ sx: { borderRadius: 2, minWidth: 280 } }}
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
