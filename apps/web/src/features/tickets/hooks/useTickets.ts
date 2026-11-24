import { useQuery } from "@tanstack/react-query";
import { getAllTickets, getTickets, type TicketListParams } from "../api/tickets-api";

export const useTickets = (params: TicketListParams) =>
  useQuery({
    queryKey: ["tickets", "list", params],
    queryFn: ({ signal }) => getTickets(params, signal)
  });

export const useAllTickets = () =>
  useQuery({
    queryKey: ["tickets", "all"],
    queryFn: ({ signal }) => getAllTickets(signal)
  });
