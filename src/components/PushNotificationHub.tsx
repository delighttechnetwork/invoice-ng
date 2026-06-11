import React, { useState, useEffect } from "react";
import { 
  Bell, 
  Trash2, 
  CheckCheck, 
  CreditCard, 
  AlertTriangle, 
  RefreshCw, 
  Volume2, 
  VolumeX, 
  Monitor, 
  Info, 
  Zap
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export interface AppNotification {
  id: string;
  type: "payment" | "overdue" | "renewal" | "info";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface NotificationSettings {
  enableDesktop: boolean;
  enableChime: boolean;
  notifyPayments: boolean;
  notifyOverdue: boolean;
  notifyRenewals: boolean;
}

interface PushNotificationHubProps {
  notifications: AppNotification[];
  setNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>;
  settings: NotificationSettings;
  setSettings: React.Dispatch<React.SetStateAction<NotificationSettings>>;
  onNotificationClick?: (notif: AppNotification) => void;
  // Trigger helper available to parents
  onTriggerSimulatedNotification: (type: "payment" | "overdue" | "renewal" | "info", title: string, message: string) => void;
}

export default function PushNotificationHub({
  notifications,
  setNotifications,
  settings,
  setSettings,
  onNotificationClick,
  onTriggerSimulatedNotification
}: PushNotificationHubProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [permissionState, setPermissionState] = useState<NotificationPermission>("default");

  // Sync notification permission state
  useEffect(() => {
    if ("Notification" in window) {
      setPermissionState(Notification.permission);
    }
  }, []);

  const requestBrowserPermission = async () => {
    if (!("Notification" in window)) {
      alert("This browser does not support standard web server notifications.");
      return;
    }
    const res = await Notification.requestPermission();
    setPermissionState(res);
    if (res === "granted") {
      onTriggerSimulatedNotification(
        "info",
        "System Push Activated",
        "Desktop push banners from InvoiceNG are now fully configured and active!"
      );
    }
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const toggleReadStatus = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: !n.read } : n));
  };

  const deleteNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative font-sans select-none">
      
      {/* Bell Trigger */}
      <button 
        id="notification-bell-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 bg-white border border-slate-200 text-slate-700 hover:text-blue-600 rounded-xl transition-all cursor-pointer shadow-xs focus:ring-2 focus:ring-blue-500/20 active:scale-95 flex items-center justify-center"
      >
        <Bell size={18} className={unreadCount > 0 ? "animate-swing" : ""} />
        
        {unreadCount > 0 && (
          <span 
            id="notification-badge-count"
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white font-extrabold text-[9px] rounded-full flex items-center justify-center border-2 border-white animate-pulse"
          >
            {unreadCount}
          </span>
        )}
      </button>

      {/* Notification overlay drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Click away backdrop */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)} 
            />

            <motion.div 
              id="notifications-panel-container"
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-3.5 w-80 sm:w-96 bg-white border border-slate-200 rounded-3xl shadow-xl z-50 overflow-hidden flex flex-col text-xs"
            >
              
              {/* Header section */}
              <div className="p-4 bg-slate-900 text-white flex justify-between items-center flex-shrink-0">
                <div className="flex items-center gap-1.5 font-bold">
                  <Bell size={14} className="text-blue-400" />
                  <span>Real-time Alerts Feed</span>
                  {unreadCount > 0 && (
                    <span className="bg-blue-600 text-[9px] text-white py-0.5 px-2 rounded-full font-bold ml-1 font-mono">
                      {unreadCount} NEW
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {unreadCount > 0 && (
                    <button 
                      id="notif-read-all"
                      onClick={markAllAsRead}
                      className="text-[10px] text-zinc-400 hover:text-white transition-colors cursor-pointer flex items-center gap-0.5"
                    >
                      <CheckCheck size={11} />
                      <span>Mark Read</span>
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button 
                      id="notif-clear-all"
                      onClick={clearAllNotifications}
                      className="text-[10px] text-zinc-400 hover:text-white transition-colors cursor-pointer flex items-center gap-0.5"
                    >
                      <Trash2 size={11} />
                      <span>Clear</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Browser Permission Prompt bar if not granted */}
              {permissionState !== "granted" && (
                <div className="bg-blue-50 border-b border-blue-100 p-3 text-[11px] text-blue-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Monitor size={14} className="text-blue-600 flex-shrink-0" />
                    <span>Enable native OS desktop banner notifications?</span>
                  </div>
                  <button 
                    id="notif-grant-btn"
                    onClick={requestBrowserPermission}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] py-1 px-2.5 rounded font-bold cursor-pointer transition-colors"
                  >
                    Allow
                  </button>
                </div>
              )}

              {/* Notifications scroll area */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 flex-1">
                {notifications.length === 0 ? (
                  <div className="p-12 text-center text-zinc-400 flex flex-col items-center justify-center space-y-2">
                    <Bell size={24} className="text-zinc-200" />
                    <p className="font-semibold text-[11px] text-[#222]">No recent push notifications</p>
                    <p className="text-[10px] max-w-xs text-zinc-400">Trigger simulated payments, overdues, or renews in the command deck to see them fire!</p>
                  </div>
                ) : (
                  notifications.map(notif => {
                    // Set icons & colors by type
                    let notifIcon = <Info size={14} className="text-blue-500" />;
                    let typeBg = "bg-blue-50/50";
                    switch (notif.type) {
                      case "payment":
                        notifIcon = <CreditCard size={14} className="text-emerald-500" />;
                        typeBg = "bg-emerald-50/40 border-l-4 border-emerald-500";
                        break;
                      case "overdue":
                        notifIcon = <AlertTriangle size={14} className="text-red-500 animate-pulse" />;
                        typeBg = "bg-red-50/30 border-l-4 border-red-500";
                        break;
                      case "renewal":
                        notifIcon = <RefreshCw size={14} className="text-indigo-500" />;
                        typeBg = "bg-indigo-50/40 border-l-4 border-indigo-500";
                        break;
                    }

                    return (
                      <div 
                        key={notif.id}
                        onClick={() => {
                          if (onNotificationClick) onNotificationClick(notif);
                          setIsOpen(false);
                        }}
                        className={`p-4 transition-all hover:bg-slate-50 flex gap-3 relative cursor-pointer ${typeBg} ${!notif.read ? 'font-medium bg-slate-50/80 shadow-inner' : 'opacity-85'}`}
                      >
                        {/* Icon sphere */}
                        <div className="mt-0.5 w-7 h-7 rounded-xl bg-white shadow-xs border border-slate-150 flex items-center justify-center flex-shrink-0">
                          {notifIcon}
                        </div>

                        {/* Title text */}
                        <div className="space-y-1 pr-6 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-slate-800 text-[11px]">{notif.title}</span>
                          </div>
                          <p className="text-zinc-500 leading-relaxed text-[11px] font-sans">{notif.message}</p>
                          <span className="font-mono text-[9px] text-zinc-400 block pt-0.5">{notif.timestamp}</span>
                        </div>

                        {/* Slide items controller */}
                        <div className="absolute right-3 top-3 flex gap-1 bg-white/80 backdrop-blur-xs p-1 rounded-lg border border-slate-100 opacity-60 hover:opacity-100 transition-opacity">
                          <button
                            id={`notif-toggle-read-${notif.id}`}
                            onClick={(e) => toggleReadStatus(notif.id, e)}
                            className="p-1 hover:bg-slate-100 rounded text-slate-500"
                            title={notif.read ? "Mark unread" : "Mark read"}
                          >
                            <CheckCheck size={11} className={notif.read ? "text-blue-600" : "text-zinc-400"} />
                          </button>
                          <button
                            id={`notif-del-${notif.id}`}
                            onClick={(e) => deleteNotification(notif.id, e)}
                            className="p-1 hover:bg-slate-100 rounded text-red-500"
                            title="Delete alert"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>

                      </div>
                    );
                  })
                )}
              </div>

              {/* Quick Settings Panel Footer */}
              <div className="bg-slate-50 p-3.5 border-t border-slate-200 flex flex-wrap gap-2 items-center justify-between text-[10px] text-zinc-500 flex-shrink-0">
                <div className="flex gap-3">
                  <button 
                    id="notif-toggle-chime"
                    onClick={() => setSettings(prev => ({ ...prev, enableChime: !prev.enableChime }))}
                    className="flex items-center gap-1 hover:text-blue-600 font-semibold cursor-pointer"
                    title={settings.enableChime ? "Mute chimes" : "Enable chimes"}
                  >
                    {settings.enableChime ? (
                      <Volume2 size={12} className="text-blue-500" />
                    ) : (
                      <VolumeX size={12} className="text-zinc-400" />
                    )}
                    <span>Sound</span>
                  </button>

                  <button 
                    id="notif-toggle-desktop"
                    onClick={() => setSettings(prev => ({ ...prev, enableDesktop: !prev.enableDesktop }))}
                    className="flex items-center gap-1 hover:text-blue-600 font-semibold cursor-pointer"
                  >
                    <Monitor size={12} className={settings.enableDesktop ? "text-blue-500" : "text-zinc-400"} />
                    <span>OS Banner</span>
                  </button>
                </div>
                
                <span className="font-mono text-[9px] text-zinc-400">InvoiceNG push v1.1</span>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}

// -------------------------------------------------------------
// COMMAND DECK SIMULATOR COMPONENT FOR INTEGRATION IN HOME VIEW
// -------------------------------------------------------------

interface PushNotificationSimulatorProps {
  onTrigger: (type: "payment" | "overdue" | "renewal" | "info", title: string, message: string) => void;
  clientsListForSim: { id: string; name: string; company?: string }[];
}

export function PushNotificationSimulatorDeck({
  onTrigger,
  clientsListForSim
}: PushNotificationSimulatorProps) {
  const [selectedClient, setSelectedClient] = useState(clientsListForSim[0]?.id || "");
  const [customOverdueDays, setCustomOverdueDays] = useState("14");

  const getClientName = () => {
    const c = clientsListForSim.find(item => item.id === selectedClient);
    return c ? c.name : "Professional Client";
  };

  return (
    <div id="notif-simulator-deck" className="bg-white border border-slate-200 p-6 rounded-3xl shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
        <div className="space-y-0.5">
          <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
            <Zap size={16} className="text-blue-600 animate-pulse" />
            <span>Interactive Real-time Push Simulation Center</span>
          </h4>
          <p className="text-zinc-400 text-[11px]">Deploy and instantly test mobile, web, and billing notifications on-state.</p>
        </div>
        <span className="bg-slate-100 text-zinc-500 font-bold font-mono px-2 py-0.5 rounded text-[8px] uppercase tracking-wider">
          Testing Suite
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-sans">
        
        {/* 1. Payment received push builder */}
        <div className="p-4 bg-emerald-50/20 border border-emerald-550/10 rounded-2xl space-y-3">
          <div className="flex items-center gap-1.5 font-bold text-emerald-800">
            <CreditCard size={14} />
            <span>Simulate Payment Received</span>
          </div>
          <p className="text-zinc-500 text-[10px] leading-relaxed">Simulates standard instantaneous direct bank transfer webhook updates via Paystack accredited pathways.</p>
          
          <div className="space-y-1.5">
            <label className="text-[10px] text-zinc-400 font-semibold uppercase block">Inbound Payer:</label>
            <select
              id="sim-payment-client"
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="w-full border border-slate-200 bg-white rounded-lg p-2 text-[11px] focus:outline-none focus:border-emerald-500 font-sans"
            >
              {clientsListForSim.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <button
            id="trigger-sim-payment-btn"
            type="button"
            onClick={() => {
              const amount = Math.floor(Math.random() * 450000) + 25000;
              const serial = Math.floor(Math.random() * 800) + 100;
              onTrigger(
                "payment",
                "Instant Bank Wire Received",
                `₦${amount.toLocaleString()} credited successfully from ${getClientName()} for Invoice #INV-2026-${serial}. Verified by GTBank gateway.`
              );
            }}
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all cursor-pointer active:scale-98 shadow-sm shadow-emerald-600/10"
          >
            Pushed Payment Alert
          </button>
        </div>

        {/* 2. Overdue collection trigger */}
        <div className="p-4 bg-red-50/20 border border-red-550/10 rounded-2xl space-y-3">
          <div className="flex items-center gap-1.5 font-bold text-red-800">
            <AlertTriangle size={14} className="text-red-500" />
            <span>Invoice Overdue Escalator</span>
          </div>
          <p className="text-zinc-500 text-[10px] leading-relaxed">Trigger alert when ledger lists overdue invoices. Automates localized SMS warning prompts.</p>
          
          <div className="space-y-1.5">
            <label className="text-[10px] text-zinc-400 font-semibold uppercase block">Days Overdue:</label>
            <input
              id="sim-overdue-days"
              type="number"
              value={customOverdueDays}
              onChange={(e) => setCustomOverdueDays(e.target.value)}
              className="w-full border border-slate-200 bg-white rounded-lg p-2 text-[11px] focus:outline-none focus:border-red-500 font-mono"
            />
          </div>

          <button
            id="trigger-sim-overdue-btn"
            type="button"
            onClick={() => {
              const serial = Math.floor(Math.random() * 200) + 1;
              onTrigger(
                "overdue",
                "⚠️ CRITICAL OVERDUE RETENSION",
                `Invoice INV-2026-00${serial} has lapsed into standard default. Passed ${customOverdueDays} days boundary limit. Late payment terms interest added.`
              );
            }}
            className="w-full py-2 bg-red-650 hover:bg-red-700 text-white font-bold rounded-xl transition-all cursor-pointer active:scale-98 shadow-sm shadow-red-600/10"
          >
            Fire Overdue Alert
          </button>
        </div>

        {/* 3. Subscription renewal simulator */}
        <div className="p-4 bg-indigo-50/20 border border-indigo-550/10 rounded-2xl space-y-3">
          <div className="flex items-center gap-1.5 font-bold text-indigo-800">
            <RefreshCw size={14} />
            <span>Subscription Auto-Renewal</span>
          </div>
          <p className="text-zinc-500 text-[10px] leading-relaxed">Sends ahead predictive renewals notification triggers. Safeguards active account parameters.</p>
          
          <div className="space-y-1.5 font-mono text-[10px] text-indigo-700 font-bold bg-white p-2 rounded-lg border border-indigo-50 flex flex-col justify-center text-center h-14">
            <div>NEXT CYCLE IN: 3 DAYS</div>
            <div className="text-[9px] text-zinc-400">PLAN: STARTER TIER • ₦2,000/mo</div>
          </div>

          <button
            id="trigger-sim-renewal-btn"
            type="button"
            onClick={() => {
              onTrigger(
                "renewal",
                "🔄 Subscriber Renewal Queue",
                "Your InvoiceNG Starter Hustle Tier subscription (₦2,000/mo) is scheduled to renew on June 12, 2026. GTBank mastercard payment queued."
              );
            }}
            className="w-full py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all cursor-pointer active:scale-98 shadow-sm shadow-indigo-600/10"
          >
            Push Renewal Warning
          </button>
        </div>

      </div>

    </div>
  );
}
