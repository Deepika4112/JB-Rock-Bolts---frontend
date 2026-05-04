import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/context/ThemeContext";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import PurchaseOrders from "./pages/PurchaseOrders";
import SalesInvoice from "./pages/SalesInvoice";
import Inventory from "./pages/Inventory";
import Clients from "./pages/Clients";
import Reports from "./pages/Reports";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            staleTime: 30_000,
            refetchOnWindowFocus: false,
        },
    },
});

const App = () => (
    <QueryClientProvider client={queryClient}>
        <ThemeProvider>
            <TooltipProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                    <Routes>
                        <Route path="/" element={<AppLayout><Dashboard /></AppLayout>} />
                        <Route path="/purchase-orders" element={<AppLayout><PurchaseOrders /></AppLayout>} />
                        <Route path="/sales-invoice" element={<AppLayout><SalesInvoice /></AppLayout>} />
                        <Route path="/inventory" element={<AppLayout><Inventory /></AppLayout>} />
                        <Route path="/clients" element={<AppLayout><Clients /></AppLayout>} />
                        <Route path="/reports" element={<AppLayout><Reports /></AppLayout>} />
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </BrowserRouter>
            </TooltipProvider>
        </ThemeProvider>
    </QueryClientProvider>
);

export default App;
