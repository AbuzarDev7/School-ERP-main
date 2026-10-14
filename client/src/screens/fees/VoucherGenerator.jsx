import { useState, useEffect } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Users, UserPlus, Plus, Library, Tag, Edit3, Trash2 } from "lucide-react"
import GenerateIndividualVoucherModal from "./tabs/GenerateIndividualVoucherModal"
import GenerateBulkVoucherModal from "./tabs/GenerateBulkVoucherModal"
import FeeCollectionTab from "./tabs/FeeCollectionTab"
import PendingDuesTab from "./tabs/PendingDuesTab"
import DiscountForm from "./DiscountForm"
import { useVouchers } from "@/context/VoucherContext"
import { useDiscounts } from "@/context/DiscountContext"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// Standard discount catalog. Surfaced via the "Seed Standard Discounts" action
// in the Add Discount dropdown so a fresh school can populate the common cases
// (sibling, staff, merit, etc.) in one click instead of typing them in.
const STANDARD_DISCOUNTS = [
  { name: "Sibling / Family Discount", description: "Automated discount for students with siblings in the school", amount: 100 },
  { name: "Staff Discount", description: "Discount for children of school employees", amount: 100 },
  { name: "Merit-Based Discount", description: "Discount for academic excellence", amount: 100 },
  { name: "Need-Based Discount", description: "Financial aid for deserving students", amount: 100 },
  { name: "Special Discount", description: "Custom/Case-specific fee reduction", amount: 100 },
  { name: "Sports Discount", description: "Discount for outstanding athletic performance", amount: 100 },
];

export default function VoucherGenerator() {
  const [isIndividualModalOpen, setIsIndividualModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const { refreshVouchers, error } = useVouchers();
  const { discounts, addDiscount, updateDiscount, deleteDiscount } = useDiscounts();

  // Discount manager state — the dropdown trigger lives in the header alongside
  // the voucher actions, but the form / delete confirmation are full
  // Dialog/AlertDialog modals that mount once at the bottom of the tree.
  const [isDiscountFormOpen, setIsDiscountFormOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState(null);
  const [loadingDiscount, setLoadingDiscount] = useState(false);
  const [deleteDiscountId, setDeleteDiscountId] = useState(null);
  const [isDeleteDiscountAlertOpen, setIsDeleteDiscountAlertOpen] = useState(false);

  const handleSaveDiscount = async (formData) => {
    setLoadingDiscount(true);
    const savePromise = editingDiscount
      ? updateDiscount(editingDiscount.id, formData)
      : addDiscount(formData);

    toast.promise(savePromise, {
      loading: editingDiscount ? "Updating discount..." : "Adding discount...",
      success: () => {
        setLoadingDiscount(false);
        setIsDiscountFormOpen(false);
        setEditingDiscount(null);
        return editingDiscount ? "Discount updated" : "Discount added";
      },
      error: (err) => {
        setLoadingDiscount(false);
        return err.response?.data?.error || "Operation failed";
      },
    });
  };

  // Pre-filters by case-insensitive name so re-running after a partial seed
  // only inserts the discounts that aren't already configured.
  const handleSeedDiscounts = async () => {
    const existingNames = new Set(discounts.map((d) => d.name.toLowerCase()));
    const toSeed = STANDARD_DISCOUNTS.filter((d) => !existingNames.has(d.name.toLowerCase()));

    if (toSeed.length === 0) {
      return toast.info("All standard discounts are already configured.");
    }

    const seedPromise = Promise.all(toSeed.map((d) => addDiscount(d)));
    toast.promise(seedPromise, {
      loading: "Initializing standard discounts...",
      success: () => `Added ${toSeed.length} standard discount${toSeed.length === 1 ? "" : "s"}.`,
      error: "Failed to seed standard discounts.",
    });
  };

  const confirmDeleteDiscount = () => {
    toast.promise(deleteDiscount(deleteDiscountId), {
      loading: "Deleting discount...",
      success: "Discount deleted",
      error: "Failed to delete",
    });
    setIsDeleteDiscountAlertOpen(false);
  };

  // Auto-refresh whenever the user returns to this tab/window. Keeps the list
  // fresh in multi-operator setups without a manual sync button.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        refreshVouchers();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [refreshVouchers]);

  return (
      <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Fee Management System</h2>
            <p className="text-slate-500 text-sm font-medium">Manage billing, payments, and outstanding balances</p>
          </div>
          <div className="flex flex-wrap gap-2 justify-end items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-11 px-6 rounded-xl font-bold border-slate-200 text-slate-600 hover:bg-slate-50 transition-all active:scale-[0.98]"
                >
                  <Plus className="mr-2 h-4 w-4" /> Add Discount
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                side="bottom"
                sideOffset={6}
                avoidCollisions={false}
                className="w-80 p-2 rounded-2xl shadow-xl border-slate-100"
              >
                <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-3 py-2">
                  Discount Manager
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onSelect={() => { setEditingDiscount(null); setIsDiscountFormOpen(true) }}
                  className="flex items-center h-10 px-3 rounded-xl font-bold text-slate-600 cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <Plus className="mr-2 h-4 w-4 text-emerald-600" /> New Discount
                </DropdownMenuItem>

                <DropdownMenuItem
                  onSelect={(e) => { e.preventDefault(); handleSeedDiscounts() }}
                  className="flex items-center h-10 px-3 rounded-xl font-bold text-slate-600 cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <Library className="mr-2 h-4 w-4 text-blue-600" /> Seed Standard Discounts
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-3 py-2 flex items-center justify-between">
                  <span>Configured</span>
                  <span className="text-slate-600 font-mono">{discounts.length}</span>
                </DropdownMenuLabel>

                {discounts.length === 0 ? (
                  <div className="px-4 py-6 text-[10px] text-slate-400 italic text-center">
                    No discounts yet — add one above.
                  </div>
                ) : (
                  <div className="max-h-72 overflow-y-auto py-1">
                    {discounts.map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center justify-between gap-2 px-3 py-2 mx-1 rounded-lg hover:bg-slate-50 transition-colors group"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Tag className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-slate-700 truncate">{d.name}</span>
                            <span className="text-[10px] text-blue-600 font-bold">Rs. {d.amount.toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => { setEditingDiscount(d); setIsDiscountFormOpen(true) }}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            aria-label={`Edit ${d.name}`}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => { setDeleteDiscountId(d.id); setIsDeleteDiscountAlertOpen(true) }}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            aria-label={`Delete ${d.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              onClick={() => setIsIndividualModalOpen(true)}
              className="h-11 p-0 rounded-xl font-bold border-2 border-emerald-600 bg-transparent hover:bg-transparent shadow-lg shadow-emerald-900/20 transition-all overflow-hidden group"
            >
              <div className="flex items-center justify-center w-full h-full bg-emerald-600 px-6 animate-fast-blink text-white transition-colors group-hover:animate-none group-hover:bg-emerald-700">
                <UserPlus className="mr-2 h-5 w-5" /> Individual Voucher
              </div>
            </Button>

            <Button
              onClick={() => setIsBulkModalOpen(true)}
              className="h-11 bg-blue-600 hover:bg-blue-700 text-white px-6 rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98]"
            >
              <Users className="mr-2 h-5 w-5" /> Bulk Vouchers
            </Button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-between">
            <p className="text-sm text-red-600 font-bold">{error}</p>
            <Button onClick={refreshVouchers} variant="ghost" size="sm" className="text-red-600 hover:bg-red-100 font-black uppercase text-[10px]">Retry Now</Button>
          </div>
        )}

        <Tabs defaultValue="collection" className="w-full">
          <TabsList className="bg-slate-200/60 p-1 mb-6 w-80 rounded-xl">
            <TabsTrigger value="collection" className="rounded-xl">Fee Collection</TabsTrigger>
            <TabsTrigger value="pending" className="rounded-xl">Pending Dues</TabsTrigger>
          </TabsList>

          <TabsContent value="collection">
            <FeeCollectionTab />
          </TabsContent>

          <TabsContent value="pending">
            <PendingDuesTab />
          </TabsContent>
        </Tabs>

        <GenerateIndividualVoucherModal open={isIndividualModalOpen} setOpen={setIsIndividualModalOpen} />
        <GenerateBulkVoucherModal open={isBulkModalOpen} setOpen={setIsBulkModalOpen} />

        <DiscountForm
          open={isDiscountFormOpen}
          setOpen={(val) => {
            setIsDiscountFormOpen(val)
            if (!val) setEditingDiscount(null)
          }}
          initialData={editingDiscount}
          onSave={handleSaveDiscount}
          loading={loadingDiscount}
        />

        <AlertDialog open={isDeleteDiscountAlertOpen} onOpenChange={setIsDeleteDiscountAlertOpen}>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-bold">Delete this discount?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove the discount and unassign it from any students currently using it.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl font-bold">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteDiscount}
                className="bg-red-600 hover:bg-red-700 rounded-xl font-bold"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
  )
}
