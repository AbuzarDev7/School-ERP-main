import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, User, Mail, Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { register, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    const success = await register({ name, email, password });
    if (success) {
      navigate("/auth/login");
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left Side (Visual Branding) */}
      <div className="hidden lg:flex w-2/5 bg-[#0F172A] relative overflow-hidden items-center justify-center p-12">
         <div className="absolute inset-0 opacity-20">
          <div className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500 blur-[100px]" />
        </div>
        
        <div className="relative z-10 text-center">
          <div className="inline-flex p-4 rounded-3xl bg-emerald-500 mb-8">
            <ShieldCheck className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">Secure Enrollment</h2>
          <p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">
            Join the school systems already transforming their administrative workflows with Academic Pro.
          </p>
        </div>

        <div className="absolute bottom-8 left-8 text-slate-500 text-xs font-bold uppercase tracking-[0.2em]">
          Powered by AddsMint
        </div>
      </div>

      {/* Right Side (Form) */}
      <div className="w-full lg:w-3/5 flex items-center justify-center p-6 md:p-12 bg-slate-50 lg:bg-white">
        <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Create Account</h2>
            <p className="text-slate-500 mt-2">Get started with your school management portal</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Full Name</Label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500" />
                <Input 
                  placeholder="Ayan Khan" 
                  autoFocus
                  className="pl-10 h-12 rounded-xl bg-slate-50 border-slate-200" 
                  required 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Official Email</Label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500" />
                <Input 
                  type="email" 
                  placeholder="admin@school.com" 
                  className="pl-10 h-12 rounded-xl bg-slate-50 border-slate-200" 
                  required 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Password</Label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    type={showPass ? "text" : "password"} 
                    placeholder="••••••••" 
                    className="pl-10 pr-10 h-12 rounded-xl bg-slate-50" 
                    required 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Confirm</Label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    type={showConfirm ? "text" : "password"} 
                    placeholder="••••••••" 
                    className="pl-10 pr-10 h-12 rounded-xl bg-slate-50" 
                    required 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 bg-[#0F172A] hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg transition-all mt-4" 
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Complete Registration"}
            </Button>
          </form>

          <div className="text-center text-sm text-slate-500 font-medium">
            Already managing a school?{" "}
            <Link to="/auth/login" className="text-emerald-600 font-bold hover:underline underline-offset-4">
              Sign In here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}