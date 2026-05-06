import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useConstants } from "@/lib/constants";
import { fetchReport, fetchFulfillmentReport } from "@/lib/api";
import { inr } from "@/lib/format";
import { toast } from "sonner";
import { Download, IndianRupee, Package, TrendingUp, ClipboardList, BarChart3 } from "lucide-react";

const Reports = () => {
    const { products } = useConstants();
    const [tab, setTab] = useState("fulfillment");
    const today = new Date().toISOString().split('T')[0];
    const [from, setFrom] = useState(today);
    const [to, setTo] = useState(today);
    const [product, setProduct] = useState("all");
    const [client, setClient] = useState("all");

    // Sales Report Params
    const salesParams = {
        from_date: from ? new Date(from).toISOString() : undefined,
        to_date: to ? new Date(to).toISOString() : undefined,
        product: product !== "all" ? product : undefined,
        client: client !== "all" ? client : undefined,
    };

    // Fulfillment Report Params
    const fulfillmentParams = {
        from_date: from ? new Date(from).toISOString() : undefined,
        to_date: to ? new Date(to).toISOString() : undefined,
        client: client !== "all" ? client : undefined,
    };

    const { data: salesData, isLoading: salesLoading } = useQuery({
        queryKey: ["report", salesParams],
        queryFn: () => fetchReport(salesParams),
        enabled: tab === "sales",
    });

    const { data: fulfillmentData, isLoading: fulfillmentLoading } = useQuery({
        queryKey: ["fulfillmentReport", fulfillmentParams],
        queryFn: () => fetchFulfillmentReport(fulfillmentParams),
        enabled: tab === "fulfillment",
    });

    const exportCSV = () => {
        if (tab === "sales") {
            const rows = salesData?.rows || [];
            if (rows.length === 0) { toast.error("No data to export"); return; }
            const headers = ["Date", "Invoice No", "PO No", "Grand Total", "Payment Status"];
            const csvRows = rows.map((r) => [
                r.date, 
                r.invoice_number || "—", 
                r.po_number || "—", 
                r.price, 
                r.payment_status
            ]);
            downloadCSV(headers, csvRows, "sales-report");
        } else {
            const rows = fulfillmentData?.rows || [];
            if (rows.length === 0) { toast.error("No data to export"); return; }
            const headers = ["Date", "Client Name", "Project Name", "Item", "Total Required", "Delivered", "Pending"];
            const csvRows = rows.map((r) => [
                r.date,
                r.client_name, 
                r.project, 
                r.item, 
                r.total_required, 
                r.delivered, 
                r.pending
            ]);
            downloadCSV(headers, csvRows, "fulfillment-report");
        }
    };

    const downloadCSV = (headers, rows, name) => {
        const csv = [headers, ...rows]
            .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
            .join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `jb-${name}-${Date.now()}.csv`; a.click();
        URL.revokeObjectURL(url);
        toast.success(`Exported ${rows.length} records`);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">Reports & Analytics</h2>
                    <p className="text-sm text-muted-foreground mt-1">Analyze your sales performance and order fulfillment.</p>
                </div>
                <Button onClick={exportCSV} className="bg-gradient-accent hover:opacity-90 shadow-elegant">
                    <Download className="h-4 w-4 mr-2" /> Export CSV
                </Button>
            </div>

            <Tabs value={tab} onValueChange={setTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6 p-1 bg-muted/50 rounded-xl">
                    <TabsTrigger value="fulfillment" className="rounded-lg py-2 transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        <ClipboardList className="h-4 w-4 mr-2" /> Fulfillment Report
                    </TabsTrigger>
                    <TabsTrigger value="sales" className="rounded-lg py-2 transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        <BarChart3 className="h-4 w-4 mr-2" /> Sales Report
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="fulfillment" className="space-y-6">
                    <Card className="p-5 shadow-card">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>From Date</Label>
                                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>To Date</Label>
                                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Search Client</Label>
                                <Input placeholder="Filter by client..." value={client === "all" ? "" : client}
                                    onChange={(e) => setClient(e.target.value || "all")} />
                            </div>
                        </div>
                    </Card>

                    {/* Fulfillment Table */}
                    <Card className="shadow-card overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50 text-muted-foreground">
                                    <tr>
                                        <th className="text-left font-medium px-5 py-4">Date</th>
                                        <th className="text-left font-medium px-5 py-4">Client Name</th>
                                        <th className="text-left font-medium px-5 py-4">Project Name</th>
                                        <th className="text-left font-medium px-5 py-4">Item</th>
                                        <th className="text-right font-medium px-5 py-4">Total Required</th>
                                        <th className="text-right font-medium px-5 py-4">Delivered</th>
                                        <th className="text-right font-medium px-5 py-4">Pending</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {fulfillmentLoading && (
                                        <tr><td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">Loading...</td></tr>
                                    )}
                                    {fulfillmentData?.rows.map((r) => (
                                        <tr key={r.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                                            <td className="px-5 py-4 text-muted-foreground">{r.date}</td>
                                            <td className="px-5 py-4 font-semibold text-foreground">{r.client_name}</td>
                                            <td className="px-5 py-4 text-muted-foreground">{r.project}</td>
                                            <td className="px-5 py-4 text-foreground font-medium">{r.item}</td>
                                            <td className="px-5 py-4 text-right font-medium">{r.total_required} {r.uom}</td>
                                            <td className="px-5 py-4 text-right font-bold text-success">{r.delivered} {r.uom}</td>
                                            <td className="px-5 py-4 text-right font-bold text-orange-500">{r.pending} {r.uom}</td>
                                        </tr>
                                    ))}
                                    {!fulfillmentLoading && fulfillmentData?.rows.length === 0 && (
                                        <tr><td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">No records found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </TabsContent>

                <TabsContent value="sales" className="space-y-6">
                    {/* Filters for Sales */}
                    <Card className="p-5 shadow-card">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>From Date</Label>
                                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>To Date</Label>
                                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                            </div>
                        </div>
                    </Card>

                    {/* Sales Stat cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Card className="p-5 shadow-card border-l-4 border-primary">
                            <div className="flex items-center gap-3">
                                <div className="h-11 w-11 rounded-xl bg-primary/10 grid place-items-center"><IndianRupee className="h-5 w-5 text-primary" /></div>
                                <div>
                                    <div className="text-xs uppercase tracking-wider text-muted-foreground">Filtered Revenue</div>
                                    <div className="text-2xl font-bold text-foreground">{inr(salesData?.total_revenue ?? 0)}</div>
                                </div>
                            </div>
                        </Card>
                        <Card className="p-5 shadow-card border-l-4 border-accent">
                            <div className="flex items-center gap-3">
                                <div className="h-11 w-11 rounded-xl bg-accent/15 grid place-items-center"><Package className="h-5 w-5 text-accent" /></div>
                                <div>
                                    <div className="text-xs uppercase tracking-wider text-muted-foreground">Records</div>
                                    <div className="text-2xl font-bold text-foreground">{salesData?.record_count ?? 0}</div>
                                </div>
                            </div>
                        </Card>
                        <Card className="p-5 shadow-card border-l-4 border-success">
                            <div className="flex items-center gap-3">
                                <div className="h-11 w-11 rounded-xl bg-success/15 grid place-items-center"><TrendingUp className="h-5 w-5 text-success" /></div>
                                <div>
                                    <div className="text-xs uppercase tracking-wider text-muted-foreground">Avg Order Value</div>
                                    <div className="text-2xl font-bold text-foreground">{inr(salesData?.avg_order_value ?? 0)}</div>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Sales Table */}
                    <Card className="shadow-card overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50 text-muted-foreground">
                                    <tr>
                                        <th className="text-left font-medium px-5 py-4">Date</th>
                                        <th className="text-left font-medium px-5 py-4">Invoice No</th>
                                        <th className="text-left font-medium px-5 py-4">PO No</th>
                                        <th className="text-right font-medium px-5 py-4">Grand Total</th>
                                        <th className="text-left font-medium px-5 py-4">Payment</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {salesLoading && (
                                        <tr><td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">Loading...</td></tr>
                                    )}
                                    {salesData?.rows.map((r) => (
                                        <tr key={r.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                                            <td className="px-5 py-4 text-muted-foreground">{r.date}</td>
                                            <td className="px-5 py-4 text-primary font-medium">{r.invoice_number || "—"}</td>
                                            <td className="px-5 py-4 text-muted-foreground">{r.po_number || "—"}</td>
                                            <td className="px-5 py-4 text-right font-bold">{inr(r.price)}</td>
                                            <td className="px-5 py-4 text-muted-foreground">{r.payment_status}</td>
                                        </tr>
                                    ))}
                                    {!salesLoading && (!salesData || salesData.rows.length === 0) && (
                                        <tr><td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">No records match the filters.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default Reports;
