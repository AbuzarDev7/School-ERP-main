import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStudents } from "@/context/StudentContext";
import { useFeeStructures } from "@/context/FeeStructureContext";
import { StudentFormBody } from "./StudentForm";

// Standalone screen for new-student registration. Uses the same StudentFormBody
// as the modal in Students.jsx so the two flows can never drift in behavior.
export default function StudentFormScreen() {
  const navigate = useNavigate();
  const { addStudent } = useStudents();
  const { structures } = useFeeStructures();
  const classList = structures.map((s) => s.className);

  const handleCancel = () => navigate("/students");

  const handleSave = async (formDataPayload) => {
    const savePromise = addStudent(formDataPayload);

    toast.promise(savePromise, {
      loading: "Saving...",
      success: () => {
        navigate("/students");
        return "Student registered";
      },
      error: "Failed to save student",
    });

    return savePromise;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          className="h-9 px-3 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl font-bold gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Students
        </Button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
        <StudentFormBody
          active={true}
          initialData={null}
          classList={classList}
          onCancel={handleCancel}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}
