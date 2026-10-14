import { workerService } from "./worker.service.js";
import { workerSchema, workerPaymentSchema, workerAdvanceSchema, workerExtraHoursSchema } from "./worker.validation.js";
import { supabaseService } from "../../config/supabase.service.js";
import { z } from "zod";

// FormData sends everything as strings; coerce the numeric fields before Zod validation.
const coerceWorkerFields = (body) => ({
  ...body,
  ...(body.monthlySalary !== undefined && { monthlySalary: Number(body.monthlySalary) }),
  ...(body.hourlyOvertimeRate !== undefined && { hourlyOvertimeRate: Number(body.hourlyOvertimeRate) }),
  ...(body.standardWorkingDays !== undefined && { standardWorkingDays: Number(body.standardWorkingDays) }),
});

export const createWorker = async (req, res) => {
  try {
    let profilePicture;
    if (req.file) {
      profilePicture = await supabaseService.uploadFile(req.file, 'school-assets', 'workers');
    }
    const validatedData = workerSchema.parse(coerceWorkerFields(req.body));
    if (profilePicture) validatedData.profilePicture = profilePicture;
    const worker = await workerService.createWorker(validatedData);
    res.status(201).json(worker);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    console.error("Create Worker Error:", error);
    res.status(500).json({ error: "Failed to create worker" });
  }
};

export const getAllWorkers = async (req, res) => {
  try {
    const { month } = req.query; // Optional month filter
    const workers = await workerService.getAllWorkers(month);
    res.json(workers);
  } catch (error) {
    console.error("Get All Workers Error:", error);
    res.status(500).json({ error: "Failed to fetch workers" });
  }
};

export const getWorkerById = async (req, res) => {
  try {
    const { id } = req.params;
    const worker = await workerService.getWorkerById(id);
    if (!worker) {
      return res.status(404).json({ error: "Worker not found" });
    }
    res.json(worker);
  } catch (error) {
    console.error("Get Worker By ID Error:", error);
    res.status(500).json({ error: "Failed to fetch worker" });
  }
};

export const updateWorker = async (req, res) => {
  try {
    const { id } = req.params;
    let profilePicture;
    if (req.file) {
      profilePicture = await supabaseService.uploadFile(req.file, 'school-assets', 'workers');
    }
    const validatedData = workerSchema.partial().parse(coerceWorkerFields(req.body));
    if (profilePicture) validatedData.profilePicture = profilePicture;
    const updatedWorker = await workerService.updateWorker(id, validatedData);
    res.json(updatedWorker);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    console.error("Update Worker Error:", error);
    res.status(500).json({ error: "Failed to update worker" });
  }
};

export const deleteWorker = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedWorker = await workerService.deleteWorker(id);
    res.json(updatedWorker);
  } catch (error) {
    console.error("Delete Worker Error:", error);
    res.status(500).json({ error: "Failed to delete worker" });
  }
};

export const reactivateWorker = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedWorker = await workerService.reactivateWorker(id);
    res.json(updatedWorker);
  } catch (error) {
    console.error("Reactivate Worker Error:", error);
    res.status(500).json({ error: "Failed to reactivate worker" });
  }
};

export const createPayment = async (req, res) => {
  try {
    const validatedData = workerPaymentSchema.parse(req.body);
    const payment = await workerService.createPayment(validatedData);
    res.status(201).json(payment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error("Create Payment Error:", error);
    res.status(500).json({ error: "Failed to create payment" });
  }
};

export const getPayrollContext = async (req, res) => {
  try {
    const { id } = req.params;
    const { month } = req.query;
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: "Valid month (YYYY-MM) is required" });
    }
    const context = await workerService.getPayrollContext(id, month);
    if (!context) return res.status(404).json({ error: "Worker not found" });
    res.json(context);
  } catch (error) {
    console.error("Get Payroll Context Error:", error);
    res.status(500).json({ error: "Failed to fetch payroll context" });
  }
};

export const createAdvance = async (req, res) => {
  try {
    const validatedData = workerAdvanceSchema.parse(req.body);
    const advance = await workerService.createAdvance(validatedData);
    res.status(201).json(advance);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error("Create Advance Error:", error);
    res.status(500).json({ error: "Failed to create advance" });
  }
};

export const updateAdvance = async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = workerAdvanceSchema.partial().parse(req.body);
    const updated = await workerService.updateAdvance(id, validatedData);
    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error("Update Advance Error:", error);
    res.status(500).json({ error: "Failed to update advance" });
  }
};

export const deleteAdvance = async (req, res) => {
  try {
    const { id } = req.params;
    await workerService.deleteAdvance(id);
    res.status(204).send();
  } catch (error) {
    console.error("Delete Advance Error:", error);
    res.status(500).json({ error: "Failed to delete advance" });
  }
};

export const createExtraHours = async (req, res) => {
  try {
    const validatedData = workerExtraHoursSchema.parse(req.body);
    const entry = await workerService.createExtraHours(validatedData);
    res.status(201).json(entry);
  } catch (error) {
    console.error("Create Extra Hours Error:", error);
    res.status(500).json({ error: "Failed to record extra hours" });
  }
};

export const updateExtraHours = async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = workerExtraHoursSchema.partial().parse(req.body);
    const updated = await workerService.updateExtraHours(id, validatedData);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Failed to update extra hours" });
  }
};

export const deleteExtraHours = async (req, res) => {
  try {
    const { id } = req.params;
    await workerService.deleteExtraHours(id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete entry" });
  }
};

export const undoPayment = async (req, res) => {
  try {
    const { id } = req.params;
    await workerService.undoPayment(id);
    res.status(204).send();
  } catch (error) {
    console.error("Undo Payment Error:", error);
    res.status(500).json({ error: "Failed to undo payment" });
  }
};