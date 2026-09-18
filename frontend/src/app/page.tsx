"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  User, 
  LogIn, 
  UserPlus, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck, 
  Sprout, 
  ArrowRight, 
  ArrowLeft, 
  MessageSquare, 
  KeyRound, 
  RefreshCw, 
  Phone,
  Sparkles
} from "lucide-react";
import api from "@/lib/api";

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const router = useRouter();

  // ----------------------------------------------------
  // Login State
  // ----------------------------------------------------
  const [loginStep, setLoginStep] = useState<"phone" | "otp">("phone");
  const [loginPhone, setLoginPhone] = useState("");
  const [loginOtp, setLoginOtp] = useState("");
  const [loginDevOtp, setLoginDevOtp] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginCooldown, setLoginCooldown] = useState(0);

  // ----------------------------------------------------
  // Register State
  // ----------------------------------------------------
  const [regStep, setRegStep] = useState<"details" | "otp">("details");
  const [fullName, setFullName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [aadhaar, setAadhaar] = useState("");
  const [stateName, setStateName] = useState("Haryana");
  const [district, setDistrict] = useState("Karnal");
  const [landAcres, setLandAcres] = useState("5");
  const [regOtp, setRegOtp] = useState("");
  const [regDevOtp, setRegDevOtp] = useState<string | null>(null);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState("");
  const [regSuccess, setRegSuccess] = useState("");
  const [regCooldown, setRegCooldown] = useState(0);

  // Auto-focus OTP ref
  const loginOtpInputRef = useRef<HTMLInputElement>(null);
  const regOtpInputRef = useRef<HTMLInputElement>(null);

  // Cooldown timer interval
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (loginCooldown > 0) {
      timer = setInterval(() => setLoginCooldown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [loginCooldown]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (regCooldown > 0) {
      timer = setInterval(() => setRegCooldown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [regCooldown]);

  // Focus OTP input when transitioning to OTP step
  useEffect(() => {
    if (loginStep === "otp") {
      setTimeout(() => loginOtpInputRef.current?.focus(), 100);
    }
  }, [loginStep]);

  useEffect(() => {
    if (regStep === "otp") {
      setTimeout(() => regOtpInputRef.current?.focus(), 100);
    }
  }, [regStep]);

  // ----------------------------------------------------
  // LOGIN HANDLERS
  // ----------------------------------------------------

  // Step 1: Send Login OTP
  const handleSendLoginOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (loginPhone.trim().length !== 10) {
      setLoginError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setLoginLoading(true);
    setLoginError("");

    try {
      const res = await api.post("/auth/send-otp", {
        phone_number: loginPhone.trim(),
        purpose: "login"
      });

      setLoginDevOtp(res.data.dev_otp || "123456");
      setLoginStep("otp");
      setLoginCooldown(30);
      setLoginOtp("");
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (detail) {
        setLoginError(detail);
      } else if (err.message?.includes("Network Error") || !err.response) {
        setLoginError("Cannot connect to backend server. Please ensure FastAPI server is running on port 8000.");
      } else {
        setLoginError("Failed to send verification code. Please check your mobile number.");
      }
    } finally {
      setLoginLoading(false);
    }
  };

  // Step 2: Verify Login OTP & Authenticate
  const handleVerifyLoginOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loginOtp.trim().length < 6) {
      setLoginError("Please enter the 6-digit verification code sent to your phone.");
      return;
    }

    setLoginLoading(true);
    setLoginError("");

    try {
      const response = await api.post("/auth/verify-otp", {
        phone_number: loginPhone.trim(),
        otp: loginOtp.trim(),
        purpose: "login"
      });

      const { access_token, user } = response.data;
      localStorage.setItem("token", access_token);
      localStorage.setItem("user", JSON.stringify(user));

      if (user.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/farmer");
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (detail) {
        setLoginError(detail);
      } else {
        setLoginError("Invalid verification code. Please try again.");
      }
    } finally {
      setLoginLoading(false);
    }
  };

  // ----------------------------------------------------
  // REGISTRATION HANDLERS
  // ----------------------------------------------------

  // Step 1: Send Registration OTP
  const handleSendRegisterOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");
    setRegSuccess("");

    if (!fullName.trim()) {
      setRegError("Please enter your full name.");
      return;
    }
    if (regPhone.trim().length !== 10) {
      setRegError("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (aadhaar.trim().length !== 12) {
      setRegError("Aadhaar number must be exactly 12 digits.");
      return;
    }

    setRegLoading(true);

    try {
      const res = await api.post("/auth/send-otp", {
        phone_number: regPhone.trim(),
        purpose: "register"
      });

      setRegDevOtp(res.data.dev_otp || "123456");
      setRegStep("otp");
      setRegCooldown(30);
      setRegOtp("");
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (detail) {
        setRegError(detail);
      } else if (err.message?.includes("Network Error") || !err.response) {
        setRegError("Cannot connect to backend server. Please ensure FastAPI server is running on port 8000.");
      } else {
        setRegError("Failed to initiate registration OTP. Please verify details.");
      }
    } finally {
      setRegLoading(false);
    }
  };

  // Step 2: Complete Registration with OTP
  const handleCompleteRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regOtp.trim().length < 6) {
      setRegError("Please enter the 6-digit verification code sent via SMS.");
      return;
    }

    setRegLoading(true);
    setRegError("");
    setRegSuccess("");

    try {
      const payload = {
        phone_number: regPhone.trim(),
        full_name: fullName.trim(),
        otp: regOtp.trim(),
        aadhaar: aadhaar.trim(),
        state: stateName,
        district: district.trim(),
        land_acres: parseFloat(landAcres) || 1.0
      };

      const response = await api.post("/auth/register", payload);
      const { access_token, user } = response.data;

      localStorage.setItem("token", access_token);
      localStorage.setItem("user", JSON.stringify(user));

      setRegSuccess("Registration verified & completed! Redirecting to your Kisan Dashboard...");
      setTimeout(() => {
        router.push("/farmer");
      }, 1000);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (detail) {
        setRegError(detail);
      } else {
        setRegError("Failed to verify code and register. Please try again.");
      }
    } finally {
      setRegLoading(false);
    }
  };

  // Demo shortcut helper
  const fillDemo = (phone: string) => {
    setLoginPhone(phone);
    setActiveTab("login");
    setLoginStep("phone");
    setLoginError("");
    setLoginOtp("");
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-600/30 mb-4">
          <Sprout className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Procurement Centre Portal
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Department of Consumer Affairs (DoCA) &bull; Smart Automation System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-slate-800/90 backdrop-blur border border-slate-700/80 shadow-2xl rounded-2xl p-6 sm:p-8">
          
          {/* Tab Switcher */}
          <div className="flex bg-slate-900/80 p-1 rounded-xl mb-6 border border-slate-700">
            <button
              type="button"
              onClick={() => { 
                setActiveTab("login"); 
                setLoginError(""); 
                setLoginStep("phone");
              }}
              className={`flex-1 flex items-center justify-center py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
                activeTab === "login"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <LogIn className="w-4 h-4 mr-2" />
              Sign In (SMS OTP)
            </button>
            <button
              type="button"
              onClick={() => { 
                setActiveTab("register"); 
                setRegError(""); 
                setRegStep("details");
              }}
              className={`flex-1 flex items-center justify-center py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
                activeTab === "register"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Farmer Registration
            </button>
          </div>

          {/* ==================================================== */}
          {/* LOGIN TAB */}
          {/* ==================================================== */}
          {activeTab === "login" && (
            <div>
              {/* STEP 1: Enter Phone Number */}
              {loginStep === "phone" && (
                <form className="space-y-5" onSubmit={handleSendLoginOtp}>
                  <div>
                    <label htmlFor="login-phone" className="block text-sm font-medium text-slate-200">
                      Registered Mobile Number
                    </label>
                    <p className="text-xs text-slate-400 mt-0.5 mb-2">
                      We will send a 6-digit OTP code to verify your identity.
                    </p>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 text-sm font-semibold">
                        +91
                      </span>
                      <input
                        id="login-phone"
                        type="tel"
                        required
                        maxLength={10}
                        value={loginPhone}
                        onChange={(e) => setLoginPhone(e.target.value.replace(/\D/g, ""))}
                        className="block w-full pl-14 pr-4 py-3 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-base tracking-wider font-mono transition"
                        placeholder="98765 43210"
                      />
                    </div>
                  </div>

                  {loginError && (
                    <div className="rounded-xl bg-red-950/60 p-4 border border-red-800/80 flex items-start text-red-200 text-sm animate-in fade-in duration-200">
                      <AlertCircle className="h-5 w-5 text-red-400 mr-2.5 flex-shrink-0 mt-0.5" />
                      <span>{loginError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loginLoading || loginPhone.length !== 10}
                    className="w-full flex items-center justify-center py-3.5 px-4 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500 transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loginLoading ? (
                      <span className="flex items-center">
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Sending OTP SMS...
                      </span>
                    ) : (
                      <>
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Send OTP via SMS
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </button>

                  {/* Demo Quick Logins */}
                  <div className="pt-4 border-t border-slate-700/80">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center">
                      <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                      Quick Demo Accounts (Click to Fill):
                    </p>
                    <div className="flex flex-col gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => fillDemo("9999999999")}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/80 hover:bg-slate-700/60 border border-slate-700 text-slate-300 transition text-left"
                      >
                        <div className="flex items-center">
                          <ShieldCheck className="w-4 h-4 text-indigo-400 mr-2" />
                          <span><strong>Admin Officer:</strong> 9999999999 (DoCA)</span>
                        </div>
                        <span className="text-indigo-400 text-[11px] font-medium">Select</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => fillDemo("9876543210")}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/80 hover:bg-slate-700/60 border border-slate-700 text-slate-300 transition text-left"
                      >
                        <div className="flex items-center">
                          <User className="w-4 h-4 text-green-400 mr-2" />
                          <span><strong>Farmer:</strong> 9876543210 (Ramesh Kumar)</span>
                        </div>
                        <span className="text-green-400 text-[11px] font-medium">Select</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => fillDemo("9876543211")}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/80 hover:bg-slate-700/60 border border-slate-700 text-slate-300 transition text-left"
                      >
                        <div className="flex items-center">
                          <User className="w-4 h-4 text-green-400 mr-2" />
                          <span><strong>Farmer:</strong> 9876543211 (Suresh Patel)</span>
                        </div>
                        <span className="text-green-400 text-[11px] font-medium">Select</span>
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* STEP 2: Enter OTP Code */}
              {loginStep === "otp" && (
                <form className="space-y-5" onSubmit={handleVerifyLoginOtp}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-medium text-slate-400">Mobile Number</span>
                      <p className="text-sm font-semibold text-white font-mono flex items-center">
                        <Phone className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
                        +91 {loginPhone}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setLoginStep("phone"); setLoginError(""); }}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center hover:underline"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                      Change Number
                    </button>
                  </div>

                  <div>
                    <label htmlFor="login-otp" className="block text-sm font-medium text-slate-200">
                      Enter 6-Digit SMS Verification Code
                    </label>
                    <div className="mt-2 relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                        <KeyRound className="h-5 w-5 text-indigo-400" />
                      </span>
                      <input
                        ref={loginOtpInputRef}
                        id="login-otp"
                        type="text"
                        required
                        maxLength={6}
                        value={loginOtp}
                        onChange={(e) => setLoginOtp(e.target.value.replace(/\D/g, ""))}
                        className="block w-full pl-12 pr-4 py-3 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xl tracking-[0.4em] font-mono font-bold text-center transition"
                        placeholder="••••••"
                      />
                    </div>
                  </div>

                  {/* Dev / Demo Mode OTP Helper */}
                  {loginDevOtp && (
                    <div className="p-3 bg-indigo-950/50 border border-indigo-700/50 rounded-xl flex items-center justify-between text-xs text-indigo-200">
                      <div className="flex items-center">
                        <MessageSquare className="w-4 h-4 mr-2 text-indigo-400 flex-shrink-0" />
                        <span>
                          SMS Code: <strong className="font-mono text-white text-sm bg-indigo-900/70 px-1.5 py-0.5 rounded border border-indigo-600/40 ml-1">{loginDevOtp}</strong>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLoginOtp(loginDevOtp)}
                        className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded-lg transition"
                      >
                        Autofill
                      </button>
                    </div>
                  )}

                  {loginError && (
                    <div className="rounded-xl bg-red-950/60 p-4 border border-red-800/80 flex items-start text-red-200 text-sm animate-in fade-in duration-200">
                      <AlertCircle className="h-5 w-5 text-red-400 mr-2.5 flex-shrink-0 mt-0.5" />
                      <span>{loginError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loginLoading || loginOtp.length !== 6}
                    className="w-full flex items-center justify-center py-3.5 px-4 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500 transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loginLoading ? (
                      <span className="flex items-center">
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Verifying OTP...
                      </span>
                    ) : (
                      <>
                        Verify OTP & Enter Portal
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </button>

                  {/* Resend OTP */}
                  <div className="text-center pt-2">
                    {loginCooldown > 0 ? (
                      <p className="text-xs text-slate-400">
                        Resend code in <span className="text-indigo-400 font-semibold font-mono">{loginCooldown}s</span>
                      </p>
                    ) : (
                      <button
                        type="button"
                        disabled={loginLoading}
                        onClick={() => handleSendLoginOtp()}
                        className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 hover:underline flex items-center justify-center mx-auto"
                      >
                        <RefreshCw className="w-3.5 h-3.5 mr-1" />
                        Resend OTP SMS
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ==================================================== */}
          {/* REGISTRATION TAB */}
          {/* ==================================================== */}
          {activeTab === "register" && (
            <div>
              {/* STEP 1: Enter Registration Details */}
              {regStep === "details" && (
                <form className="space-y-4" onSubmit={handleSendRegisterOtp}>
                  <div>
                    <label htmlFor="reg-name" className="block text-sm font-medium text-slate-200">
                      Farmer Full Name (As per Aadhaar)
                    </label>
                    <input
                      id="reg-name"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="mt-1.5 block w-full px-4 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                      placeholder="e.g. Ramesh Kumar"
                    />
                  </div>

                  <div>
                    <label htmlFor="reg-phone" className="block text-sm font-medium text-slate-200">
                      Mobile Number (For SMS Verification)
                    </label>
                    <div className="mt-1.5 relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 text-sm font-medium">
                        +91
                      </span>
                      <input
                        id="reg-phone"
                        type="tel"
                        required
                        maxLength={10}
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value.replace(/\D/g, ""))}
                        className="block w-full pl-12 pr-4 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium font-mono"
                        placeholder="10-digit mobile number"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="reg-aadhaar" className="block text-sm font-medium text-slate-200">
                      Aadhaar Card Number (12 Digits)
                    </label>
                    <input
                      id="reg-aadhaar"
                      type="text"
                      required
                      maxLength={12}
                      value={aadhaar}
                      onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, ""))}
                      className="mt-1.5 block w-full px-4 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium font-mono tracking-wider"
                      placeholder="123456789012"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-200">State</label>
                      <select
                        value={stateName}
                        onChange={(e) => setStateName(e.target.value)}
                        className="mt-1.5 block w-full px-3 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="Haryana">Haryana</option>
                        <option value="Punjab">Punjab</option>
                        <option value="Uttar Pradesh">Uttar Pradesh</option>
                        <option value="Rajasthan">Rajasthan</option>
                        <option value="Madhya Pradesh">Madhya Pradesh</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-200">District</label>
                      <input
                        type="text"
                        required
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        className="mt-1.5 block w-full px-3 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-200">
                      Land Holding (in Acres)
                    </label>
                    <input
                      type="number"
                      min="0.5"
                      step="0.5"
                      required
                      value={landAcres}
                      onChange={(e) => setLandAcres(e.target.value)}
                      className="mt-1.5 block w-full px-4 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  </div>

                  {regError && (
                    <div className="rounded-xl bg-red-950/60 p-4 border border-red-800/80 flex items-start text-red-200 text-sm animate-in fade-in duration-200">
                      <AlertCircle className="h-5 w-5 text-red-400 mr-2.5 flex-shrink-0 mt-0.5" />
                      <span>{regError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={regLoading || !regPhone || !fullName || !aadhaar}
                    className="w-full flex items-center justify-center py-3.5 px-4 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-green-500 transition-all shadow-lg shadow-green-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {regLoading ? (
                      <span className="flex items-center">
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Sending Verification OTP...
                      </span>
                    ) : (
                      <>
                        Verify Phone via SMS OTP
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* STEP 2: Verify Registration OTP */}
              {regStep === "otp" && (
                <form className="space-y-5" onSubmit={handleCompleteRegister}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-medium text-slate-400">Verifying Farmer Registration</span>
                      <p className="text-sm font-semibold text-white font-mono flex items-center">
                        <Phone className="w-3.5 h-3.5 mr-1.5 text-green-400" />
                        +91 {regPhone} &bull; {fullName}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setRegStep("details"); setRegError(""); }}
                      className="text-xs text-green-400 hover:text-green-300 font-medium flex items-center hover:underline"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                      Edit Details
                    </button>
                  </div>

                  <div>
                    <label htmlFor="reg-otp" className="block text-sm font-medium text-slate-200">
                      Enter 6-Digit SMS Verification Code
                    </label>
                    <div className="mt-2 relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                        <KeyRound className="h-5 w-5 text-green-400" />
                      </span>
                      <input
                        ref={regOtpInputRef}
                        id="reg-otp"
                        type="text"
                        required
                        maxLength={6}
                        value={regOtp}
                        onChange={(e) => setRegOtp(e.target.value.replace(/\D/g, ""))}
                        className="block w-full pl-12 pr-4 py-3 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-xl tracking-[0.4em] font-mono font-bold text-center transition"
                        placeholder="••••••"
                      />
                    </div>
                  </div>

                  {/* Dev / Demo Mode Helper */}
                  {regDevOtp && (
                    <div className="p-3 bg-green-950/50 border border-green-700/50 rounded-xl flex items-center justify-between text-xs text-green-200">
                      <div className="flex items-center">
                        <MessageSquare className="w-4 h-4 mr-2 text-green-400 flex-shrink-0" />
                        <span>
                          SMS Code: <strong className="font-mono text-white text-sm bg-green-900/70 px-1.5 py-0.5 rounded border border-green-600/40 ml-1">{regDevOtp}</strong>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRegOtp(regDevOtp)}
                        className="text-xs font-semibold bg-green-600 hover:bg-green-500 text-white px-2.5 py-1 rounded-lg transition"
                      >
                        Autofill
                      </button>
                    </div>
                  )}

                  {regError && (
                    <div className="rounded-xl bg-red-950/60 p-4 border border-red-800/80 flex items-start text-red-200 text-sm animate-in fade-in duration-200">
                      <AlertCircle className="h-5 w-5 text-red-400 mr-2.5 flex-shrink-0 mt-0.5" />
                      <span>{regError}</span>
                    </div>
                  )}

                  {regSuccess && (
                    <div className="rounded-xl bg-green-950/60 p-4 border border-green-800/80 flex items-start text-green-200 text-sm animate-in fade-in duration-200">
                      <CheckCircle2 className="h-5 w-5 text-green-400 mr-2.5 flex-shrink-0 mt-0.5" />
                      <span>{regSuccess}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={regLoading || regOtp.length !== 6}
                    className="w-full flex items-center justify-center py-3.5 px-4 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-green-500 transition-all shadow-lg shadow-green-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {regLoading ? (
                      <span className="flex items-center">
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Completing Registration...
                      </span>
                    ) : (
                      <>
                        Verify & Complete Registration
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </button>

                  {/* Resend OTP */}
                  <div className="text-center pt-2">
                    {regCooldown > 0 ? (
                      <p className="text-xs text-slate-400">
                        Resend code in <span className="text-green-400 font-semibold font-mono">{regCooldown}s</span>
                      </p>
                    ) : (
                      <button
                        type="button"
                        disabled={regLoading}
                        onClick={(e) => handleSendRegisterOtp(e as any)}
                        className="text-xs font-semibold text-green-400 hover:text-green-300 hover:underline flex items-center justify-center mx-auto"
                      >
                        <RefreshCw className="w-3.5 h-3.5 mr-1" />
                        Resend OTP SMS
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
