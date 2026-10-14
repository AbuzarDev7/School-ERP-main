import { invoiceService } from "./invoice.service.js";
import { invoiceSchema } from "./invoice.validation.js";
import { z } from "zod";

export const createInvoice = async (req, res) => {
  try {
    const parsed = invoiceSchema.parse(req.body);
    const invoice = await invoiceService.create(parsed);
    res.status(201).json(invoice);
  } catch (err) {
    const message = err instanceof z.ZodError ? "Invalid invoice data" : err.message;
    res.status(400).json({ error: message });
  }
};

export const getInvoices = async (req, res) => {
  try {
    const invoices = await invoiceService.getAll();
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
};

export const getInvoice = async (req, res) => {
  try {
    const invoice = await invoiceService.getById(req.params.id);
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const parsed = invoiceSchema.parse(req.body);
    const updated = await invoiceService.update(id, parsed);
    res.json(updated);
  } catch (err) {
    const message = err instanceof z.ZodError ? "Update validation failed" : err.message;
    res.status(400).json({ error: message });
  }
};

export const deleteInvoice = async (req, res) => {
  try {
    await invoiceService.delete(req.params.id);
    res.json({ success: true, message: "Invoice deleted successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};