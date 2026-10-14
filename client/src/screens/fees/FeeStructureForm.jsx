import { useEffect, useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, Receipt } from "lucide-react"
import { useFeeStructures } from "@/context/FeeStructureContext";
import { toast } from "sonner"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { useNumericInput } from "@/hooks/useNumericInput"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"

export default function FeeStructureForm({ open, setOpen, initialData, onSave, loading }) {
  const { heads } = useFeeStructures();
  const { sanitize } = useNumericInput();
  const [name, setName] = useState("");
  const [className, setClassName] = useState("");
  const [lateFine, setLateFine] = useState(100);
  const [tuitionFee, setTuitionFee] = useState(0);
  const [examFee, setExamFee] = useState(0);
  const [transportFee, setTransportFee] = useState(0);
  const [schoolFee, setSchoolFee] = useState(0);
  const [admissionFee, setAdmissionFee] = useState(0);
  const [annualFund, setAnnualFund] = useState(0);
  const [courseFee, setCourseFee] = useState(0);
  const [otherFees, setOtherFees] = useState({});

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || "");
      setClassName(initialData.className || "");
      setLateFine(initialData.late ?? 100);
      setTuitionFee(initialData.tuition ?? 0);
      setExamFee(initialData.exam ?? 0);
      setTransportFee(initialData.transport ?? 0);
      setSchoolFee(initialData.schoolFee ?? 0);
      setAdmissionFee(initialData.admissionFee ?? 0);
      setAnnualFund(initialData.annualFund ?? 0);
      setCourseFee(initialData.courseFee ?? 0);

      const initialOtherFees = {};
      initialData.fees?.forEach(f => {
        initialOtherFees[f.feeHeadId] = f.amount;
      });
      setOtherFees(initialOtherFees);
    } else {
      setName("");
      setClassName("");
      setLateFine(100);

      const findDefault = (name) => heads.find(h => h.name.toLowerCase() === name.toLowerCase())?.amount || 0;
      setTuitionFee(findDefault("Tuition"));
      setExamFee(findDefault("Exam"));
      setTransportFee(findDefault("Transport"));
      setSchoolFee(0);
      setAdmissionFee(0);
      setAnnualFund(0);
      setCourseFee(0);

      const defaultOtherFees = {};
      dynamicHeads.forEach(h => {
        defaultOtherFees[h.id] = h.amount;
      });
      setOtherFees(defaultOtherFees);
    }
  }, [initialData, open, heads]);

  // Pre-compute IDs for fixed heads
  const fixedHeadIds = useMemo(() => {
    const ids = {};
    heads.forEach(head => {
      const name = head.name.toLowerCase();
      if (name === "tuition") ids.tuition = head.id;
      if (name === "exam") ids.exam = head.id;
      if (name === "transport") ids.transport = head.id;
    });
    return ids;
  }, [heads]);

  // Filter out fixed heads for dynamic rendering
  const dynamicHeads = useMemo(() => {
    const fixedHeadNames = ["tuition", "exam", "transport"];
    return heads.filter(head => !fixedHeadNames.includes(head.name.toLowerCase()));
  }, [heads]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalFees = {};
    let hasInvalidAmount = false;

    dynamicHeads.forEach((h) => {
      const amount = Number(otherFees[h.id] || 0);
      if (isNaN(amount) || amount < 0) hasInvalidAmount = true;
      finalFees[h.id] = amount;
    });

    if (hasInvalidAmount) return toast.error("Please enter valid positive numbers for all fees");

    onSave({
      name: name.trim() || undefined,
      className: className.trim(),
      late: Number(lateFine) || 0,
      tuition: Number(tuitionFee) || 0,
      exam: Number(examFee) || 0,
      transport: Number(transportFee) || 0,
      schoolFee: Number(schoolFee) || 0,
      admissionFee: Number(admissionFee) || 0,
      annualFund: Number(annualFund) || 0,
      courseFee: Number(courseFee) || 0,
      fees: finalFees
    });
  };

  const handleOtherFeeChange = (headId, val) => {
    setOtherFees(prev => ({ ...prev, [headId]: val }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[95vw] sm:max-w-[800px] p-0 overflow-hidden max-h-[95vh] sm:max-h-[90vh] flex flex-col shadow-xl border border-slate-200 rounded-xl bg-white">
        <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="px-6 py-5 border-b bg-slate-50/50 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-600 rounded-lg flex items-center justify-center text-white shadow-sm">
                <Receipt size={24} />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900">
                  {initialData ? "Update Fee Structure" : "Create Fee Structure"}
                </DialogTitle>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Define class-wise fees and late payment penalties.
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-white">
            <div className="max-w-4xl mx-auto space-y-10">
              
              {/* Configuration Section */}
              <section className="space-y-5">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <span className="w-1.5 h-4 bg-emerald-600 rounded-full" />
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Basic Configuration</h3>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Name (Optional)</Label>
                    <Input
                      placeholder="e.g. Monthly Fee Structure"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Class Name (Optional)</Label>
                    <Input
                      placeholder="e.g. Grade 10"
                      value={className}
                      onChange={(e) => setClassName(e.target.value)}
                      className="h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Late Fee Fine (Per Day) (Optional)</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      className="h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-xl"
                      min="0"
                      placeholder="100"
                      value={lateFine === 0 ? "" : lateFine} // Display empty string for 0 to allow typing
                      onChange={(e) => {
                        const num = sanitize(e.target.value); // Use the sanitize function
                        if (num !== null) setLateFine(num); // Update state only if valid
                      }}
                    />
                  </div>
                </div>
              </section>

              {/* Core Fee Components Section */}
              <section className="space-y-5">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <span className="w-1.5 h-4 bg-emerald-600 rounded-full" />
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Core Fee Components</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Tuition Fee <span className="normal-case text-slate-400 font-normal">(optional)</span></Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      min="0"
                      placeholder="0"
                      className="h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-xl"
                      value={tuitionFee === 0 ? "" : tuitionFee}
                      onChange={(e) => {
                        const num = sanitize(e.target.value);
                        if (num !== null) setTuitionFee(num);
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Exam Fee <span className="normal-case text-slate-400 font-normal">(optional)</span></Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      min="0"
                      placeholder="0"
                      className="h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-xl"
                      value={examFee === 0 ? "" : examFee}
                      onChange={(e) => {
                        const num = sanitize(e.target.value);
                        if (num !== null) setExamFee(num);
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Transport Fee <span className="normal-case text-slate-400 font-normal">(optional)</span></Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      min="0"
                      placeholder="0"
                      className="h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-xl"
                      value={transportFee === 0 ? "" : transportFee}
                      onChange={(e) => {
                        const num = sanitize(e.target.value);
                        if (num !== null) setTransportFee(num);
                      }}
                    />
                  </div>
                </div>
              </section>

              {/* Fee Slip Components Section */}
              <section className="space-y-5">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <span className="w-1.5 h-4 bg-blue-600 rounded-full" />
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Fee Slip Components</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">School Fee <span className="normal-case text-slate-400 font-normal">(optional)</span></Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      min="0"
                      placeholder="0"
                      className="h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-xl"
                      value={schoolFee === 0 ? "" : schoolFee}
                      onChange={(e) => {
                        const num = sanitize(e.target.value);
                        if (num !== null) setSchoolFee(num);
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Admission Fee <span className="normal-case text-slate-400 font-normal">(optional)</span></Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      min="0"
                      placeholder="0"
                      className="h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-xl"
                      value={admissionFee === 0 ? "" : admissionFee}
                      onChange={(e) => {
                        const num = sanitize(e.target.value);
                        if (num !== null) setAdmissionFee(num);
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Annual Fund <span className="normal-case text-slate-400 font-normal">(optional)</span></Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      min="0"
                      placeholder="0"
                      className="h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-xl"
                      value={annualFund === 0 ? "" : annualFund}
                      onChange={(e) => {
                        const num = sanitize(e.target.value);
                        if (num !== null) setAnnualFund(num);
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Course Fee <span className="normal-case text-slate-400 font-normal">(optional)</span></Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      min="0"
                      placeholder="0"
                      className="h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-xl"
                      value={courseFee === 0 ? "" : courseFee}
                      onChange={(e) => {
                        const num = sanitize(e.target.value);
                        if (num !== null) setCourseFee(num);
                      }}
                    />
                  </div>
                </div>
              </section>

              {/* Other Fee Components Section */}
              {dynamicHeads.length > 0 && (
                <section className="space-y-5">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <span className="w-1.5 h-4 bg-emerald-600 rounded-full" />
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Other Fee Components</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                    {dynamicHeads.map((head) => (
                    <div key={head.id} className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">{head.name} *</Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        min="0"
                        placeholder="0"
                        className="h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-xl"
                        value={otherFees[head.id] === 0 ? "" : (otherFees[head.id] || "")} // Display empty string for 0
                        onChange={(e) => {
                          const num = sanitize(e.target.value);
                          if (num !== null) handleOtherFeeChange(head.id, num);
                        }}
                        required
                      />
                    </div>
                  ))}
                </div>
              </section>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-5 py-8 border-t bg-slate-50 flex justify-end gap-3 shrink-0">
            <Button variant="ghost" type="button" onClick={() => setOpen(false)} className="h-12 px-6 font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-all">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="h-12 bg-emerald-600 hover:bg-emerald-700 px-8 font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98]">
              {loading && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
              {initialData ? "Update Structure" : "Save Structure"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}