import React, { useState } from "react";
import { Invoice } from "../types";
import { X, ShieldCheck, CreditCard, Landmark, Loader2, CheckCircle2 } from "lucide-react";

interface PaystackSimulatorProps {
  invoice: Invoice;
  onClose: () => void;
  onPaymentSuccess: (reference: string) => void;
}

export default function PaystackSimulator({ invoice, onClose, onPaymentSuccess }: PaystackSimulatorProps) {
  const [method, setMethod] = useState<"card" | "bank">("card");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [step, setStep] = useState<"form" | "loading" | "otp" | "success">("form");
  const [otp, setOtp] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const calculateTotal = () => {
    const subtotal = invoice.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const tax = subtotal * (invoice.taxRate / 100);
    return Math.max(0, subtotal + tax - invoice.discount);
  };

  const amount = calculateTotal();

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (method === "card") {
      if (!cardNumber || !expiry || !cvv) {
        setErrorMsg("Please fill in all card details.");
        return;
      }
    } else {
      if (!bankName || !accountNumber) {
        setErrorMsg("Please select bank and enter account number.");
        return;
      }
    }

    setStep("loading");
    setTimeout(() => {
      setStep("otp");
    }, 1800);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) {
      setErrorMsg("Please enter the One-Time PIN sent to your phone.");
      return;
    }

    setStep("loading");
    setTimeout(() => {
      setStep("success");
      const ref = `PSTK-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      setTimeout(() => {
        onPaymentSuccess(ref);
      }, 1500);
    }, 1800);
  };

  return (
    <div id="paystack-overlay" className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-150 transform transition-all flex flex-col">
        {/* Banner */}
        <div className="bg-[#09c2cf] p-4 text-white flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <span className="font-sans font-black tracking-tight text-lg">paystack</span>
            <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded font-mono uppercase tracking-wider font-extrabold">Sandbox</span>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-white/80 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 flex-1 flex flex-col justify-between min-h-[320px]">
          {step === "form" && (
            <div className="space-y-4">
              <div className="text-center pb-2 border-b border-slate-100">
                <span className="text-xs text-slate-400 block uppercase font-bold tracking-widest">Pay to Apex Digital</span>
                <strong className="text-2xl font-black text-slate-800 font-mono">
                  ₦ {amount.toLocaleString()}
                </strong>
                <span className="text-[10px] text-zinc-500 font-bold block mt-0.5">{invoice.invoiceNumber} • {invoice.clientDetails.name}</span>
              </div>

              {/* Method choice switcher */}
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => { setMethod("card"); setErrorMsg(""); }}
                  className={`py-2 text-center rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${method === "card" ? "bg-white text-[#09c2cf] shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                >
                  <CreditCard size={13} />
                  <span>Pay with Card</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setMethod("bank"); setErrorMsg(""); }}
                  className={`py-2 text-center rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${method === "bank" ? "bg-white text-[#09c2cf] shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                >
                  <Landmark size={13} />
                  <span>Pay with Bank</span>
                </button>
              </div>

              {errorMsg && (
                <p className="text-red-500 font-bold text-[11px] text-center">{errorMsg}</p>
              )}

              <form onSubmit={handlePay} className="space-y-3">
                {method === "card" ? (
                  <>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400">Card Number</label>
                      <input 
                        type="text" 
                        maxLength={19}
                        placeholder="5399 2300 4580 1200"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value.replace(/[^\d ]/g, '').replace(/(.{4})/g, '$1 ').trim())}
                        className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-mono font-bold focus:outline-none focus:border-[#09c2cf]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400">Expiry (MM/YY)</label>
                        <input 
                          type="text" 
                          maxLength={5}
                          placeholder="09/28"
                          value={expiry}
                          onChange={(e) => setExpiry(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-mono focus:outline-none focus:border-[#09c2cf] text-center"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400">CVV</label>
                        <input 
                          type="password" 
                          maxLength={3}
                          placeholder="123"
                          value={cvv}
                          onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                          className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-mono focus:outline-none focus:border-[#09c2cf] text-center"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400">Choose your Bank</label>
                      <select 
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#09c2cf] bg-white h-10"
                      >
                        <option value="">Select a bank</option>
                        <option value="GTB">Guaranty Trust Bank</option>
                        <option value="Zenith">Zenith Bank</option>
                        <option value="Access">Access Bank</option>
                        <option value="Kuda">Kuda Microfinance Bank</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400">Account Number</label>
                      <input 
                        type="text" 
                        maxLength={10}
                        placeholder="0123456789"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                        className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-mono font-bold focus:outline-none focus:border-[#09c2cf]"
                      />
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  className="w-full py-3 bg-[#09c2cf] hover:bg-[#07aab6] text-white rounded-xl text-xs font-extrabold transition-all duration-200 cursor-pointer text-center block mt-3"
                >
                  Pay ₦ {amount.toLocaleString()}
                </button>
              </form>
            </div>
          )}

          {step === "loading" && (
            <div className="flex-1 flex flex-col justify-center items-center gap-3">
              <Loader2 className="animate-spin text-[#09c2cf]" size={42} />
              <p className="text-xs font-bold text-slate-500">Contacting Paystack gateway host...</p>
            </div>
          )}

          {step === "otp" && (
            <div className="space-y-4">
              <div className="text-center">
                <span className="text-xs text-slate-400 block uppercase font-bold tracking-widest">Two-Factor Authentication</span>
                <p className="text-[11px] text-zinc-500 mt-1">Please report the One-Time PIN (OTP) sent to your registered phone number to authenticate payment.</p>
              </div>

              {errorMsg && (
                <p className="text-red-500 font-bold text-xs text-center">{errorMsg}</p>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-3">
                <input 
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full border border-slate-200 rounded-xl p-3 text-center tracking-widest text-lg font-mono font-bold focus:outline-none focus:border-[#09c2cf]"
                />
                
                <button
                  type="submit"
                  className="w-full py-3 bg-[#09c2cf] hover:bg-[#07aab6] text-white rounded-xl text-xs font-extrabold transition-all duration-200 cursor-pointer text-center"
                >
                  Verify & Complete Transaction
                </button>
              </form>
            </div>
          )}

          {step === "success" && (
            <div className="flex-1 flex flex-col justify-center items-center gap-3 text-center">
              <CheckCircle2 size={46} className="text-emerald-500" />
              <div>
                <h4 className="text-sm font-black text-slate-800">Payment Completed!</h4>
                <p className="text-[10px] text-zinc-500 mt-0.5">Reference key has been injected to client files successfully.</p>
              </div>
            </div>
          )}

          {/* Secure disclaimer */}
          <div className="flex justify-center items-center gap-1 text-[9px] text-slate-400 border-t border-slate-50 pt-4 mt-auto">
            <ShieldCheck size={11} className="text-emerald-500" />
            <span>Authorized SECURE by Paystack Payment Shield v2.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}
