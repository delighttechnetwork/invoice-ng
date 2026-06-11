import React, { useState } from "react";
import { Invoice, Client } from "../types";
import { Compass, Lightbulb, Mail, MessageSquare, Loader2, Play, AlertTriangle, Check } from "lucide-react";

interface AICoachAndReminderProps {
  invoices: Invoice[];
  clients: Client[];
}

export default function AICoachAndReminder({ invoices, clients }: AICoachAndReminderProps) {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState("");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [customQuestion, setCustomQuestion] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const pendingCount = invoices.filter(i => i.status === "pending").length;
  const overdueCount = invoices.filter(i => i.status === "overdue").length;
  const totalReceivables = invoices
    .filter(i => i.status === "pending" || i.status === "overdue")
    .reduce((sum, i) => {
      const sub = i.items.reduce((s, item) => s + (item.quantity * item.price), 0);
      const tax = sub * (i.taxRate / 100);
      return sum + (sub + tax - i.discount);
    }, 0);

  const triggerCoachAudit = async () => {
    setLoading(true);
    setResponse("");
    setErrorMsg("");

    try {
      const summaryText = `I have ${invoices.length} total invoices in my system:
- ${pendingCount} are pending payment.
- ${overdueCount} are overdue.
- Total active receivables represent ₦ ${totalReceivables.toLocaleString()}.
The clients are: ${clients.map(c => `${c.name} (${c.company || "Freelance"})`).join(", ")}.

Provide an executive, concise cash-flow optimization advisory. Keep it under 200 words, action-oriented, and tailored for a Nigerian technology/service professional (referencing Nigerian banking transfers, VAT structures where relevant). Give 2 clear strategic bullets.`;

      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: summaryText }),
      });

      if (!res.ok) {
        throw new Error("Failed to contact Gemini server route.");
      }

      const data = await res.json();
      setResponse(data.reply || "No audit output compiled by Gemini.");
    } catch (e: any) {
      console.error(e);
      setErrorMsg("Unable to run AI intelligence audit. Check if GEMINI_API_KEY is configured.");
    } finally {
      setLoading(false);
    }
  };

  const generateFollowupEmail = async () => {
    if (!selectedInvoiceId) {
      setErrorMsg("Please select an active invoice file first.");
      return;
    }

    const selectedInv = invoices.find(i => i.id === selectedInvoiceId);
    if (!selectedInv) return;

    setLoading(true);
    setResponse("");
    setErrorMsg("");

    try {
      const promptText = `Draft a polite, professional, but firm payment reminder email for invoice ${selectedInv.invoiceNumber}.
Client: ${selectedInv.clientDetails.name} (${selectedInv.clientDetails.company || "Independent"})
Due date: ${selectedInv.dueDate}
Amount due: ₦ ${(selectedInv.items.reduce((sum, item) => sum + (item.price * item.quantity), 0) * (1 + selectedInv.taxRate / 100) - selectedInv.discount).toLocaleString()}
Current Status: ${selectedInv.status}

Keep it extremely professional, with a subject line, clean placeholders, and standard Nigerian corporate billing tone. Keep it under 150 words.`;

      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptText }),
      });

      if (!res.ok) {
        throw new Error("Unable to create reminder sheet.");
      }

      const data = await res.json();
      setResponse(data.reply);
    } catch (e: any) {
      console.error(e);
      setErrorMsg("Could not process email reminder draft.");
    } finally {
      setLoading(false);
    }
  };

  const askCustomQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customQuestion.trim()) return;

    setLoading(true);
    setResponse("");
    setErrorMsg("");

    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: customQuestion }),
      });

      if (!res.ok) {
        throw new Error("Failed to resolve custom prompt inquiry.");
      }

      const data = await res.json();
      setResponse(data.reply);
    } catch (e: any) {
      console.error(e);
      setErrorMsg("Gemini assistant offline. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
            <Lightbulb size={20} />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">Strategy Advisor & Cashflow Coach</h3>
            <p className="text-slate-500 text-xs mt-0.5">Strategic billing assessments, liquidity guidance, and professional Nigerian tax rules compiled interactively.</p>
          </div>
        </div>
        <Compass className="text-emerald-500 animate-pulse" size={18} />
      </div>

      {/* Receivables summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-50 p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Active Receivables</span>
          <div className="mt-2">
            <strong className="text-lg font-black text-slate-800 font-mono">₦ {totalReceivables.toLocaleString()}</strong>
            <span className="text-[10px] text-slate-500 block mt-0.5">{pendingCount + overdueCount} unpaid files</span>
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Risk Threat Index</span>
          <div className="mt-2 flex items-center gap-2">
            {overdueCount > 0 ? (
              <>
                <AlertTriangle className="text-amber-500" size={16} />
                <strong className="text-sm font-black text-amber-700">MODERATE ({overdueCount} Overdue)</strong>
              </>
            ) : (
              <>
                <Check className="text-emerald-500" size={16} />
                <strong className="text-sm font-black text-emerald-700">VERY LOW</strong>
              </>
            )}
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Actions Suggested</span>
          <div className="mt-2">
            <button
              onClick={triggerCoachAudit}
              disabled={loading}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg cursor-pointer flex items-center gap-1 uppercase transition-all"
            >
              <Play size={8} />
              <span>Run Smart Audit</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tool Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        <div className="space-y-4 border-r border-slate-100 pr-0 lg:pr-6">
          <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
            <Mail size={13} className="text-emerald-500" />
            <span>Smart Follow-up Generator</span>
          </h4>
          <p className="text-[11px] text-slate-400 leading-normal">Select an invoice below to generate a tailored reminder draft email in seconds.</p>

          <div className="space-y-2">
            <select
              value={selectedInvoiceId}
              onChange={(e) => setSelectedInvoiceId(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 h-10"
            >
              <option value="">Choose active invoice file...</option>
              {invoices
                .filter(i => i.status !== "paid" && i.status !== "cancelled")
                .map(i => (
                  <option key={i.id} value={i.id}>
                    {i.invoiceNumber} - {i.clientDetails.name} (₦ {(i.items.reduce((sum, item) => sum + (item.price * item.quantity), 0) * (1 + i.taxRate / 100) - i.discount).toLocaleString()})
                  </option>
                ))}
            </select>

            <button
              onClick={generateFollowupEmail}
              disabled={loading || !selectedInvoiceId}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-55 transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 size={13} className="animate-spin text-emerald-400" />
                  <span>Consulting Coach...</span>
                </>
              ) : (
                <>
                  <Mail size={13} className="text-emerald-400" />
                  <span>Draft Follow-up Letter</span>
                </>
              )}
            </button>
          </div>

          <form onSubmit={askCustomQuestion} className="space-y-2 pt-2 border-t border-slate-50">
            <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
              <MessageSquare size={13} className="text-[#09c2cf]" />
              <span>Ask custom tax/billing query</span>
            </h4>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="How do I account for WHT (withholding tax) in Nigeria?"
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
              />
              <button
                type="submit"
                disabled={loading || !customQuestion.trim()}
                className="px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 transition-colors"
              >
                Ask
              </button>
            </div>
          </form>
        </div>

        {/* Coach Output terminal */}
        <div className="bg-slate-950 text-slate-350 rounded-2xl p-5 font-mono text-[11px] flex flex-col justify-between min-h-[220px] shadow-inner relative border border-slate-900">
          <div className="flex justify-between items-center border-b border-slate-900 pb-2 mb-3">
            <span className="text-emerald-500 font-bold tracking-widest text-[9px] uppercase">Coach Terminal Output:</span>
            <span className="text-[8px] bg-slate-900 px-1.5 py-0.5 rounded tracking-wider text-slate-500 uppercase">Interactive</span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-56 pr-1 select-all text-left whitespace-pre-wrap leading-relaxed min-h-[140px] text-xs text-indigo-200">
            {loading ? (
              <div className="flex items-center justify-center p-8 gap-2.5">
                <Loader2 className="animate-spin text-emerald-500" size={18} />
                <span className="animate-pulse font-mono tracking-widest text-[#09c2cf] text-[10px]">COACH ANALYZING DATA...</span>
              </div>
            ) : errorMsg ? (
              <p className="text-amber-500 font-semibold">{errorMsg}</p>
            ) : response ? (
              response
            ) : (
              <span className="text-slate-600 italic">
                {`Standby for accounting advice. Click 'Run Smart Audit' to verify receivables, or compile direct client reminders.`}
              </span>
            )}
          </div>
          
          <div className="text-[9px] text-slate-600 pt-3 border-t border-slate-900 mt-2 text-center select-none font-mono">
            Integrates GEMINI Flash Live Ledger Analysis
          </div>
        </div>
      </div>
    </div>
  );
}
