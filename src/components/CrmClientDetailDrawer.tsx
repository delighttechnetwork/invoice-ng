import React, { useState } from "react";
import { 
  X, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Building, 
  Plus, 
  Trash2, 
  FileText, 
  ArrowUpRight, 
  MessageSquare, 
  Lightbulb,
  ClipboardList
} from "lucide-react";
import { Client, Invoice, ClientNote } from "../types";

interface CrmClientDetailDrawerProps {
  client: Client;
  invoices: Invoice[];
  onClose: () => void;
  onUpdateClient: (updatedClient: Client) => void;
  onViewInvoice: (invoiceId: string) => void;
}

export default function CrmClientDetailDrawer({
  client,
  invoices,
  onClose,
  onUpdateClient,
  onViewInvoice
}: CrmClientDetailDrawerProps) {
  // Local state for editing contact info
  const [name, setName] = useState(client.name);
  const [email, setEmail] = useState(client.email);
  const [phone, setPhone] = useState(client.phone || "");
  const [company, setCompany] = useState(client.company || "");
  const [address, setAddress] = useState(client.address || "");
  
  // Note inputs
  const [noteText, setNoteText] = useState("");
  const [activeTab, setActiveTab] = useState<"contact" | "invoices" | "notes">("contact");

  // Calculate client-specific financial metrics
  const clientInvoices = invoices.filter(inv => inv.clientId === client.id);
  const totalInvoiced = clientInvoices.reduce((sum, inv) => {
    const sub = inv.items.reduce((s, it) => s + (it.quantity * it.price), 0);
    const tax = inv.taxRate ? (sub * (inv.taxRate / 100)) : 0;
    return sum + (sub + tax - inv.discount);
  }, 0);
  
  const totalPaid = clientInvoices
    .filter(inv => inv.status === "paid")
    .reduce((sum, inv) => {
      const sub = inv.items.reduce((s, it) => s + (it.quantity * it.price), 0);
      const tax = inv.taxRate ? (sub * (inv.taxRate / 100)) : 0;
      return sum + (sub + tax - inv.discount);
    }, 0);

  const outstanding = totalInvoiced - totalPaid;

  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    const updated: Client = {
      ...client,
      name,
      email,
      phone: phone || "",
      company: company || "",
      address: address || "",
    };
    onUpdateClient(updated);
    
    // Add an auto note that contact info was updated
    const autoNote: ClientNote = {
      id: `note-auto-${Date.now()}`,
      text: "System: Customer contact information updated.",
      createdAt: new Date().toISOString().replace("T", " ").substring(0, 16)
    };
    const notesList = client.notes ? [autoNote, ...client.notes] : [autoNote];
    onUpdateClient({ ...updated, notes: notesList });
  };

  const handleAddNote = (text: string = noteText) => {
    if (!text.trim()) return;
    
    const newNote: ClientNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      text: text.trim(),
      createdAt: new Date().toISOString().replace("T", " ").substring(0, 16)
    };

    const updatedNotes = client.notes ? [newNote, ...client.notes] : [newNote];
    onUpdateClient({
      ...client,
      notes: updatedNotes
    });
    setNoteText("");
  };

  const handleDeleteNote = (noteId: string) => {
    if (!client.notes) return;
    const updatedNotes = client.notes.filter(n => n.id !== noteId);
    onUpdateClient({
      ...client,
      notes: updatedNotes
    });
  };

  // Custom quick note presets
  const presets = [
    { label: "Payment Follow-up Sent", text: "Sent friendly WhatsApp and email follow-up regarding invoice payment." },
    { label: "Briefing Call Completed", text: "Had voice call to align on design specification adjustments. Client approved scope change." },
    { label: "Rate Agreement Signed", text: "Signed off on retainer pricing structure for Q3 services." },
    { label: "Payment Promise Made", text: "Client confirmed bank wire transfer queued for processing by end of week." }
  ];

  return (
    <div id="crm-drawer-container" className="fixed inset-y-0 right-0 w-full md:max-w-xl bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200 animate-slide-in font-sans">
      
      {/* Header */}
      <div className="p-6 bg-[#0F172A] text-white flex justify-between items-center flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center font-bold text-lg border border-blue-400/30">
            {client.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 className="font-extrabold text-base tracking-tight">{client.name}</h3>
            <span className="text-[10px] text-zinc-400 font-mono tracking-widest uppercase bg-slate-800 px-2 py-0.5 rounded">
              {client.company || "Individual Client"}
            </span>
          </div>
        </div>
        <button 
          id="crm-drawer-close"
          onClick={onClose}
          className="p-2 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer text-zinc-400 hover:text-white"
        >
          <X size={20} />
        </button>
      </div>

      {/* Mini Financial Banner */}
      <div className="px-6 py-4 bg-slate-50 border-b border-slate-150 grid grid-cols-3 gap-2 text-center text-xs flex-shrink-0">
        <div className="border-r border-slate-200">
          <span className="text-[9px] text-zinc-400 uppercase font-black tracking-wider block">Invocations</span>
          <strong className="text-[#111] font-mono font-bold text-sm block mt-0.5">{clientInvoices.length} total</strong>
        </div>
        <div className="border-r border-slate-200">
          <span className="text-[9px] text-zinc-400 uppercase font-black tracking-wider block">Paid Total</span>
          <strong className="text-emerald-600 font-mono font-bold text-sm block mt-0.5">₦{totalPaid.toLocaleString()}</strong>
        </div>
        <div>
          <span className="text-[9px] text-red-500 uppercase font-black tracking-wider block">Unpaid Bills</span>
          <strong className="text-red-650 font-mono font-bold text-sm block mt-0.5">₦{outstanding.toLocaleString()}</strong>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-slate-200 flex-shrink-0 bg-slate-50/50">
        <button
          id="crm-tab-contact"
          onClick={() => setActiveTab("contact")}
          className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 uppercase tracking-wider ${
            activeTab === "contact"
              ? "border-blue-600 text-blue-700 bg-white"
              : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-slate-50"
          }`}
        >
          Contact Card
        </button>
        <button
          id="crm-tab-invoices"
          onClick={() => setActiveTab("invoices")}
          className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 uppercase tracking-wider ${
            activeTab === "invoices"
              ? "border-blue-600 text-blue-700 bg-white"
              : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-slate-50"
          }`}
        >
          Past Invoices ({clientInvoices.length})
        </button>
        <button
          id="crm-tab-notes"
          onClick={() => setActiveTab("notes")}
          className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 uppercase tracking-wider ${
            activeTab === "notes"
              ? "border-blue-600 text-blue-700 bg-white"
              : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-slate-50"
          }`}
        >
          CRM Notes & Logs ({client.notes?.length || 0})
        </button>
      </div>

      {/* Scrollable Core Pane */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* CONTACT INFO EDITOR */}
        {activeTab === "contact" && (
          <form id="crm-contact-editor" onSubmit={handleSaveContact} className="space-y-4 text-xs">
            <h4 className="font-extrabold text-[#111] text-sm flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <User size={16} className="text-blue-600" />
              <span>EDIT CLIENT CONTACT DETAILS</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-bold text-gray-400 uppercase text-[9px] tracking-wider block">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 text-zinc-400" size={14} />
                  <input
                    id="crm-edit-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50/20"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-400 uppercase text-[9px] tracking-wider block">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 text-zinc-400" size={14} />
                  <input
                    id="crm-edit-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50/20"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-400 uppercase text-[9px] tracking-wider block">Phone Contact</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 text-zinc-400" size={14} />
                  <input
                    id="crm-edit-phone"
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+234..."
                    className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50/20"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-400 uppercase text-[9px] tracking-wider block">Corporate Entity / Company</label>
                <div className="relative">
                  <Building className="absolute left-3 top-3 text-zinc-400" size={14} />
                  <input
                    id="crm-edit-company"
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Company standard Ltd"
                    className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50/20"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-gray-400 uppercase text-[9px] tracking-wider block">Billing Address</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 text-zinc-400" size={14} />
                <textarea
                  id="crm-edit-address"
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Address lines..."
                  className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50/20 resize-none"
                />
              </div>
            </div>

            <button
              id="crm-save-contact-btn"
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md cursor-pointer transition-colors"
            >
              Update Customer CRM Profile
            </button>
          </form>
        )}

        {/* PAST INVOICES */}
        {activeTab === "invoices" && (
          <div id="crm-invoices-pane" className="space-y-4">
            <h4 className="font-extrabold text-[#111] text-sm flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <ClipboardList size={16} className="text-blue-600" />
              <span>CLIENT PAST TRANSACTION HISTORY</span>
            </h4>

            {clientInvoices.length === 0 ? (
              <div className="text-center p-8 bg-slate-50 rounded-2xl border border-dashed text-gray-400 text-xs">
                <FileText className="mx-auto text-zinc-300 mb-2" size={24} />
                No invoices found for this user in current workspace ledgers.
              </div>
            ) : (
              <div className="space-y-2.5">
                {clientInvoices.map(inv => {
                  const sub = inv.items.reduce((s, it) => s + (it.quantity * it.price), 0);
                  const tax = inv.taxRate ? (sub * (inv.taxRate / 100)) : 0;
                  const invoiceTotal = sub + tax - inv.discount;

                  // Define status styling
                  let statusStyles = "";
                  switch(inv.status) {
                    case "paid":
                      statusStyles = "bg-emerald-50 text-emerald-700 border-emerald-100";
                      break;
                    case "pending":
                      statusStyles = "bg-indigo-50 text-indigo-700 border-indigo-100";
                      break;
                    case "overdue":
                      statusStyles = "bg-red-50 text-red-700 border-red-100";
                      break;
                    default:
                      statusStyles = "bg-gray-50 text-gray-600 border-gray-150";
                  }

                  return (
                    <div 
                      key={inv.id} 
                      className="p-4 bg-white border border-slate-150 hover:border-slate-300 rounded-2xl flex justify-between items-center text-xs shadow-xs hover:shadow-sm transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-gray-900">{inv.invoiceNumber}</span>
                          <span className={`text-[9px] uppercase font-bold border rounded px-1.5 py-0.2 ${statusStyles}`}>
                            {inv.status}
                          </span>
                        </div>
                        <div className="text-zinc-400 font-mono text-[10px] flex items-center gap-3">
                          <span>Issued: {inv.date}</span>
                          <span>Due: {inv.dueDate}</span>
                        </div>
                      </div>

                      <div className="text-right flex items-center gap-3">
                        <div>
                          <strong className="text-gray-900 block font-mono font-black text-sm">₦{invoiceTotal.toLocaleString()}</strong>
                          <span className="text-[10px] text-zinc-400 bg-slate-100 px-1.5 py-0.5 rounded font-mono">{inv.items.length} lines</span>
                        </div>
                        <button
                          id={`crm-view-ledger-${inv.id}`}
                          onClick={() => onViewInvoice(inv.id)}
                          title="Open in Ledger view"
                          className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 rounded-xl transition-all cursor-pointer"
                        >
                          <ArrowUpRight size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* NOTES & RECOLLECTIONS FEED */}
        {activeTab === "notes" && (
          <div id="crm-notes-pane" className="space-y-4">
            <h4 className="font-extrabold text-[#111] text-sm flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <MessageSquare size={16} className="text-blue-600" />
              <span>CLIENT MEMORANDA & RELATIONSHIP FEED</span>
            </h4>

            {/* Quick Presets Builder */}
            <div className="space-y-1.5">
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">💡 CRM Presets Shortcuts (Add immediately):</span>
              <div className="flex flex-wrap gap-1.5">
                {presets.map((preset, index) => (
                  <button
                    key={index}
                    id={`preset-btn-${index}`}
                    type="button"
                    onClick={() => handleAddNote(preset.text)}
                    className="text-[10px] bg-slate-150 hover:bg-slate-200 text-gray-700 font-semibold py-1 px-2.5 rounded-lg border border-slate-200 cursor-pointer transition-all active:scale-95"
                  >
                    + {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Manual Textbox entry */}
            <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-150">
              <textarea
                id="crm-manual-note-input"
                rows={3}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Log manual follow-ups, offline bank promises, custom terms conversations..."
                className="w-full border border-gray-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
              />
              <div className="flex justify-between items-center">
                <span className="text-[9px] text-zinc-400 flex items-center gap-1">
                  <Lightbulb size={11} className="text-blue-600" />
                  <span>SME CRM Assistant active</span>
                </span>
                <button
                  id="crm-add-manual-note-btn"
                  type="button"
                  onClick={() => handleAddNote()}
                  disabled={!noteText.trim()}
                  className="py-1.5 px-4 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 transition-all"
                >
                  <Plus size={12} />
                  <span>Add Log Entry</span>
                </button>
              </div>
            </div>

            {/* Lists notes */}
            <div className="space-y-3 pt-2">
              {!client.notes || client.notes.length === 0 ? (
                <div className="text-center p-8 text-zinc-400 text-xs bg-slate-50 rounded-2xl border border-dashed">
                  No previous touchpoints, contact logs, or follow-up notes on record. Click any shortcut above to post some entries.
                </div>
              ) : (
                client.notes.map(note => (
                  <div 
                    key={note.id} 
                    id={`note-card-${note.id}`}
                    className="p-4 bg-slate-50 text-xs rounded-2xl border border-slate-150 space-y-2 relative group hover:bg-slate-100/50 transition-colors"
                  >
                    <div className="flex justify-between items-center text-zinc-400 text-[10px]">
                      <span className="font-mono font-semibold">{note.createdAt}</span>
                      <button
                        id={`crm-del-note-${note.id}`}
                        onClick={() => handleDeleteNote(note.id)}
                        className="p-1 text-zinc-300 hover:text-red-500 rounded transition-colors cursor-pointer"
                        title="Delete note log entry"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <p className="text-gray-800 leading-relaxed font-sans">{note.text}</p>
                  </div>
                ))
              )}
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
