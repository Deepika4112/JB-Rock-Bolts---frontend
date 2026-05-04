import { useQuery } from "@tanstack/react-query";
import { fetchConstants } from "@/lib/api";

const FALLBACK = {
    products: [],
    uom_options: [],
    clients: [],
    locations: [],
    projects: [],
    payment_terms: [],
    payment_statuses: ["Pending", "Partial", "Paid"],
    delivery_statuses: ["Pending", "Delivered"],
    inventory_statuses: ["In Stock", "Low Stock", "Out of Stock"],
};

export function useConstants() {
    const { data } = useQuery({
        queryKey: ["constants"],
        queryFn: fetchConstants,
        staleTime: Infinity,
        gcTime: Infinity,
    });
    return data || FALLBACK;
}
