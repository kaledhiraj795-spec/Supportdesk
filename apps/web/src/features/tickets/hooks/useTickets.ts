import { useQuery } from "@tanstack/react-query";
import { getTickets } from "../api/tickets-api";

export const useTickets = () =>
  useQuery({
    queryKey: ["tickets"],
    queryFn: ({ signal }) => getTickets(signal)
  });
