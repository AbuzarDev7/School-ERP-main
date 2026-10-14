import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { History, Search, UserSquare } from "lucide-react";
import { useStudents } from "@/context/StudentContext";
import { useVouchers } from "@/context/VoucherContext";

const formatPKR = (n) => `₨ ${Math.round(Number(n) || 0).toLocaleString("en-PK")}`;
const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" }) : "—";

// View Details modal: cashier types a roll/reg number, gets the matching
// student card, then sees every voucher ever issued to them with paid/due
// state. Read-only — collection still happens through the row's Collect Fee
// button on the main tab.
export default function StudentHistoryModal({ open, setOpen }) {
  const { students } = useStudents();
  const { vouchers } = useVouchers();
  const [query, setQuery] = useState("");

  // Reset the search when the modal closes so reopening starts clean.
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  // Match against roll number OR registration number, ignoring case and the
  // common "REG-" / "#" prefixes a cashier might paste in.
  const match = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return null;
    const stripped = term.replace(/[^a-z0-9]/gi, "");
    if (!stripped) return null;
    return students.find((s) => {
      const roll = String(s.rollNumber || "").toLowerCase().replace(/[^a-z0-9]/gi, "");
      const reg = String(s.regNumber || "").toLowerCase().replace(/[^a-z0-9]/gi, "");
      return (roll && roll === stripped) || (reg && reg === stripped);
    });
  }, [query, students]);

  const studentVouchers = useMemo(() => {
    if (!match) return [];
    return vouchers
      .filter((v) => v.studentId === match.id)
      .sort((a, b) => new Date(b.dueDate || b.createdAt) - new Date(a.dueDate || a.createdAt));
  }, [match, vouchers]);

  const totals = useMemo(() => {
    const totalPayable = studentVouchers.reduce((s, v) => s + Number(v.totalPayable || 0), 0);
    const paid = studentVouchers.reduce((s, v) => s + Number(v.paidAmount || 0), 0);
    const outstanding = studentVouchers.reduce((s, v) => {
      if (v.status === "PAID") return s;
      return s + Math.max(0, Number(v.totalPayable || 0) - Number(v.paidAmount || 0));
    }, 0);
    return { totalPayable, paid, outstanding, count: studentVouchers.length };
  }, [studentVouchers]);

  const showEmpty = query.trim() && !match;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[98vw] sm:max-w-200 p-0 overflow-hidden max-h-[90vh] flex flex-col shadow-xl border border-slate-200 rounded-xl bg-white">
        <div className="px-6 py-5 border-b bg-slate-50/50 flex items-center gap-4 shrink-0">
          <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center text-white shadow-sm">
            <History size={20} />
          </div>
          <div>
            <DialogTitle className="text-lg font-bold text-slate-900">Student Fee History</DialogTitle>
            <DialogDescription className="text-[11px] font-medium mt-0.5">
              Look up a student by Roll Number or Registration Number.
            </DialogDescription>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              autoFocus
              placeholder="Enter Roll Number or Registration Number..."
              className="pl-12 h-12 bg-slate-50 border-slate-200 rounded-xl text-base font-bold"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {!query.trim() && (
            <div className="border-2 border-dashed border-slate-200 rounded-2xl py-12 text-center">
              <UserSquare className="mx-auto w-10 h-10 text-slate-300 mb-2" />
              <p className="text-sm font-bold text-slate-500">Type a Roll # or Reg # to begin</p>
              <p className="text-xs text-slate-400 mt-1">Exact-match lookup. Numbers and letters only.</p>
            </div>
          )}

          {showEmpty && (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 text-center">
              <p className="text-sm font-bold text-amber-700">No student matches "{query}"</p>
              <p className="text-xs text-amber-600 mt-1">Double-check the number — the lookup is exact.</p>
            </div>
          )}

          {match && (
            <>
              <div className="bg-slate-900 rounded-2xl p-5 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Student</p>
                  <p className="text-xl font-black mt-0.5">
                    {match.firstName} {match.lastName}
                  </p>
                  <p className="text-[11px] font-medium text-slate-300 mt-0.5">
                    {match.class || "—"} · Roll {match.rollNumber || "—"} · Reg {match.regNumber || "—"}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3 sm:gap-5">
                  <Stat label="Vouchers" value={String(totals.count)} accent="text-blue-300" />
                  <Stat label="Paid" value={formatPKR(totals.paid)} accent="text-emerald-300" />
                  <Stat label="Outstanding" value={formatPKR(totals.outstanding)} accent="text-rose-300" />
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-slate-100 border-b-2 border-slate-200">
                      <tr className="text-left">
                        <th className="px-4 py-3 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-r border-slate-200 last:border-r-0">Voucher</th>
                        <th className="px-4 py-3 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-r border-slate-200 last:border-r-0">Month</th>
                        <th className="px-4 py-3 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-r border-slate-200 last:border-r-0">Due</th>
                        <th className="px-4 py-3 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-r border-slate-200 last:border-r-0 text-right">Total</th>
                        <th className="px-4 py-3 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-r border-slate-200 last:border-r-0 text-right">Paid</th>
                        <th className="px-4 py-3 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-r border-slate-200 last:border-r-0 text-right">Balance</th>
                        <th className="px-4 py-3 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-r border-slate-200 last:border-r-0">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentVouchers.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-10 text-center text-slate-400 italic font-medium bg-white">
                            No vouchers issued to this student yet.
                          </td>
                        </tr>
                      ) : (
                        studentVouchers.map((v, i) => {
                          const rowBg = i % 2 === 0 ? "bg-white" : "bg-slate-50";
                          const balance = Math.max(0, Number(v.totalPayable || 0) - Number(v.paidAmount || 0));
                          return (
                            <tr key={v.id} className={`${rowBg} border-b border-slate-200 hover:bg-slate-100 transition-colors`}>
                              <td className="px-4 py-3 font-mono font-bold text-blue-600 border-r border-slate-200 last:border-r-0">{v.voucherNumber}</td>
                              <td className="px-4 py-3 font-medium text-slate-700 border-r border-slate-200 last:border-r-0">{v.month}</td>
                              <td className="px-4 py-3 text-slate-500 font-medium border-r border-slate-200 last:border-r-0">{formatDate(v.dueDate)}</td>
                              <td className="px-4 py-3 text-right font-bold text-slate-800 border-r border-slate-200 last:border-r-0">{formatPKR(v.totalPayable)}</td>
                              <td className="px-4 py-3 text-right font-bold text-emerald-700 border-r border-slate-200 last:border-r-0">{formatPKR(v.paidAmount)}</td>
                              <td className="px-4 py-3 text-right font-bold text-rose-600 border-r border-slate-200 last:border-r-0">{balance > 0 ? formatPKR(balance) : "—"}</td>
                              <td className="px-4 py-3 border-r border-slate-200 last:border-r-0">
                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                  v.status === "PAID"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : v.status === "PARTIAL"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-amber-100 text-amber-700"
                                }`}>
                                  {v.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-slate-50 flex justify-end shrink-0">
          <Button variant="ghost" onClick={() => setOpen(false)} className="h-10 px-6 font-bold text-slate-600 hover:bg-slate-200 rounded-xl">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="flex flex-col leading-tight">
      <span className={`text-[10px] font-black uppercase tracking-widest ${accent}`}>{label}</span>
      <span className="text-sm font-black mt-0.5 truncate">{value}</span>
    </div>
  );
}
