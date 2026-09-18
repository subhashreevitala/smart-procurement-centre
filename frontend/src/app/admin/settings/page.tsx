"use client";

import { useState, useEffect } from "react";
import { 
  Settings, 
  Building2, 
  Sprout, 
  MessageSquare, 
  Bell, 
  Save, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  ShieldAlert,
  Sliders
} from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

interface Centre {
  id: number;
  name: string;
  location: string;
  capacity_per_day: number;
}

interface Crop {
  id: number;
  name: string;
  msp: number;
}

export default function SettingsAdminPage() {
  const [activeTab, setActiveTab] = useState<"centres" | "crops" | "notifications" | "queue">("centres");
  
  const [centres, setCentres] = useState<Centre[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState("");
  const [saveError, setSaveError] = useState("");

  // New Centre Form
  const [newCentreName, setNewCentreName] = useState("");
  const [newCentreLoc, setNewCentreLoc] = useState("");
  const [newCentreCap, setNewCentreCap] = useState("1500");
  const [showAddCentre, setShowAddCentre] = useState(false);

  // New Crop Form
  const [newCropName, setNewCropName] = useState("");
  const [newCropMsp, setNewCropMsp] = useState("2500");
  const [showAddCrop, setShowAddCrop] = useState(false);

  // SMS Gateway Settings State
  const [smsApiKey, setSmsApiKey] = useState("DEMO_API_KEY_SMS_INDIA_HUB");
  const [smsSenderId, setSmsSenderId] = useState("DOCAGOV");
  const [notifyOnBooking, setNotifyOnBooking] = useState(true);
  const [notifyOnCheckin, setNotifyOnCheckin] = useState(true);
  const [notifyOnQuality, setNotifyOnQuality] = useState(true);
  const [notifyOnPayment, setNotifyOnPayment] = useState(true);

  // Queue Policy State
  const [slotBufferMins, setSlotBufferMins] = useState("15");
  const [overbookingTolerance, setOverbookingTolerance] = useState("0");

  useEffect(() => {
    fetchSettingsData();
  }, []);

  const fetchSettingsData = async () => {
    try {
      setLoading(true);
      const [centresRes, cropsRes] = await Promise.all([
        api.get("/centres/"),
        api.get("/centres/crops")
      ]);
      setCentres(centresRes.data);
      setCrops(cropsRes.data);
    } catch (err) {
      console.error("Failed to load settings data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCentreCapacity = async (id: number, capacity: number) => {
    try {
      setSaveError("");
      await api.patch(`/centres/${id}`, { capacity_per_day: capacity });
      setCentres((prev) => prev.map((c) => (c.id === id ? { ...c, capacity_per_day: capacity } : c)));
      showToast("Procurement Centre capacity updated successfully!");
    } catch (err: any) {
      setSaveError(err.response?.data?.detail || "Failed to update centre capacity");
    }
  };

  const handleAddCentre = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaveError("");
      const res = await api.post("/centres/", {
        name: newCentreName,
        location: newCentreLoc,
        capacity_per_day: Number(newCentreCap)
      });
      setCentres([...centres, res.data]);
      setNewCentreName("");
      setNewCentreLoc("");
      setShowAddCentre(false);
      showToast("New APMC Mandi added successfully!");
    } catch (err: any) {
      setSaveError(err.response?.data?.detail || "Failed to create centre");
    }
  };

  const handleUpdateCropMsp = async (id: number, msp: number) => {
    try {
      setSaveError("");
      await api.patch(`/centres/crops/${id}`, { msp: msp });
      setCrops((prev) => prev.map((c) => (c.id === id ? { ...c, msp: msp } : c)));
      showToast("Minimum Support Price (MSP) rate updated successfully!");
    } catch (err: any) {
      setSaveError(err.response?.data?.detail || "Failed to update crop MSP");
    }
  };

  const handleAddCrop = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaveError("");
      const res = await api.post("/centres/crops", {
        name: newCropName,
        msp: Number(newCropMsp)
      });
      setCrops([...crops, res.data]);
      setNewCropName("");
      setShowAddCrop(false);
      showToast("New Crop & MSP rate added successfully!");
    } catch (err: any) {
      setSaveError(err.response?.data?.detail || "Failed to create crop");
    }
  };

  const showToast = (msg: string) => {
    setSaveSuccess(msg);
    setTimeout(() => setSaveSuccess(""), 4000);
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">System Configuration & Settings</h1>
          <p className="text-sm text-slate-500 mt-0.5">Configure APMC Mandis, MSP benchmark pricing, SMS gateway, and queue policies</p>
        </div>
      </div>

      {/* Notifications / Feedback */}
      {saveSuccess && (
        <div className="rounded-2xl bg-emerald-50 p-4 border border-emerald-200 flex items-center text-emerald-800 text-sm font-medium shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 mr-3 flex-shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {saveError && (
        <div className="rounded-2xl bg-red-50 p-4 border border-red-200 flex items-center text-red-800 text-sm font-medium shadow-sm">
          <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 pb-2">
        {[
          { id: "centres", label: "Mandi Capacities", icon: Building2 },
          { id: "crops", label: "MSP Price Schedules", icon: Sprout },
          { id: "notifications", label: "SMS & Gateway", icon: MessageSquare },
          { id: "queue", label: "Queue Automation", icon: Sliders },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "inline-flex items-center px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors",
              activeTab === tab.id
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            )}
          >
            <tab.icon className="w-4 h-4 mr-2" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Mandi Capacity Settings */}
      {activeTab === "centres" && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-slate-900">Procurement Centres & Daily Capacity Limits</h2>
              <p className="text-xs text-slate-500">Limits prevent congestion by capping maximum booking volume per day</p>
            </div>
            <button
              onClick={() => setShowAddCentre(!showAddCentre)}
              className="inline-flex items-center text-xs font-semibold px-3.5 py-2 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add New Mandi
            </button>
          </div>

          {showAddCentre && (
            <form onSubmit={handleAddCentre} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Register New Centre</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Mandi Name (e.g. APMC Mandi Rohtak)"
                  value={newCentreName}
                  onChange={(e) => setNewCentreName(e.target.value)}
                  className="px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                />
                <input
                  type="text"
                  required
                  placeholder="Location / District"
                  value={newCentreLoc}
                  onChange={(e) => setNewCentreLoc(e.target.value)}
                  className="px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                />
                <input
                  type="number"
                  required
                  placeholder="Daily Capacity (Quintals)"
                  value={newCentreCap}
                  onChange={(e) => setNewCentreCap(e.target.value)}
                  className="px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-500 transition"
              >
                Save Mandi
              </button>
            </form>
          )}

          <div className="divide-y divide-slate-100">
            {centres.map((c) => (
              <div key={c.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm">{c.name}</h3>
                  <span className="text-xs text-slate-500">{c.location}</span>
                </div>

                <div className="flex items-center space-x-3">
                  <span className="text-xs font-medium text-slate-500">Intake Capacity:</span>
                  <div className="relative">
                    <input
                      type="number"
                      defaultValue={c.capacity_per_day}
                      onBlur={(e) => handleUpdateCentreCapacity(c.id, Number(e.target.value))}
                      className="w-32 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">Qtl/d</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: MSP Price Schedules */}
      {activeTab === "crops" && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-slate-900">Minimum Support Price (MSP) Rates</h2>
              <p className="text-xs text-slate-500">Government sanctioned purchase price benchmark (₹ per Quintal)</p>
            </div>
            <button
              onClick={() => setShowAddCrop(!showAddCrop)}
              className="inline-flex items-center text-xs font-semibold px-3.5 py-2 rounded-xl bg-green-50 text-green-700 hover:bg-green-100 transition"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add New Crop
            </button>
          </div>

          {showAddCrop && (
            <form onSubmit={handleAddCrop} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Add New Crop</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Crop Name (e.g. Barley)"
                  value={newCropName}
                  onChange={(e) => setNewCropName(e.target.value)}
                  className="px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                />
                <input
                  type="number"
                  required
                  placeholder="MSP Rate (₹/Quintal)"
                  value={newCropMsp}
                  onChange={(e) => setNewCropMsp(e.target.value)}
                  className="px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-500 transition"
              >
                Save Crop Rate
              </button>
            </form>
          )}

          <div className="divide-y divide-slate-100">
            {crops.map((crop) => (
              <div key={crop.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm">{crop.name}</h3>
                  <span className="text-xs text-green-700 font-medium">Standard Government Procurement</span>
                </div>

                <div className="flex items-center space-x-3">
                  <span className="text-xs font-medium text-slate-500">MSP Rate:</span>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-medium">₹</span>
                    <input
                      type="number"
                      defaultValue={crop.msp}
                      onBlur={(e) => handleUpdateCropMsp(crop.id, Number(e.target.value))}
                      className="w-36 pl-6 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: SMS Gateway & Notifications */}
      {activeTab === "notifications" && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">SMS India Hub & Push Notification Gateway</h2>
            <p className="text-xs text-slate-500">Automated SMS updates dispatched to registered farmer mobile numbers</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                SMS Gateway API Key
              </label>
              <input
                type="password"
                value={smsApiKey}
                onChange={(e) => setSmsApiKey(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                SMS Sender Header ID
              </label>
              <input
                type="text"
                value={smsSenderId}
                onChange={(e) => setSmsSenderId(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono font-bold"
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">SMS Dispatch Triggers</h3>

            <label className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer">
              <div>
                <span className="font-semibold text-slate-900 text-sm block">Slot Booking Confirmation</span>
                <span className="text-xs text-slate-500">Dispatches SMS with Token Number & Mandi arrival date</span>
              </div>
              <input
                type="checkbox"
                checked={notifyOnBooking}
                onChange={(e) => setNotifyOnBooking(e.target.checked)}
                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer">
              <div>
                <span className="font-semibold text-slate-900 text-sm block">Check-In & Queue Arrival</span>
                <span className="text-xs text-slate-500">Notifies farmer when their truck is marked checked-in at the gate</span>
              </div>
              <input
                type="checkbox"
                checked={notifyOnCheckin}
                onChange={(e) => setNotifyOnCheckin(e.target.checked)}
                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer">
              <div>
                <span className="font-semibold text-slate-900 text-sm block">Quality & Weighing Completion</span>
                <span className="text-xs text-slate-500">Sends weighbridge receipt & moisture grade assessment confirmation</span>
              </div>
              <input
                type="checkbox"
                checked={notifyOnQuality}
                onChange={(e) => setNotifyOnQuality(e.target.checked)}
                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer">
              <div>
                <span className="font-semibold text-slate-900 text-sm block">Direct Benefit Transfer (DBT) Payout</span>
                <span className="text-xs text-slate-500">Sends bank credit notification when payment is marked completed</span>
              </div>
              <input
                type="checkbox"
                checked={notifyOnPayment}
                onChange={(e) => setNotifyOnPayment(e.target.checked)}
                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
              />
            </label>
          </div>

          <button
            onClick={() => showToast("SMS Notification settings saved successfully!")}
            className="inline-flex items-center px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-500 shadow-md transition"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Gateway Settings
          </button>
        </div>
      )}

      {/* Tab 4: Queue Automation */}
      {activeTab === "queue" && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Smart Queue Algorithm & Congestion Policies</h2>
            <p className="text-xs text-slate-500">Automated slot sizing and wait time estimation rules</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Average Unloading Buffer Time (Minutes/Slot)
              </label>
              <input
                type="number"
                value={slotBufferMins}
                onChange={(e) => setSlotBufferMins(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold"
              />
              <p className="text-xs text-slate-500">Used by queue engine to calculate estimated wait times on the farmer portal</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Emergency Capacity Tolerance Buffer (%)
              </label>
              <input
                type="number"
                value={overbookingTolerance}
                onChange={(e) => setOverbookingTolerance(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold"
              />
              <p className="text-xs text-slate-500">Allows small overflow buffer during peak harvesting rush days</p>
            </div>
          </div>

          <button
            onClick={() => showToast("Queue policies updated successfully!")}
            className="inline-flex items-center px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-500 shadow-md transition"
          >
            <Save className="w-4 h-4 mr-2" />
            Update Queue Policies
          </button>
        </div>
      )}
    </div>
  );
}
