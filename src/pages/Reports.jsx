import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useConstants } from "@/lib/constants";
import { fetchReport, fetchFulfillmentReport, fetchPendingPOs, fetchPurchaseOrder } from "@/lib/api";
import { inr, fmtDate, fmtDateTime } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";
import { Download, IndianRupee, Package, TrendingUp, ClipboardList, BarChart3, Clock, FileText, Printer, Pencil } from "lucide-react";

const Reports = () => {
    const { products } = useConstants();
    const [tab, setTab] = useState("fulfillment");
    const today = new Date().toISOString().split('T')[0];
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
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

    const [selectedPOId, setSelectedPOId] = useState(null);
    const { data: selectedPO, isLoading: selectedPOLoading } = useQuery({
        queryKey: ["purchase-order", selectedPOId],
        queryFn: () => fetchPurchaseOrder(selectedPOId),
        enabled: !!selectedPOId,
    });
    const closeViewingPO = () => setSelectedPOId(null);

    const { data: pendingData, isLoading: pendingLoading } = useQuery({
        queryKey: ["pendingPOsReport"],
        queryFn: fetchPendingPOs,
        enabled: tab === "pending",
    });

    const exportCSV = () => {
        if (tab === "sales") {
            const rows = salesData?.rows || [];
            if (rows.length === 0) { toast.error("No data to export"); return; }
            const headers = ["Date", "Invoice No", "PO No", "Subtotal", "Grand Total", "GST Amount", "Payment Status"];
            const csvRows = rows.map((r) => [
                r.date,
                r.invoice_number || "—",
                r.po_number || "—",
                r.subtotal,
                r.price,
                r.gst_amount,
                r.payment_status
            ]);
            downloadCSV(headers, csvRows, "sales-report");
        } else if (tab === "fulfillment") {
            const rows = fulfillmentData?.rows || [];
            if (rows.length === 0) { toast.error("No data to export"); return; }
            const headers = ["Date", "Client Name", "Project Name", "Item", "REQ.", "Delivered Quantity", "Pend."];
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
            } else {
            const rows = pendingData?.rows || [];
            if (rows.length === 0) { toast.error("No data to export"); return; }
            const headers = ["Date", "PO Number", "Client Name", "Project", "Item", "Total Qty", "Delivered Quantity", "Pending Qty", "Delivered Value", "Status"];
            const csvRows = rows.map((r) => [
                r.date,
                r.po_number,
                r.client_name,
                r.project,
                r.item,
                r.total_qty,
                r.delivered_qty,
                r.pending_qty,
                r.delivered_value,
                r.status
            ]);
            downloadCSV(headers, csvRows, "pending-pos-report");
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
                <TabsList className="grid w-full grid-cols-3 mb-6 p-1 bg-muted/50 rounded-xl">
                    <TabsTrigger value="fulfillment" className="rounded-lg py-2 transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        <ClipboardList className="h-4 w-4 mr-2" /> Fulfillment
                    </TabsTrigger>
                    <TabsTrigger value="sales" className="rounded-lg py-2 transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        <BarChart3 className="h-4 w-4 mr-2" /> Sales
                    </TabsTrigger>
                    <TabsTrigger value="pending" className="rounded-lg py-2 transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        <Clock className="h-4 w-4 mr-2" /> Pending POs
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
                                <thead className="bg-muted/50 text-muted-foreground text-[11px] uppercase tracking-wider">
                                    <tr>
                                        <th className="text-left font-semibold px-2 py-3">Date</th>
                                        <th className="text-left font-semibold px-2 py-3">Client Name</th>
                                        <th className="text-left font-semibold px-2 py-3">Project Name</th>
                                        <th className="text-left font-semibold px-2 py-3">Item</th>
                                        <th className="text-right font-semibold px-2 py-3">Req.</th>
                                        <th className="text-right font-semibold px-2 py-3 text-success">Delivered Quantity</th>
                                        <th className="text-right font-semibold px-2 py-3">Pend.</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {fulfillmentLoading && (
                                        <tr><td colSpan={8} className="px-5 py-12 text-center text-muted-foreground">Loading...</td></tr>
                                    )}
                                    {fulfillmentData?.rows.map((r) => (
                                        <tr key={r.id} className="border-t border-border hover:bg-muted/30 transition-colors text-[12.5px]">
                                            <td className="px-2 py-3 text-muted-foreground whitespace-nowrap">{r.date}</td>
                                            <td className="px-2 py-3 font-semibold text-foreground truncate max-w-[120px]" title={r.client_name}>{r.client_name}</td>
                                            <td className="px-2 py-3 text-muted-foreground truncate max-w-[100px]" title={r.project}>{r.project}</td>
                                            <td className="px-2 py-3 text-foreground font-medium truncate max-w-[140px]" title={r.item}>{r.item}</td>
                                            <td className="px-2 py-3 text-right font-medium whitespace-nowrap">{r.total_required} <span className="text-[10px] text-muted-foreground">{r.uom}</span></td>
                                            <td className="px-2 py-3 text-right font-bold text-success whitespace-nowrap">{r.delivered} <span className="text-[10px] text-muted-foreground">{r.uom}</span></td>
                                            <td className="px-2 py-3 text-right font-bold text-orange-500 whitespace-nowrap">{r.pending} <span className="text-[10px] text-muted-foreground">{r.uom}</span></td>
                                        </tr>
                                    ))}
                                    {!fulfillmentLoading && fulfillmentData?.rows.length === 0 && (
                                        <tr><td colSpan={8} className="px-5 py-12 text-center text-muted-foreground">No records found.</td></tr>
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="p-5 shadow-card border-l-4 border-primary">
                            <div className="flex items-center gap-3">
                                <div className="h-11 w-11 rounded-xl bg-primary/10 grid place-items-center"><IndianRupee className="h-5 w-5 text-primary" /></div>
                                <div>
                                    <div className="text-xs uppercase tracking-wider text-muted-foreground">Filtered Revenue</div>
                                    <div className="text-2xl font-bold text-foreground">{inr(salesData?.total_revenue ?? 0)}</div>
                                </div>
                            </div>
                        </Card>
                        <Card className="p-5 shadow-card border-l-4 border-blue-500">
                            <div className="flex items-center gap-3">
                                <div className="h-11 w-11 rounded-xl bg-blue-500/10 grid place-items-center"><TrendingUp className="h-5 w-5 text-blue-500" /></div>
                                <div>
                                    <div className="text-xs uppercase tracking-wider text-muted-foreground">Total GST</div>
                                    <div className="text-2xl font-bold text-foreground">{inr(salesData?.total_gst ?? 0)}</div>
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
                                <thead className="bg-muted/50 text-muted-foreground text-[11px] uppercase tracking-wider">
                                    <tr>
                                        <th className="text-left font-semibold px-2 py-3">Date</th>
                                        <th className="text-left font-semibold px-2 py-3">Invoice No</th>
                                        <th className="text-left font-semibold px-2 py-3">PO No</th>
                                        <th className="text-right font-semibold px-2 py-3">Subtotal</th>
                                        <th className="text-right font-semibold px-2 py-3">Grand Total</th>
                                        <th className="text-right font-semibold px-2 py-3">GST Amount</th>
                                        <th className="text-left font-semibold px-2 py-3">Payment</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {salesLoading && (
                                        <tr><td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">Loading...</td></tr>
                                    )}
                                    {salesData?.rows.map((r) => (
                                        <tr key={r.id} className="border-t border-border hover:bg-muted/30 transition-colors text-[12.5px]">
                                            <td className="px-2 py-3 text-muted-foreground whitespace-nowrap">{r.date}</td>
                                            <td className="px-2 py-3 text-primary font-medium truncate max-w-[120px]" title={r.invoice_number}>{r.invoice_number || "—"}</td>
                                            <td className="px-2 py-3 text-muted-foreground truncate max-w-[120px]" title={r.po_number}>{r.po_number || "—"}</td>
                                            <td className="px-2 py-3 text-right font-bold text-foreground">{inr(r.subtotal)}</td>
                                            <td className="px-2 py-3 text-right font-bold text-foreground">{inr(r.price)}</td>
                                            <td className="px-2 py-3 text-right font-medium text-blue-500">{inr(r.gst_amount)}</td>
                                            <td className="px-2 py-3 text-muted-foreground text-[11px]">{r.payment_status}</td>
                                        </tr>
                                    ))}
                                    {!salesLoading && (!salesData || salesData.rows.length === 0) && (
                                        <tr><td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">No records match the filters.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </TabsContent>

                <TabsContent value="pending" className="space-y-6">
                    {/* Pending Stat cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                        <Card className="p-5 shadow-card border-l-4 border-emerald-500">
                            <div className="flex items-center gap-3">
                                <div className="h-11 w-11 rounded-xl bg-emerald-500/10 grid place-items-center"><IndianRupee className="h-5 w-5 text-emerald-500" /></div>
                                <div>
                                    <div className="text-xs uppercase tracking-wider text-muted-foreground">Delivered Value</div>
                                    <div className="text-xl font-bold text-foreground">{inr(pendingData?.total_pending_value ?? 0)}</div>
                                </div>
                            </div>
                        </Card>
                        <Card className="p-5 shadow-card border-l-4 border-indigo-500">
                            <div className="flex items-center gap-3">
                                <div className="h-11 w-11 rounded-xl bg-indigo-500/10 grid place-items-center"><ClipboardList className="h-5 w-5 text-indigo-500" /></div>
                                <div>
                                    <div className="text-xs uppercase tracking-wider text-muted-foreground">Total Pending POs</div>
                                    <div className="text-xl font-bold text-foreground">{pendingData?.count ?? 0}</div>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Pending Table */}
                    <Card className="shadow-card overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50 text-muted-foreground text-[11px] uppercase tracking-wider">
                                    <tr>
                                        <th className="text-left font-semibold px-2 py-3">Date</th>
                                        <th className="text-left font-semibold px-2 py-3">PO Number</th>
                                        <th className="text-left font-semibold px-2 py-3">Client</th>
                                        <th className="text-left font-semibold px-2 py-3">Item</th>
                                        <th className="text-right font-semibold px-2 py-3">Total Qty</th>
                                        <th className="text-right font-semibold px-2 py-3 text-success">Delivered Quantity</th>
                                        <th className="text-right font-semibold px-2 py-3">Pending Qty</th>
                                        <th className="text-right font-semibold px-2 py-3">Delivered Payment</th>
                                        <th className="text-right font-semibold px-2 py-3">Pending Payment</th>
                                        <th className="text-left font-semibold px-2 py-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pendingLoading && (
                                        <tr><td colSpan={11} className="px-5 py-12 text-center text-muted-foreground">Loading...</td></tr>
                                    )}
                                    {pendingData?.rows.map((r) => (
                                        <tr key={r.id} className="border-t border-border hover:bg-muted/30 transition-colors text-[12.5px]">
                                            <td className="px-2 py-3 text-muted-foreground whitespace-nowrap">{r.date}</td>
                                            <td className="px-2 py-3 font-semibold text-primary truncate max-w-[120px]" title={r.po_number}>
                                                <button type="button" className="text-left w-full text-primary hover:underline focus:outline-none" onClick={() => setSelectedPOId(r.id)}>
                                                    {r.po_number}
                                                </button>
                                            </td>
                                            <td className="px-2 py-3 text-muted-foreground truncate max-w-[120px]" title={r.client_name}>{r.client_name}</td>
                                            <td className="px-2 py-3 text-muted-foreground truncate max-w-[140px]" title={r.item}>{r.item}</td>
                                            <td className="px-2 py-3 text-right font-medium whitespace-nowrap">{r.total_qty} <span className="text-[10px] text-muted-foreground">{r.uom || ''}</span></td>
                                            <td className="px-2 py-3 text-right font-bold text-success whitespace-nowrap">{r.delivered_qty || 0} <span className="text-[10px] text-muted-foreground">{r.uom || ''}</span></td>
                                            <td className="px-2 py-3 text-right font-bold whitespace-nowrap">{r.pending_qty} <span className="text-[10px] text-muted-foreground">{r.uom || ''}</span></td>
                                            <td className="px-2 py-3 text-right font-bold text-success">{inr(r.total_value - r.pending_total)}</td>
                                            <td className="px-2 py-3 text-right font-bold text-success">{inr(r.pending_total)}</td>
                                            <td className="px-2 py-3 text-left"><StatusBadge status={r.status} label={r.status} /></td>
                                        </tr>
                                    ))}
                                    {!pendingLoading && (!pendingData?.rows || pendingData.rows.length === 0) && (
                                        <tr><td colSpan={11} className="px-5 py-12 text-center text-muted-foreground">No pending POs found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </TabsContent>
            </Tabs>

            <Dialog open={!!selectedPOId} onOpenChange={(open) => { if (!open) closeViewingPO(); }}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>Purchase Order Details</DialogTitle></DialogHeader>
                    {selectedPOId && selectedPOLoading && (
                        <div className="px-5 py-12 text-center text-muted-foreground">Loading...</div>
                    )}
                    {selectedPO && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">PO Number</div>
                                    <div className="font-medium text-foreground break-words">{selectedPO.po_number}</div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Delivery Status</div>
                                    <StatusBadge
                                        status={
                                            (selectedPO.delivery_status === "Delivered" && selectedPO.all_dispatches_marked) ? "Delivered" :
                                            (selectedPO.delivery_status === "Delivered" || selectedPO.delivery_status === "Partial") ? "Partial" :
                                            "Not Delivered"
                                        }
                                        label={
                                            (selectedPO.delivery_status === "Delivered" && selectedPO.all_dispatches_marked) ? "Delivered" :
                                            selectedPO.delivery_status === "Delivered" ? "Dispatched (Pending Challans)" :
                                            selectedPO.delivery_status
                                        }
                                    />
                                </div>
                                <div>
                                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Client</div>
                                    <div className="font-medium text-foreground break-words">{selectedPO.client_name}</div>
                                </div>
                                <div>
                                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Project</div>
                                    <div className="font-medium text-foreground break-words">{selectedPO.project}</div>
                                </div>
                                <div>
                                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Payment Terms</div>
                                    <div className="font-medium text-foreground break-words">{selectedPO.payment_terms}</div>
                                </div>
                                <div>
                                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Validity Date</div>
                                    <div className="font-medium text-foreground break-words">{selectedPO.validity_date ? fmtDate(selectedPO.validity_date) : "—"}</div>
                                </div>
                                <div>
                                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">GST %</div>
                                    <div className="font-medium text-foreground break-words">{selectedPO.gst || "0%"}</div>
                                </div>
                                <div>
                                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Freight</div>
                                    <div className="font-medium text-foreground break-words">{inr(selectedPO.freight)}</div>
                                </div>
                                {selectedPO.file_url && (
                                    <div className="col-span-2 mt-2">
                                        <Button variant="outline" size="sm" className="w-full" onClick={() => window.open(`http://localhost:8000${selectedPO.file_url}`, "_blank") }>
                                            <FileText className="h-4 w-4 mr-2" /> View Attached PO Document
                                        </Button>
                                    </div>
                                )}
                            </div>
                            <div className="rounded-lg border border-border overflow-x-auto">
                                <div className="bg-muted/50 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Items</div>
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/30">
                                        <tr>
                                            <th className="text-left px-3 py-2 font-medium text-muted-foreground">#</th>
                                            <th className="text-left px-3 py-2 font-medium text-muted-foreground">Item</th>
                                            <th className="text-right px-3 py-2 font-medium text-muted-foreground">Req.</th>
                                            <th className="text-right px-3 py-2 font-medium text-success">Del.</th>
                                            <th className="text-right px-3 py-2 font-medium text-warning">Pend.</th>
                                            <th className="text-left px-3 py-2 font-medium text-muted-foreground">UOM</th>
                                            <th className="text-right px-3 py-2 font-medium text-muted-foreground">Unit Price</th>
                                            <th className="text-right px-3 py-2 font-medium text-muted-foreground">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(selectedPO.line_items?.length > 0 ? selectedPO.line_items : [{ item: selectedPO.item, quantity: selectedPO.total_quantity, uom: selectedPO.uom, unit_price: selectedPO.unit_price, delivered_quantity: 0 }]).map((li, i) => {
                                            const delQty = li.delivered_quantity || 0;
                                            const pend = Math.max(0, (li.quantity || 0) - delQty);
                                            return (
                                                <tr key={i} className="border-t border-border">
                                                    <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                                                    <td className="px-3 py-2 font-medium">{li.item}</td>
                                                    <td className="px-3 py-2 text-right">{li.quantity}</td>
                                                    <td className="px-3 py-2 text-right text-success font-bold">{delQty}</td>
                                                    <td className="px-3 py-2 text-right text-warning font-bold">{pend}</td>
                                                    <td className="px-3 py-2">{li.uom || "Nos"}</td>
                                                    <td className="px-3 py-2 text-right">{inr(li.unit_price)}</td>
                                                    <td className="px-3 py-2 text-right font-semibold">{inr((li.quantity || 0) * (li.unit_price || 0))}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                    <Clock className="h-4 w-4 text-accent" /> Activity Log
                                </div>
                                <div className="flex items-start gap-3 text-xs border-l-2 border-primary/40 pl-3">
                                    <div className="flex-1">
                                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Created By</div>
                                        <div className="font-semibold text-foreground">{selectedPO.created_by || "—"}</div>
                                        <div className="text-muted-foreground">{selectedPO.created_at ? fmtDateTime(selectedPO.created_at) : "—"}</div>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 text-xs border-l-2 border-warning/40 pl-3">
                                    <div className="flex-1">
                                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Last Updated By</div>
                                        <div className="font-semibold text-foreground">{selectedPO.last_updated_by || "—"}</div>
                                        <div className="text-muted-foreground">{selectedPO.last_updated_at ? fmtDateTime(selectedPO.last_updated_at) : "—"}</div>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 text-xs border-l-2 border-accent/40 pl-3">
                                    <div className="flex-1">
                                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Last Opened By</div>
                                        <div className="font-semibold text-foreground">{selectedPO.last_opened_by || "—"}</div>
                                        <div className="text-muted-foreground">{selectedPO.last_opened_at ? fmtDateTime(selectedPO.last_opened_at) : "—"}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={closeViewingPO}>Close</Button>
                        {selectedPO?.file_url && (
                            <Button variant="outline" onClick={() => window.open(`http://localhost:8000${selectedPO.file_url}`, "_blank")}>
                                <FileText className="h-4 w-4 mr-2" /> View Document
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Reports;
