// student.controller.js
import { studentService } from "./student.service.js"
import { z } from "zod"; // Import z from zod
import { studentSchema } from "./student.validation.js"
import { supabaseService } from '../../config/supabase.service.js';
import { activityService } from '../activity/activity.service.js';

const ctxFromReq = (req) => ({
  actorId: req.user?.id,
  actorName: req.user?.name,
  actorEmail: req.user?.email,
  ipAddress: req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim(),
});

const studentLabel = (s) => `${s?.firstName || ''} ${s?.lastName || ''}`.trim() || `Student #${s?.regNumber || s?.id || ''}`;

export const createStudent = async (req, res) => {
  try {
    const { body, files } = req;

    // Extract raw student data from the request body, excluding metadata and relation fields
    const {
      id: _id, createdAt, updatedAt, discounts, manualDiscount, // manualDiscount is deprecated
      ...rawStudentData
    } = body;

    // 0. Validate with Zod
    const validatedData = studentSchema.parse(rawStudentData);

    // Initialize data for Prisma with validated and coerced types
    const studentDataForPrisma = {
      ...validatedData,
      lastSession: validatedData.lastSession ?? '',
      fathersCnic: validatedData.fathersCnic ?? '',
      emergencyNumber: validatedData.emergencyNumber ?? '',
    };

    // 1. Process File Uploads to Supabase Storage in parallel
    if (files) {
      const fileKeys = ['photo', 'birthCertificate', 'fatherCnicFile', 'leavingCertificate'];
      for (const key of fileKeys) {
        if (files[key]?.[0]) {
          try {
            studentDataForPrisma[key] = await supabaseService.uploadFile(files[key][0]);
          } catch (e) {
            console.error(`File upload failed for ${key}:`, e);
            throw new Error(`Failed to upload ${key}. Supabase might be busy.`);
          }
        }
      }
    }

    // Zod's coerce.date() handles date parsing, so direct assignment from validatedData is sufficient.
    // Ensure we don't pass raw empty strings to Prisma if Zod preprocessed them to undefined
    if (validatedData.dob !== undefined) studentDataForPrisma.dob = validatedData.dob;
    if (validatedData.admissionDate !== undefined) studentDataForPrisma.admissionDate = validatedData.admissionDate;

    // 3. Save to database
    const student = await studentService.create(studentDataForPrisma);
    activityService.log({
      ...ctxFromReq(req),
      action: 'STUDENT_CREATED',
      entityType: 'Student',
      entityId: student.id,
      entityLabel: studentLabel(student),
    });
    res.status(201).json(student);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    console.error("Create Student Error:", error);
    res.status(500).json({ error: "Failed to register student" });
  }
};

export const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { files } = req;

    // 1. Sanitize body: exclude primary keys, metadata, and relations
    // We also exclude file fields from the initial spread to avoid overwriting 
    // them with string URLs until we've processed potential new uploads.
    const {
      id: _id, createdAt, updatedAt, discounts, regNumber,
      photo: _p, birthCertificate: _bc, fatherCnicFile: _fcf, leavingCertificate: _lc,
      ...rawUpdateData
    } = req.body;

    // Helper to get single string value even if field is sent multiple times
    const body = req.body;
    const getVal = (key) => Array.isArray(body[key]) ? body[key][body[key].length - 1] : body[key];

    // 1.5 Validate updates with Zod (partial allowed if needed, but schema is strict here)
    const validatedData = studentSchema.partial().parse(rawUpdateData);

    // Initialize data for Prisma with validated and coerced types
    const updateDataForPrisma = { ...validatedData };

    // 2. Fetch existing record to handle file cleanup from Supabase
    const oldStudent = await studentService.getById(id);
    if (!oldStudent) return res.status(404).json({ error: "Student not found" });
    const fileFields = ['photo', 'birthCertificate', 'fatherCnicFile', 'leavingCertificate'];

    // 3. Handle file updates
    if (files) {
      for (const field of fileFields) {
        if (files[field] && files[field][0]) {
          if (oldStudent[field]) await supabaseService.deleteFile(oldStudent[field]);
          updateDataForPrisma[field] = await supabaseService.uploadFile(files[field][0]);
        }
      }
    }

    // 4. Handle files that weren't changed (keep existing URL) 
    // or were explicitly cleared (sent as empty string)
    for (const field of fileFields) {
      if (updateDataForPrisma[field] === undefined) {
        const currentVal = getVal(field);

        const isValidPath = typeof currentVal === 'string' && (
          currentVal.startsWith('http') || currentVal.startsWith('/uploads/')
        );

        if (currentVal === '') {
          if (oldStudent[field]) await supabaseService.deleteFile(oldStudent[field]);
          updateDataForPrisma[field] = null;
        } else if (isValidPath) {
          updateDataForPrisma[field] = currentVal;
        }
      }
    }

    // Zod's coerce.date() handles date parsing, so direct assignment from validatedData is sufficient.
    if (validatedData.dob !== undefined) {
      updateDataForPrisma.dob = validatedData.dob;
    } else {
      delete updateDataForPrisma.dob;
    }

    if (validatedData.admissionDate !== undefined) {
      updateDataForPrisma.admissionDate = validatedData.admissionDate;
    } else {
      delete updateDataForPrisma.admissionDate;
    }

    const student = await studentService.update(id, updateDataForPrisma);
    activityService.log({
      ...ctxFromReq(req),
      action: 'STUDENT_UPDATED',
      entityType: 'Student',
      entityId: student.id,
      entityLabel: studentLabel(student),
    });
    res.json(student);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Update validation failed", details: error.errors });
    }
    console.error("Update Error:", error);
    res.status(500).json({ error: "Failed to update student profile" });
  }
}


export const getStudents = async (req, res) => {
  const students = await studentService.getAll()
  res.json(students)
}

export const getStudent = async (req, res) => {
  const student = await studentService.getById(req.params.id)

  if (!student) {
    return res.status(404).json({ error: "Student not found" })
  }

  res.json(student)
}

export const deleteStudent = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    // Soft delete: Update status instead of deleting record/files
    const student = await studentService.softDelete(id, status || 'ARCHIVED');
    activityService.log({
      ...ctxFromReq(req),
      action: 'STUDENT_DELETED',
      entityType: 'Student',
      entityId: student.id,
      entityLabel: studentLabel(student),
      details: { status: student.status },
    });
    res.json(student);
  } catch (error) {
    console.error("Delete Error:", error);
    res.status(500).json({ error: "Failed to delete student record" });
  }
}