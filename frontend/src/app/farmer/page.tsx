"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar, Sprout, MapPin, Plus, CheckCircle2, AlertCircle, Clock, ShieldAlert, ArrowRight, User } from "lucide-react";
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

interface Booking {
  id: number;
  token_number: string;
  booking_date: string;
  quantity_expected: number;
  quantity_actual?: number;
  status: string;
  payment_status: string;
  centre?: Centre;
  crop?: Crop;
}

export default function FarmerDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [centres, setCentres] = useState<Centre[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingMode, setBookingMode] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Slot Form State
  const [selectedCentre, setSelectedCentre] = useState<number>(1);
  const [selectedCrop, setSelectedCrop] = useState<number>(1);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [quantity, setQuantity] = useState<string>("50");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  useEffect(() => {
    const userStored = localStorage.getItem("user");
    if (userStored) {
      try {
        setCurrentUser(JSON.parse(userStored));
      } catch (e) {
        console.error(e);
      }
    }
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [bookingsRes, centresRes, cropsRes] = await Promise.all([
        api.get("/bookings/my-bookings"),
        api.get("/centres/"),
        api.get("/centres/crops")
      ]);

      setBookings(bookingsRes.data);
      setCentres(centresRes.data);
      setCrops(cropsRes.data);
      if (centresRes.data.length > 0) setSelectedCentre(centresRes.data[0].id);
      if (cropsRes.data.length > 0) setSelectedCrop(cropsRes.data[0].id);
    } catch (error) {
      console.error("Failed to load initial data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setFormError("");
    setFormSuccess("");

    try {
      const payload = {
        centre_id: Number(selectedCentre),
        crop_id: Number(selectedCrop),
        booking_date: new Date(selectedDate).toISOString(),
        quantity_expected: parseFloat(quantity)
      };

      const response = await api.post("/bookings/", payload);
      setFormSuccess(`Slot booked successfully! Your Token Number is: ${response.data.token_number}`);
      
      // Refresh bookings
      const updatedBookings = await api.get("/bookings/my-bookings");
      setBookings(updatedBookings.data);

      setTimeout(() => {
        setBookingMode(false);
        setFormSuccess("");
      }, 2500);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setFormError(detail || "Failed to book slot. Please verify capacity and try again.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "checked_in":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "weighing":
      case "quality_check":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "rejected":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Farmer Greeting Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <User className="w-3.5 h-3.5" />
            <span>Verified Farmer Profile</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome, {currentUser?.full_name || "Farmer"}
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Mobile: +91 {currentUser?.phone_number || "9876543210"}
          </p>
        </div>
        <button
          onClick={() => { setBookingMode(!bookingMode); setFormError(""); setFormSuccess(""); }}
          className="inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-semibold bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-600/30 transition"
        >
          {bookingMode ? "View My Bookings" : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Book New Slot
            </>
          )}
        </button>
      </div>

      {/* Booking Form Modal/Card */}
      {bookingMode && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 transition-all">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Book Procurement Slot</h2>
              <p className="text-sm text-slate-500">Smart capacity checking will verify slot availability in real time</p>
            </div>
          </div>

          <form onSubmit={handleCreateBooking} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Select Procurement Centre (Mandi)
                </label>
                <select
                  value={selectedCentre}
                  onChange={(e) => setSelectedCentre(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {centres.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Cap: {c.capacity_per_day} Qtl/day)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Select Crop
                </label>
                <select
                  value={selectedCrop}
                  onChange={(e) => setSelectedCrop(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {crops.map((crop) => (
                    <option key={crop.id} value={crop.id}>
                      {crop.name} (MSP: ₹{crop.msp}/Qtl)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Preferred Date
                </label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split("T")[0]}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Estimated Quantity (Quintals)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="0.5"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="e.g. 50"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {formError && (
              <div className="rounded-xl bg-red-50 p-4 border border-red-200 flex items-start text-red-800 text-sm">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2.5 flex-shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="rounded-xl bg-green-50 p-4 border border-green-200 flex items-start text-green-800 text-sm font-medium">
                <CheckCircle2 className="h-5 w-5 text-green-500 mr-2.5 flex-shrink-0 mt-0.5" />
                <span>{formSuccess}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitLoading || !quantity}
              className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/20 disabled:opacity-50"
            >
              {submitLoading ? "Checking Capacity & Allocating Token..." : "Confirm Slot Booking"}
            </button>
          </form>
        </div>
      )}

      {/* Bookings List Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Your Scheduled & Past Bookings</h2>

        {loading ? (
          <div className="text-center py-12 text-slate-500 text-sm">Loading your slot details...</div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 border-dashed p-8">
            <Calendar className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <h3 className="text-base font-semibold text-slate-800">No active bookings found</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              You haven't booked any procurement slot yet. Click the "Book New Slot" button above to reserve a date.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {bookings.map((b) => (
              <div
                key={b.id}
                className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div className="flex items-center space-x-3">
                    <span className="font-mono text-sm font-bold bg-slate-100 border border-slate-200 text-slate-800 px-3 py-1.5 rounded-lg">
                      {b.token_number}
                    </span>
                    <span className={cn("text-xs font-semibold px-3 py-1 rounded-full border", getStatusBadge(b.status))}>
                      {b.status.replace("_", " ").toUpperCase()}
                    </span>
                  </div>
                  <div className="text-sm text-slate-500">
                    Scheduled Date: <strong className="text-slate-800 font-semibold">{format(new Date(b.booking_date), "dd MMM yyyy")}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-sm">
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">Procurement Centre</span>
                    <span className="font-semibold text-slate-800 mt-0.5 block flex items-center">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 mr-1" />
                      {b.centre?.name || "APMC Mandi Karnal"}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs text-slate-400 block font-medium">Crop & Quantity</span>
                    <span className="font-semibold text-slate-800 mt-0.5 block flex items-center">
                      <Sprout className="w-3.5 h-3.5 text-green-600 mr-1" />
                      {b.crop?.name || "Wheat"} &bull; {b.quantity_expected} Qtl
                    </span>
                  </div>

                  <div>
                    <span className="text-xs text-slate-400 block font-medium">Payment Status</span>
                    <span className={cn(
                      "font-semibold mt-0.5 block capitalize",
                      b.payment_status === "completed" ? "text-emerald-600" :
                      b.payment_status === "processing" ? "text-indigo-600" : "text-amber-600"
                    )}>
                      {b.payment_status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
