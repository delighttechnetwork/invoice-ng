import React, { useState } from "react";
import { motion } from "motion/react";
import { 
  Lock, 
  Mail, 
  User, 
  Compass, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  CheckCircle, 
  AlertCircle,
  HelpCircle,
  Loader2
} from "lucide-react";
import { getSupabase } from "../lib/supabase";

interface FrontendAuthFlowProps {
  onLoginSuccess: (name: string, email: string) => void;
}

export default function FrontendAuthFlow({ onLoginSuccess }: FrontendAuthFlowProps) {
  const [authMode, setAuthMode] = useState<"home" | "login" | "signup">("home");
  const [loading, setLoading] = useState(false);
  
  // Registration States
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regError, setRegError] = useState("");
  const [regSuccess, setRegSuccess] = useState("");
  
  // Login States
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginError, setLoginError] = useState("");
  
  // Forgot Password
  const [forgotPasswordActive, setForgotPasswordActive] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSentSuccess, setForgotSentSuccess] = useState(false);

  // 1. Validation - Email Format Regex
  const isEmailValid = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // 2. Validation - Password Strength evaluation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: "Empty", color: "bg-slate-200", textColor: "text-slate-400" };
    
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 10) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 2) {
      return { score, label: "Weak", color: "bg-rose-500", textColor: "text-rose-500" };
    } else if (score <= 4) {
      return { score, label: "Moderate", color: "bg-amber-500", textColor: "text-amber-500" };
    } else {
      return { score, label: "Strong & Safe!", color: "bg-emerald-500", textColor: "text-emerald-500" };
    }
  };

  // Sign up using real Supabase client
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");
    setRegSuccess("");

    if (!regName.trim()) {
      setRegError("Please specify your company or freelancer name.");
      return;
    }
    if (!regEmail.trim() || !isEmailValid(regEmail)) {
      setRegError("Please input a valid email format.");
      return;
    }
    if (regPassword.length < 6) {
      setRegError("Security protection requires password length of at least 6 characters.");
      return;
    }

    const sb = getSupabase();
    if (!sb) {
      setRegError("Supabase connection is not initialized yet.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await sb.auth.signUp({
        email: regEmail,
        password: regPassword,
        options: {
          data: {
            full_name: regName
          }
        }
      });

      if (error) throw error;
      
      setRegSuccess("Account registered! Check email for verification link, or log in.");
      alert("Registration initiated successfully via Supabase! If email confirmation is enabled on your project, please verify your inbox. Otherwise, you can proceed directly to Sign In.");
      setLoginEmail(regEmail);
      setAuthMode("login");
    } catch (err: any) {
      setRegError(err.message || "An unexpected registration error occurred.");
    } finally {
      setLoading(false);
    }
  };

  // Login using real Supabase client
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (!loginEmail.trim() || !isEmailValid(loginEmail)) {
      setLoginError("Please enter a valid email format.");
      return;
    }
    if (!loginPassword) {
      setLoginError("Please enter your password.");
      return;
    }

    const sb = getSupabase();
    if (!sb) {
      setLoginError("Supabase client not initialized.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await sb.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) throw error;

      if (data.user) {
        // Retrieve display name from metadata or fall back to email username
        const name = data.user.user_metadata?.full_name || loginEmail.split("@")[0];
        onLoginSuccess(name, loginEmail);
      }
    } catch (err: any) {
      setLoginError(err.message || "Invalid credentials combination. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSimulatedPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEmailValid(forgotEmail)) {
      alert("Invalid email format specified.");
      return;
    }

    const sb = getSupabase();
    if (!sb) {
      alert("Supabase client is not initialized.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await sb.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      setForgotSentSuccess(true);
      setTimeout(() => {
        setForgotSentSuccess(false);
        setForgotPasswordActive(false);
        setForgotEmail("");
      }, 5000);
    } catch (err: any) {
      alert(`Reset request failure: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Pass strength indicator info
  const passStrength = getPasswordStrength(regPassword);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between antialiased w-full font-sans select-none relative overflow-hidden">
      
      {/* Background visual graphics */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-100/40 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-indigo-50/40 rounded-full blur-3xl -z-10" />

      {/* Elegant minimalist header */}
      <header className="px-6 py-5 max-w-7xl w-full mx-auto flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-2xl flex items-center justify-center text-white font-mono font-black text-xl shadow-md">
            ₦
          </div>
          <div>
            <span className="text-base font-black tracking-tight text-slate-900 flex items-center gap-1.5">
              <span>InvoiceNG</span>
              <span className="text-[9px] bg-emerald-50 border border-emerald-250 text-emerald-700 font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider font-mono">Retainers</span>
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {authMode === "home" ? (
            <>
              <button 
                onClick={() => setAuthMode("login")}
                className="px-4 py-2 text-xs font-black text-slate-650 hover:text-slate-900 transition-colors cursor-pointer"
              >
                Sign In
              </button>
              <button 
                onClick={() => setAuthMode("signup")}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm shadow-emerald-700/10"
              >
                Create Account
              </button>
            </>
          ) : (
            <button 
              onClick={() => { setAuthMode("home"); setForgotPasswordActive(false); }}
              className="px-4 py-2 text-xs font-black text-slate-500 hover:text-slate-800 transition-all cursor-pointer flex items-center gap-1 bg-white border border-slate-200 rounded-xl shadow-xs"
            >
              <Compass size={13} />
              <span>Back to Home</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content Workspace Switcher */}
      <main className="flex-1 flex items-center justify-center p-4 md:p-12 z-10 max-w-7xl mx-auto w-full">
        {authMode === "home" && (
          <motion.div 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center w-full"
          >
            {/* Left Column Copywriting details */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-55 bg-opacity-10 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/10">
                <ShieldCheck size={11} />
                <span>Next-Gen Invoicing for Nigeria</span>
              </span>
              
              <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-[1.1] max-w-xl">
                Nigeria's Professional <span className="text-emerald-600">Billing Ledger</span> for Elite Teams.
              </h1>
              
              <p className="text-slate-550 text-sm sm:text-base leading-relaxed font-semibold max-w-lg">
                Craft, manage, and dispatch professional NGN invoices. Track your recurring retainers with real-time MRR analytics, sandbox payment gateways, and custom tax configurations built strictly for modern Nigerian operations.
              </p>

              {/* Feature bullet list */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {[
                  { title: "Dynamic NGN Ledger", desc: "Interactive listings with local tax calculation." },
                  { title: "Retainer MRR & ARR", desc: "Automated calculation of yearly run-rate trajectory." },
                  { title: "Paystack Gateway Simulator", desc: "Sandbox environment to clear bills in real-time." },
                  { title: "Strategic Advisors", desc: "Nigerian tax parameters and automated payment letters." }
                ].map((feat, idx) => (
                  <div key={idx} className="flex gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                      <CheckCircle size={15} />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">{feat.title}</h3>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-snug font-medium">{feat.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA and info */}
              <div className="flex flex-wrap items-center gap-4 pt-4">
                <button
                  onClick={() => setAuthMode("signup")}
                  className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black tracking-widest uppercase transition-all shadow-lg shadow-emerald-700/20 hover:shadow-emerald-700/30 flex items-center gap-2 cursor-pointer"
                >
                  <span>Build Free Account</span>
                  <ArrowRight size={13} />
                </button>
                <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-400 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>No credit card required. All cached locally in Ibadan.</span>
                </div>
              </div>
            </div>

            {/* Right Column visual preview card */}
            <div className="lg:col-span-5 relative w-full flex justify-center">
              <div className="absolute inset-0 bg-gradient-to-tr from-emerald-100 to-indigo-100 rounded-3xl blur-2xl opacity-50 -rotate-3 transform scale-95" />
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl relative w-full max-w-sm space-y-5 text-left rotate-1">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[9px] font-mono font-bold text-slate-400 uppercase">INVOICE PREVIEW</span>
                    <h3 className="font-extrabold text-slate-800 text-xs mt-0.5">INV-2026-004</h3>
                  </div>
                  <span className="bg-indigo-50 border border-indigo-200 text-indigo-700 text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider font-mono">Pending</span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-400">Client Contact</span>
                    <strong className="text-slate-700 font-bold">Danjuma Ibadan Ltd</strong>
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-400">Services Description</span>
                    <strong className="text-slate-700 font-bold">DevOps & Cloud Audits</strong>
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-400">VAT (7.5%) Included</span>
                    <strong className="text-slate-700 font-mono">₦ 37,500</strong>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl flex justify-between items-center border border-slate-150">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wide">Grand Total Due</span>
                  <strong className="text-sm font-black text-slate-900 font-mono">₦ 537,500</strong>
                </div>

                <div className="pt-2 text-center">
                  <button 
                    onClick={() => setAuthMode("login")}
                    className="w-full py-2 bg-slate-900 hover:bg-slate-950 text-white rounded-xl text-[10px] font-extrabold uppercase tracking-widest cursor-pointer transition-colors"
                  >
                    Examine LIVE Dashboard Demo
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* SIGNUP FORM MODE */}
        {authMode === "signup" && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl max-w-md w-full text-left"
          >
            <div className="text-center space-y-1.5 mb-6">
              <strong className="text-[10px] text-emerald-600 font-black uppercase tracking-widest block">SECURE SYSTEM SIGNUP</strong>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Access InvoiceNG Suite</h2>
              <p className="text-slate-400 text-xs">Simulate your business profile instantiation instantly.</p>
            </div>

            {regError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2 mb-4">
                <AlertCircle size={14} className="shrink-0 text-rose-500" />
                <span>{regError}</span>
              </div>
            )}

            {regSuccess && (
              <div className="p-3 bg-emerald-55 bg-opacity-10 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-semibold flex items-center gap-2 mb-4">
                <CheckCircle size={14} className="shrink-0 text-emerald-500" />
                <span>{regSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSignupSubmit} className="space-y-4 font-bold text-xs text-slate-705">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-slate-400">Individual or Company Name</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-slate-400"><User size={14} /></span>
                  <input
                    type="text"
                    required
                    disabled={loading}
                    placeholder="e.g. Aliko Danjuma"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 bg-slate-50/50 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all text-xs disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-slate-400">Email Address (Corporate)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-slate-400"><Mail size={14} /></span>
                  <input
                    type="email"
                    required
                    disabled={loading}
                    placeholder="e.g. aliko@export.ng"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 bg-slate-50/50 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all text-xs disabled:opacity-50"
                  />
                </div>
                {regEmail && !isEmailValid(regEmail) && (
                  <p className="text-[10px] text-rose-500 font-semibold mt-1">Please enter a valid email address with an @ domain.</p>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] uppercase tracking-wider text-slate-400">Master Password</label>
                  {regPassword && (
                    <span className={`text-[10px] font-mono font-bold ${passStrength.textColor}`}>
                      Strength: {passStrength.label}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-slate-400"><Lock size={14} /></span>
                  <input
                    type={showRegPassword ? "text" : "password"}
                    required
                    disabled={loading}
                    placeholder="••••••••"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 bg-slate-50/50 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all text-xs disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-650 cursor-pointer"
                  >
                    {showRegPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                
                {/* 3. Real-time Password Strength feedback bar */}
                {regPassword && (
                  <div className="space-y-1.5 pt-1">
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${passStrength.color}`} 
                        style={{ width: `${Math.min(100, Math.max(15, passStrength.score * 20))}%` }}
                      />
                    </div>
                    <ul className="text-[10px] text-slate-400 space-y-0.5 font-medium">
                      <li className={regPassword.length >= 6 ? "text-emerald-600" : "text-slate-400"}>✓ Minimum 6 characters</li>
                      <li className={/[A-Z]/.test(regPassword) ? "text-emerald-600" : "text-slate-400"}>✓ Has an uppercase letter</li>
                      <li className={/[0-9]/.test(regPassword) ? "text-emerald-600" : "text-slate-400"}>✓ Has at least 1 digit number</li>
                    </ul>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-colors cursor-pointer mt-2 shadow-sm shadow-emerald-800/10 flex items-center justify-center gap-1.5"
              >
                {loading ? <Loader2 size={13} className="animate-spin" /> : null}
                <span>{loading ? "Registering SECURE..." : "Sign Up"}</span>
              </button>
            </form>

            <div className="mt-5 pt-3 border-t border-slate-100 text-center text-[11px] text-slate-400 font-semibold">
              <span>Already initialized? </span>
              <button 
                onClick={() => setAuthMode("login")}
                className="text-emerald-600 hover:text-emerald-700 font-black cursor-pointer underline"
              >
                Sign In instead
              </button>
            </div>
          </motion.div>
        )}

        {/* LOGIN FORM MODE */}
        {authMode === "login" && !forgotPasswordActive && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl max-w-md w-full text-left"
          >
            <div className="text-center space-y-1.5 mb-6">
              <strong className="text-[10px] text-emerald-600 font-black uppercase tracking-widest block">ADMIN LOGIN SYNOPSIS</strong>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Welcome Back to InvoiceNG</h2>
              <p className="text-slate-400 text-xs">Verify credentials keys to synchronize local files.</p>
            </div>

            {loginError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2 mb-4">
                <AlertCircle size={14} className="shrink-0 text-rose-500" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4 font-bold text-xs text-slate-705">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-slate-400">Workspace Email</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-slate-400"><Mail size={14} /></span>
                  <input
                    type="email"
                    required
                    disabled={loading}
                    placeholder="e.g. yourname@domain.ng"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 bg-slate-50/50 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all text-xs disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] uppercase tracking-wider text-slate-400">Passphrase Code</label>
                  <button
                    type="button"
                    onClick={() => setForgotPasswordActive(true)}
                    className="text-[10px] text-emerald-600 hover:text-emerald-700 font-black cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-slate-400"><Lock size={14} /></span>
                  <input
                    type={showLoginPassword ? "text" : "password"}
                    required
                    disabled={loading}
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 bg-slate-50/50 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all text-xs disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-650 cursor-pointer"
                  >
                    {showLoginPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Remember me checkbox */}
              <div className="flex items-center justify-between py-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <span className="text-[11px] text-slate-500 font-semibold select-none">Remember this browser station</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-colors cursor-pointer mt-2 shadow-sm shadow-emerald-800/10 flex items-center justify-center gap-1.5"
              >
                {loading ? <Loader2 size={13} className="animate-spin" /> : null}
                <span>{loading ? "Unlocking Account..." : "Unlock Dashboard Access"}</span>
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-slate-100 text-center text-xs text-slate-400">
              <p className="text-[10px] text-slate-400/90 font-medium mb-3">
                💡 Hint: First time? Try signing up or logging in directly with any email.
              </p>
              <div className="font-semibold text-[11px]">
                <span>New operator? </span>
                <button 
                  onClick={() => setAuthMode("signup")}
                  className="text-emerald-600 hover:text-emerald-700 font-black cursor-pointer underline"
                >
                  Write custom profile now
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* FORGOT PASSWORD SUB-MODE */}
        {authMode === "login" && forgotPasswordActive && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl max-w-sm w-full text-left"
          >
            <div className="text-center space-y-1.5 mb-5">
              <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <HelpCircle size={20} />
              </div>
              <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">Recover Secure Credentials</h2>
              <p className="text-slate-400 text-xs">Submit registered company email address to start restoration.</p>
            </div>

            {forgotSentSuccess ? (
              <div className="p-4 bg-emerald-50 border border-emerald-250 text-emerald-800 rounded-2xl text-xs font-semibold space-y-2 text-center animate-pulse">
                <CheckCircle size={18} className="mx-auto text-emerald-500" />
                <p className="font-extrabold uppercase text-[10px] tracking-wider text-emerald-700">Dispatch Initiated!</p>
                <p className="text-[11px] leading-relaxed text-slate-600 font-medium">A temporary simulation recovery masterkey instructions has been prepared for dispatch to: <br /><strong className="text-emerald-950 font-black">{forgotEmail}</strong></p>
              </div>
            ) : (
              <form onSubmit={handleSimulatedPasswordReset} className="space-y-4 font-bold text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-slate-400">Workspace Email</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. owner@holding-plc.ng"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50/50 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white text-xs"
                  />
                </div>

                <div className="flex gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setForgotPasswordActive(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-150 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer text-center"
                  >
                    Go Back
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer text-center"
                  >
                    Simulate Reset
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        )}
      </main>

      {/* Elegant minimalist footer */}
      <footer className="py-6 border-t border-slate-200 border-opacity-60 bg-white/40 text-center font-mono text-[9px] text-slate-400 font-bold z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-3">
          <span>&copy; 2026 InvoiceNG Billing Systems. Ibadan, Nigeria.</span>
          <div className="flex items-center gap-3">
            <span>Standard Cache Persistent System</span>
            <span>•</span>
            <span className="text-emerald-600">Secure AES-256 Client-only Encryptions</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
