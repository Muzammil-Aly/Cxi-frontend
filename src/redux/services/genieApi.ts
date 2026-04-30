import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "../baseQueryWithReauth";

export const genieApi = createApi({
  reducerPath: "genieApi",
  baseQuery: baseQueryWithReauth,
  endpoints: (builder) => ({
    startConversation: builder.mutation<any, { content: string }>({
      query: (body) => ({
        url: "/genie/start-conversation",
        method: "POST",
        body,
      }),
    }),
    sendMessage: builder.mutation<
      any,
      { conversationId: string; content: string }
    >({
      query: ({ conversationId, content }) => ({
        url: `/genie/conversations/${conversationId}/messages`,
        method: "POST",
        body: { content },
      }),
    }),
    getMyConversations: builder.query<
      { conversations: { conversation_id: string; title: string; created_timestamp: number }[] },
      void
    >({
      query: () => "/genie/conversations",
    }),
    getConversationMessages: builder.query<any, string>({
      query: (conversationId) =>
        `/genie/conversations/${conversationId}/messages`,
    }),
    submitFeedback: builder.mutation<
      any,
      { conversationId: string; messageId: string; rating: "POSITIVE" | "NEGATIVE"; comment?: string }
    >({
      query: ({ conversationId, messageId, rating, comment }) => ({
        url: `/genie/conversations/${conversationId}/messages/${messageId}/feedback`,
        method: "POST",
        body: comment ? { rating, comment } : { rating },
      }),
    }),
    deleteMessage: builder.mutation<
      any,
      { conversationId: string; messageId: string }
    >({
      query: ({ conversationId, messageId }) => ({
        url: `/genie/conversations/${conversationId}/messages/${messageId}`,
        method: "DELETE",
      }),
    }),
    deleteConversation: builder.mutation<any, string>({
      query: (conversationId) => ({
        url: `/genie/conversations/${conversationId}`,
        method: "DELETE",
      }),
    }),
  }),
});

export const {
  useStartConversationMutation,
  useSendMessageMutation,
  useGetMyConversationsQuery,
  useLazyGetConversationMessagesQuery,
  useSubmitFeedbackMutation,
  useDeleteMessageMutation,
  useDeleteConversationMutation,
} = genieApi;
