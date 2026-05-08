import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { StatusBadge } from "@/components/StatusBadge";
import { inr, fmtDate, fmtDateTime } from "@/lib/format";
import { getCurrentUser } from "@/lib/currentUser";
import {
    fetchPurchaseOrders, fetchSales, createSale, updateSale,
    deleteSale as deleteSaleApi, addSaleActivity, openInvoiceDocument, downloadInvoiceDocument,
    uploadInvoiceFile
} from "@/lib/api";
import { toast } from "sonner";
import { Plus, Truck, Clock, CreditCard, Eye, Package, User, Trash2, Search, Download, UploadCloud, FileText, X, Pencil, Receipt, CheckCircle } from "lucide-react";

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
    const deleteMutation = useMutation({
        mutationFn: deleteSaleApi,
        onSuccess: () => {
            invalidateSales();
            toast.success("Sale record deleted successfully");
        },
        onError: (err) => {
            toast.error(err.message || "Failed to delete sale record");
        }
    });
    const activityMutation = useMutation({ mutationFn: ({ id, body }) => addSaleActivity(id, body), onSuccess: () => qc.invalidateQueries({ queryKey: ["sales"] }) });

    // Add Sale dialog
    const [addOpen, setAddOpen] = useState(false);
    const [selectedPO, setSelectedPO] = useState("");
    const [poData, setPoData] = useState(null);
    const [selectedLineItemId, setSelectedLineItemId] = useState("");
    const [manualItem, setManualItem] = useState("");
    const [manualUnitPrice, setManualUnitPrice] = useState("");
    const [manualGstRate, setManualGstRate] = useState("");
    const [manualFreight, setManualFreight] = useState("");
    const [dispatchQty, setDispatchQty] = useState("");
    const [paymentStatus, setPaymentStatus] = useState("Pending");
    const [paymentNote, setPaymentNote] = useState("");
    const [invoiceUrl, setInvoiceUrl] = useState("");
    const [eWayBillUrl, setEWayBillUrl] = useState("");
    const [dispatchFrom, setDispatchFrom] = useState("JB ROCK BOLTS, Survey No. 11/1, Near Hanuman Temple, Gothiva, Vadodara, Gujarat - 391110");
    const [shipTo, setShipTo] = useState("");
    const [billTo, setBillTo] = useState("");
    const [manualInvoiceNumber, setManualInvoiceNumber] = useState("");
    const [dispatchedThrough, setDispatchedThrough] = useState("");
    const [eWayBillNo, setEWayBillNo] = useState("");
    const [buyersOrderNo, setBuyersOrderNo] = useState("");
    const [paymentTerms, setPaymentTerms] = useState("");
    const [hsnCode, setHsnCode] = useState("");
    const [uploadingSaleId, setUploadingSaleId] = useState(null);
    const [dispatchItems, setDispatchItems] = useState([]); // List of items for current dispatch
    const [manualTotalGstRate, setManualTotalGstRate] = useState(""); // Manual override for total GST %

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
    const [editEWayBillNo, setEditEWayBillNo] = useState("");
    const [editBuyersOrderNo, setEditBuyersOrderNo] = useState("");
    const [editDispatchFrom, setEditDispatchFrom] = useState("");
    const [editShipTo, setEditShipTo] = useState("");
    const [editBillTo, setEditBillTo] = useState("");
    const [editPaymentTerms, setEditPaymentTerms] = useState("");
    const [editPaymentNote, setEditPaymentNote] = useState("");
    const [editDispatchQty, setEditDispatchQty] = useState("");
    const [editInvoiceUrl, setEditInvoiceUrl] = useState("");
    const [editEWayBillUrl, setEditEWayBillUrl] = useState("");
    const [editPaymentStatus, setEditPaymentStatus] = useState("Pending");
    const [editManualItem, setEditManualItem] = useState("");
    const [editManualUnitPrice, setEditManualUnitPrice] = useState("");
    const [editManualGstRate, setEditManualGstRate] = useState("");
    const [editManualFreight, setEditManualFreight] = useState("");
    const [editHsnCode, setEditHsnCode] = useState("");

    // Mark Delivered dialog
    const [markDeliveredOpen, setMarkDeliveredOpen] = useState(false);
    const [markDeliveredTarget, setMarkDeliveredTarget] = useState(null);
    const [deliveryChallanUrl, setDeliveryChallanUrl] = useState("");

    const pendingOnPO = (po) => {
        if (!po) return 0;
        return Math.max(0, (Number(po.total_quantity) || 0) - (Number(po.delivered_quantity) || 0));
    };

    const getRealTimePending = (lineItemId) => {
        if (!poData) return 0;
        let basePending = 0;
        if (lineItemId === "default" || !lineItemId) {
            basePending = pendingOnPO(poData);
        } else {
            const li = poData.line_items?.find(x => x.id.toString() === lineItemId.toString());
            basePending = li ? (li.quantity - li.delivered_quantity) : 0;
        }
        const alreadyStaged = dispatchItems
            .filter(item => {
                if (lineItemId === "default" || !lineItemId) return item.line_item_id === null;
                return item.line_item_id?.toString() === lineItemId.toString();
            })
            .reduce((acc, item) => acc + item.quantity, 0);
        return Math.max(0, basePending - alreadyStaged);
    };

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
        setSelectedLineItemId("");

        const firstItem = po?.line_items?.[0];
        if (po?.line_items?.length === 1 && firstItem) {
            setSelectedLineItemId(firstItem.id.toString());
            setManualItem(firstItem.item);
            setManualUnitPrice(firstItem.unit_price.toString());
        } else {
            setManualItem(po?.item || "");
            setManualUnitPrice(po?.unit_price?.toString() || "");
        }

        setManualGstRate(parseFloat((po?.gst || "18").toString().replace("%", "")) || 18);
        setManualFreight(po?.freight?.toString() || "0");

        setPaymentStatus("Pending");
        setPaymentNote("");
        setInvoiceUrl("");
        setEWayBillUrl("");
        setShipTo(po?.location || "");
        setBillTo(""); // Leave empty as requested (don't fill name here)
        setManualInvoiceNumber("");
        setDispatchedThrough("");
        setEWayBillNo("");
        setBuyersOrderNo("");
        setPaymentTerms(po?.payment_terms || "");
        setHsnCode("");
    };

    const handleItemChange = (liId) => {
        setSelectedLineItemId(liId);
        const li = poData?.line_items?.find(x => x.id.toString() === liId);
        if (li) {
            setManualItem(li.item);
            setManualUnitPrice(li.unit_price.toString());
        }
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

    const handleEWayBillUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const data = await uploadInvoiceFile(file);
            setEWayBillUrl(data.file_url);
            toast.success("e-Way bill uploaded");
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


    const addItemToDispatch = () => {
        if (!manualItem || !dispatchQty || Number(dispatchQty) <= 0) {
            toast.error("Please select an item and enter valid quantity");
            return;
        }

        const calc = calcAmounts({
            unit_price: manualUnitPrice,
            gst: manualGstRate,
            freight: 0 // Freight is handled at dispatch level
        }, Number(dispatchQty));

        const pending = getRealTimePending(selectedLineItemId);
        if (Number(dispatchQty) > pending) {
            toast.error(`Only ${pending} remaining for this item in this dispatch`);
            return;
        }

        const li = poData.line_items?.find(x => x.id.toString() === selectedLineItemId);

        const newItem = {
            line_item_id: selectedLineItemId === "default" ? null : Number(selectedLineItemId),
            item: manualItem,
            uom: li ? li.uom : (poData.uom || "Nos"),
            quantity: Number(dispatchQty),
            po_pending: pending - Number(dispatchQty), // The NEW pending after this add
            unit_price: Number(manualUnitPrice),
            gst_rate: Number(manualGstRate),
            subtotal: calc.subtotal,
            gst_amount: calc.gstAmount,
            total_amount: calc.grandTotal
        };

        setDispatchItems([...dispatchItems, newItem]);

        // Reset item fields but keep common ones
        setManualItem("");
        setDispatchQty("");
        setSelectedLineItemId("");
        setManualUnitPrice("");
        setManualGstRate("18");
    };

    const removeItemFromDispatch = (index) => {
        setDispatchItems(dispatchItems.filter((_, i) => i !== index));
    };

    const handleAddSale = async () => {
        if (!poData) { toast.error("Select a PO first"); return; }
        if (dispatchItems.length === 0) { toast.error("Add at least one item"); return; }

        const subtotal = dispatchItems.reduce((acc, item) => acc + item.subtotal, 0);
        const calculatedGstAmt = dispatchItems.reduce((acc, item) => acc + item.gst_amount, 0);

        let gst_amount = calculatedGstAmt;
        if (manualTotalGstRate !== "") {
            gst_amount = Math.round(subtotal * (Number(manualTotalGstRate) / 100));
        }

        const freight = Number(manualFreight) || 0;
        const grand_total = subtotal + gst_amount + freight;

        try {
            await createMutation.mutateAsync({
                po_id: poData.id,
                po_number: poData.po_number,
                client_name: poData.client_name,
                project: poData.project,
                items: dispatchItems,
                subtotal,
                gst_amount,
                freight,
                grand_total,
                payment_status: paymentStatus,
                payment_note: paymentNote || null,
                invoice_url: invoiceUrl || null,
                e_way_bill_url: eWayBillUrl || null,
                invoice_number: manualInvoiceNumber || null,
                dispatch_from: dispatchFrom || null,
                ship_to: shipTo || null,
                bill_to: billTo || null,
                dispatched_through: dispatchedThrough || null,
                e_way_bill_no: eWayBillNo || null,
                buyers_order_no: buyersOrderNo || null,
                payment_terms: paymentTerms || null,
                hsn_code: hsnCode || null,
                created_by: getCurrentUser(),
            });
            toast.success("Sales Invoice created");
            setAddOpen(false);
            setSelectedPO("");
            setPoData(null);
            setDispatchItems([]);
        } catch (e) {
            toast.error(e.message);
        }
    };

    const openDispatch = (sale) => { setDispatchTarget(sale); setDispatchAdd(""); setDispatchOpen(true); };

    const handleDispatch = async () => {
        // Since the system now supports multi-item sales, "Dispatch More" 
        // should ideally add new items or create a new sale.
        // For now, to avoid errors, we recommend creating a new Sale instead.
        toast.info("Please create a new Sale entry for additional dispatches.");
        setDispatchOpen(false);
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
        const firstItem = sale.items?.[0] || {};
        setEditManualItem(firstItem.item || "");
        setEditManualUnitPrice(firstItem.unit_price?.toString() || "");
        setEditManualGstRate(firstItem.gst_rate?.toString() || "");
        setEditManualFreight(sale.freight?.toString() || "");
        setEditInvoiceNumber(sale.invoice_number || "");
        setEditDispatchedThrough(sale.dispatched_through || "");
        setEditEWayBillNo(sale.e_way_bill_no || "");
        setEditBuyersOrderNo(sale.buyers_order_no || "");
        setEditDispatchFrom(sale.dispatch_from || "");
        setEditShipTo(sale.ship_to || "");
        setEditBillTo(sale.bill_to || "");
        setEditPaymentTerms(sale.payment_terms || "");
        setEditPaymentNote(sale.payment_note || "");
        setEditHsnCode(sale.hsn_code || "");

        const totalQty = sale.items?.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0) || 0;
        setEditDispatchQty(totalQty.toString());

        setEditInvoiceUrl(sale.invoice_url || "");
        setEditEWayBillUrl(sale.e_way_bill_url || "");
        setEditPaymentStatus(sale.payment_status);
        setEditOpen(true);
    };

    const handleUpdateSale = async () => {
        if (!editingSale) return;
        try {
            await updateMutation.mutateAsync({
                id: editingSale.id,
                body: {
                    freight: Number(editManualFreight),
                    invoice_number: editInvoiceNumber || null,
                    dispatched_through: editDispatchedThrough || null,
                    e_way_bill_no: editEWayBillNo || null,
                    buyers_order_no: editBuyersOrderNo || null,
                    dispatch_from: editDispatchFrom || null,
                    ship_to: editShipTo || null,
                    bill_to: editBillTo || null,
                    payment_terms: editPaymentTerms || null,
                    payment_note: editPaymentNote || null,
                    invoice_url: editInvoiceUrl || null,
                    e_way_bill_url: editEWayBillUrl || null,
                    payment_status: editPaymentStatus,
                    hsn_code: editHsnCode || null,
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

    const handleEditEWayBillUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const data = await uploadInvoiceFile(file);
            setEditEWayBillUrl(data.file_url);
            toast.success("e-Way bill uploaded");
        } catch (err) {
            toast.error("Upload failed: " + err.message);
        }
    };

    const handleDeliveryChallanUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const data = await uploadInvoiceFile(file);
            setDeliveryChallanUrl(data.file_url);
            toast.success("Challan uploaded");
        } catch (err) {
            toast.error("Upload failed: " + err.message);
        }
    };

    const handleMarkDelivered = async () => {
        if (!markDeliveredTarget) return;
        if (!deliveryChallanUrl) {
            toast.error("Please upload a delivery challan document");
            return;
        }
        try {
            await updateMutation.mutateAsync({
                id: markDeliveredTarget.id,
                body: {
                    delivery_status: "Delivered",
                    delivery_challan_url: deliveryChallanUrl,
                    updated_by: getCurrentUser()
                }
            });
            await activityMutation.mutateAsync({
                id: markDeliveredTarget.id,
                body: { action: "Marked Delivered", note: "Sale marked as delivered with challan document.", payment_status: markDeliveredTarget.payment_status, by: getCurrentUser() },
            });
            toast.success("Sale marked as Delivered");
            setMarkDeliveredOpen(false);
            setMarkDeliveredTarget(null);
        } catch (e) {
            toast.error(e.message);
        }
    };

    const poCalc = useMemo(() => {
        if (!poData || !dispatchQty) return null;
        return calcAmounts({
            unit_price: manualUnitPrice,
            gst: manualGstRate,
            freight: manualFreight
        }, Number(dispatchQty));
    }, [poData, dispatchQty, manualUnitPrice, manualGstRate, manualFreight]);

    const editPoCalc = useMemo(() => {
        if (!editingSale || !editDispatchQty) return null;
        return calcAmounts({
            unit_price: editManualUnitPrice,
            gst: editManualGstRate,
            freight: editManualFreight
        }, Number(editDispatchQty));
    }, [editingSale, editDispatchQty, editManualUnitPrice, editManualGstRate, editManualFreight]);

    const filteredSales = useMemo(() => {
        if (!search.trim()) return sales;
        const q = search.toLowerCase();
        return sales.filter((s) =>
            (s.po_number || "").toLowerCase().includes(q) ||
            (s.client_name || "").toLowerCase().includes(q) ||
            (s.item || "").toLowerCase().includes(q) ||
            (s.project || "").toLowerCase().includes(q)
        );
    }, [sales, search]);

    return (
        <TooltipProvider>
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
                            <div className="space-y-6">

                                {/* AUTO-FILLED INFO */}
                                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Auto-filled from PO</p>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <Field label="Client" value={poData.client_name} />
                                        <Field label="Project" value={poData.project} />
                                        {(!poData.line_items || poData.line_items.length <= 1) && (
                                            <>
                                                <Field label="Item" value={poData.item} full />
                                                <Field label="Total Qty" value={`${poData.total_quantity} ${poData.uom || "Nos"}`} />
                                                <Field label="Unit Price" value={inr(poData.unit_price)} />
                                            </>
                                        )}
                                        <Field label="GST %" value={`${poData.gst || 0}%`} />
                                        <Field label="Freight" value={inr(poData.freight)} />
                                        <Field label="Payment Terms" value={poData.payment_terms} full />
                                        {poData.validity_date && <Field label="Validity" value={fmtDate(poData.validity_date)} />}
                                    </div>
                                </div>


                                {/* 1. Invoice Details */}
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
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                    </Button>
                                                    <Button type="button" variant="link" size="sm" className="text-primary text-xs" onClick={() => window.open(`http://localhost:8000${invoiceUrl}`, "_blank")}>
                                                        View
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* 2. e-Way Bill Details */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border">
                                    <div className="space-y-1">
                                        <Label>e-Way Bill No.</Label>
                                        <Input
                                            placeholder="Enter e-Way bill number"
                                            value={eWayBillNo}
                                            onChange={(e) => setEWayBillNo(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Upload e-Way Bill Document</Label>
                                        <div className="flex items-center gap-2">
                                            <Input type="file" className="hidden" id="eway-file-upload" onChange={handleEWayBillUpload} accept=".pdf,.jpg,.jpeg,.png" />
                                            <Button type="button" variant="outline" className="w-full" onClick={() => document.getElementById("eway-file-upload").click()}>
                                                <Receipt className={`h-4 w-4 mr-2 ${eWayBillUrl ? "text-green-500" : "text-red-500"}`} />
                                                {eWayBillUrl ? "e-Way Bill Uploaded ✓" : "Upload e-Way Bill"}
                                            </Button>
                                            {eWayBillUrl && (
                                                <div className="flex items-center gap-2">
                                                    <Button type="button" variant="ghost" size="sm" onClick={() => setEWayBillUrl("")} className="text-destructive hover:bg-destructive/10">
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                    </Button>
                                                    <Button type="button" variant="link" size="sm" className="text-primary text-xs" onClick={() => window.open(`http://localhost:8000${eWayBillUrl}`, "_blank")}>
                                                        View
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* 3. Buyer's Order & 4. Dispatched Through */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border">
                                    <div className="space-y-1">
                                        <Label>Buyer's Order No. (Manual)</Label>
                                        <Input
                                            placeholder="Enter buyer's order number"
                                            value={buyersOrderNo}
                                            onChange={(e) => setBuyersOrderNo(e.target.value)}
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
                                </div>

                                {/* Addresses */}
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

                                {/* ITEM DISPATCH SECTION (Form and List) */}
                                <div className="space-y-4">
                                    <div className="space-y-4 pt-4 border-t border-border">
                                        <div className="space-y-1">
                                            <Label>Item Name (Select from PO) *</Label>
                                            <Select value={selectedLineItemId} onValueChange={handleItemChange}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={manualItem || "Select an item"} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {poData.line_items?.length > 0 ? (
                                                        poData.line_items.map((li) => (
                                                            <SelectItem key={li.id} value={li.id.toString()}>
                                                                {li.item} ({getRealTimePending(li.id)} pending)
                                                            </SelectItem>
                                                        ))
                                                    ) : (
                                                        <SelectItem value="default">{poData.item} ({getRealTimePending("default")} pending)</SelectItem>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="space-y-1">
                                                <Label>Rate (Rate)</Label>
                                                <Input type="number" value={manualUnitPrice} onChange={e => setManualUnitPrice(e.target.value)} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label>GST %</Label>
                                                <Input type="number" value={manualGstRate} onChange={e => setManualGstRate(e.target.value)} />
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex justify-between items-center">
                                                    <Label>Dispatch Quantity</Label>
                                                    {selectedLineItemId && (
                                                        <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                                                            Pending: {getRealTimePending(selectedLineItemId)}
                                                        </span>
                                                    )}
                                                </div>
                                                <Input type="number" value={dispatchQty} onChange={(e) => setDispatchQty(e.target.value)} />
                                            </div>
                                        </div>
                                        <Button type="button" variant="outline" className="w-full border-dashed border-primary text-primary hover:bg-primary/5" onClick={addItemToDispatch}>
                                            <Plus className="h-4 w-4 mr-2" /> Add Item to this Dispatch
                                        </Button>
                                    </div>

                                    {dispatchItems.length > 0 && (
                                        <div className="space-y-3 pt-4 border-t border-border">
                                            <Label className="text-xs font-semibold text-primary uppercase">Items in this Dispatch</Label>
                                            <div className="rounded-lg border border-border overflow-hidden">
                                                <table className="w-full text-xs text-left">
                                                    <thead className="bg-muted text-muted-foreground font-medium border-b border-border">
                                                        <tr>
                                                            <th className="p-2">Item Name</th>
                                                            <th className="p-2 text-center">PO Pending</th>
                                                            <th className="p-2 text-center">Dispatch Qty</th>
                                                            <th className="p-2 text-right">Rate</th>
                                                            <th className="p-2 text-right">GST</th>
                                                            <th className="p-2 text-right">Total</th>
                                                            <th className="p-2"></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {dispatchItems.map((item, idx) => (
                                                            <tr key={idx} className="border-b border-border/50">
                                                                <td className="p-2">
                                                                    <div className="font-medium">{item.item}</div>
                                                                </td>
                                                                <td className="p-2 text-center text-muted-foreground">{item.po_pending} {item.uom}</td>
                                                                <td className="p-2 text-center font-semibold text-primary">{item.quantity} {item.uom}</td>
                                                                <td className="p-2 text-right">{inr(item.unit_price)}</td>
                                                                <td className="p-2 text-right">{inr(item.gst_amount)} ({item.gst_rate}%)</td>
                                                                <td className="p-2 text-right font-bold">{inr(item.total_amount)}</td>
                                                                <td className="p-2">
                                                                    <Button variant="ghost" size="sm" onClick={() => removeItemFromDispatch(idx)} className="h-6 w-6 p-0 text-destructive">
                                                                        <X className="h-3 w-3" />
                                                                    </Button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                                <div className="p-2 bg-primary/5 flex flex-wrap justify-between items-center text-[11px] gap-4">
                                                    {(() => {
                                                        const subtotal = dispatchItems.reduce((acc, i) => acc + i.subtotal, 0);
                                                        const calculatedGstAmt = dispatchItems.reduce((acc, i) => acc + i.gst_amount, 0);
                                                        const freight = Number(manualFreight) || 0;

                                                        let finalGstAmt = calculatedGstAmt;
                                                        if (manualTotalGstRate !== "") {
                                                            finalGstAmt = Math.round(subtotal * (Number(manualTotalGstRate) / 100));
                                                        }

                                                        return (
                                                            <>
                                                                <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                                                                    <span className="text-muted-foreground">Subtotal: <b className="text-foreground">{inr(subtotal)}</b></span>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-muted-foreground whitespace-nowrap">GST Rate (%):</span>
                                                                        <Input
                                                                            type="number"
                                                                            className="h-7 w-14 text-[11px] py-0 px-2 text-center"
                                                                            placeholder="Rate"
                                                                            value={manualTotalGstRate}
                                                                            onChange={(e) => setManualTotalGstRate(e.target.value)}
                                                                        />
                                                                        {manualTotalGstRate !== "" && (
                                                                            <span className="text-muted-foreground">({inr(finalGstAmt)})</span>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-muted-foreground whitespace-nowrap">Freight:</span>
                                                                        <Input
                                                                            type="number"
                                                                            className="h-7 w-20 text-[11px] py-0 px-2"
                                                                            placeholder="0"
                                                                            value={manualFreight}
                                                                            onChange={(e) => setManualFreight(e.target.value)}
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div className="font-bold text-primary text-sm">
                                                                    Total Payable: {inr(subtotal + finalGstAmt + (Number(manualFreight) || 0))}
                                                                </div>
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* HSN/SAC */}
                                <div className="space-y-1 pt-2 border-t border-border">
                                    <Label>HSN/SAC</Label>
                                    <Input
                                        placeholder="Enter HSN/SAC code"
                                        value={hsnCode}
                                        onChange={(e) => setHsnCode(e.target.value)}
                                    />
                                </div>

                                {/* Payment Status */}
                                <div className="space-y-1 pt-2 border-t border-border">
                                    <Label>Payment Status</Label>
                                    <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {PAYMENT_STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
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
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sale Information (Editable)</p>
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <Label>Item(s) Dispatched</Label>
                                        <Input value={editManualItem} readOnly className="bg-muted cursor-not-allowed" />
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 text-sm">
                                        <div className="space-y-1">
                                            <Label>Base Rate</Label>
                                            <Input type="number" value={editManualUnitPrice} readOnly className="bg-muted cursor-not-allowed" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label>GST %</Label>
                                            <Input type="number" value={editManualGstRate} readOnly className="bg-muted cursor-not-allowed" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label>Total Freight</Label>
                                            <Input type="number" value={editManualFreight} onChange={e => setEditManualFreight(e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 1. Invoice Details */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border">
                                <div className="space-y-1">
                                    <Label>Invoice Number</Label>
                                    <Input value={editInvoiceNumber} onChange={(e) => setEditInvoiceNumber(e.target.value)} />
                                </div>
                                <div className="space-y-1">
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
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                </Button>
                                                <Button type="button" variant="link" size="sm" className="text-primary text-xs" onClick={() => window.open(`http://localhost:8000${editInvoiceUrl}`, "_blank")}>
                                                    View
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* 2. e-Way Bill Details */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border">
                                <div className="space-y-1">
                                    <Label>e-Way Bill No.</Label>
                                    <Input value={editEWayBillNo} onChange={(e) => setEditEWayBillNo(e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                    <Label>Upload Updated e-Way Bill Document</Label>
                                    <div className="flex items-center gap-2">
                                        <Input type="file" className="hidden" id="edit-eway-file-upload" onChange={handleEditEWayBillUpload} accept=".pdf,.jpg,.jpeg,.png" />
                                        <Button type="button" variant="outline" className="w-full" onClick={() => document.getElementById("edit-eway-file-upload").click()}>
                                            <Receipt className={`h-4 w-4 mr-2 ${editEWayBillUrl ? "text-green-500" : "text-red-500"}`} />
                                            {editEWayBillUrl ? "e-Way Bill Uploaded ✓" : "Upload e-Way Bill"}
                                        </Button>
                                        {editEWayBillUrl && (
                                            <div className="flex items-center gap-2">
                                                <Button type="button" variant="ghost" size="sm" onClick={() => setEditEWayBillUrl("")} className="text-destructive hover:bg-destructive/10">
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                </Button>
                                                <Button type="button" variant="link" size="sm" className="text-primary text-xs" onClick={() => window.open(`http://localhost:8000${editEWayBillUrl}`, "_blank")}>
                                                    View
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* 3. Buyer's Order & 4. Dispatched Through */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border">
                                <div className="space-y-1">
                                    <Label>Buyer's Order No.</Label>
                                    <Input value={editBuyersOrderNo} onChange={(e) => setEditBuyersOrderNo(e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                    <Label>Dispatched Through</Label>
                                    <Input value={editDispatchedThrough} onChange={(e) => setEditDispatchedThrough(e.target.value)} />
                                </div>
                            </div>

                            {/* Addresses */}
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

                            {/* Dispatch Quantity */}
                            <div className="space-y-1 pt-2 border-t border-border">
                                <Label>Total Dispatch Quantity</Label>
                                <Input type="number" value={editDispatchQty} readOnly className="bg-muted cursor-not-allowed" />
                            </div>

                            {/* HSN/SAC */}
                            <div className="space-y-1">
                                <Label>HSN/SAC</Label>
                                <Input
                                    placeholder="Enter HSN/SAC code"
                                    value={editHsnCode}
                                    onChange={(e) => setEditHsnCode(e.target.value)}
                                />
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

                            {/* Payment Status */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border">
                                <div className="space-y-1">
                                    <Label>Payment Status</Label>
                                    <Select value={editPaymentStatus} onValueChange={setEditPaymentStatus}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {PAYMENT_STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label>Update Note</Label>
                                    <Input placeholder="Optional note about this edit" value={editPaymentNote} onChange={(e) => setEditPaymentNote(e.target.value)} />
                                </div>
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
                                <Field label="Delivery Status" value={viewSale.delivery_status} />
                                <Field label="Dispatch From" value={viewSale.dispatch_from} full />
                                <Field label="Ship To" value={viewSale.ship_to} full />
                                <Field label="Bill To" value={viewSale.bill_to} full />
                                <Field label="Dispatched Through" value={viewSale.dispatched_through} full />
                                <Field label="e-Way Bill No." value={viewSale.e_way_bill_no} />
                            </div>
                            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Item Details</p>
                                <div className="rounded-md border border-border overflow-hidden">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-muted text-muted-foreground font-medium border-b border-border">
                                            <tr>
                                                <th className="p-2">Item</th>
                                                <th className="p-2 text-center">Qty</th>
                                                <th className="p-2 text-right">Rate</th>
                                                <th className="p-2 text-right">GST</th>
                                                <th className="p-2 text-right">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(viewSale.items || []).map((it, idx) => (
                                                <tr key={idx} className="border-b border-border/50">
                                                    <td className="p-2 font-medium">{it.item}</td>
                                                    <td className="p-2 text-center">{it.quantity} {it.uom}</td>
                                                    <td className="p-2 text-right">{inr(it.unit_price)}</td>
                                                    <td className="p-2 text-right">{inr(it.gst_amount)} ({it.gst_rate}%)</td>
                                                    <td className="p-2 text-right font-bold">{inr(it.total_amount)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-muted/50 font-semibold">
                                            <tr>
                                                <td colSpan="4" className="p-2 text-right">Subtotal:</td>
                                                <td className="p-2 text-right">{inr(viewSale.subtotal)}</td>
                                            </tr>
                                            <tr>
                                                <td colSpan="4" className="p-2 text-right">Total GST:</td>
                                                <td className="p-2 text-right">{inr(viewSale.gst_amount)}</td>
                                            </tr>
                                            <tr>
                                                <td colSpan="4" className="p-2 text-right">Freight:</td>
                                                <td className="p-2 text-right">{inr(viewSale.freight)}</td>
                                            </tr>
                                            <tr className="text-primary bg-primary/5 text-sm">
                                                <td colSpan="4" className="p-2 text-right">Grand Total:</td>
                                                <td className="p-2 text-right">{inr(viewSale.grand_total)}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="space-y-1">
                                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Invoice Doc</div>
                                    {viewSale.invoice_url ? (
                                        <Button type="button" variant="link" size="sm" className="p-0 h-auto text-primary" onClick={() => window.open(`http://localhost:8000${viewSale.invoice_url}`, "_blank")}>
                                            View Invoice
                                        </Button>
                                    ) : <span className="text-xs text-muted-foreground">—</span>}
                                </div>
                                <div className="space-y-1">
                                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">e-Way Bill Doc</div>
                                    {viewSale.e_way_bill_url ? (
                                        <Button type="button" variant="link" size="sm" className="p-0 h-auto text-primary" onClick={() => window.open(`http://localhost:8000${viewSale.e_way_bill_url}`, "_blank")}>
                                            View e-Way Bill
                                        </Button>
                                    ) : <span className="text-xs text-muted-foreground">—</span>}
                                </div>
                                <div className="space-y-1">
                                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Delivery Challan</div>
                                    {viewSale.delivery_challan_url ? (
                                        <Button type="button" variant="link" size="sm" className="p-0 h-auto text-primary" onClick={() => window.open(`http://localhost:8000${viewSale.delivery_challan_url}`, "_blank")}>
                                            View Challan
                                        </Button>
                                    ) : <span className="text-xs text-muted-foreground">—</span>}
                                </div>
                                <Field label="Buyer's Order No." value={viewSale.buyers_order_no} full />
                                <Field label="HSN/SAC" value={viewSale.hsn_code} />
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
                        const totalDispatched = sale.items?.reduce((acc, it) => acc + it.quantity, 0) || 0;
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
                                        <StatusBadge
                                            status={sale.delivery_status === "Delivered" ? "Delivered" : "Not Delivered"}
                                            label={sale.delivery_status}
                                        />
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <button onClick={() => setViewSale(sale)}
                                                    className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted transition-colors">
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent><p>View Activity</p></TooltipContent>
                                        </Tooltip>

                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <button onClick={() => openEditSale(sale)}
                                                    className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted transition-colors text-blue-500">
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent><p>Edit Sale</p></TooltipContent>
                                        </Tooltip>

                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <button
                                                    onClick={() => {
                                                        if (sale.invoice_url) {
                                                            window.open(`http://localhost:8000${sale.invoice_url}`, "_blank");
                                                        } else {
                                                            setUploadingSaleId(sale.id);
                                                            document.getElementById("direct-invoice-upload").click();
                                                        }
                                                    }}
                                                    className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted transition-colors"
                                                >
                                                    {sale.invoice_url ? (
                                                        <FileText className="h-4 w-4 text-green-500" />
                                                    ) : (
                                                        <UploadCloud className="h-4 w-4 text-red-500" />
                                                    )}
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent><p>{sale.invoice_url ? "View Invoice" : "Upload Invoice"}</p></TooltipContent>
                                        </Tooltip>

                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <button
                                                    onClick={() => {
                                                        if (sale.e_way_bill_url) {
                                                            window.open(`http://localhost:8000${sale.e_way_bill_url}`, "_blank");
                                                        } else {
                                                            setUploadingSaleId(sale.id);
                                                            document.getElementById("direct-eway-upload").click();
                                                        }
                                                    }}
                                                    className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted transition-colors"
                                                >
                                                    {sale.e_way_bill_url ? (
                                                        <Receipt className="h-4 w-4 text-green-500" />
                                                    ) : (
                                                        <Receipt className="h-4 w-4 text-red-500" />
                                                    )}
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent><p>{sale.e_way_bill_url ? "View e-Way Bill" : "Upload e-Way Bill"}</p></TooltipContent>
                                        </Tooltip>

                                        {sale.delivery_challan_url && (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <button 
                                                        onClick={() => window.open(`http://localhost:8000${sale.delivery_challan_url}`, "_blank")} 
                                                        className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted transition-colors"
                                                    >
                                                        <FileText className="h-4 w-4 text-blue-500" />
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent><p>View Delivery Challan</p></TooltipContent>
                                            </Tooltip>
                                        )}

                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <button onClick={() => setItemToDelete(sale.id)}
                                                    className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-destructive/10 text-destructive transition-colors">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent><p>Delete Sale</p></TooltipContent>
                                        </Tooltip>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-sm">
                                    <Field label="Items" value={sale.item} full />
                                    <Field label="Project" value={sale.project} />
                                    <Field label="Invoice Total" value={inr(sale.grand_total)} />
                                    <Field label="Subtotal" value={inr(sale.subtotal)} />
                                    <Field label="Total GST" value={inr(sale.gst_amount)} />
                                    <Field label="Freight" value={inr(sale.freight)} />
                                    <Field label="Dispatched Through" value={sale.dispatched_through} />
                                    <Field label="HSN/SAC" value={sale.hsn_code} />
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
                                    <Button size="xs" variant="outline" onClick={() => openDispatch(sale)}>
                                        <Truck className="h-3 w-3 mr-1" /> Dispatch More
                                    </Button>
                                    <Button size="xs" variant="outline" onClick={() => openInvoiceDocument(sale.id)}>
                                        <Package className="h-3 w-3 mr-1" /> Generate Invoice
                                    </Button>
                                    <Button size="xs" variant="outline" onClick={() => downloadInvoiceDocument(sale.id)}>
                                        <Download className="h-3 w-3 mr-1" /> Download Invoice
                                    </Button>
                                    <Button
                                        size="xs"
                                        variant="outline"
                                        onClick={() => {
                                            if (sale.e_way_bill_url) {
                                                window.open(`http://localhost:8000${sale.e_way_bill_url}`, "_blank");
                                            } else {
                                                setUploadingSaleId(sale.id);
                                                document.getElementById("direct-eway-upload").click();
                                            }
                                        }}
                                        className={sale.e_way_bill_url ? "text-green-600 border-green-200 hover:bg-green-50" : ""}
                                    >
                                        <Receipt className="h-3 w-3 mr-1" />
                                        {sale.e_way_bill_url ? "View e-Way Bill" : "Upload e-Way Bill"}
                                    </Button>
                                    {sale.delivery_status !== "Delivered" && (
                                        <Button size="xs" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50" onClick={() => {
                                            setMarkDeliveredTarget(sale);
                                            setDeliveryChallanUrl("");
                                            setMarkDeliveredOpen(true);
                                        }}>
                                            <CheckCircle className="h-3 w-3 mr-1" /> Mark Delivered
                                        </Button>
                                    )}
                                    {PAYMENT_STATUS.filter((s) => s !== sale.payment_status).map((s) => (
                                        <Button key={s} size="xs" variant="outline" onClick={() => handlePaymentUpdate(sale.id, s)}>
                                            <CreditCard className="h-3 w-3 mr-1" /> Mark {s}
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

            {/* Mark Delivered Confirmation Dialog */}
            <Dialog open={markDeliveredOpen} onOpenChange={(open) => !open && setMarkDeliveredOpen(false)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>Mark as Delivered</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <p className="text-sm text-muted-foreground">Upload the delivery challan document to mark this sale as Delivered.</p>
                        <div className="space-y-2">
                            <Label>Delivery Challan Document *</Label>
                            <div className="flex items-center gap-2">
                                <Input type="file" className="hidden" id="challan-file-upload" onChange={handleDeliveryChallanUpload} accept=".pdf,.jpg,.jpeg,.png" />
                                <Button type="button" variant="outline" className="w-full" onClick={() => document.getElementById("challan-file-upload").click()}>
                                    <FileText className="h-4 w-4 mr-2" />
                                    {deliveryChallanUrl ? "Challan Uploaded ✓" : "Upload Challan"}
                                </Button>
                                {deliveryChallanUrl && (
                                    <Button type="button" variant="ghost" size="icon" onClick={() => setDeliveryChallanUrl("")} title="Remove">
                                        <X className="h-4 w-4 text-destructive" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setMarkDeliveredOpen(false)}>Cancel</Button>
                        <Button onClick={handleMarkDelivered} className="bg-gradient-primary" disabled={!deliveryChallanUrl || updateMutation.isPending}>Mark Delivered</Button>
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
            <input
                type="file"
                id="direct-eway-upload"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={async (e) => {
                    const file = e.target.files[0];
                    if (!file || !uploadingSaleId) return;
                    const tid = toast.loading("Uploading e-way bill...");
                    try {
                        const data = await uploadInvoiceFile(file);
                        await updateMutation.mutateAsync({
                            id: uploadingSaleId,
                            body: { e_way_bill_url: data.file_url, updated_by: getCurrentUser() }
                        });
                        toast.success("e-Way bill updated", { id: tid });
                        setUploadingSaleId(null);
                    } catch (err) {
                        toast.error("Upload failed: " + err.message, { id: tid });
                    }
                }}
            />
        </div>
        </TooltipProvider>
    );
};

const Field = ({ label, value, full }) => (
    <div className={full ? "col-span-2" : ""}>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="font-medium text-foreground break-words">{value ?? "—"}</div>
    </div>
);

export default SalesInvoice;