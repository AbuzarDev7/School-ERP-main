import { useState, useRef, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { useFeeStructures } from "@/context/FeeStructureContext";
import { useDiscounts } from "@/context/DiscountContext";
import { useStudents } from "@/context/StudentContext";
import { cn } from "@/lib/utils";
import { Camera, Upload, User, CheckCircle2, Circle, AlertCircle, GraduationCap, FileText, X, Plus, Check, Loader2 } from "lucide-react";
import { useNumericInput } from "@/hooks/useNumericInput";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Helper for labels used in toast messages
const labelMapping = {
  birthCertificate: "B-Form / Birth Certificate",
  fatherCnicFile: "Parent/Guardian CNIC Copy",
  leavingCertificate: "School Leaving Certificate",
  photo: "Student Profile Photo"
};

// const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const BASE_URL = import.meta.env.VITE_API_URL || "";

const getFileUrl = (val) => {
  if (!val) return null;
  if (typeof val === 'string' && val.startsWith('http')) return val;
  if (typeof val !== 'string') return URL.createObjectURL(val);
  if (val.startsWith('data:') || val.startsWith('blob:')) return val;
  const cleanVal = val.replace(/\\/g, '/').replace(/^\/+/, '');
  return `${BASE_URL}/${cleanVal}`;
};

// Shared form body — no Dialog wrapper. Reused by the modal (StudentForm) and
// the standalone screen (StudentFormScreen) so the two stay in lock-step.
// `active` mirrors the old `open` prop: true while the form is mounted/visible.
// `onCancel` is what the wrapper wants to do when the user hits Cancel — close
// the modal, navigate back, etc.
export function StudentFormBody({ active, onSave, onCancel, initialData, classList }) {
  const [errors, setErrors] = useState({});
  const [photo, setPhoto] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWebcamOpen, setIsWebcamOpen] = useState(false);
  const firstNameRef = useRef(null);
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const { sanitize } = useNumericInput();
  const { discounts } = useDiscounts();
  const { students } = useStudents();

  const { structures, heads } = useFeeStructures();

  const DEFAULT_CLASSES = useMemo(() => [
    "Playgroup", "Nursery", "Prep",
    "Class 1", "Class 2", "Class 3", "Class 4", "Class 5",
    "Class 6", "Class 7", "Class 8", "Class 9", "Class 10",
    "Matric"
  ], []);

  const derivedClassList = useMemo(() => {
    const fromStructures = structures.map((s) => s.className);
    return Array.from(new Set([...DEFAULT_CLASSES, ...fromStructures]));
  }, [structures, DEFAULT_CLASSES]);




  const currentYear = new Date().getFullYear();
  const autoSession = `${currentYear}-${(currentYear + 1).toString().slice(-2)}`;

  // File size constants
  const LIMITS = {
    IMAGE: 1 * 1024 * 1024, // 1MB
    DOCUMENT: 2 * 1024 * 1024 // 2MB
  };

  const [documents, setDocuments] = useState({
    birthCertificate: null,
    fatherCnicFile: null,
    leavingCertificate: null
  });
  const [selectedDiscounts, setSelectedDiscounts] = useState([]);

  const [form, setForm] = useState({
    firstName: "", lastName: "", rollNumber: "", dob: "", admissionDate: "",
    class: "", fathersName: "", fathersCnic: "",
    guardianName: "", guardianOccupation: "", previousSchool: "",
    lastSession: autoSession, emergencyNumber: "",
    phone: "", email: "", address: "", tuitionDiscount: 0, examDiscount: 0, transportDiscount: 0
  });

  const selectedFeeStructure = structures.find(s => s.className === form.class);

  useEffect(() => {
    if (initialData) {
      setErrors({});
      const formatDate = (dateString) => (dateString ? new Date(dateString).toISOString().split('T')[0] : "");
      setForm({
        ...initialData,
        dob: formatDate(initialData.dob),
        admissionDate: formatDate(initialData.admissionDate),
        lastSession: (() => {
          const initialSessionYear = parseInt(initialData.lastSession?.split('-')[0]);
          const autoSessionYear = parseInt(autoSession.split('-')[0]);
          // If the initialData's session is older than the current autoSession, update it.
          return (initialSessionYear && initialSessionYear < autoSessionYear) ? autoSession : (initialData.lastSession || autoSession);
        })(),
        tuitionDiscount: initialData.tuitionDiscount || 0,
        examDiscount: initialData.examDiscount || 0,
        transportDiscount: initialData.transportDiscount || 0,
      });
      // Populate photo and document previews from initialData paths
      setPhoto(initialData.photo || null);
      setDocuments({
        birthCertificate: initialData.birthCertificate || null,
        fatherCnicFile: initialData.fatherCnicFile || null,
        leavingCertificate: initialData.leavingCertificate || null,
      });
      if (initialData.discounts) {
        setSelectedDiscounts(initialData.discounts.map(d => d.id));
      }
    } else {
      setForm({
        firstName: "", lastName: "", rollNumber: "", dob: "", admissionDate: new Date().toISOString().split('T')[0],
        class: "", fathersName: "", fathersCnic: "",
        guardianName: "", guardianOccupation: "", previousSchool: "",
        lastSession: autoSession, emergencyNumber: "",
        phone: "", email: "", address: "", tuitionDiscount: 0, examDiscount: 0, transportDiscount: 0
      });
      setPhoto(null);
      setDocuments({ birthCertificate: null, fatherCnicFile: null, leavingCertificate: null });
      setSelectedDiscounts([]);
    }
  }, [initialData, active, autoSession]);

  // Auto-focus First Name field when the form becomes active
  useEffect(() => {
    if (active) {
      const timer = setTimeout(() => {
        firstNameRef.current?.focus();
      }, 150); // Small delay to account for Dialog animation and focus trapping
      return () => clearTimeout(timer);
    }
  }, [active]);

  // Stop the webcam stream on unmount so navigating away from the screen (or
  // closing the modal) doesn't leave the camera light burning.
  useEffect(() => {
    return () => {
      videoRef.current?.srcObject?.getTracks().forEach(track => track.stop());
    };
  }, []);

  // Auto-apply Sibling Discount based on Father's CNIC.
  // We track the last CNIC we evaluated so the effect only acts on real CNIC
  // changes — not on incidental re-runs (e.g. the StudentContext refreshing
  // after a successful submit, which otherwise re-detected the just-created
  // student as its own sibling and fired a false "Sibling detected" toast).
  const lastCheckedCnicRef = useRef(null);
  useEffect(() => {
    const siblingDiscount = discounts.find(d =>
      d.name.toLowerCase() === "sibling / family discount"
    ) || discounts.find(d => d.name.toLowerCase().includes("sibling"));
    if (!siblingDiscount) return;

    // Reset tracking when the CNIC is incomplete so the next full entry re-runs.
    if (form.fathersCnic?.length !== 15) {
      lastCheckedCnicRef.current = null;
      return;
    }

    if (lastCheckedCnicRef.current === form.fathersCnic) return;
    lastCheckedCnicRef.current = form.fathersCnic;

    const hasSibling = students.some(s =>
      s.fathersCnic === form.fathersCnic && s.id !== initialData?.id
    );

    if (hasSibling) {
      if (!selectedDiscounts.includes(siblingDiscount.id)) {
        setSelectedDiscounts(prev => [...prev, siblingDiscount.id]);
        toast.info("Sibling detected! Sibling Discount auto-applied.");
      }
    } else if (selectedDiscounts.includes(siblingDiscount.id)) {
      setSelectedDiscounts(prev => prev.filter(id => id !== siblingDiscount.id));
      toast.info("No matching sibling found. Sibling Discount removed.");
    }
    // dependencies: we exclude selectedDiscounts to allow manual removal after auto-apply
  }, [form.fathersCnic, students, discounts, initialData?.id]);

  // Calculate Totals for the Fee Summary
  const feeSummaryTotals = useMemo(() => {
    if (!selectedFeeStructure) return { base: 0, discount: 0, net: 0 };

    const otherFeesTotal = selectedFeeStructure.fees
      ?.filter(f => !["tuition", "exam", "transport"].includes((f.feeHead?.name || heads.find(h => h.id === f.feeHeadId)?.name || "").toLowerCase()))
      ?.reduce((sum, f) => sum + f.amount, 0) || 0;

    const baseTuition = (selectedFeeStructure.tuition || 0);
    const baseExam = (selectedFeeStructure.exam || 0);
    const baseTransport = (selectedFeeStructure.transport || 0);
    const baseSchoolFee = (selectedFeeStructure.schoolFee || 0);
    const baseAdmissionFee = (selectedFeeStructure.admissionFee || 0);
    const baseAnnualFund = (selectedFeeStructure.annualFund || 0);
    const baseCourseFee = (selectedFeeStructure.courseFee || 0);

    const base = baseTuition + baseExam + baseTransport +
                 baseSchoolFee + baseAdmissionFee + baseAnnualFund + baseCourseFee +
                 otherFeesTotal;

    const predefinedDiscount = discounts
      .filter(d => selectedDiscounts.includes(d.id))
      .reduce((sum, d) => sum + d.amount, 0);

    const discount = predefinedDiscount +
                     (Number(form.tuitionDiscount) || 0) +
                     (Number(form.examDiscount) || 0) +
                     (Number(form.transportDiscount) || 0);

    return { base, discount, net: Math.max(0, base - discount) };
  }, [selectedFeeStructure, discounts, selectedDiscounts, form.tuitionDiscount, form.examDiscount, form.transportDiscount, heads]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > LIMITS.IMAGE) {
      toast.error("Image too large. Please upload an image smaller than 1MB.");
      setErrors(prev => ({ ...prev, photo: "Exceeds 1MB" }));
      e.target.value = null;
      return;
    }

    setErrors(prev => { const n = { ...prev }; delete n.photo; return n; });
    setPhoto(URL.createObjectURL(file));
  };

  const handleDocumentUpload = (e) => {
    const { name, files } = e.target;
    const file = files[0];

    // Handle file clearing
    if (!file) {
      setErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
      setDocuments((prev) => ({ ...prev, [name]: null }));
      return;
    }

    if (file.size > LIMITS.DOCUMENT) {
      toast.error(`${labelMapping[name]} is too large. Max limit is 2MB.`);
      setErrors(prev => ({ ...prev, [name]: "Exceeds 2MB" }));
      e.target.value = null;
      return;
    }

    setErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
    setDocuments((prev) => ({ ...prev, [name]: file }));
  };

  const startWebcam = async () => {
    try {
      setIsWebcamOpen(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
    } catch (err) {
      toast.error("Could not access webcam.");
      setIsWebcamOpen(false);
    }
  };

  const capturePhoto = () => {
    // HD webcams produce ~3-5MB PNGs at full resolution, which sail past the
    // 1MB image limit and bypass file.size validation entirely. Cap the long
    // edge at 800px and encode as JPEG quality 0.85 — comfortably under the
    // limit while still readable on a printed admission form.
    const MAX_EDGE = 800;
    const video = videoRef.current;
    const sw = video.videoWidth;
    const sh = video.videoHeight;
    const scale = Math.min(1, MAX_EDGE / Math.max(sw, sh));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(sw * scale);
    canvas.height = Math.round(sh * scale);
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    setPhoto(canvas.toDataURL("image/jpeg", 0.85));
    stopWebcam();
  };

  const stopWebcam = () => {
    videoRef.current?.srcObject?.getTracks().forEach(track => track.stop());
    setIsWebcamOpen(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (errors[name]) {
      setErrors(prev => {
        const n = { ...prev };
        delete n[name];
        return n;
      });
    }

    if (name === "phone" || name === "emergencyNumber") {
      // Remove all non-digits and limit to 11 numbers
      const digits = value.replace(/\D/g, "").slice(0, 11);
      // Auto-insert dash after 4 digits (e.g., 0300-1234567)
      const formatted = digits.length > 4 ? `${digits.slice(0, 4)}-${digits.slice(4)}` : digits;
      setForm({ ...form, [name]: formatted });
    } else if (["firstName", "lastName", "previousSchool", "fathersName", "guardianName", "guardianOccupation"].includes(name)) {
      const alphaOnly = value.replace(/[^A-Za-z\s]/g, "");
      setForm({ ...form, [name]: alphaOnly });
    } else if (name === "fathersCnic") {
      const digits = value.replace(/\D/g, "").slice(0, 13);
      let formatted = digits;
      if (digits.length > 12) {
        formatted = `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
      } else if (digits.length > 5) {
        formatted = `${digits.slice(0, 5)}-${digits.slice(5)}`;
      }
      setForm({ ...form, [name]: formatted });
    } else if (["tuitionDiscount", "examDiscount", "transportDiscount"].includes(name)) {
      const limit = name === "tuitionDiscount" ? selectedFeeStructure?.tuition :
                    name === "examDiscount" ? selectedFeeStructure?.exam :
                    selectedFeeStructure?.transport;

      const numValue = sanitize(value, limit || 0);
      if (numValue !== null) {
        setForm({ ...form, [name]: numValue });
      }
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSelectChange = (name, value) => {
    if (errors[name]) {
      setErrors(prev => {
        const n = { ...prev };
        delete n[name];
        return n;
      });
    }
    setForm({ ...form, [name]: value });
  };

  const handleDiscountToggle = (id) => {
    setSelectedDiscounts(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => { // Make handleSubmit async
    // Client-side Validation Logic
    const fieldErrors = {};
    if (!form.firstName) fieldErrors.firstName = "Required";
    if (!form.dob) fieldErrors.dob = "Required";
    if (!form.admissionDate) fieldErrors.admissionDate = "Required";
    if (!form.class) fieldErrors.class = "Required";
    if (!form.phone) fieldErrors.phone = "Required";
    if (!form.fathersName) fieldErrors.fathersName = "Required";
    if (!form.fathersCnic) fieldErrors.fathersCnic = "Required";
    if (!form.emergencyNumber) fieldErrors.emergencyNumber = "Required";
    if (!form.address) fieldErrors.address = "Required";
    if (!photo) fieldErrors.photo = "Required";

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      toast.error("Please complete all required fields and uploads.");
      return;
    }

    setIsSubmitting(true);

    // Prepare FormData for submission (important for file uploads)
    const formDataPayload = new FormData();

    // Append all form text fields
    for (const key in form) {
      if (form[key] !== null && form[key] !== undefined) {
        // CRITICAL: rollNumber is an Int @autoincrement in Prisma.
        // Sending "" (empty string) from the form state causes a Prisma ValidationError.
        // We omit it so the database can handle the autoincrement correctly.
        if (key === 'rollNumber' && (form[key] === "" || form[key] === null)) continue;

        formDataPayload.append(key, String(form[key]));
      }
    }

    formDataPayload.append('discountIds', JSON.stringify(selectedDiscounts));

    // Handle photo upload
    if (photo) { // If photo state has a value
      if (photo.startsWith('data:') || photo.startsWith('blob:')) {
        // New photo captured or selected
        try {
          const response = await fetch(photo);
          const blob = await response.blob();
          // Defense in depth: file-input handler enforces LIMITS.IMAGE on
          // selected files, but a webcam-captured data URI never went through
          // that path. Reject anything that would still exceed the cap after
          // resize/JPEG compression.
          if (blob.size > LIMITS.IMAGE) {
            toast.error("Captured image is too large. Please retake the photo.");
            setIsSubmitting(false);
            return;
          }
          formDataPayload.append('photo', blob, 'student_photo.jpg');
        } catch (error) {
          console.error("Error converting photo to blob:", error);
          toast.error("Failed to process photo for upload.");
          setIsSubmitting(false);
          return; // Prevent form submission if photo processing fails
        }
      } else if (typeof photo === 'string' && initialData?.photo === photo) {
        // Existing photo path, not changed, send it back to preserve
        formDataPayload.append('photo', photo);
      }
    } else if (initialData?.photo) {
      // Photo was present in initialData but is now null/empty in form state,
      // indicating it should be cleared on the backend.
      formDataPayload.append('photo', '');
    }

    // Append document files
    for (const key in documents) {
      if (documents[key] instanceof File) { // Only append if it's a new File object
        formDataPayload.append(key, documents[key]);
      } else if (typeof documents[key] === 'string' && initialData?.[key] === documents[key]) {
        // Existing document path, not changed, send it back to preserve
        formDataPayload.append(key, documents[key]);
      } else if (initialData?.[key] && !documents[key]) {
        // Document was present in initialData but is now null/empty in form state,
        // indicating it should be cleared on the backend.
        formDataPayload.append(key, '');
      }
    }

    try {
      // Wait for the parent to complete the API call
      await onSave(formDataPayload);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="px-6 py-5 border-b bg-slate-50/50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-600 rounded-lg flex items-center justify-center text-white shadow-sm">
            <GraduationCap size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {initialData ? "Update Student Profile" : "New Student Registration"}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Fill in the student information and upload required documents.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-white">
        <div className="max-w-5xl mx-auto space-y-8">

          {/* Status Checklist */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatusBadge label="Profile Photo" isDone={!!photo} />
            <StatusBadge label="B-Form" isDone={!!documents.birthCertificate} />
            <StatusBadge label="Parent CNIC" isDone={!!documents.fatherCnicFile} />
            <StatusBadge label="Leaving Cert" isDone={!!documents.leavingCertificate} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

            {/* Left Column: Form Inputs */}
            <div className="lg:col-span-8 space-y-10">

              {/* Student Information Section */}
              <section className="space-y-5">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <span className="w-1.5 h-4 bg-emerald-600 rounded-full" />
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Academic Information</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Admission Date *</Label>
                    <Input
                      type="date"
                      name="admissionDate"
                      value={form.admissionDate}
                      onChange={handleChange}
                      className={cn("h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-xl", errors.admissionDate && "border-red-500")}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Session</Label>
                    <Input
                      name="lastSession"
                      value={form.lastSession}
                      readOnly
                      className="h-11 bg-slate-100/50 border-slate-200 text-slate-500 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Roll Number</Label>
                    <Input
                      name="rollNumber"
                      value={form.rollNumber}
                      onChange={handleChange}
                      placeholder="e.g. 101"
                      className="h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Class *</Label>
                    <Select value={form.class} onValueChange={(v) => handleSelectChange("class", v)}>
                      <SelectTrigger className={cn("h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-xl", errors.class && "border-red-500")}>
                        <SelectValue placeholder="Select Class" />
                      </SelectTrigger>
                      <SelectContent side="bottom" position="popper" sideOffset={4}>{derivedClassList.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <span className="w-1.5 h-4 bg-emerald-600 rounded-full" />
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Student Information</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">First Name *</Label>
                    <Input
                      ref={firstNameRef}
                      name="firstName"
                      value={form.firstName}
                      placeholder="Ayan"
                      onChange={handleChange}
                      className={cn("h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-xl", errors.firstName && "border-red-500")}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Last Name (Optional)</Label>
                    <Input
                      name="lastName"
                      value={form.lastName}
                      placeholder="Khan"
                      onChange={handleChange}
                      className="h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-xl"
                    />
                  </div>
                </div>

                {initialData && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Registration Number</Label>
                      <Input
                        value={form.regNumber || ""}
                        readOnly
                        className="h-11 bg-emerald-50/50 font-bold text-emerald-700 border-emerald-100 rounded-xl"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Date of Birth *</Label>
                    <Input
                      type="date"
                      name="dob"
                      value={form.dob}
                      onChange={handleChange}
                      className={cn("h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-xl", errors.dob && "border-red-500")}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Previous School (Optional)</Label>
                    <Input
                      name="previousSchool"
                      value={form.previousSchool}
                      placeholder="Name of last school"
                      onChange={handleChange}
                      className="h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Primary Contact *</Label>
                    <Input
                      name="phone"
                      value={form.phone}
                      placeholder="0300-1234567"
                      onChange={handleChange}
                      className={cn("h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-xl", errors.phone && "border-red-500")}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Emergency Number *</Label>
                    <Input
                      name="emergencyNumber"
                      value={form.emergencyNumber}
                      placeholder="0300-1234567"
                      onChange={handleChange}
                      className={cn("h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-xl", errors.emergencyNumber && "border-red-500")}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Email (Optional)</Label>
                    <Input
                      name="email"
                      type="email"
                      value={form.email || ""}
                      placeholder="parent@example.com"
                      onChange={handleChange}
                      className={cn("h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-xl", errors.email && "border-red-500")}
                    />
                    <p className="text-[11px] text-slate-400 font-medium">
                      Used for fee voucher email notifications. Leave blank to skip email channel.
                    </p>
                  </div>
                </div>
              </section>

              {/* Guardian Details Section */}
              <section className="space-y-5">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <span className="w-1.5 h-4 bg-emerald-600 rounded-full" />
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Guardian Details</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Father's Name *</Label>
                    <Input
                      name="fathersName"
                      value={form.fathersName}
                      placeholder="Full Name"
                      onChange={handleChange}
                      className={cn("h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-xl", errors.fathersName && "border-red-500")}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Guardian Name (Optional)</Label>
                    <Input
                      name="guardianName"
                      value={form.guardianName}
                      placeholder="Name if other than father"
                      onChange={handleChange}
                      className="h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Father / Guardian CNIC *</Label>
                    <Input
                      name="fathersCnic"
                      value={form.fathersCnic}
                      placeholder="00000-0000000-0"
                      onChange={handleChange}
                      className={cn("h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-xl", errors.fathersCnic && "border-red-500")}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Occupation (Optional)</Label>
                    <Input
                      name="guardianOccupation"
                      value={form.guardianOccupation}
                      placeholder="Work / Profession"
                      onChange={handleChange}
                      className="h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-xl"
                    />
                  </div>
                </div>
              </section>

              {/* Discounts Section */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Applied Discounts</h3>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button type="button" className="h-8 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-bold uppercase tracking-tight text-slate-700 hover:bg-slate-50 transition-all cursor-pointer">
                        <Plus className="w-3 h-3" /> Add Discount
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" sideOffset={5} className="w-64 rounded-xl shadow-xl border-slate-200 z-[9999]">
                      <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-3 py-2 bg-slate-50/50">Select Discount to Add</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <div className="max-h-64 overflow-y-auto p-1">
                        {discounts
                          .filter(d => !selectedDiscounts.includes(d.id))
                          .map(d => (
                            <DropdownMenuItem key={d.id} onClick={() => handleDiscountToggle(d.id)} className="cursor-pointer focus:bg-blue-50 rounded-lg m-1 p-2 group">
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-slate-700 group-hover:text-blue-700">{d.name}</span>
                                <span className="text-[10px] text-blue-600 font-black">Rs. {d.amount.toLocaleString()}</span>
                              </div>
                            </DropdownMenuItem>
                          ))
                        }
                        {discounts.length === 0 && (
                          <div className="px-4 py-6 text-[10px] text-slate-400 italic text-center">No discounts configured. Add one from Fee Vouchers.</div>
                        )}
                        {discounts.length > 0 && discounts.filter(d => !selectedDiscounts.includes(d.id)).length === 0 && (
                          <div className="px-4 py-6 text-[10px] text-slate-400 italic text-center">All available discounts applied.</div>
                        )}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 min-h-11">
                  {selectedDiscounts.length === 0 ? (
                    <div className="text-[10px] text-slate-400 italic col-span-full py-6 border-2 border-dashed rounded-xl border-slate-100 text-center bg-slate-50/30">
                      No discounts applied yet.
                    </div>
                  ) : (
                    discounts
                      .filter(d => selectedDiscounts.includes(d.id))
                      .map(d => (
                        <div key={d.id} className="group flex items-center space-x-3 p-3 rounded-lg border border-blue-100 bg-blue-50/40 hover:bg-blue-50 transition-all shadow-sm animate-in fade-in zoom-in-95 duration-200">
                          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0">
                            <Check className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold text-slate-700 truncate">{d.name}</p>
                            <p className="text-[10px] font-black text-blue-600">Rs. {d.amount.toLocaleString()}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDiscountToggle(d.id)}
                            className="text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))
                  )}
                </div>
              </section>

              {/* Additional Details Section */}
              <section className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="col-span-full space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Full Address *</Label>
                    <Textarea
                      name="address"
                      value={form.address}
                      placeholder="House #, Street, City..."
                      onChange={handleChange}
                      rows={2}
                      className={cn("resize-none bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-xl", errors.address && "border-red-500")}
                    />
                  </div>
                </div>

                {/* Class-wise Fee Details Summary */}
                {form.class && selectedFeeStructure?.fees && (
                  <div className="bg-slate-900 rounded-xl p-5 text-white">
                    <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <FileText className="w-3 h-3" /> Standard Fee for {form.class}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                      <div>
                        <FeeSummaryItem label="Tuition Fee" amount={selectedFeeStructure.tuition} />
                        <div className="mt-2 relative max-w-sm">
                          <Input
                            type="text"
                            name="tuitionDiscount"
                            value={form.tuitionDiscount}
                            onChange={handleChange}
                            placeholder="0"
                            inputMode="numeric"
                            min="0"
                            max={selectedFeeStructure.tuition}
                            className="h-9 bg-white/10 border-white/10 focus:bg-white/20 text-white transition-all rounded-lg pl-8 text-sm placeholder:text-white/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-blue-400">Rs.</span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium italic mt-1">Tuition Discount (optional)</p>
                      </div>
                      <div>
                        <FeeSummaryItem label="Exam Fee" amount={selectedFeeStructure.exam} />
                        <div className="mt-2 relative max-w-sm">
                          <Input
                            type="text"
                            name="examDiscount"
                            value={form.examDiscount}
                            onChange={handleChange}
                            placeholder="0"
                            inputMode="numeric"
                            min="0"
                            max={selectedFeeStructure.exam}
                            className="h-9 bg-white/10 border-white/10 focus:bg-white/20 text-white transition-all rounded-lg pl-8 text-sm placeholder:text-white/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-blue-400">Rs.</span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium italic mt-1">Exam Discount (optional)</p>
                      </div>
                      <div>
                        <FeeSummaryItem label="Transport Fee" amount={selectedFeeStructure.transport} />
                        <div className="mt-2 relative max-w-sm">
                          <Input
                            type="text"
                            name="transportDiscount"
                            value={form.transportDiscount}
                            onChange={handleChange}
                            placeholder="0"
                            inputMode="numeric"
                            min="0"
                            max={selectedFeeStructure.transport}
                            className="h-9 bg-white/10 border-white/10 focus:bg-white/20 text-white transition-all rounded-lg pl-8 text-sm placeholder:text-white/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-blue-400">Rs.</span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium italic mt-1">Transport Discount (optional)</p>
                      </div>
                      {(selectedFeeStructure.schoolFee || 0) > 0 && (
                        <FeeSummaryItem label="School Fee" amount={selectedFeeStructure.schoolFee} />
                      )}
                      {(selectedFeeStructure.admissionFee || 0) > 0 && (
                        <FeeSummaryItem label="Admission Fee" amount={selectedFeeStructure.admissionFee} />
                      )}
                      {(selectedFeeStructure.annualFund || 0) > 0 && (
                        <FeeSummaryItem label="Annual Fund" amount={selectedFeeStructure.annualFund} />
                      )}
                      {(selectedFeeStructure.courseFee || 0) > 0 && (
                        <FeeSummaryItem label="Course Fee" amount={selectedFeeStructure.courseFee} />
                      )}
                      <FeeSummaryItem label="Late Fee Fine" amount={selectedFeeStructure.late} isSpecial />
                    </div>

                    {/* Totals breakdown with Net Payable calculation */}
                    <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                      <div className="flex items-center gap-10">
                        <FeeSummaryItem label="Base Total" amount={feeSummaryTotals.base} />
                        <FeeSummaryItem label="Total Discount" amount={feeSummaryTotals.discount} isSpecial />
                      </div>
                      <div className="bg-white/10 px-8 py-4 rounded-2xl border border-white/5 shadow-inner">
                        <p className="text-[9px] uppercase font-black tracking-[0.25em] text-blue-400 mb-1">Net Monthly Payable</p>
                        <p className="text-3xl font-black">Rs. {feeSummaryTotals.net.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            </div>

            {/* Right Column: Uploads */}
            <div className="lg:col-span-4 space-y-8">

              {/* Photo Area */}
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 flex flex-col items-center">
                <div className={`relative w-44 h-44 rounded-lg overflow-hidden border-2 bg-white flex items-center justify-center
                ${photo ? 'border-emerald-500 shadow-lg' : (errors.photo ? 'border-red-300' : 'border-slate-200 border-dashed')}`}>
                  {isWebcamOpen ? (
                    <video ref={videoRef} autoPlay className="w-full h-full object-cover" />
                  ) : photo ? (
                    <img src={getFileUrl(photo)} alt="Student" crossOrigin="anonymous" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-12 h-12 text-slate-200" />
                  )}
                  {photo && <CheckCircle2 className="absolute top-2 right-2 w-5 h-5 text-emerald-600 bg-white rounded-full shadow-sm" />}
                </div>

                <div className="flex gap-2 w-full mt-4">
                  <Button variant="outline" size="sm" className="flex-1 font-bold text-xs" onClick={() => fileInputRef.current.click()}>
                    <Upload className="w-3.5 h-3.5 mr-1.5" /> File
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 font-bold text-xs" onClick={isWebcamOpen ? capturePhoto : startWebcam}>
                    <Camera className="w-3.5 h-3.5 mr-1.5" /> {isWebcamOpen ? "Capture" : "Webcam"}
                  </Button>
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                <p className="text-[10px] text-slate-400 mt-3 font-medium">Profile Image Limit: 1MB</p>
              </div>

              {/* Required Documents */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Documents (Optional)</h4>
                <div className="space-y-3">
                  <DocumentInput label="B-Form / Birth Cert (Optional)" name="birthCertificate" file={documents.birthCertificate} error={errors.birthCertificate} onChange={handleDocumentUpload} getFileUrl={getFileUrl} />
                  <DocumentInput label="Father CNIC Copy (Optional)" name="fatherCnicFile" file={documents.fatherCnicFile} error={errors.fatherCnicFile} onChange={handleDocumentUpload} getFileUrl={getFileUrl} />
                  <DocumentInput label="Leaving Certificate (Optional)" name="leavingCertificate" file={documents.leavingCertificate} error={errors.leavingCertificate} onChange={handleDocumentUpload} getFileUrl={getFileUrl} />
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="px-5 py-8 border-t bg-slate-50 flex justify-end gap-3 shrink-0">
        <Button variant="ghost" disabled={isSubmitting} onClick={onCancel} className="h-12 px-6 font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-all">
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 px-4 py-6 font-bold shadow-md">
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? "Processing..." : (initialData ? "Save Student Record" : "Complete Registration")}
        </Button>
      </div>
    </>
  );
}

export default function StudentForm({ open, setOpen, onSave, initialData, classList }) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[98vw] sm:max-w-250 p-0 overflow-hidden max-h-[98vh] sm:max-h-[92vh] flex flex-col shadow-xl border border-slate-200 rounded-xl bg-white">
        {/* Visually-hidden a11y title/description so Radix Dialog doesn't warn —
            the visible header lives inside StudentFormBody as a plain h2/p so
            it can be reused by the standalone screen wrapper. */}
        <DialogTitle className="sr-only">
          {initialData ? "Update Student Profile" : "New Student Registration"}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Fill in the student information and upload required documents.
        </DialogDescription>
        <StudentFormBody
          active={open}
          onSave={onSave}
          onCancel={() => setOpen(false)}
          initialData={initialData}
          classList={classList}
        />
      </DialogContent>
    </Dialog>
  );
}

function FeeSummaryItem({ label, amount, isSpecial }) {
  return (
    <div className="space-y-1">
      <p className={cn("text-[9px] uppercase font-bold tracking-tight", isSpecial ? "text-amber-400" : "text-slate-400")}>{label}</p>
      <p className="text-sm font-bold">Rs. {(amount || 0).toLocaleString()}</p>
    </div>
  );
}

function StatusBadge({ label, isDone }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded border text-[11px] font-bold transition-all
      ${isDone ? 'bg-white border-emerald-200 text-emerald-700 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
      <div className={`w-2 h-2 rounded-full ${isDone ? 'bg-emerald-600 shadow-[0_0_8px_rgba(37,99,235,0.4)]' : 'bg-slate-300'}`} />
      {label}
    </div>
  );
}

function DocumentInput({ label, name, file, error, onChange, getFileUrl }) {
  const inputRef = useRef(null);
  // FIXED: Only show link if file is a valid string/path and not a Blob/File object being uploaded
  const isViewable = typeof file === 'string' && file.startsWith('http');
  const hasFile = !!file;

  return (
    <div className={`p-3 rounded-lg border-2 transition-all bg-white
      ${file ? 'border-green-400 border-dashed bg-blue-50/20' : (error ? 'border-red-400 border-dashed bg-red-50/20' : 'border-slate-100')}`}>
      <div className="flex justify-between items-center mb-2">
        <Label className={`text-[10px] font-bold uppercase tracking-tight ${error && !file ? 'text-red-600' : 'text-slate-500'}`}>
          {label}
        </Label>
        <div className="flex items-center gap-2">
          {isViewable && (
            <a
              href={getFileUrl(file)}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] text-blue-600 hover:underline font-bold"
            >
              View File
            </a>
          )}
          {file && (
            <button type="button" onClick={() => onChange({ target: { name, files: [] } })} className="text-slate-400 hover:text-red-500">
              <X size={14} />
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={onChange}
          name={name}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            "cursor-pointer text-white rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-wider shadow-sm transition-all active:scale-95",
            hasFile
              ? "bg-amber-500 hover:bg-amber-600 hover:shadow-md"
              : "bg-emerald-600 hover:bg-emerald-700 hover:shadow-md"
          )}
        >
          {hasFile ? "Replace" : "Browse"}
        </button>
        {!hasFile && (
          <span className="text-[11px] text-slate-400 italic flex-1">No file selected</span>
        )}
        {file && !isViewable && <CheckCircle2 size={16} className="text-emerald-600 shrink-0 ml-auto" />}
      </div>
    </div>
  );
}
