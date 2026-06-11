import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Menu,
  X,
  FileText,
  Users,
  Settings,
  Compass,
  CreditCard,
  CloudLightning,
  PlusCircle,
  Trash2,
  ExternalLink,
  Database,
  Layers,
  Banknote,
  UserCheck,
  User,
  Lock,
  RefreshCw,
  LogOut,
  Info,
  Download,
  Printer
} from "lucide-react";

import { Invoice, Client, BusinessProfile, LineItem, InvoiceStatus } from "./types";
import { defaultBusinessProfile, NIGERIAN_BANKS } from "./data";
import { getSupabase, isSupabaseConfigured } from "./lib/supabase";
import PaystackSimulator from "./components/PaystackSimulator";
import AICoachAndReminder from "./components/AICoachAndReminder";
import SubscriberTracker from "./components/SubscriberTracker";
import FrontendAuthFlow from "./components/FrontendAuthFlow";

export default function App() {
  // Local session authentication (synchronized to Supabase user session context)
  const [sessionUser, setSessionUser] = useState<{ name: string; email: string } | null>(null);

  // Navigation Tabs: dashboard, invoices, clients, profile, subscriber-metrics, ai-coach, supabase
  const [activeTab, setActiveTab] = useState<string>(() => {
    return localStorage.getItem("invoiceng_active_tab") || "dashboard";
  });
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  // Sync active Tab to localStorage
  useEffect(() => {
    localStorage.setItem("invoiceng_active_tab", activeTab);
  }, [activeTab]);

  // Domain States (cached in localStorage)
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [profile, setProfile] = useState<BusinessProfile>(defaultBusinessProfile);

  // User Profile state (decoupled per logged-in session user)
  const [userProfile, setUserProfile] = useState<{
    fullName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    bio: string;
    companyName: string;
    regNumber: string;
    industry: string;
    profilePic: string;
  }>({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    bio: "",
    companyName: "",
    regNumber: "",
    industry: "",
    profilePic: ""
  });

  // Sync user profile state dynamically when session user logs in
  useEffect(() => {
    if (sessionUser) {
      const saved = localStorage.getItem(`invoiceng_userprofile_${sessionUser.email}`);
      if (saved) {
        setUserProfile(JSON.parse(saved));
      } else {
        setUserProfile({
          fullName: sessionUser.name,
          email: sessionUser.email,
          phone: "+234 803 000 1111",
          address: "12 Ring Road",
          city: "Ibadan",
          state: "Oyo State",
          bio: "Finance Administrator",
          companyName: "Apex Digital Solutions Ltd",
          regNumber: "RC-38194",
          industry: "Technology & Professional Services",
          profilePic: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&q=80"
        });
      }
    }
  }, [sessionUser]);

  // Form states and selected items
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState<boolean>(false);
  const [showClientModal, setShowClientModal] = useState<boolean>(false);
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState<string>("");

  // Supabase Sync States
  const [supabaseUser, setSupabaseUser] = useState<any>(null);
  const [sbEmail, setSbEmail] = useState("");
  const [sbPassword, setSbPassword] = useState("");
  const [sbMessage, setSbMessage] = useState("");
  const [sbLoading, setSbLoading] = useState(false);

  // Editing structures
  const [newInvoice, setNewInvoice] = useState<Partial<Invoice>>({
    invoiceNumber: "",
    clientId: "",
    date: new Date().toISOString().split("T")[0],
    dueDate: new Date(Date.now() + 14 * 24 * 3605 * 1000).toISOString().split("T")[0],
    items: [{ id: "item_init", description: "", quantity: 1, price: 0 }],
    status: "draft",
    taxRate: 7.5,
    discount: 0,
    isRecurring: false,
    frequency: "monthly",
    notes: ""
  });

  const [newClient, setNewClient] = useState<Partial<Client>>({
    name: "",
    email: "",
    phone: "",
    address: "",
    company: "",
    notes: []
  });

  // Sound chime indicator
  const playNotificationChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } catch (e) {
      console.warn("Chime playback not supported on browser environment yet.");
    }
  };

  // Load active Supabase sessions and handle subscription bindings on mount
  useEffect(() => {
    const sb = getSupabase();
    if (sb) {
      sb.auth.getSession().then(({ data: { session } }: any) => {
        setSupabaseUser(session?.user ?? null);
      });
      const { data: { subscription } } = sb.auth.onAuthStateChange((_event: any, session: any) => {
        setSupabaseUser(session?.user ?? null);
      });
      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  // Sync sessionUser state to the verified Supabase identity reactively
  useEffect(() => {
    if (supabaseUser) {
      const name = supabaseUser.user_metadata?.full_name || supabaseUser.email?.split("@")[0] || "Operator";
      setSessionUser({ name, email: supabaseUser.email || "" });
    } else {
      setSessionUser(null);
    }
  }, [supabaseUser]);

  // Automatically retrieve cloud database data when Supabase session becomes active
  useEffect(() => {
    if (!supabaseUser) {
      setInvoices([]);
      setClients([]);
      setProfile(defaultBusinessProfile);
      return;
    }
    
    const pullCloudBackup = async () => {
      const sb = getSupabase();
      if (!sb) return;
      
      setSbLoading(true);
      try {
        const { data: pullData, error: pullError } = await sb
          .from("invoices_ng")
          .select("data")
          .eq("id", `inv_state_${supabaseUser.id}`)
          .maybeSingle();

        if (!pullError && pullData && pullData.data) {
          const payload = pullData.data;
          if (payload.invoices) {
            setInvoices(payload.invoices);
            localStorage.setItem("invoices_ng_list", JSON.stringify(payload.invoices));
          } else {
            setInvoices([]);
            localStorage.setItem("invoices_ng_list", "[]");
          }
          if (payload.clients) {
            setClients(payload.clients);
            localStorage.setItem("invoices_ng_clients", JSON.stringify(payload.clients));
          } else {
            setClients([]);
            localStorage.setItem("invoices_ng_clients", "[]");
          }
          if (payload.profile) {
            setProfile(payload.profile);
            localStorage.setItem("invoices_ng_profile", JSON.stringify(payload.profile));
          } else {
            setProfile(defaultBusinessProfile);
            localStorage.setItem("invoices_ng_profile", JSON.stringify(defaultBusinessProfile));
          }
          setSbMessage(`Successfully synchronized with Supabase! Cloud backup restored: ${payload.invoices?.length || 0} invoices, ${payload.clients?.length || 0} clients.`);
        } else {
          // Fresh user account on this database. Clear previous local visitor's data to avoid leaking local configs.
          setInvoices([]);
          localStorage.setItem("invoices_ng_list", "[]");
          setClients([]);
          localStorage.setItem("invoices_ng_clients", "[]");
          
          const freshProfile = {
            name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split("@")[0].toUpperCase() || "NEW BUSINESS",
            email: supabaseUser.email || "",
            phone: "+234 803 000 1111",
            address: "Nigeria",
            bankDetails: {
              bankName: "",
              accountNumber: "",
              accountName: ""
            },
            plan: "Pro Growth",
            logoSeed: "APEX"
          };
          setProfile(freshProfile);
          localStorage.setItem("invoices_ng_profile", JSON.stringify(freshProfile));
          setSbMessage("Welcome! A pristine empty workspace has been synchronized and initialized for your Supabase identity.");
        }
      } catch (err: any) {
        console.warn("Auto-sync cloud check failed, continuing with local cache:", err);
      } finally {
        setSbLoading(false);
      }
    };
    
    pullCloudBackup();
  }, [supabaseUser]);

  // Save changes locally and sync automatically if connected to Supabase
  const triggerAutoPush = async (invs: Invoice[], cls: Client[], prof: BusinessProfile) => {
    const sb = getSupabase();
    if (!sb || !supabaseUser) return;
    try {
      const invoicePayload = {
        id: `inv_state_${supabaseUser.id}`,
        data: { invoices: invs, clients: cls, profile: prof },
        user_id: supabaseUser.id
      };
      await sb
        .from("invoices_ng")
        .upsert(invoicePayload, { onConflict: "id" });
      console.log("Real-time cloud database backup updated.");
    } catch (err) {
      console.warn("Real-time cloud backup failed, continuing using local storage", err);
    }
  };

  const saveInvoices = (updated: Invoice[]) => {
    setInvoices(updated);
    localStorage.setItem("invoices_ng_list", JSON.stringify(updated));
    triggerAutoPush(updated, clients, profile);
  };

  const saveClients = (updated: Client[]) => {
    setClients(updated);
    localStorage.setItem("invoices_ng_clients", JSON.stringify(updated));
    triggerAutoPush(invoices, updated, profile);
  };

  const saveProfile = (updated: BusinessProfile) => {
    setProfile(updated);
    localStorage.setItem("invoices_ng_profile", JSON.stringify(updated));
    triggerAutoPush(invoices, clients, updated);
  };

  // Compute stats
  const getSubtotal = (invoice: Invoice) => {
    return invoice.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  };

  const getTax = (invoice: Invoice) => {
    return getSubtotal(invoice) * (invoice.taxRate / 100);
  };

  const getTotal = (invoice: Invoice) => {
    return Math.max(0, getSubtotal(invoice) + getTax(invoice) - invoice.discount);
  };

  // Aggregated dashboards statistics
  const totalInvoicedSum = invoices.reduce((sum, i) => sum + getTotal(i), 0);
  const paidInvoicesSum = invoices.filter(i => i.status === "paid").reduce((sum, i) => sum + getTotal(i), 0);
  const pendingInvoicesSum = invoices.filter(i => i.status === "pending").reduce((sum, i) => sum + getTotal(i), 0);
  const overdueInvoicesSum = invoices.filter(i => i.status === "overdue").reduce((sum, i) => sum + getTotal(i), 0);

  // Invoices actions
  const handleAddNewInvoiceItem = () => {
    const defaultItem: LineItem = {
      id: `item_${Math.random().toString(36).substring(2, 9)}`,
      description: "",
      quantity: 1,
      price: 0
    };
    setNewInvoice(prev => ({
      ...prev,
      items: [...(prev.items || []), defaultItem]
    }));
  };

  const handleRemoveInvoiceItem = (index: number) => {
    const currentItems = [...(newInvoice.items || [])];
    if (currentItems.length <= 1) return;
    currentItems.splice(index, 1);
    setNewInvoice(prev => ({ ...prev, items: currentItems }));
  };

  const handleUpdateInvoiceItem = (index: number, key: keyof LineItem, val: any) => {
    const currentItems = [...(newInvoice.items || [])];
    const item = { ...currentItems[index] };
    if (key === "quantity") {
      item.quantity = Math.max(1, parseInt(val) || 1);
    } else if (key === "price") {
      item.price = Math.max(0, parseFloat(val) || 0);
    } else {
      (item as any)[key] = val;
    }
    currentItems[index] = item;
    setNewInvoice(prev => ({ ...prev, items: currentItems }));
  };

  const handleSaveInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvoice.clientId || !newInvoice.invoiceNumber) {
      alert("Please choose a client and fill in the invoice identification number.");
      return;
    }

    const matchedClient = clients.find(c => c.id === newInvoice.clientId);
    if (!matchedClient) return;

    const validatedItems = (newInvoice.items || []).map(item => ({
      id: item.id || `item_${Math.random().toString(36).substring(2, 9)}`,
      description: item.description || "Invoiced Consultant Service",
      quantity: item.quantity || 1,
      price: item.price || 0
    }));

    const originalInvoice = invoices.find(inv => inv.id === newInvoice.id);
    const becamePaid = (newInvoice.status === "paid") && (!originalInvoice || originalInvoice.status !== "paid");
    let initialHistory = originalInvoice?.history || [];
    let reference = newInvoice.paymentReference;

    if (becamePaid) {
      reference = reference || `MANUAL-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      initialHistory = [
        ...initialHistory,
        {
          timestamp: new Date().toISOString(),
          reference,
          status: "paid" as InvoiceStatus,
          notes: "Manually marked as paid during edit/creation"
        }
      ];
    }

    const finalInvoice: Invoice = {
      id: newInvoice.id || `inv_${Math.random().toString(36).substring(2, 9)}`,
      invoiceNumber: newInvoice.invoiceNumber,
      clientId: newInvoice.clientId,
      clientDetails: {
        name: matchedClient.name,
        email: matchedClient.email,
        phone: matchedClient.phone,
        address: matchedClient.address,
        company: matchedClient.company
      },
      issuerDetails: {
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        address: profile.address
      },
      date: newInvoice.date || new Date().toISOString().split("T")[0],
      dueDate: newInvoice.dueDate || new Date().toISOString().split("T")[0],
      items: validatedItems,
      status: (newInvoice.status as InvoiceStatus) || "draft",
      taxRate: newInvoice.taxRate || 7.5,
      discount: newInvoice.discount || 0,
      notes: newInvoice.notes || "",
      isRecurring: newInvoice.isRecurring || false,
      frequency: newInvoice.frequency || "monthly",
      paymentReference: reference,
      history: initialHistory
    };

    let updatedInvoicesList = [...invoices];
    if (newInvoice.id) {
      updatedInvoicesList = updatedInvoicesList.map(inv => inv.id === newInvoice.id ? finalInvoice : inv);
    } else {
      updatedInvoicesList.unshift(finalInvoice);
    }

    saveInvoices(updatedInvoicesList);
    setShowInvoiceModal(false);
    setSelectedInvoice(finalInvoice);
    playNotificationChime();
  };

  const handleDeleteInvoice = (id: string) => {
    if (confirm("Are you sure you want to delete this invoice permanently?")) {
      const filtered = invoices.filter(i => i.id !== id);
      saveInvoices(filtered);
      if (selectedInvoice?.id === id) {
        setSelectedInvoice(null);
      }
    }
  };

  const handleEditInvoiceTrigger = (inv: Invoice) => {
    setNewInvoice({ ...inv });
    setShowInvoiceModal(true);
  };

  const handleExportCSV = () => {
    if (invoices.length === 0) {
      alert("No invoices available to export.");
      return;
    }
    
    // Define headers
    const headers = [
      "Invoice Number",
      "Client Name",
      "Client Email",
      "Client Company",
      "Issue Date",
      "Due Date",
      "Subtotal (NGN)",
      "VAT Amount (NGN)",
      "Discount (NGN)",
      "Total (NGN)",
      "Status",
      "Payment Reference",
      "Is Recurring"
    ];

    // Helper to escape double quotes and wrap in quotes if needed
    const escapeCSV = (val: string) => {
      const formatted = (val || "").replace(/"/g, '""');
      return `"${formatted}"`;
    };

    // Build data rows
    const rows = invoices.map(inv => {
      const subtotal = getSubtotal(inv);
      const tax = getTax(inv);
      const total = getTotal(inv);
      return [
        escapeCSV(inv.invoiceNumber),
        escapeCSV(inv.clientDetails?.name),
        escapeCSV(inv.clientDetails?.email),
        escapeCSV(inv.clientDetails?.company || "N/A"),
        escapeCSV(inv.date),
        escapeCSV(inv.dueDate),
        subtotal,
        tax,
        inv.discount,
        total,
        escapeCSV(inv.status),
        escapeCSV(inv.paymentReference || "N/A"),
        inv.isRecurring ? "Yes" : "No"
      ];
    });

    // Combine headers and rows
    const csvContent = [
      headers.join(","),
      ...rows.map(e => e.join(","))
    ].join("\n");

    // Trigger download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `InvoiceNG_Export_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.name || !newClient.email) {
      alert("Please provide the Client's Name and valid Email address.");
      return;
    }

    const finalClient: Client = {
      id: newClient.id || `cli_${Math.random().toString(36).substring(2, 9)}`,
      name: newClient.name,
      email: newClient.email,
      phone: newClient.phone || "",
      address: newClient.address || "",
      company: newClient.company || "",
      notes: newClient.notes || []
    };

    let updatedClients = [...clients];
    if (newClient.id) {
      updatedClients = updatedClients.map(c => c.id === newClient.id ? finalClient : c);
    } else {
      updatedClients.unshift(finalClient);
    }

    saveClients(updatedClients);
    setShowClientModal(false);
    setNewClient({ name: "", email: "", phone: "", address: "", company: "", notes: [] });
    playNotificationChime();
  };

  const handleDeleteClient = (id: string) => {
    if (confirm("Are you sure you want to delete this client? Related records will remain intact.")) {
      const filtered = clients.filter(c => c.id !== id);
      saveClients(filtered);
    }
  };

  const handleEditClientTrigger = (c: Client) => {
    setNewClient({ ...c });
    setShowClientModal(true);
  };

  // Payment triggers with Paystack gateway popup Simulator
  const handleTriggerPaystack = (inv: Invoice) => {
    setPayingInvoice(inv);
  };

  const handlePaystackSuccess = (reference: string) => {
    if (!payingInvoice) return;
    const timestamp = new Date().toISOString();
    const newHistoryItem = {
      timestamp,
      reference,
      status: "paid" as InvoiceStatus,
      notes: "Cleared via simulated Paystack Gateway sandbox"
    };

    const updated = invoices.map(inv => {
      if (inv.id === payingInvoice.id) {
        const history = [...(inv.history || []), newHistoryItem];
        return {
          ...inv,
          status: "paid" as InvoiceStatus,
          paymentReference: reference,
          history
        };
      }
      return inv;
    });
    saveInvoices(updated);
    if (selectedInvoice?.id === payingInvoice.id) {
      setSelectedInvoice({
        ...selectedInvoice,
        status: "paid" as InvoiceStatus,
        paymentReference: reference,
        history: [...(selectedInvoice.history || []), newHistoryItem]
      });
    }
    setPayingInvoice(null);
    playNotificationChime();
  };

  // Supabase integrations
  const handleSupabaseSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const sb = getSupabase();
    if (!sb) return;

    setSbLoading(true);
    setSbMessage("");
    try {
      const { data: _data, error } = await sb.auth.signUp({
        email: sbEmail,
        password: sbPassword
      });
      if (error) throw error;
      setSbMessage("Sign up successful! Please check your email for confirmation, or try logging in.");
    } catch (e: any) {
      setSbMessage(`Sign up failed: ${e.message}`);
    } finally {
      setSbLoading(false);
    }
  };

  const handleSupabaseLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const sb = getSupabase();
    if (!sb) return;

    setSbLoading(true);
    setSbMessage("");
    try {
      const { data, error } = await sb.auth.signInWithPassword({
        email: sbEmail,
        password: sbPassword
      });
      if (error) throw error;
      setSupabaseUser(data.user);
      
      // Auto pull backup
      try {
        const { data: pullData, error: pullError } = await sb
          .from("invoices_ng")
          .select("data")
          .eq("id", `inv_state_${data.user.id}`)
          .single();

        if (!pullError && pullData && pullData.data) {
          const payload = pullData.data;
          if (payload.invoices) {
            setInvoices(payload.invoices);
            localStorage.setItem("invoices_ng_list", JSON.stringify(payload.invoices));
          }
          if (payload.clients) {
            setClients(payload.clients);
            localStorage.setItem("invoices_ng_clients", JSON.stringify(payload.clients));
          }
          if (payload.profile) {
            setProfile(payload.profile);
            localStorage.setItem("invoices_ng_profile", JSON.stringify(payload.profile));
          }
          setSbMessage(`Successfully authenticated as ${data.user.email}! Cloud system backup restored & synced: ${payload.invoices?.length || 0} invoices and ${payload.clients?.length || 0} clients loaded automatically.`);
        } else {
          setSbMessage(`Logged in successfully as ${data.user.email}! No previous cloud backup was found. Your local data is now set to auto-sync to the cloud on any change.`);
        }
      } catch (pullErr: any) {
        setSbMessage(`Logged in successfully as ${data.user.email}! (Soft pull check completed)`);
      }
      playNotificationChime();
    } catch (e: any) {
      setSbMessage(`Login error: ${e.message}`);
    } finally {
      setSbLoading(false);
    }
  };

  const handleSupabaseLogout = async () => {
    const sb = getSupabase();
    if (!sb) return;
    try {
      await sb.auth.signOut();
      setSupabaseUser(null);
      setSbMessage("User signed out.");
    } catch (e: any) {
      console.error(e);
    }
  };

  // Reset all local cache and dummy data to start completely fresh (Clean Slate)
  const handleWipeAllLocalData = async () => {
    const confirmWipe = window.confirm(
      "Are you absolutely sure you want to completely clear and DELETE all client accounts, invoices, and ledger records to start fresh? This will wipe your browser's local cache and any synchronized cloud database backup immediately."
    );
    if (!confirmWipe) return;

    // Reset components state variables
    setInvoices([]);
    localStorage.setItem("invoices_ng_list", JSON.stringify([]));

    setClients([]);
    localStorage.setItem("invoices_ng_clients", JSON.stringify([]));

    const freshProfile = {
      name: "",
      email: "",
      phone: "",
      address: "",
      bankDetails: {
        bankName: "",
        accountNumber: "",
        accountName: ""
      },
      plan: "Pro Growth",
      logoSeed: "APEX"
    };
    setProfile(freshProfile);
    localStorage.setItem("invoices_ng_profile", JSON.stringify(freshProfile));

    // Also clear session profile settings stored for the active session user
    if (sessionUser) {
      localStorage.removeItem(`invoiceng_userprofile_${sessionUser.email}`);
    }

    // If Supabase is connected, propagate this clean slate operation to the cloud backup
    const sb = getSupabase();
    if (sb && supabaseUser) {
      try {
        const invoicePayload = {
          id: `inv_state_${supabaseUser.id}`,
          data: { invoices: [], clients: [], profile: freshProfile },
          user_id: supabaseUser.id
        };
        const { error } = await sb
          .from("invoices_ng")
          .upsert(invoicePayload, { onConflict: "id" });
        if (error) throw error;
        setSbMessage("🧹 Success! All local data was wiped, and your connected Supabase database backup was cleared and synchronized to a completely empty clean slate!");
      } catch (err: any) {
        console.warn("Could not sync wipe to Supabase cloud:", err);
        setSbMessage(`Local data was wiped, but cloud sync wipe failed: ${err.message}`);
      }
    } else {
      setSbMessage("🧹 Success! All local data, client catalogs, and custom templates have been deleted. You are starting on a completely clean, pristine slate ready for Supabase sync!");
    }

    playNotificationChime();
    alert("All app data has been wiped successfully! The dashboard and cloud sync are now empty.");
  };

  // Push user state (Invoices, Clients, Profile) to Supabase Cloud Storage
  const handlePushToSupabase = async () => {
    const sb = getSupabase();
    if (!sb || !supabaseUser) {
      alert("Please log in using your credentials first.");
      return;
    }

    setSbLoading(true);
    setSbMessage("");
    try {
      // Push invoices
      const invoicePayload = {
        id: `inv_state_${supabaseUser.id}`,
        data: { invoices, clients, profile },
        user_id: supabaseUser.id
      };

      const { error } = await sb
        .from("invoices_ng")
        .upsert(invoicePayload, { onConflict: "id" });

      if (error) throw error;

      setSbMessage("All local files, clients, and business profile synced to Cloud database SUCCESSFULLY! ⚡");
      playNotificationChime();
    } catch (e: any) {
      setSbMessage(`Push failed: ${e.message}. Suggestion: Verify if the 'invoices_ng' table has been created with proper schemas inside your Supabase SQL editor.`);
    } finally {
      setSbLoading(false);
    }
  };

  // Pull records from Supabase Cloud Storage
  const handlePullFromSupabase = async () => {
    const sb = getSupabase();
    if (!sb || !supabaseUser) {
      alert("Please sign in first.");
      return;
    }

    setSbLoading(true);
    setSbMessage("");
    try {
      const { data, error } = await sb
        .from("invoices_ng")
        .select("data")
        .eq("id", `inv_state_${supabaseUser.id}`)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          throw new Error("No existing cloud backup synchronized yet for this user account. Push some files first.");
        }
        throw error;
      }

      if (data && data.data) {
        const payload = data.data;
        if (payload.invoices) saveInvoices(payload.invoices);
        if (payload.clients) saveClients(payload.clients);
        if (payload.profile) saveProfile(payload.profile);

        setSbMessage("Cloud database database backup downloaded successfully! Locally cached files updated.");
        playNotificationChime();
      }
    } catch (e: any) {
      setSbMessage(`Pull failed: ${e.message}`);
    } finally {
      setSbLoading(false);
    }
  };

  if (!sessionUser) {
    return (
      <FrontendAuthFlow 
        onLoginSuccess={(name, email) => {
          setSessionUser({ name, email });
          localStorage.setItem("invoiceng_session_user", JSON.stringify({ name, email }));
          playNotificationChime();
        }}
      />
    );
  }

  return (
    <div id="invoice-app-hub" className="min-h-screen bg-slate-50 flex antialiased">
      {/* Mobile Sidebar Overlay Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 z-30 md:hidden backdrop-blur-xs transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar navigation container */}
      <aside 
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-100 flex flex-col border-r border-slate-800 transition-transform duration-300 ease-in-out md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-2xl flex items-center justify-center text-white font-mono font-black text-xl shadow-md cursor-pointer">
              ₦
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
                <span>InvoiceNG</span>
                <span className="text-[9px] bg-slate-800 border border-slate-705 text-emerald-400 font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider font-mono">Retainers</span>
              </h1>
              <p className="text-[10px] text-slate-450 mt-0.5 font-medium truncate max-w-[130px]">{profile.name}</p>
            </div>
          </div>

          {/* Close menu button on mobile */}
          <button 
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Tab Selection Navigation list */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {[
            { id: "dashboard", label: "Dashboard", icon: <Layers size={14} /> },
            { id: "invoices", label: "Invoices", icon: <FileText size={14} /> },
            { id: "clients", label: "Clients", icon: <Users size={14} /> },
            { id: "user-profile", label: "User Profile", icon: <User size={14} /> },
            { id: "profile", label: "Business Profile", icon: <Settings size={14} /> },
            { id: "subscriber-metrics", label: "Retainer MRR", icon: <RefreshCw size={14} /> },
            { id: "ai-coach", label: "Strategy Advisor", icon: <Compass size={14} /> },
            { id: "supabase", label: "Supabase Cloud", icon: <Database size={14} /> }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { 
                  setActiveTab(tab.id); 
                  setSelectedInvoice(null);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black tracking-wide transition-all text-left cursor-pointer ${
                  isActive 
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-950/25" 
                    : "text-slate-400 hover:text-white hover:bg-slate-800/40"
                }`}
              >
                <span className={`${isActive ? "text-white" : "text-slate-400"}`}>
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Status Footer Card */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/30">
          <div className="p-3.5 bg-slate-800/40 rounded-2xl space-y-2.5 border border-slate-850/60 text-left">
            <div className="flex items-center gap-2.5">
              <img 
                src={userProfile.profilePic || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&q=80"}
                alt={sessionUser?.name}
                className="w-8 h-8 rounded-full object-cover border border-slate-700 hover:border-emerald-500 transition-all shrink-0 bg-slate-800"
                referrerPolicy="no-referrer"
              />
              <div className="min-w-0 flex-1">
                <strong className="text-[10px] text-white font-black uppercase tracking-wider truncate block" title={sessionUser?.name}>
                  {sessionUser?.name}
                </strong>
                <p className="text-[9px] text-slate-400 font-bold truncate leading-none mt-0.5">
                  {sessionUser?.email}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex flex-col gap-1.5">
              <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-widest">
                {supabaseUser ? "☁️ Backup Sync Active" : "💾 Local Cache Active"}
              </span>
              <button 
                onClick={handleSupabaseLogout}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-[10px] font-black text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/10 rounded-xl cursor-pointer transition-all"
              >
                <LogOut size={11} />
                <span>Sign Out Session</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Right Column Layout Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 md:pl-64">
        {/* Mobile Header Top Bar */}
        <header className="md:hidden flex items-center justify-between bg-white border-b border-slate-200 px-5 py-3.5 sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors cursor-pointer border border-slate-200/60"
            >
              <Menu size={16} />
            </button>
            
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-mono font-black text-sm shadow-xs">
                ₦
              </div>
              <strong className="text-sm font-black text-slate-950 tracking-tight">InvoiceNG</strong>
            </div>
          </div>

          <span className="text-[9px] bg-slate-100 border border-slate-200/65 text-slate-505 font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono">
            {profile.name ? profile.name.split(" ")[0] : "Ibadan"}
          </span>
        </header>

        {/* Main Workspace Layout */}
        <main className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
        
        {/* Dynamic Warning for missing Supabase config */}
        {!isSupabaseConfigured && activeTab === "supabase" && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3 text-amber-800">
            <Info size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <strong className="text-xs font-black uppercase tracking-wider block">Supabase Connection Keys Missing</strong>
              <p className="text-xs mt-1 leading-relaxed text-amber-700">
                You have not defined the required credentials (<span className="font-mono bg-amber-100 px-1 py-0.2 rounded font-bold">VITE_SUPABASE_URL</span> and <span className="font-mono bg-amber-100 px-1 py-0.2 rounded font-bold">VITE_SUPABASE_ANON_KEY</span>) in the environment settings yet. 
                App data will persist correctly on your browser localStorage. To enable continuous live server sync, configure secrets in AI Studio settings panel.
              </p>
            </div>
          </div>
        )}

        {/* Dashboard Content */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            {/* Quick stats widgets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { title: "Total Issued Value", val: totalInvoicedSum, desc: "Sum of all active ledger logs", color: "text-slate-800 bg-white border border-slate-200" },
                { title: "Cleared (PAID)", val: paidInvoicesSum, desc: "Settled payments cleared", color: "text-emerald-800 bg-emerald-50/60 border border-emerald-100" },
                { title: "Pending Balance", val: pendingInvoicesSum, desc: "Awaiting term dates", color: "text-indigo-800 bg-indigo-50/60 border border-indigo-100" },
                { title: "Overdue (Debt)", val: overdueInvoicesSum, desc: "Elapsed past term dates", color: "text-rose-805 bg-rose-50/60 border border-rose-100" }
              ].map((stat, i) => (
                <div key={i} className={`p-5 rounded-3xl shadow-xs transition-transform hover:-translate-y-0.5 min-w-0 ${stat.color}`}>
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block truncate" title={stat.title}>{stat.title}</span>
                  <div className="mt-2.5">
                    <strong className="text-lg sm:text-xl lg:text-[21px] xl:text-2xl font-black font-mono break-all leading-tight block" title={`₦ ${stat.val.toLocaleString()}`}>
                      ₦ {stat.val.toLocaleString()}
                    </strong>
                    <p className="text-[10px] opacity-75 mt-0.5 font-medium truncate" title={stat.desc}>{stat.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick summary grid layout split */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Recent Invoices Column */}
              <div className="lg:col-span-8 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">Invoicing Ledger</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Quickly drill down or create invoice transactions.</p>
                  </div>
                  <button
                    onClick={() => {
                      setNewInvoice({
                        invoiceNumber: `INV-2026-0${invoices.length + 1}`,
                        clientId: "",
                        date: new Date().toISOString().split("T")[0],
                        dueDate: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().split("T")[0],
                        items: [{ id: `item_${Math.random().toString(36).substring(2, 9)}`, description: "", quantity: 1, price: 0 }],
                        status: "draft",
                        taxRate: 7.5,
                        discount: 0,
                        isRecurring: false,
                        notes: ""
                      });
                      setShowInvoiceModal(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black cursor-pointer transition-colors"
                  >
                    <PlusCircle size={13} />
                    <span>Create Invoice</span>
                  </button>
                </div>

                {invoices.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <FileText size={40} className="mx-auto text-slate-350 opacity-60 mb-2" />
                    <p className="font-bold text-xs uppercase tracking-wider">No Invoices Issued Yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-extrabold uppercase text-[9px] tracking-wider">
                          <th className="pb-3 pl-2">Invoice Code</th>
                          <th className="pb-3">Client details</th>
                          <th className="pb-3">Terms date</th>
                          <th className="pb-3 text-right">Total sum</th>
                          <th className="pb-3 text-center">Status</th>
                          <th className="pb-3 pr-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 font-medium">
                        {invoices.slice(0, 6).map(inv => {
                          const total = getTotal(inv);
                          return (
                            <tr key={inv.id} className="hover:bg-slate-50/50 group transition-colors">
                              <td className="py-3 pl-2 font-mono font-bold text-slate-700">{inv.invoiceNumber}</td>
                              <td className="py-3">
                                <span className="text-slate-800 font-bold block">{inv.clientDetails.name}</span>
                                <span className="text-[10px] text-slate-400">{inv.clientDetails.company || "Independent Freelance"}</span>
                              </td>
                              <td className="py-3">
                                <span className="text-slate-600 font-mono block">{inv.date}</span>
                                <span className="text-[9px] text-slate-400 font-mono block uppercase">Due {inv.dueDate}</span>
                              </td>
                              <td className="py-3 text-right font-mono font-bold text-slate-800">
                                ₦ {total.toLocaleString()}
                              </td>
                              <td className="py-3 text-center">
                                <span className={`px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-widest ${
                                  inv.status === "paid" ? "bg-emerald-50 text-emerald-700" :
                                  inv.status === "pending" ? "bg-indigo-50 text-indigo-700" :
                                  inv.status === "overdue" ? "bg-red-50 text-red-700" :
                                  "bg-slate-100 text-slate-600"
                                }`}>
                                  {inv.status}
                                </span>
                              </td>
                              <td className="py-3 pr-2 text-right">
                                <div className="flex justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => setSelectedInvoice(inv)}
                                    className="p-1 border border-slate-200 text-slate-500 hover:border-emerald-600 hover:text-emerald-600 rounded-lg cursor-pointer transition-colors"
                                    title="View / Issue Paystack payment"
                                  >
                                    <ExternalLink size={12} />
                                  </button>
                                  <button
                                    onClick={() => handleEditInvoiceTrigger(inv)}
                                    className="p-1 border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-lg cursor-pointer"
                                    title="Edit fields"
                                  >
                                    <Settings size={12} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteInvoice(inv.id)}
                                    className="p-1 border border-slate-200 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                                    title="Delete permanently"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Partner Advisory brief */}
              <div className="lg:col-span-4 bg-slate-900 text-slate-200 border border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] bg-emerald-500/10 px-2.5 py-0.5 rounded text-emerald-400 font-black tracking-widest uppercase">
                      Advisor Strategic Brief
                    </span>
                    <Compass className="text-emerald-500 animate-pulse" size={14} />
                  </div>
                  <h3 className="text-sm font-black uppercase text-white tracking-wider">Apex Liquidity Check</h3>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    You have <strong>₦ {pendingInvoicesSum.toLocaleString()}</strong> pending collections.
                    Use our interactive Strategy Advisor module to trigger firmer collections notifications or obtain Nigerian tax (WHT/VAT) strategies instantly via Gemini.
                  </p>
                </div>

                <div className="border-t border-slate-800 pt-4">
                  <button
                    onClick={() => setActiveTab("ai-coach")}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black tracking-wider uppercase flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Compass size={13} />
                    <span>Open Strategy Advisor</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Invoices tab details & preview flow */}
        {activeTab === "invoices" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Ledger Column */}
            <div className="lg:col-span-12 xl:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3 gap-2 flex-wrap">
                <div className="flex flex-col">
                  <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">All Issued Bills</h3>
                  <span className="text-[10px] font-mono text-slate-400">{invoices.length} Files Total</span>
                </div>
                <button
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 border border-emerald-200/50 cursor-pointer"
                  title="Export offline accounting ledger to CSV format"
                >
                  <Download size={11} className="text-emerald-600" />
                  <span>Export CSV</span>
                </button>
              </div>

              {/* Real-time search query input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Filter by invoice ID or client name..."
                  value={invoiceSearchQuery}
                  onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                  className="w-full text-xs font-medium px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-hidden focus:border-emerald-500 focus:bg-white transition-all text-slate-700 placeholder-slate-400"
                />
                {invoiceSearchQuery && (
                  <button
                    onClick={() => setInvoiceSearchQuery("")}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-[10px] font-bold"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
                {(() => {
                  const filtered = invoices.filter(inv => {
                    if (!invoiceSearchQuery) return true;
                    const query = invoiceSearchQuery.toLowerCase();
                    const invNo = (inv.invoiceNumber || "").toLowerCase();
                    const clientName = (inv.clientDetails?.name || "").toLowerCase();
                    return invNo.includes(query) || clientName.includes(query);
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="py-8 text-center text-slate-400 text-xs font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        No invoices match "{invoiceSearchQuery}"
                      </div>
                    );
                  }

                  return filtered.map(inv => {
                    const total = getTotal(inv);
                    const isSel = selectedInvoice?.id === inv.id;
                    return (
                      <div
                        key={inv.id}
                        onClick={() => setSelectedInvoice(inv)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer text-left ${isSel ? "border-emerald-500 bg-emerald-50/10" : "border-slate-150 bg-white hover:bg-slate-50/50"}`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-tight">{inv.invoiceNumber}</span>
                            <strong className="text-xs text-slate-800 font-extrabold block mt-0.5">{inv.clientDetails.name}</strong>
                            <span className="text-[10px] text-slate-400 block mt-0.5">{inv.date} • Due {inv.dueDate}</span>
                          </div>
                          <div className="text-right">
                            <strong className="text-xs text-slate-800 font-black font-mono block">₦ {total.toLocaleString()}</strong>
                            <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider mt-1.5 inline-block ${
                              inv.status === "paid" ? "bg-emerald-50 text-emerald-700" :
                              inv.status === "pending" ? "bg-indigo-50 text-indigo-700" :
                              inv.status === "overdue" ? "bg-red-50 text-red-700" :
                              "bg-slate-100 text-slate-600"
                            }`}>
                              {inv.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Right Branding Preview Section */}
            <div className="lg:col-span-7 space-y-6">
              {selectedInvoice ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
                  {/* Ledger Actions top */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Document Controls:</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-widest ${
                        selectedInvoice.status === "paid" ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-700"
                      }`}>
                        {selectedInvoice.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 font-sans font-bold text-xs">
                      {selectedInvoice.status !== "paid" && (
                        <button
                          onClick={() => handleTriggerPaystack(selectedInvoice)}
                          className="px-4 py-2 bg-[#09c2cf] hover:bg-[#07aab6] text-white rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <CreditCard size={13} />
                          <span>Simulate Sandbox Payment</span>
                        </button>
                      )}
                      
                      <button
                        onClick={() => window.print()}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
                        title="Print this invoice beautifully"
                      >
                        <Printer size={13} />
                        <span>Print Invoice</span>
                      </button>

                      <button
                        onClick={() => handleEditInvoiceTrigger(selectedInvoice)}
                        className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl cursor-pointer"
                        title="Edit Invoice Fields"
                      >
                        <Settings size={13} />
                      </button>

                      <button
                        onClick={() => handleDeleteInvoice(selectedInvoice.id)}
                        className="p-2 border border-slate-200 text-rose-600 hover:bg-rose-50 rounded-xl cursor-pointer"
                        title="Delete Invoice permanently"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Printable Invoice paper segment */}
                  <div id="printable-invoice-paper" className="p-8 bg-slate-50/50 border border-slate-200 rounded-2xl space-y-8 text-left select-all">
                    
                    {/* Header */}
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1">
                        <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-mono text-xl font-extrabold shadow-sm">
                          {profile.logoSeed ? profile.logoSeed.substring(0, 2).toUpperCase() : "AP"}
                        </div>
                        <h4 className="text-sm font-black text-slate-800">{profile.name}</h4>
                        <span className="text-[10px] text-slate-400 block">{profile.email} • {profile.phone}</span>
                        <span className="text-[10px] text-slate-400 block w-64 leading-tight">{profile.address}</span>
                      </div>
                      
                      <div className="text-right space-y-1">
                        <span className="text-xs text-slate-400 uppercase font-black tracking-widest block">Original Invoice</span>
                        <strong className="text-lg font-black text-slate-800 block font-mono">{selectedInvoice.invoiceNumber}</strong>
                        <span className="text-[10px] text-slate-500 block">Issued: {selectedInvoice.date}</span>
                        <span className="text-[10px] text-rose-500 font-bold block bg-rose-50 px-2 py-0.5 rounded-md inline-block">Term date: {selectedInvoice.dueDate}</span>
                      </div>
                    </div>

                    {/* Bill to */}
                    <div className="border-t border-slate-200/60 pt-4 grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] uppercase text-zinc-400 font-bold tracking-widest">Bill Recipient:</span>
                        <h5 className="text-xs font-black text-slate-800 mt-1">{selectedInvoice.clientDetails.name}</h5>
                        <p className="text-[10px] text-slate-400 block">{selectedInvoice.clientDetails.company || "Independent Entity"}</p>
                        <p className="text-[10px] text-slate-400 block">{selectedInvoice.clientDetails.email}</p>
                        <p className="text-[10px] text-slate-400 block w-56 mt-0.5 leading-tight">{selectedInvoice.clientDetails.address}</p>
                      </div>

                      {selectedInvoice.isRecurring && (
                        <div className="text-right">
                          <span className="text-[10px] uppercase text-zinc-400 font-bold tracking-widest block">Billing Retainer Agreement:</span>
                          <span className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-700 font-black px-2.5 py-1 rounded-full uppercase tracking-wider mt-1.5 inline-block">
                            🔄 Active {selectedInvoice.frequency} retainer
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Table of items */}
                    <div className="space-y-2">
                      <div className="border-b border-slate-200 pb-2">
                        <span className="text-[10px] uppercase text-zinc-400 font-bold tracking-widest">Itemized Consultant Ledger Details:</span>
                      </div>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-slate-400 font-bold uppercase text-[9px] border-b border-slate-200 pb-2">
                            <th className="py-2 text-left">Description</th>
                            <th className="py-2 text-center w-16">Quantity</th>
                            <th className="py-2 text-right w-28">Unit Price (₦)</th>
                            <th className="py-2 text-right w-32 border-r-0">Sum (₦)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedInvoice.items.map(item => (
                            <tr key={item.id}>
                              <td className="py-2.5 text-slate-700 font-semibold">{item.description}</td>
                              <td className="py-2.5 text-center text-slate-600 font-mono">{item.quantity}</td>
                              <td className="py-2.5 text-right text-slate-600 font-mono">{(item.price || 0).toLocaleString()}</td>
                              <td className="py-2.5 text-right font-bold text-slate-800 font-mono">{(item.quantity * item.price).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Balance calculation sheet */}
                    <div className="border-t border-slate-200/60 pt-4 flex justify-between items-start gap-4">
                      {/* Bank execution instructions */}
                      <div className="bg-white p-3 rounded-xl border border-slate-150 space-y-1.5 w-72">
                        <span className="text-[9px] uppercase font-black text-[#0c2f35] flex items-center gap-1">
                          <Banknote size={10} className="text-[#09c2cf]" />
                          <span>Official Payment Settlement:</span>
                        </span>
                        <div className="text-[10px] text-slate-600 font-medium space-y-0.5 leading-snug">
                          <div className="flex justify-between"><span>Bank Code:</span> <strong className="text-slate-800">{profile.bankDetails.bankName}</strong></div>
                          <div className="flex justify-between"><span>Account Number:</span> <strong className="text-slate-800 font-mono select-all text-xs">{profile.bankDetails.accountNumber}</strong></div>
                          <div className="flex justify-between"><span>Beneficiary:</span> <strong className="text-slate-800">{profile.bankDetails.accountName}</strong></div>
                        </div>
                        {selectedInvoice.paymentReference && (
                          <div className="text-[9px] bg-emerald-50 border border-emerald-100 text-emerald-800 p-1.5 rounded-lg font-mono">
                            VERIFIED: {selectedInvoice.paymentReference}
                          </div>
                        )}
                      </div>

                      {/* Math Summary */}
                      <div className="w-56 space-y-1.5 text-xs text-slate-600 font-medium text-right">
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <strong className="font-mono text-slate-800">₦ {getSubtotal(selectedInvoice).toLocaleString()}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>VAT ({selectedInvoice.taxRate}%):</span>
                          <strong className="font-mono text-slate-800">₦ {getTax(selectedInvoice).toLocaleString()}</strong>
                        </div>
                        {selectedInvoice.discount > 0 && (
                          <div className="flex justify-between text-rose-500">
                            <span>Flat Discount:</span>
                            <strong className="font-mono">- ₦ {selectedInvoice.discount.toLocaleString()}</strong>
                          </div>
                        )}
                        <div className="flex justify-between border-t border-slate-300 pt-2 text-sm">
                          <span className="font-bold text-slate-800">Sum Total:</span>
                          <strong className="font-black font-mono text-emerald-600 text-sm">₦ {getTotal(selectedInvoice).toLocaleString()}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Transaction History ledger tracker */}
                    <div className="border-t border-slate-200/60 pt-4 mt-4 print:hidden">
                      <span className="text-[10px] uppercase font-black text-slate-800 tracking-wider flex items-center gap-1.5 mb-2">
                        <RefreshCw size={11} className="text-emerald-500 animate-spin-slow" />
                        <span>Transaction Ledger History:</span>
                      </span>
                      {selectedInvoice.history && selectedInvoice.history.length > 0 ? (
                        <div className="space-y-1.5">
                          {selectedInvoice.history.map((h, i) => (
                            <div key={i} className="flex flex-wrap justify-between items-center bg-slate-50 border border-slate-200/60 p-2.5 rounded-xl text-[11px] gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                                  {h.status}
                                </span>
                                <span className="text-slate-600 font-semibold leading-none">
                                  Ref: <span className="font-mono text-slate-800 select-all font-bold">{h.reference}</span>
                                </span>
                              </div>
                              <span className="text-slate-400 font-mono text-[10px]">
                                {new Date(h.timestamp).toLocaleString("en-NG", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                  timeZone: "Africa/Lagos"
                                })}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-[10px] text-center font-medium">
                          No official transaction execution history yet. Status is currently marked as "{selectedInvoice.status}".
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-xs">
                  <FileText size={48} className="mx-auto text-slate-300 opacity-60 mb-2" />
                  <p className="font-bold text-slate-400 text-xs uppercase tracking-wider">No Invoice Selected</p>
                  <p className="text-[10px] text-slate-500 mt-1 max-w-xs mx-auto">Select a document key from the ledger list to load, edit, print or simulator clear payments via Paystack.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Clients tab details list */}
        {activeTab === "clients" && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">Client Records Index</h3>
                <p className="text-slate-500 text-xs mt-0.5">Edit or register business entities on Apex system database.</p>
              </div>

              <button
                onClick={() => {
                  setNewClient({ name: "", email: "", phone: "", address: "", company: "", notes: [] });
                  setShowClientModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black cursor-pointer transition-colors"
              >
                <PlusCircle size={13} />
                <span>Add Client file</span>
              </button>
            </div>

            {clients.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Users size={40} className="mx-auto text-slate-300 opacity-60 mb-2" />
                <p className="font-bold text-xs uppercase tracking-wider">No client indexes stored yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {clients.map(c => (
                  <div key={c.id} className="bg-slate-50 hover:bg-slate-50/80 border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
                    <div className="space-y-2 text-left">
                      <div className="flex justify-between items-start">
                        <strong className="text-sm font-black text-slate-800 block">{c.name}</strong>
                        <span className="text-[9px] bg-white border border-slate-200 text-slate-400 font-bold px-1.5 py-0.5 rounded uppercase font-mono">CLI-NG</span>
                      </div>
                      {c.company && <p className="text-[10px] text-emerald-700 font-extrabold uppercase tracking-wide">{c.company}</p>}
                      <div className="text-[10px] text-slate-505 space-y-0.5">
                        <div className="flex justify-between"><span>Email:</span> <strong className="text-slate-700">{c.email}</strong></div>
                        <div className="flex justify-between"><span>Phone:</span> <strong className="text-slate-700">{c.phone || "---"}</strong></div>
                        <div className="flex justify-between"><span>Address:</span> <strong className="text-slate-700">{c.address || "---"}</strong></div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-1 border-t border-slate-100 pt-3">
                      <button
                        onClick={() => handleEditClientTrigger(c)}
                        className="px-2.5 py-1.5 text-[10px] font-black border border-slate-200 text-slate-600 hover:bg-white rounded-lg cursor-pointer transition-colors"
                      >
                        Modify Profile
                      </button>
                      <button
                        onClick={() => handleDeleteClient(c.id)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer max-h-8"
                        title="Delete client permanently"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Business Settings profile */}
        {activeTab === "profile" && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs max-w-2xl mx-auto space-y-6 text-left">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">Business Settings & Settlement Core</h3>
              <p className="text-slate-500 text-xs mt-0.5 font-medium">Invoices generated will render issuer variables and bank settlements based on changes updated here.</p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveProfile(profile);
                alert("Business Profile saved cache updated.");
                playNotificationChime();
              }}
              className="space-y-4 text-xs font-bold"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-slate-400">Business Name</label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-800 bg-slate-50/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-slate-400">Official Billing Email</label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-800 bg-slate-50/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-slate-400">Phone lines</label>
                  <input
                    type="text"
                    value={profile.phone}
                    onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-800 bg-slate-50/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-slate-400">Business Seed abbreviation (Logo)</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={profile.logoSeed}
                    onChange={(e) => setProfile(prev => ({ ...prev, logoSeed: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-800 bg-slate-50/50"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-slate-400">Physical address description</label>
                <textarea
                  value={profile.address}
                  onChange={(e) => setProfile(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 h-20 font-semibold text-slate-800 bg-slate-50/50"
                />
              </div>

              {/* Settlement bank specifications */}
              <div className="bg-slate-50/80 p-5 rounded-2xl space-y-4 border border-slate-200">
                <h4 className="text-[10px] uppercase tracking-widest text-[#0c2f35] font-black flex items-center gap-1.5">
                  <Banknote size={13} className="text-emerald-500" />
                  <span>Settlement Bank Instructions (Invoice Recipient Transfer Targets)</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-slate-450">Destination Bank Name</label>
                    <select
                      value={profile.bankDetails.bankName}
                      onChange={(e) => setProfile(prev => ({
                        ...prev,
                        bankDetails: { ...prev.bankDetails, bankName: e.target.value }
                      }))}
                      className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 h-10 bg-white"
                    >
                      {NIGERIAN_BANKS.map((b, idx) => (
                        <option key={idx} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-slate-450">Account Number (10 digits)</label>
                    <input
                      type="text"
                      maxLength={10}
                      value={profile.bankDetails.accountNumber}
                      onChange={(e) => setProfile(prev => ({
                        ...prev,
                        bankDetails: { ...prev.bankDetails, accountNumber: e.target.value.replace(/\D/g, "") }
                      }))}
                      className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono font-bold text-slate-800"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-slate-450">Settlement Beneficiary Name (Account Name)</label>
                  <input
                    type="text"
                    value={profile.bankDetails.accountName}
                    onChange={(e) => setProfile(prev => ({
                      ...prev,
                      bankDetails: { ...prev.bankDetails, accountName: e.target.value }
                    }))}
                    className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-800"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl cursor-pointer transition-colors"
              >
                Save Profile Configuration Sheet
              </button>
            </form>

            {/* Programmatic Clean Slate Manager */}
            <div className="pt-6 border-t border-slate-100">
              <div className="bg-rose-50/70 border border-rose-100 p-5 rounded-2xl space-y-3 text-left">
                <div>
                  <h4 className="text-xs font-black text-rose-800 uppercase tracking-widest flex items-center gap-1.5">
                    <Trash2 size={13} className="text-rose-600" />
                    <span>Clean Slate - Delete All Data</span>
                  </h4>
                  <p className="text-[10px] text-rose-600 mt-1 leading-normal font-semibold">
                    Delete all client catalogs, invoice sheets, ledger logs, and custom profiles to start on a completely fresh, empty canvas.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleWipeAllLocalData}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1"
                >
                  <span>Wipe All Data & Start Fresh</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* User Profile personal & business configurations */}
        {activeTab === "user-profile" && (
          <div id="user-profile-editor-card" className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs max-w-2xl mx-auto space-y-6 text-left">
            <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">User Identity & Profile Panel</h3>
                <p className="text-slate-500 text-xs mt-0.5 font-medium">Configure personal and business settings representing your professional operator profile.</p>
              </div>
              <img 
                src={userProfile.profilePic || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&q=80"} 
                alt="Avatar" 
                className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500 shadow-sm shrink-0 bg-slate-150"
                referrerPolicy="no-referrer"
              />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                // Save custom profile
                localStorage.setItem(`invoiceng_userprofile_${sessionUser?.email || "default"}`, JSON.stringify(userProfile));
                
                // Update session state so other parts of layout update reactive name immediately
                setSessionUser(prev => prev ? { ...prev, name: userProfile.fullName } : null);
                
                // Update invoiceng_session_user stored session info as well
                localStorage.setItem("invoiceng_session_user", JSON.stringify({ name: userProfile.fullName, email: sessionUser?.email || "" }));
                
                alert("User Profile updated successfully!");
                playNotificationChime();
                setActiveTab("dashboard");
              }}
              className="space-y-6 text-xs font-bold"
            >
              {/* Profile avatar picker section */}
              <div className="space-y-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between pb-3 border-b border-slate-150/60">
                  <div className="space-y-0.5 text-left">
                    <label className="text-[10px] uppercase tracking-wider text-slate-500 block">Professional Profile Picture</label>
                    <p className="text-[9px] text-slate-400 font-semibold leading-normal">Click a preset below, input an image URL, or drop your own image file here.</p>
                  </div>
                  
                  {/* Interactive Drag and Drop Upload Zone */}
                  <div 
                    id="profile-pic-dropzone"
                    className="w-full sm:w-64 h-20 border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl flex flex-col justify-center items-center p-2.5 text-center cursor-pointer bg-white transition-all hover:bg-slate-50/50"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add("border-emerald-500", "bg-emerald-50/10");
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove("border-emerald-500", "bg-emerald-50/10");
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove("border-emerald-500", "bg-emerald-50/10");
                      const files = e.dataTransfer.files;
                      if (files && files[0]) {
                        const file = files[0];
                        if (file.type.startsWith("image/")) {
                          const reader = new FileReader();
                          reader.onload = (readerEvt) => {
                            if (readerEvt.target?.result) {
                              setUserProfile(prev => ({ ...prev, profilePic: readerEvt.target!.result as string }));
                            }
                          };
                          reader.readAsDataURL(file);
                        } else {
                          alert("Unsupported file format. Please drop an image file (PNG/JPG).");
                        }
                      }
                    }}
                    onClick={() => {
                      document.getElementById("profile-pic-file-input")?.click();
                    }}
                  >
                    <span className="text-[10px] text-slate-700 font-extrabold uppercase tracking-wide">Drag & Drop Photo Here</span>
                    <span className="text-[9px] text-slate-400 font-medium mt-0.5">or click here to choose a file</span>
                    <input 
                      type="file"
                      id="profile-pic-file-input"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const files = e.target.files;
                        if (files && files[0]) {
                          const file = files[0];
                          const reader = new FileReader();
                          reader.onload = (readerEvt) => {
                            if (readerEvt.target?.result) {
                              setUserProfile(prev => ({ ...prev, profilePic: readerEvt.target!.result as string }));
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold">Or Select Preset Avatar Choice</span>
                  <div className="flex flex-wrap items-center gap-3">
                    {[
                      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&q=80",
                      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&q=80",
                      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&q=80",
                      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&q=80",
                      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&q=80"
                    ].map((imgUrl, i) => {
                      const isSelected = userProfile.profilePic === imgUrl;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setUserProfile(prev => ({ ...prev, profilePic: imgUrl }))}
                          className={`w-12 h-12 rounded-full overflow-hidden border-2 transition-all cursor-pointer hover:scale-105 shrink-0 ${
                            isSelected ? "border-emerald-500 ring-2 ring-emerald-100" : "border-slate-300 hover:border-slate-450"
                          }`}
                        >
                          <img src={imgUrl} alt="Preset avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                <div className="space-y-1 pt-1.5 border-t border-slate-155">
                  <span className="text-[10px] text-slate-400 font-medium">Or enter a custom image URL:</span>
                  <input
                    type="url"
                    value={userProfile.profilePic}
                    onChange={(e) => setUserProfile(prev => ({ ...prev, profilePic: e.target.value }))}
                    placeholder="https://example.com/your-image.jpg"
                    className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono text-slate-600 bg-white"
                  />
                </div>
              </div>

              {/* Section 1: Basic Personal Info */}
              <div className="space-y-4">
                <h4 className="text-[10px] uppercase tracking-widest text-[#0c2f35] font-black border-b border-light-slate pb-1.5 mt-2">
                  1. Basic Personal Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-slate-400">Full Name</label>
                    <input
                      type="text"
                      required
                      value={userProfile.fullName}
                      onChange={(e) => setUserProfile(prev => ({ ...prev, fullName: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-800 bg-slate-50/50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-slate-400">Operator Email (Read-only)</label>
                    <input
                      type="email"
                      readOnly
                      disabled
                      value={userProfile.email}
                      className="w-full border border-slate-150 rounded-xl p-2.5 font-semibold text-slate-400 bg-slate-100 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-slate-400">Operator Bio / Role Title</label>
                  <input
                    type="text"
                    value={userProfile.bio}
                    onChange={(e) => setUserProfile(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="e.g. Lead Accounting Partner & Auditor"
                    className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-800 bg-slate-50/50"
                  />
                </div>
              </div>

              {/* Section 2: Basic Business Info */}
              <div className="space-y-4">
                <h4 className="text-[10px] uppercase tracking-widest text-[#0c2f35] font-black border-b border-light-slate pb-1.5 mt-2">
                  2. Basic Business Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] uppercase tracking-wider text-slate-400">Registered Business Name</label>
                    <input
                      type="text"
                      value={userProfile.companyName}
                      onChange={(e) => setUserProfile(prev => ({ ...prev, companyName: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-800 bg-slate-50/50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-slate-400">CAC Registration (RC/BN)</label>
                    <input
                      type="text"
                      value={userProfile.regNumber}
                      onChange={(e) => setUserProfile(prev => ({ ...prev, regNumber: e.target.value }))}
                      placeholder="e.g. RC-123456"
                      className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-800 bg-slate-50/50 uppercase"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-slate-400">Business Industry / Specialization</label>
                  <input
                    type="text"
                    value={userProfile.industry}
                    onChange={(e) => setUserProfile(prev => ({ ...prev, industry: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-800 bg-slate-50/50"
                  />
                </div>
              </div>

              {/* Section 3: Contact details & Address */}
              <div className="space-y-4">
                <h4 className="text-[10px] uppercase tracking-widest text-[#0c2f35] font-black border-b border-light-slate pb-1.5 mt-2">
                  3. Contact & Address Details
                </h4>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-slate-400">Phone Contact Line</label>
                  <input
                    type="text"
                    value={userProfile.phone}
                    onChange={(e) => setUserProfile(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-800 bg-slate-50/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-slate-400">Street Address</label>
                  <input
                    type="text"
                    value={userProfile.address}
                    onChange={(e) => setUserProfile(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-800 bg-slate-50/50"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-slate-400">City</label>
                    <input
                      type="text"
                      value={userProfile.city}
                      onChange={(e) => setUserProfile(prev => ({ ...prev, city: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-800 bg-slate-50/50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-slate-400">State / Territory</label>
                    <input
                      type="text"
                      value={userProfile.state}
                      onChange={(e) => setUserProfile(prev => ({ ...prev, state: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-800 bg-slate-50/50"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl cursor-pointer transition-all shadow-md shadow-emerald-850/15"
              >
                Save User Profile Information
              </button>
            </form>
          </div>
        )}

        {/* Retainer metrics visual panel */}
        {activeTab === "subscriber-metrics" && (
          <SubscriberTracker invoices={invoices} />
        )}

        {/* AI Accountant coach panel instruction */}
        {activeTab === "ai-coach" && (
          <AICoachAndReminder invoices={invoices} clients={clients} />
        )}

        {/* Supabase integration page tab */}
        {activeTab === "supabase" && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs max-w-3xl mx-auto space-y-6 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                  <Database size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">Cloud Synchronization System</h3>
                  <p className="text-slate-500 text-xs mt-0.5 font-medium">Backup ledger files, clients registries, and business parameters safely using Supabase cloud PostgreSQL.</p>
                </div>
              </div>
              <CloudLightning className="text-emerald-500" size={18} />
            </div>

            {sbMessage && (
              <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl text-indigo-805 text-xs font-bold leading-relaxed whitespace-pre-wrap">
                {sbMessage}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Profile/Auth panel */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
                  <UserCheck size={13} className="text-emerald-500" />
                  <span>User Authentication Account</span>
                </h4>

                {supabaseUser ? (
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-150 space-y-3">
                    <div className="text-xs font-bold text-slate-600">
                      Currently Authenticated as:
                      <strong className="text-slate-800 block mt-1 font-mono">{supabaseUser.email}</strong>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <button
                        onClick={handlePushToSupabase}
                        disabled={sbLoading}
                        className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      >
                        {sbLoading ? <RefreshCw className="animate-spin" size={12} /> : null}
                        <span>Push Cloud Backup</span>
                      </button>
                      <button
                        onClick={handlePullFromSupabase}
                        disabled={sbLoading}
                        className="py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      >
                        {sbLoading ? <RefreshCw className="animate-spin" size={12} /> : null}
                        <span>Pull Cloud Backup</span>
                      </button>
                    </div>

                    <button
                      onClick={handleSupabaseLogout}
                      className="w-full py-2 border border-slate-200 text-slate-500 hover:text-rose-600 text-[10px] font-black uppercase tracking-wider rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors"
                    >
                      <LogOut size={11} />
                      <span>Log Out Session</span>
                    </button>
                  </div>
                ) : (
                  <form className="space-y-3 bg-slate-50 p-5 rounded-2xl border border-slate-150 text-xs font-bold">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-slate-400">Cloud Register Email</label>
                      <input
                        type="email"
                        placeholder="invoice@company.com"
                        value={sbEmail}
                        onChange={(e) => setSbEmail(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl p-2.5 bg-white text-slate-700 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-slate-400">Database Passkey</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={sbPassword}
                        onChange={(e) => setSbPassword(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl p-2.5 bg-white text-slate-700 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <button
                        type="button"
                        onClick={handleSupabaseLogin}
                        disabled={sbLoading}
                        className="py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-extrabold cursor-pointer text-center"
                      >
                        {sbLoading ? "Verifying..." : "Log In Sync"}
                      </button>
                      <button
                        type="button"
                        onClick={handleSupabaseSignUp}
                        disabled={sbLoading}
                        className="py-3 bg-white border border-slate-200 hover:bg-slate-55 text-slate-750 font-extrabold rounded-xl cursor-pointer text-center"
                      >
                        Register
                      </button>
                    </div>
                  </form>
                )}

                {/* Prune & Clean Slate Manager */}
                <div className="bg-rose-50/70 border border-rose-100 p-5 rounded-2xl space-y-3 text-left">
                  <div>
                    <h4 className="text-xs font-black text-rose-800 uppercase tracking-widest flex items-center gap-1.5">
                      <Trash2 size={13} className="text-rose-600" />
                      <span>Clean Slate Manager</span>
                    </h4>
                    <p className="text-[10px] text-rose-600 mt-1 leading-normal font-semibold">
                      Delete all current local registries, client lists, and test data to start fresh.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleWipeAllLocalData}
                    className="w-full py-2.5 bg-rose-650 hover:bg-rose-700 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1"
                  >
                    <span>Wipe Local Cache & Start Fresh</span>
                  </button>
                </div>
              </div>

              {/* DDL Guide details */}
              <div className="space-y-4 font-sans border-l border-slate-100 pl-0 md:pl-6 text-[10px] leading-relaxed">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
                  <Lock size={13} className="text-indigo-500" />
                  <span>Manual Setup Instructions</span>
                </h4>
                <p className="text-slate-500 text-xs">
                  Ensure you execute the SQL script schema inside your Supabase platform SQL worksheet editor to activate backup operations:
                </p>

                <div className="bg-slate-950 text-slate-300 rounded-xl p-4 font-mono select-all relative overflow-x-auto text-[10px] leading-snug border border-slate-900">
                  <pre className="text-green-400">
{`-- Create table in SQL Worksheet:
create table invoices_ng (
  id text primary key,
  data jsonb not null,
  user_id uuid references auth.users(id)
);

-- Enable Row Level Security:
alter table invoices_ng enable row level security;

-- Add RLS select policy:
create policy "Users can modify own data."
  on invoices_ng
  for all
  using (auth.uid() = user_id);`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER credit */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12 text-center text-xs text-slate-400 font-medium">
        <div className="max-w-7xl mx-auto px-6">
          <span>&copy; 2026 InvoiceNG Billing Systems. Fully persistent locally and ready for Supabase Cloud integrations.</span>
        </div>
      </footer>
    </div>

      {/* Paystack pop Simulator Overlay */}
      {payingInvoice && (
        <PaystackSimulator
          invoice={payingInvoice}
          onClose={() => setPayingInvoice(null)}
          onPaymentSuccess={handlePaystackSuccess}
        />
      )}

      {/* MODAL: Add/Edit Invoice */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-150"
          >
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">
                {newInvoice.id ? "Edit Invoice metadata" : "Create New Invoice Ledger"}
              </h3>
              <button
                type="button"
                onClick={() => setShowInvoiceModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleSaveInvoice} className="p-6 overflow-y-auto flex-1 font-bold text-xs space-y-4 text-left">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-slate-400">Invoice Number / Code</label>
                  <input
                    type="text"
                    required
                    placeholder="INV-2026-004"
                    value={newInvoice.invoiceNumber}
                    onChange={(e) => setNewInvoice(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl p-2.5 font-mono font-bold text-slate-700 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-slate-400">Recipient Client</label>
                  <select
                    required
                    value={newInvoice.clientId}
                    onChange={(e) => setNewInvoice(prev => ({ ...prev, clientId: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl p-2.5 h-10 bg-white"
                  >
                    <option value="">Select a client...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.company || "Independent"})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-slate-400">Issue Date</label>
                  <input
                    type="date"
                    required
                    value={newInvoice.date}
                    onChange={(e) => setNewInvoice(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-slate-400">Due Terms Date</label>
                  <input
                    type="date"
                    required
                    value={newInvoice.dueDate}
                    onChange={(e) => setNewInvoice(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isRecurringCheck"
                    checked={newInvoice.isRecurring}
                    onChange={(e) => setNewInvoice(prev => ({ ...prev, isRecurring: e.target.checked }))}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="isRecurringCheck" className="text-xs font-black text-slate-705 cursor-pointer">
                    Enable Retainer (Recurring Stream)
                  </label>
                </div>

                {newInvoice.isRecurring && (
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-slate-400 block pb-1">Billing frequency</label>
                    <select
                      value={newInvoice.frequency}
                      onChange={(e) => setNewInvoice(prev => ({ ...prev, frequency: e.target.value as any }))}
                      className="w-full border border-slate-200 rounded-xl p-2 bg-white"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Line items details selection */}
              <div className="space-y-2 pt-2">
                <div className="flex justify-between items-center border-b border-slate-100 pb-1">
                  <strong className="text-xs font-black uppercase tracking-wider text-slate-600">Leasing / Consultation Line Items</strong>
                  <button
                    type="button"
                    onClick={handleAddNewInvoiceItem}
                    className="text-[10px] bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg hover:bg-indigo-100 font-extrabold cursor-pointer transition-colors"
                  >
                    + Add Item Row
                  </button>
                </div>

                <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
                  {(newInvoice.items || []).map((item, idx) => (
                    <div key={item.id} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                      <div className="sm:col-span-6 space-y-1">
                        <label className="text-[9px] uppercase tracking-wider text-slate-400">Description</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Cloud API milestone delivery"
                          value={item.description}
                          onChange={(e) => handleUpdateInvoiceItem(idx, "description", e.target.value)}
                          className="w-full border border-slate-200 rounded-xl p-2 focus:outline-none"
                        />
                      </div>
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-[9px] uppercase tracking-wider text-slate-400">Qty</label>
                        <input
                          type="number"
                          required
                          min={1}
                          value={item.quantity}
                          onChange={(e) => handleUpdateInvoiceItem(idx, "quantity", e.target.value)}
                          className="w-full border border-slate-200 rounded-xl p-2 focus:outline-none text-center"
                        />
                      </div>
                      <div className="sm:col-span-3 space-y-1">
                        <label className="text-[9px] uppercase tracking-wider text-slate-400">Unit Cost (₦)</label>
                        <input
                          type="number"
                          required
                          min={0}
                          value={item.price}
                          onChange={(e) => handleUpdateInvoiceItem(idx, "price", e.target.value)}
                          className="w-full border border-slate-200 rounded-xl p-2 focus:outline-none text-right font-mono"
                        />
                      </div>
                      <div className="sm:col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveInvoiceItem(idx)}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer max-h-12"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tax rate and flat discounts specs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-slate-450">VAT Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    value={newInvoice.taxRate}
                    onChange={(e) => setNewInvoice(prev => ({ ...prev, taxRate: parseFloat(e.target.value) || 0 }))}
                    className="w-full border border-slate-200 rounded-xl p-2 focus:outline-none font-mono text-center"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-slate-450">Flat Discount (₦)</label>
                  <input
                    type="number"
                    min={0}
                    value={newInvoice.discount}
                    onChange={(e) => setNewInvoice(prev => ({ ...prev, discount: parseFloat(e.target.value) || 0 }))}
                    className="w-full border border-slate-200 rounded-xl p-2 focus:outline-none font-mono text-right"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-slate-400">Document Status</label>
                  <select
                    value={newInvoice.status}
                    onChange={(e) => setNewInvoice(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full border border-slate-200 rounded-xl p-2 bg-white"
                  >
                    <option value="draft">Draft</option>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-slate-400">Invoice Note / Memo</label>
                  <input
                    type="text"
                    placeholder="Check bank transfer notes for reference code."
                    value={newInvoice.notes}
                    onChange={(e) => setNewInvoice(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-widest mt-4 cursor-pointer text-center"
              >
                Save Invoice Record
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL: Add/Edit Client */}
      {showClientModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border"
          >
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <strong className="text-sm uppercase tracking-wider text-slate-800">
                {newClient.id ? "Edit Client profile details" : "Add Client profile"}
              </strong>
              <button
                type="button"
                onClick={() => setShowClientModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="p-6 font-bold text-xs space-y-4 text-left">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-slate-400">Client / Contact Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aliko Danjuma"
                  value={newClient.name}
                  onChange={(e) => setNewClient(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl p-2.5 bg-white text-slate-705 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-slate-400">Billing Email address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. aliko@conglomerate.ng"
                  value={newClient.email}
                  onChange={(e) => setNewClient(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl p-2.5 bg-white text-slate-705 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-slate-400">Phone Hotline</label>
                <input
                  type="text"
                  placeholder="e.g. +234 803 000 0000"
                  value={newClient.phone}
                  onChange={(e) => setNewClient(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl p-2.5 bg-white text-slate-705"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-slate-400">Company Name</label>
                <input
                  type="text"
                  placeholder="e.g. Danjuma Conglomerate Plc"
                  value={newClient.company}
                  onChange={(e) => setNewClient(prev => ({ ...prev, company: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl p-2.5 bg-white text-slate-705"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-slate-400">Physical Location Address</label>
                <input
                  type="text"
                  placeholder="e.g. Ring Road, Ibadan"
                  value={newClient.address}
                  onChange={(e) => setNewClient(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl p-2.5 bg-white text-slate-705"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-widest mt-2 cursor-pointer text-center"
              >
                Save Client Record file
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
