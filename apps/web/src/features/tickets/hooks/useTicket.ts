import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createTicket,
  createTicketComment,
  getTicket,
  getTicketComments,
  updateTicketStatus,
  type CreateTicketCommentInput,
  type CreateTicketInput,
  type TicketStatus
} from "../api/tickets-api";

export const useTicket = (id: string) =>
  useQuery({
    queryKey: ["tickets", id],
    queryFn: ({ signal }) => getTicket(id, signal)
  });

export const useTicketComments = (id: string, enabled = true) =>
  useQuery({
    queryKey: ["tickets", id, "comments"],
    queryFn: ({ signal }) => getTicketComments(id, signal),
    enabled: enabled && Boolean(id)
  });

export const useCreateTicketComment = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTicketCommentInput) => createTicketComment(id, input),
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: ["tickets", id] }),
      queryClient.invalidateQueries({ queryKey: ["tickets", id, "comments"] }),
      queryClient.invalidateQueries({ queryKey: ["tickets", "list"] }),
      queryClient.invalidateQueries({ queryKey: ["tickets", "all"] })
    ])
  });
};

export const useCreateTicket = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTicketInput) => createTicket(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tickets"] })
  });
};

export const useUpdateTicketStatus = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status: TicketStatus) => updateTicketStatus(id, status),
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: ["tickets", id] }),
      queryClient.invalidateQueries({ queryKey: ["tickets", id, "comments"] }),
      queryClient.invalidateQueries({ queryKey: ["tickets", "list"] }),
      queryClient.invalidateQueries({ queryKey: ["tickets", "all"] })
    ])
  });
};
