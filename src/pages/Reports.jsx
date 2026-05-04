import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useConstants } from "@/lib/constants";
import { fetchReport } from "@/lib/api";
import { inr } from "@/lib/format";
import { toast } from "sonner";
import { Download, IndianRupee, Package, TrendingUp } from "lucide-react";

const Reports = () => {
    const { products } = useConstants();
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [product, setProduct] = useState("all");
    const [client, setClient] = useState("all");

    const params = {
        from_date: from ? new Date(from).toISOString() : undefined,
        to_date: to ? new Date(to).toISOString() : undefined,
        product: product !== "all" ? product : undefined,
        client: client !== "all" ? client : undefined,
        limit: 100,
    };

    const { data, isLoading } = useQuery({
        queryKey: ["report", params],
        queryFn: () => fetchReport(params),
    });

    const rows = data?.rows || [];
    const totalRevenue = data?.total_revenue ?? 0;
    const recordCount = data?.record_count ?? 0;
    const avgOrderValue = data?.avg_order_value ?? 0;

    const exportCSV = () => {
        if (rows.length === 0) { toast.error("No data to export"); return; }
        const headers = ["Date", "Client", "Product", "Location", "PO", "Invoice", "Price", "Payment", "Delivery"];
        const csvRows = rows.map((r) => [
            r.date, r.client_name, r.product, r.location ?? "",
            r.po_number ?? "", r.invoice_number ?? "", r.price,
            r.payment_status, r.delivery_status,
        ]);
        const csv = [headers, ...csvRows]
            .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
            .join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `jb-rockbolts-report-${Date.now()}.csv`; a.click();
        URL.revokeObjectURL(url);
        toast.success(`Exported ${rows.length} records`);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">Reports</h2>
                    <p className="text-sm text-muted-foreground mt-1">Filter records and export to CSV.</p>
                </div>
                <Button onClick={exportCSV} className="bg-gradient-accent hover:opacity-90 shadow-elegant">
                    <Download className="h-4 w-4 mr-2" /> Export CSV
                </Button>
            </div>

            {/* Filters */}
            <Card className="p-5 shadow-card">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                        <Label>From Date</Label>
                        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>To Date</Label>
                        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Product</Label>
                        <Select value={product} onValueChange={setProduct}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Products</SelectItem>
                                {products.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Client Name</Label>
                        <Input placeholder="Search client..." value={client === "all" ? "" : client}
                            onChange={(e) => setClient(e.target.value || "all")} />
                    </div>
                </div>
            </Card>

            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="p-5 shadow-card">
                    <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-xl bg-primary/10 grid place-items-center"><IndianRupee className="h-5 w-5 text-primary" /></div>
                        <div>
                            <div className="text-xs uppercase tracking-wider text-muted-foreground">Filtered Revenue</div>
                            <div className="text-2xl font-bold text-foreground">{inr(totalRevenue)}</div>
                        </div>
                    </div>
                </Card>
                <Card className="p-5 shadow-card">
                    <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-xl bg-accent/15 grid place-items-center"><Package className="h-5 w-5 text-accent" /></div>
                        <div>
                            <div className="text-xs uppercase tracking-wider text-muted-foreground">Records</div>
                            <div className="text-2xl font-bold text-foreground">{recordCount}</div>
                        </div>
                    </div>
                </Card>
                <Card className="p-5 shadow-card">
                    <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-xl bg-success/15 grid place-items-center"><TrendingUp className="h-5 w-5 text-success" /></div>
                        <div>
                            <div className="text-xs uppercase tracking-wider text-muted-foreground">Avg Order Value</div>
                            <div className="text-2xl font-bold text-foreground">{inr(avgOrderValue)}</div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Table */}
            <Card className="shadow-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-muted-foreground">
                            <tr>
                                <th className="text-left font-medium px-5 py-3">Date</th>
                                <th className="text-left font-medium px-5 py-3">Client</th>
                                <th className="text-left font-medium px-5 py-3">Product</th>
                                <th className="text-left font-medium px-5 py-3">Location</th>
                                <th className="text-right font-medium px-5 py-3">Price</th>
                                <th className="text-left font-medium px-5 py-3">Payment</th>
                                <th className="text-left font-medium px-5 py-3">Delivery</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading && (
                                <tr><td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">Loading...</td></tr>
                            )}
                            {rows.slice(0, 30).map((r) => (
                                <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                                    <td className="px-5 py-3 text-muted-foreground">{r.date}</td>
                                    <td className="px-5 py-3 font-medium text-foreground">{r.client_name}</td>
                                    <td className="px-5 py-3 text-muted-foreground max-w-[260px] truncate">{r.product}</td>
                                    <td className="px-5 py-3 text-muted-foreground">{r.location}</td>
                                    <td className="px-5 py-3 text-right font-semibold">{inr(r.price)}</td>
                                    <td className="px-5 py-3 text-muted-foreground">{r.payment_status}</td>
                                    <td className="px-5 py-3 text-muted-foreground">{r.delivery_status}</td>
                                </tr>
                            ))}
                            {!isLoading && rows.length === 0 && (
                                <tr><td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">No records match the filters.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default Reports;
