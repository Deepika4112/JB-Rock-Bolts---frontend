import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { inr, fmtDate, fmtDateTime } from "@/lib/format";
import { getCurrentUser } from "@/lib/currentUser";
import {
    fetchPurchaseOrders, fetchSales, createSale, updateSale,
    deleteSale as deleteSaleApi, addSaleActivity, openInvoiceDocument, downloadInvoiceDocument,
    uploadInvoiceFile
} from "@/lib/api";
import { toast } from "sonner";
import { Plus, Truck, Clock, CreditCard, Eye, Package, User, Trash2, Search, Download, UploadCloud, FileText, X, Pencil } from "lucide-react";

const PAYMENT_STATUS = ["Pending", "Partial", "Paid"];

const SalesInvoice = () => {
    const qc = useQueryClient();

    const { data: orders = [] } = useQuery({
        queryKey: ["purchase-orders"],
        queryFn: () => fetchPurchaseOrders(),
    });

    const { data: sales = [], isLoading } = useQuery({
        queryKey: ["sales"],
        queryFn: () => fetchSales(),
    });

    const invalidateSales = () => {
        qc.invalidateQueries({ queryKey: ["sales"] });
        qc.invalidateQueries({ queryKey: ["purchase-orders"] });
        qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    };

    const createMutation = useMutation({ mutationFn: createSale, onSuccess: invalidateSales });
    const updateMutation = useMutation({ mutationFn: ({ id, body }) => updateSale(id, body), onSuccess: invalidateSales });
    const deleteMutation = useMutation({ mutationFn: deleteSaleApi, onSuccess: invalidateSales });
    const activityMutation = useMutation({ mutationFn: ({ id, body }) => addSaleActivity(id, body), onSuccess: () => qc.invalidateQueries({ queryKey: ["sales"] }) });

    // Add Sale dialog
    const [addOpen, setAddOpen] = useState(false);
    const [selectedPO, setSelectedPO] = useState("");
    const [poData, setPoData] = useState(null);
    const [dispatchQty, setDispatchQty] = useState("");
    const [paymentStatus, setPaymentStatus] = useState("Pending");
    const [paymentNote, setPaymentNote] = useState("");
    const [invoiceUrl, setInvoiceUrl] = useState("");
    const [dispatchFrom, setDispatchFrom] = useState("JB ROCK BOLTS, Survey No. 11/1, Near Hanuman Temple, Gothiva, Vadodara, Gujarat - 391110");
    const [shipTo, setShipTo] = useState("");
    const [billTo, setBillTo] = useState("");
    const [manualInvoiceNumber, setManualInvoiceNumber] = useState("");
    const [dispatchedThrough, setDispatchedThrough] = useState("");
    const [buyersOrderNo, setBuyersOrderNo] = useState("");
    const [paymentTerms, setPaymentTerms] = useState("");
    const [uploadingSaleId, setUploadingSaleId] = useState(null);

    // Dispatch More dialog
    const [dispatchOpen, setDispatchOpen] = useState(false);
    const [dispatchTarget, setDispatchTarget] = useState(null);
    const [dispatchAdd, setDispatchAdd] = useState("");

    const [viewSale, setViewSale] = useState(null);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [search, setSearch] = useState("");
    const [editOpen, setEditOpen] = useState(false);
    const [editingSale, setEditingSale] = useState(null);
    // Edit form states
    const [editInvoiceNumber, setEditInvoiceNumber] = useState("");
    const [editDispatchedThrough, setEditDispatchedThrough] = useState("");
    const [editBuyersOrderNo, setEditBuyersOrderNo] = useState("");
    const [editDispatchFrom, setEditDispatchFrom] = useState("");
    const [editShipTo, setEditShipTo] = useState("");
    const [editBillTo, setEditBillTo] = useState("");
    const [editPaymentTerms, setEditPaymentTerms] = useState("");
    const [editPaymentNote, setEditPaymentNote] = useState("");
    const [editDispatchQty, setEditDispatchQty] = useState("");
    const [editInvoiceUrl, setEditInvoiceUrl] = useState("");
    const [editPaymentStatus, setEditPaymentStatus] = useState("Pending");

    const pendingOnPO = (po) => Math.max(0, (Number(po.total_quantity) || 0) - (Number(po.delivered_quantity) || 0));

    const calcAmounts = (po, qty) => {
        const unitPrice = Number(po.unit_price) || 0;
        const freight = Number(po.freight) || 0;
        const gstRate = parseFloat((po.gst || "0").toString().replace("%", "")) || 0;
        const subtotal = unitPrice * qty;
        const gstAmount = Math.round(subtotal * gstRate / 100);
        return { unitPrice, freight, gstRate, gstAmount, subtotal, grandTotal: subtotal + gstAmount + freight };
    };

    const handlePOChange = (poNumber) => {
        setSelectedPO(poNumber);
        const po = orders.find((o) => o.po_number === poNumber);
        setPoData(po || null);
        setDispatchQty("");
        setPaymentStatus("Pending");
        setPaymentNote("");
        setInvoiceUrl("");
        setShipTo(po?.location || "");
        setBillTo(po?.client_name || "");
        setManualInvoiceNumber("");
        setDispatchedThrough("");
        setBuyersOrderNo("");
        setPaymentTerms(po?.payment_terms || "");
    };

    const handleInvoiceUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const data = await uploadInvoiceFile(file);
            setInvoiceUrl(data.file_url);
            toast.success("Invoice uploaded");
        } catch (err) {
            toast.error("Upload failed: " + err.message);
        }
    };

    const handleDirectInvoiceUpload = async (e, saleId) => {
        const file = e.target.files[0];
        if (!file || !saleId) return;
        const tid = toast.loading("Uploading invoice...");
        try {
            const data = await uploadInvoiceFile(file);
            await updateMutation.mutateAsync({ 
                id: saleId, 
                body: { invoice_url: data.file_url, updated_by: getCurrentUser() } 
            });
            toast.success("Invoice updated", { id: tid });
            setUploadingSaleId(null);
        } catch (err) {
            toast.error("Upload failed: " + err.message, { id: tid });
        }
    };

    const handleDeleteInvoice = async (saleId) => {
        if (!window.confirm("Are you sure you want to delete this invoice? You can then upload a new one.")) return;
        const tid = toast.loading("Removing invoice...");
        try {
            await updateMutation.mutateAsync({ 
                id: saleId, 
                body: { invoice_url: null, updated_by: getCurrentUser() } 
            });
            await activityMutation.mutateAsync({
                id: saleId,
                body: { action: "Invoice Deleted", note: "Uploaded invoice document was removed", by: getCurrentUser() },
            });
            toast.success("Invoice removed", { id: tid });
        } catch (err) {
            toast.error("Failed to remove invoice: " + err.message, { id: tid });
        }
    };


    const handleAddSale = async () => {
        if (!poData) { toast.error("Select a PO first"); return; }
        const qty = Number(dispatchQty);
        if (!qty || qty <= 0) { toast.error("Enter dispatch quantity"); return; }
        const maxDispatch = pendingOnPO(poData);
        if (qty > maxDispatch) { toast.error(`Cannot dispatch more than pending qty (${maxDispatch})`); return; }
        const calc = calcAmounts(poData, qty);
        try {
            await createMutation.mutateAsync({
                po_id: poData.id,
                po_number: poData.po_number,
                client_name: poData.client_name,
                item: poData.item,
                project: poData.project,
                uom: poData.uom || "Nos",
                dispatched_qty: qty,
                total_qty: Number(poData.total_quantity) || 0,
                previous_delivered: Number(poData.delivered_quantity) || 0,
                unit_price: calc.unitPrice,
                gst_rate: calc.gstRate,
                freight: calc.freight,
                payment_status: paymentStatus,
                payment_note: paymentNote || null,
                invoice_url: invoiceUrl || null,
                invoice_number: manualInvoiceNumber || null,
                dispatch_from: dispatchFrom || null,
                ship_to: shipTo || null,
                bill_to: billTo || null,
                dispatched_through: dispatchedThrough || null,
                buyers_order_no: buyersOrderNo || null,
                payment_terms: paymentTerms || null,
                created_by: getCurrentUser(),
            });
            toast.success("Sale added & PO updated");
            setAddOpen(false);
            setSelectedPO("");
            setPoData(null);
        } catch (e) {
            toast.error(e.message);
        }
    };

    const openDispatch = (sale) => { setDispatchTarget(sale); setDispatchAdd(""); setDispatchOpen(true); };

    const handleDispatch = async () => {
        const qty = Number(dispatchAdd);
        if (!qty || qty <= 0) { toast.error("Enter quantity to dispatch"); return; }
        const po = orders.find((o) => o.id === dispatchTarget.po_id);
        const remaining = po ? pendingOnPO(po) : 0;
        if (qty > remaining) { toast.error(`Only ${remaining} pending on this PO`); return; }
        try {
            await updateMutation.mutateAsync({
                id: dispatchTarget.id,
                body: {
                    dispatched_qty: dispatchTarget.dispatched_qty + qty,
                    updated_by: getCurrentUser(),
                },
            });
            await activityMutation.mutateAsync({
                id: dispatchTarget.id,
                body: { action: "Additional Dispatch", note: `Dispatched ${qty} more ${dispatchTarget.uom}`, by: getCurrentUser(), payment_status: dispatchTarget.payment_status },
            });
            toast.success("Dispatch updated");
            setDispatchOpen(false);
        } catch (e) {
            toast.error(e.message);
        }
    };

    const handlePaymentUpdate = async (saleId, status) => {
        try {
            await updateMutation.mutateAsync({ id: saleId, body: { payment_status: status, updated_by: getCurrentUser() } });
            await activityMutation.mutateAsync({
                id: saleId,
                body: { action: "Payment Updated", note: `Status changed to ${status}`, payment_status: status, by: getCurrentUser() },
            });
            toast.success(`Payment marked as ${status}`);
        } catch (e) {
            toast.error(e.message);
        }
    };

    const confirmDeleteSale = async () => {
        if (!itemToDelete) return;
        try {
            await deleteMutation.mutateAsync(itemToDelete);
            toast.success("Sale deleted");
        } catch (e) {
            toast.error(e.message);
        }
        setItemToDelete(null);
    };
    
    const openEditSale = (sale) => {
        setEditingSale(sale);
        setEditInvoiceNumber(sale.invoice_number || "");
        setEditDispatchedThrough(sale.dispatched_through || "");
        setEditBuyersOrderNo(sale.buyers_order_no || "");
        setEditDispatchFrom(sale.dispatch_from || "");
        setEditShipTo(sale.ship_to || "");
        setEditBillTo(sale.bill_to || "");
        setEditPaymentTerms(sale.payment_terms || "");
        setEditPaymentNote(sale.payment_note || "");
        setEditDispatchQty(sale.dispatched_qty.toString());
        setEditInvoiceUrl(sale.invoice_url || "");
        setEditPaymentStatus(sale.payment_status);
        setEditOpen(true);
    };

    const handleUpdateSale = async () => {
        if (!editingSale) return;
        try {
            await updateMutation.mutateAsync({
                id: editingSale.id,
                body: {
                    invoice_number: editInvoiceNumber || null,
                    dispatched_through: editDispatchedThrough || null,
                    buyers_order_no: editBuyersOrderNo || null,
                    dispatch_from: editDispatchFrom || null,
                    ship_to: editShipTo || null,
                    bill_to: editBillTo || null,
                    payment_terms: editPaymentTerms || null,
                    payment_note: editPaymentNote || null,
                    dispatched_qty: Number(editDispatchQty),
                    invoice_url: editInvoiceUrl || null,
                    payment_status: editPaymentStatus,
                    updated_by: getCurrentUser(),
                }
            });
            await activityMutation.mutateAsync({
                id: editingSale.id,
                body: { action: "Sale Updated", note: "Sale details were modified", by: getCurrentUser(), payment_status: editPaymentStatus },
            });
            toast.success("Sale details updated");
            setEditOpen(false);
            setEditingSale(null);
        } catch (e) {
            toast.error(e.message);
        }
    };

    const handleEditInvoiceUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const data = await uploadInvoiceFile(file);
            setEditInvoiceUrl(data.file_url);
            toast.success("Invoice uploaded");
        } catch (err) {
            toast.error("Upload failed: " + err.message);
        }
    };

    const poCalc = useMemo(() => {
        if (!poData || !dispatchQty) return null;
        return calcAmounts(poData, Number(dispatchQty));
    }, [poData, dispatchQty]);

    const editPoCalc = useMemo(() => {
        if (!editingSale || !editDispatchQty) return null;
        return calcAmounts({
            unit_price: editingSale.unit_price,
            gst: editingSale.gst_rate,
            freight: editingSale.freight
        }, Number(editDispatchQty));
    }, [editingSale, editDispatchQty]);

    const filteredSales = useMemo(() => {
        if (!search.trim()) return sales;
        const q = search.toLowerCase();
        return sales.filter((s) =>
            s.po_number.toLowerCase().includes(q) ||
            s.client_name.toLowerCase().includes(q) ||
            (s.item || "").toLowerCase().includes(q) ||
            (s.project || "").toLowerCase().includes(q)
        );
    }, [sales, search]);

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">Sales</h2>
                    <p className="text-sm text-muted-foreground mt-1">Manage dispatch, invoicing, payments and activity tracking.</p>
                </div>
                <Button onClick={() => setAddOpen(true)} className="bg-gradient-primary hover:opacity-90 shadow-elegant">
                    <Plus className="h-4 w-4 mr-2" /> Add New Sale
                </Button>
            </div>

            {/* Add New Sale Dialog */}
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>Add New Sales Invoice</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1">
                            <Label>Purchase Order No. *</Label>
                            <Select value={selectedPO} onValueChange={handlePOChange}>
                                <SelectTrigger><SelectValue placeholder="Select PO Number" /></SelectTrigger>
                                <SelectContent>
                                    {orders.length > 0
                                        ? orders.map((o) => (
                                            <SelectItem key={o.id} value={o.po_number}>
                                                {o.po_number} — {o.client_name}
                                            </SelectItem>
                                        ))
                                        : <div className="p-2 text-sm text-muted-foreground">No POs available</div>
                                    }
                                </SelectContent>
                            </Select>
                        </div>

                        {poData && (
                            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Auto-filled from PO</p>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <Field label="Client" value={poData.client_name} />
                                        <Field label="Project" value={poData.project} />
                                        <Field label="Item" value={poData.item} full />
                                        <Field label="Total Qty" value={`${poData.total_quantity} ${poData.uom || "Nos"}`} />
                                        <Field label="Unit Price" value={inr(poData.unit_price)} />
                                        <Field label="GST %" value={`${poData.gst || 0}%`} />
                                        <Field label="Freight" value={inr(poData.freight)} />
                                        <Field label="Payment Terms" value={poData.payment_terms} full />
                                        {poData.validity_date && <Field label="Validity" value={fmtDate(poData.validity_date)} />}
                                    </div>
                            </div>
                        )}

                        {poData && (
                            <div className="space-y-1">
                                <Label>Dispatch Quantity * <span className="text-xs text-muted-foreground">(max: {pendingOnPO(poData)} {poData.uom || "Nos"})</span></Label>
                                <Input type="number" min="1" max={pendingOnPO(poData)} placeholder="Enter quantity to dispatch"
                                    value={dispatchQty} onChange={(e) => setDispatchQty(e.target.value)} />
                            </div>
                        )}

                        {poCalc && (
                            <div className="space-y-3">
                                <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] uppercase text-muted-foreground">Total Delivered</span>
                                            <span className="font-bold text-foreground">{(Number(poData.delivered_quantity) || 0) + Number(dispatchQty)} {poData.uom || "Nos"}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] uppercase text-muted-foreground">Remaining Pending</span>
                                            <span className="font-bold text-orange-600">{Math.max(0, pendingOnPO(poData) - Number(dispatchQty))} {poData.uom || "Nos"}</span>
                                        </div>
                                        <div className="flex flex-col border-l border-primary/20 pl-4">
                                            <span className="text-[10px] uppercase text-muted-foreground">Grand Total</span>
                                            <span className="font-bold text-primary">{inr(poCalc.grandTotal)}</span>
                                        </div>
                                    </div>
                                    <div className="mt-2 pt-2 border-t border-primary/10 flex flex-wrap gap-x-4 text-[11px] text-muted-foreground">
                                        <span>Subtotal: {inr(poCalc.subtotal)}</span>
                                        <span>GST {poCalc.gstRate}%: {inr(poCalc.gstAmount)}</span>
                                        <span>Freight: {inr(poCalc.freight)}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {poData && (
                            <div className="space-y-4 pt-2 border-t border-border">
                                <div className="space-y-1">
                                    <Label>Dispatch From (Source Address)</Label>
                                    <Textarea 
                                        placeholder="Enter source address" 
                                        value={dispatchFrom} 
                                        onChange={(e) => setDispatchFrom(e.target.value)}
                                        rows={2}
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <Label>Ship To (Delivery Address) *</Label>
                                        <Textarea 
                                            placeholder="Enter delivery address" 
                                            value={shipTo} 
                                            onChange={(e) => setShipTo(e.target.value)}
                                            rows={3}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Bill To (Billing Address) *</Label>
                                        <Textarea 
                                            placeholder="Enter billing address" 
                                            value={billTo} 
                                            onChange={(e) => setBillTo(e.target.value)}
                                            rows={3}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {poData && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border">
                                <div className="space-y-1">
                                    <Label>Invoice Number (Manual)</Label>
                                    <Input 
                                        placeholder="Enter invoice number (optional)" 
                                        value={manualInvoiceNumber} 
                                        onChange={(e) => setManualInvoiceNumber(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Dispatched Through (Manual)</Label>
                                    <Input 
                                        placeholder="Enter courier/transport name" 
                                        value={dispatchedThrough} 
                                        onChange={(e) => setDispatchedThrough(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1 sm:col-span-2">
                                    <Label>Buyer's Order No. (Manual)</Label>
                                    <Input 
                                        placeholder="Enter buyer's order number" 
                                        value={buyersOrderNo} 
                                        onChange={(e) => setBuyersOrderNo(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        {poData && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label>Payment Status</Label>
                                    <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {PAYMENT_STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1 sm:col-span-2">
                                    <Label>Upload Invoice Document</Label>
                                    <div className="flex items-center gap-2">
                                        <Input type="file" className="hidden" id="invoice-file-upload" onChange={handleInvoiceUpload} accept=".pdf,.jpg,.jpeg,.png" />
                                        <Button type="button" variant="outline" className="w-full" onClick={() => document.getElementById("invoice-file-upload").click()}>
                                            <FileText className={`h-4 w-4 mr-2 ${invoiceUrl ? "text-green-500" : "text-red-500"}`} />
                                            {invoiceUrl ? "Invoice Uploaded ✓" : "Upload Invoice"}
                                        </Button>
                                        {invoiceUrl && (
                                            <div className="flex items-center gap-2">
                                                <Button type="button" variant="ghost" size="sm" onClick={() => setInvoiceUrl("")} className="text-destructive hover:bg-destructive/10">
                                                    <Trash2 className="h-4 w-4 mr-2" /> Remove upload file
                                                </Button>
                                                <Button type="button" variant="link" size="sm" className="text-primary text-xs" onClick={() => window.open(`http://localhost:8000${invoiceUrl}`, "_blank")}>
                                                    View current file
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                        <Button onClick={handleAddSale} className="bg-gradient-primary" disabled={createMutation.isPending}>Add Sales Invoice</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Sale Dialog */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>Edit Sale: {editingSale?.po_number}</DialogTitle></DialogHeader>
                    {editingSale && (
                        <div className="space-y-4 py-2">
                            {/* PO Context Info */}
                            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">PO Information (Reference)</p>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <Field label="Client" value={editingSale.client_name} />
                                    <Field label="Project" value={editingSale.project} />
                                    <Field label="Item" value={editingSale.item} full />
                                    <Field label="Total PO Qty" value={`${editingSale.total_qty} ${editingSale.uom}`} />
                                    <Field label="Payment Terms (from PO)" value={editingSale.payment_terms} full />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label>Dispatch Quantity *</Label>
                                <Input type="number" value={editDispatchQty} onChange={(e) => setEditDispatchQty(e.target.value)} />
                            </div>

                            {editPoCalc && (
                                <div className="space-y-3">
                                    <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                                        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                                            <div className="flex flex-col border-l border-primary/20 pl-4">
                                                <span className="text-[10px] uppercase text-muted-foreground">Updated Grand Total</span>
                                                <span className="font-bold text-primary">{inr(editPoCalc.grandTotal)}</span>
                                            </div>
                                        </div>
                                        <div className="mt-2 pt-2 border-t border-primary/10 flex flex-wrap gap-x-4 text-[11px] text-muted-foreground">
                                            <span>Subtotal: {inr(editPoCalc.subtotal)}</span>
                                            <span>GST {editPoCalc.gstRate}%: {inr(editPoCalc.gstAmount)}</span>
                                            <span>Freight: {inr(editPoCalc.freight)}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label>Invoice Number</Label>
                                    <Input value={editInvoiceNumber} onChange={(e) => setEditInvoiceNumber(e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                    <Label>Dispatched Through</Label>
                                    <Input value={editDispatchedThrough} onChange={(e) => setEditDispatchedThrough(e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                    <Label>Buyer's Order No.</Label>
                                    <Input value={editBuyersOrderNo} onChange={(e) => setEditBuyersOrderNo(e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                    <Label>Payment Status</Label>
                                    <Select value={editPaymentStatus} onValueChange={setEditPaymentStatus}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {PAYMENT_STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-4 pt-2 border-t border-border">
                                <div className="space-y-1">
                                    <Label>Dispatch From (Source Address)</Label>
                                    <Textarea value={editDispatchFrom} onChange={(e) => setEditDispatchFrom(e.target.value)} rows={2} />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <Label>Ship To (Delivery Address)</Label>
                                        <Textarea value={editShipTo} onChange={(e) => setEditShipTo(e.target.value)} rows={3} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Bill To (Billing Address)</Label>
                                        <Textarea value={editBillTo} onChange={(e) => setEditBillTo(e.target.value)} rows={3} />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1 sm:col-span-2 pt-2 border-t border-border">
                                <Label>Upload Updated Invoice Document</Label>
                                <div className="flex items-center gap-2">
                                    <Input type="file" className="hidden" id="edit-invoice-file-upload" onChange={handleEditInvoiceUpload} accept=".pdf,.jpg,.jpeg,.png" />
                                    <Button type="button" variant="outline" className="w-full" onClick={() => document.getElementById("edit-invoice-file-upload").click()}>
                                        <FileText className={`h-4 w-4 mr-2 ${editInvoiceUrl ? "text-green-500" : "text-red-500"}`} />
                                        {editInvoiceUrl ? "Invoice Uploaded ✓" : "Upload Invoice"}
                                    </Button>
                                    {editInvoiceUrl && (
                                        <div className="flex items-center gap-2">
                                            <Button type="button" variant="ghost" size="sm" onClick={() => setEditInvoiceUrl("")} className="text-destructive hover:bg-destructive/10">
                                                <Trash2 className="h-4 w-4 mr-2" /> Remove upload file
                                            </Button>
                                            <Button type="button" variant="link" size="sm" className="text-primary text-xs" onClick={() => window.open(`http://localhost:8000${editInvoiceUrl}`, "_blank")}>
                                                View current file
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-1 pt-2 border-t border-border">
                                <Label>Update Note</Label>
                                <Input placeholder="Optional note about this edit" value={editPaymentNote} onChange={(e) => setEditPaymentNote(e.target.value)} />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                        <Button onClick={handleUpdateSale} className="bg-gradient-primary" disabled={updateMutation.isPending}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dispatch More Dialog */}
            <Dialog open={dispatchOpen} onOpenChange={setDispatchOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>Dispatch More</DialogTitle></DialogHeader>
                    {dispatchTarget && (() => {
                        const po = orders.find((o) => o.id === dispatchTarget.po_id);
                        const remaining = po ? pendingOnPO(po) : 0;
                        return (
                            <div className="space-y-4 py-2">
                                <div className="text-sm text-muted-foreground">PO: <span className="font-medium text-foreground">{dispatchTarget.po_number}</span></div>
                                <div className="space-y-1">
                                    <Label>Additional Quantity <span className="text-xs text-muted-foreground">(max: {remaining} {dispatchTarget.uom})</span></Label>
                                    <Input type="number" min="1" max={remaining} value={dispatchAdd} onChange={(e) => setDispatchAdd(e.target.value)} />
                                </div>
                            </div>
                        );
                    })()}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDispatchOpen(false)}>Cancel</Button>
                        <Button onClick={handleDispatch} className="bg-gradient-primary" disabled={updateMutation.isPending}>Dispatch</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* View Activity Dialog */}
            <Dialog open={!!viewSale} onOpenChange={(o) => !o && setViewSale(null)}>
                <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>Sale Activity Log</DialogTitle></DialogHeader>
                    {viewSale && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <Field label="PO Number" value={viewSale.po_number} />
                                <Field label="Client" value={viewSale.client_name} />
                                <Field label="Item" value={viewSale.item} full />
                                <Field label="Invoice #" value={viewSale.invoice_number} />
                                <Field label="Dispatched Qty" value={`${viewSale.dispatched_qty} ${viewSale.uom}`} />
                                <Field label="Grand Total" value={inr(viewSale.grand_total)} />
                                <Field label="Payment Status" value={viewSale.payment_status} />
                                <Field label="Dispatch From" value={viewSale.dispatch_from} full />
                                <Field label="Ship To" value={viewSale.ship_to} full />
                                <Field label="Bill To" value={viewSale.bill_to} full />
                                <Field label="Dispatched Through" value={viewSale.dispatched_through} full />
                                <Field label="Buyer's Order No." value={viewSale.buyers_order_no} full />
                                <Field label="Payment Terms" value={viewSale.payment_terms} full />
                            </div>
                            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                                <div className="flex items-center gap-2 text-sm font-semibold">
                                    <Clock className="h-4 w-4 text-accent" /> Activities
                                </div>
                                {(viewSale.activities || []).map((act, i) => (
                                    <div key={i} className="text-xs border-l-2 border-primary/40 pl-3 space-y-0.5">
                                        <div className="font-semibold text-foreground">{act.action}</div>
                                        <div className="text-muted-foreground">{act.note}</div>
                                        <div className="flex items-center gap-1 text-muted-foreground">
                                            <User className="h-3 w-3" />
                                            <span>{act.by || "—"}</span>
                                            <span>·</span>
                                            <span>{fmtDateTime(act.at)}</span>
                                        </div>
                                        <div><StatusBadge status={act.payment_status === "Paid" ? "Delivered" : act.payment_status === "Partial" ? "Partial" : "Pending"} label={act.payment_status} /></div>
                                    </div>
                                ))}
                                {(!viewSale.activities || viewSale.activities.length === 0) && (
                                    <p className="text-xs text-muted-foreground">No activities recorded.</p>
                                )}
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setViewSale(null)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Search bar */}
            {sales.length > 1 && (
                <Card className="p-4 shadow-card">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input className="pl-9" placeholder="Search by PO number, client, item, project..."
                            value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                </Card>
            )}

            {/* Sales List */}
            {isLoading ? (
                <Card className="p-12 text-center shadow-card"><p className="text-muted-foreground">Loading sales...</p></Card>
            ) : filteredSales.length === 0 ? (
                <Card className="p-12 text-center shadow-card">
                    <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">
                        {sales.length === 0 ? <>No sales yet. Click <b>Add New Sale</b> to get started.</> : "No sales match your search."}
                    </p>
                </Card>
            ) : (
                <div className="space-y-4">
                    {filteredSales.map((sale) => {
                        const po = orders.find((o) => o.id === sale.po_id);
                        const currentPending = po ? pendingOnPO(po) : 0;
                        const totalDelivered = (sale.previous_delivered || 0) + sale.dispatched_qty;
                        return (
                            <Card key={sale.id} className="p-5 shadow-card space-y-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <span className="font-semibold text-foreground">{sale.po_number}</span>
                                        <span className="ml-2 text-sm text-muted-foreground">— {sale.client_name}</span>
                                        {sale.invoice_number && (
                                            <span className="ml-2 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{sale.invoice_number}</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <StatusBadge
                                            status={sale.payment_status === "Paid" ? "Delivered" : sale.payment_status === "Partial" ? "Partial" : "Pending"}
                                            label={sale.payment_status}
                                        />
                                        <button onClick={() => setViewSale(sale)} title="View Activity"
                                            className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted transition-colors">
                                            <Eye className="h-4 w-4" />
                                        </button>
                                        <button onClick={() => openEditSale(sale)} title="Edit Sale"
                                            className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted transition-colors text-blue-500">
                                            <Pencil className="h-4 w-4" />
                                        </button>
                                        <button 
                                            onClick={() => {
                                                if (sale.invoice_url) {
                                                    window.open(`http://localhost:8000${sale.invoice_url}`, "_blank");
                                                } else {
                                                    setUploadingSaleId(sale.id);
                                                    document.getElementById("direct-invoice-upload").click();
                                                }
                                            }} 
                                            title={sale.invoice_url ? "View Invoice" : "Upload Invoice"}
                                            className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted transition-colors"
                                        >
                                            {sale.invoice_url ? (
                                                <FileText className="h-4 w-4 text-green-500" />
                                            ) : (
                                                <UploadCloud className="h-4 w-4 text-red-500" />
                                            )}
                                        </button>
                                        <button onClick={() => setItemToDelete(sale.id)} title="Delete Sale"
                                            className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-destructive/10 text-destructive transition-colors">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-sm">
                                    <Field label="Item" value={sale.item} />
                                    <Field label="Project" value={sale.project} />
                                    <Field label="PO Total Qty" value={`${sale.total_qty} ${sale.uom}`} />
                                    <Field label="Dispatched Qty" value={`${sale.dispatched_qty} ${sale.uom}`} />
                                    <Field label="Pending Qty" value={`${currentPending} ${sale.uom}`} />
                                    <Field label="Grand Total" value={inr(sale.grand_total)} />
                                    <Field label="GST" value={`${sale.gst_rate}% (${inr(sale.gst_amount)})`} />
                                    <Field label="Freight" value={inr(sale.freight)} />
                                    <Field label="Dispatched Through" value={sale.dispatched_through} />
                                    <Field label="Buyer's Order No." value={sale.buyers_order_no} />
                                </div>

                                <div className="flex flex-wrap gap-6 text-xs border-t border-border pt-3">
                                    <div>
                                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Created By</div>
                                        <div className="font-semibold text-foreground">{sale.created_by || "—"}</div>
                                        <div className="text-muted-foreground">{fmtDateTime(sale.created_at)}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Last Updated By</div>
                                        <div className="font-semibold text-foreground">{sale.updated_by || "—"}</div>
                                        <div className="text-muted-foreground">{fmtDateTime(sale.updated_at)}</div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <Button size="sm" variant="outline" onClick={() => openDispatch(sale)}>
                                        <Truck className="h-4 w-4 mr-1" /> Dispatch More
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => openInvoiceDocument(sale.id)}>
                                        <Package className="h-4 w-4 mr-1" /> Generate Invoice
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => downloadInvoiceDocument(sale.id)}>
                                        <Download className="h-4 w-4 mr-1" /> Download Invoice
                                    </Button>
                                    {PAYMENT_STATUS.filter((s) => s !== sale.payment_status).map((s) => (
                                        <Button key={s} size="sm" variant="outline" onClick={() => handlePaymentUpdate(sale.id, s)}>
                                            <CreditCard className="h-4 w-4 mr-1" /> Mark {s}
                                        </Button>
                                    ))}
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>Confirm Deletion</DialogTitle></DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-muted-foreground">Are you sure you want to delete this sale? This action cannot be undone.</p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setItemToDelete(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmDeleteSale} disabled={deleteMutation.isPending}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <input 
                type="file" 
                id="direct-invoice-upload" 
                className="hidden" 
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleDirectInvoiceUpload(e, uploadingSaleId)} 
            />
        </div>
    );
};

const Field = ({ label, value, full }) => (
    <div className={full ? "col-span-2" : ""}>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="font-medium text-foreground break-words">{value ?? "—"}</div>
    </div>
);

export default SalesInvoice;
