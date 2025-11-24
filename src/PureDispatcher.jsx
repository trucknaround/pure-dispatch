import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Truck, Send, User, Volume2, VolumeX, Clock, Zap, Mic, MicOff, MapPin, Fuel, Navigation, Package, Phone, CloudRain, AlertCircle, Building, Mail, RefreshCw, Star, History, Search, Filter, Download, LogOut, ChevronDown, Home, FileText, Upload, Check, X, Eye, Trash2, Lock, LogIn } from 'lucide-react';

// Backend URL
const BACKEND_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:8080'
  : '';

// Text-to-Speech
const forceSpeak = (text, onStart, onEnd) => {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) {
      resolve(false);
      return;
    }
    window.speechSynthesis.cancel();
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      utterance.lang = 'en-US';
      utterance.onstart = () => { if (onStart) onStart(); };
      utterance.onend = () => { if (onEnd) onEnd(); resolve(true); };
      utterance.onerror = () => { if (onEnd) onEnd(); resolve(false); };
      window.speechSynthesis.speak(utterance);
    }, 100);
  });
};

// Speech Recognition
const startListening = (onResult, onEnd, onError) => {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    onError('not-supported');
    return null;
  }
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';
  let hasResult = false;
  recognition.onresult = (event) => {
    hasResult = true;
    const transcript = event.results[0][0].transcript;
    if (onResult) onResult(transcript);
  };
  recognition.onerror = (event) => {
    if (!hasResult && onError) onError(event.error);
  };
  recognition.onend = () => { if (onEnd) onEnd(); };
  try {
    recognition.start();
    return recognition;
  } catch (error) {
    if (onError) onError('start-failed');
    return null;
  }
};

const getMoodColor = (mood) => {
  const colors = {
    tired: 'text-purple-400',
    frustrated: 'text-orange-400',
    positive: 'text-green-400',
    stressed: 'text-red-400',
    neutral: 'text-gray-400'
  };
  return colors[mood] || colors.neutral;
};

const getSkillIcon = (skillName) => {
  const icons = {
    findFuel: Fuel,
    sendNav: Navigation,
    bookLoad: Package,
    callBroker: Phone,
    getWeatherRoute: CloudRain,
    checkWeighStation: AlertCircle,
    logIncident: AlertCircle,
    draftEmail: Mail
  };
  return icons[skillName] || MapPin;
};

// =====================================================
// LOGIN PAGE COMPONENT
// =====================================================
function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }

    setIsLoading(true);
    
    // Mock authentication - in production, call your backend
    setTimeout(() => {
      const savedCarrier = localStorage.getItem('pureCarrier');
      if (savedCarrier) {
        try {
          const carrierData = JSON.parse(savedCarrier);
          // In production, verify email/password match
          onLogin(carrierData);
        } catch (e) {
          setError('Invalid credentials');
        }
      } else {
        // New user - proceed to registration
        onLogin(null);
      }
      setIsLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Truck className="w-8 h-8 text-black" />
          </div>
          <h1 className="text-4xl font-light text-white mb-2">Pure Dispatch</h1>
          <p className="text-gray-400">AI-Powered Virtual Dispatcher</p>
        </div>

        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
          <h2 className="text-2xl font-light text-white mb-6">Login</h2>
          
          {error && (
            <div className="mb-4 bg-red-900/20 border border-red-500 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-gray-800 text-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none placeholder-gray-500"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-gray-800 text-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none placeholder-gray-500"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-green-500 text-black py-3 rounded-full hover:bg-green-400 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400">
              New to Pure Dispatch?{' '}
              <button
                onClick={() => onLogin(null)}
                className="text-green-400 hover:text-green-300 font-medium"
              >
                Register now
              </button>
            </p>
          </div>
        </div>

        <p className="text-xs text-gray-600 text-center mt-6">
          By logging in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}

// =====================================================
// DASHBOARD COMPONENT
// =====================================================
function Dashboard({ carrier, onNavigate, onLogout }) {
  return (
    <div className="min-h-screen bg-black">
      <div className="border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
              <Truck className="w-5 h-5 text-black" />
            </div>
            <div>
              <h1 className="text-2xl font-light text-white">Pure Dispatch</h1>
              <p className="text-sm text-gray-400">{carrier?.companyName || 'Welcome'}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <h2 className="text-3xl font-light text-white mb-8">What would you like to do?</h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          <button
            onClick={() => onNavigate('home')}
            className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-8 text-left hover:from-green-400 hover:to-green-500 transition-all transform hover:scale-105"
          >
            <MessageCircle className="w-12 h-12 text-black mb-4" />
            <h3 className="text-2xl font-medium text-black mb-2">Start Dispatching</h3>
            <p className="text-black/80">Talk to Pure AI and manage your loads</p>
          </button>

          <button
            onClick={() => onNavigate('profile')}
            className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-left hover:border-gray-700 transition-all transform hover:scale-105"
          >
            <User className="w-12 h-12 text-green-400 mb-4" />
            <h3 className="text-2xl font-medium text-white mb-2">Update Profile</h3>
            <p className="text-gray-400">Edit your company information and settings</p>
          </button>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// DOCUMENT UPLOAD SECTION COMPONENT
// =====================================================
function DocumentUploadSection({ title, docType, existingDoc, onUpload, onDelete, icon: Icon }) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    // Simulate upload - in production, upload to your backend/cloud storage
    setTimeout(() => {
      const fileData = {
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date(),
        url: URL.createObjectURL(file) // In production, this would be your cloud storage URL
      };
      onUpload(docType, fileData);
      setIsUploading(false);
    }, 1000);
  };

  return (
    <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-green-400" />
          <h4 className="font-medium text-white">{title}</h4>
        </div>
        {existingDoc && (
          <span className="text-xs bg-green-900/30 text-green-400 px-2 py-1 rounded-full">
            Uploaded
          </span>
        )}
      </div>

      {existingDoc ? (
        <div className="space-y-2">
          <div className="bg-gray-800 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm text-white">{existingDoc.name}</p>
                <p className="text-xs text-gray-500">
                  {(existingDoc.size / 1024).toFixed(1)} KB • {new Date(existingDoc.uploadedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.open(existingDoc.url, '_blank')}
                className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
              >
                <Eye className="w-4 h-4 text-gray-300" />
              </button>
              <button
                onClick={() => onDelete(docType)}
                className="p-2 rounded-lg bg-red-900/30 hover:bg-red-900/50 transition-colors"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            </div>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors text-sm"
          >
            Replace File
          </button>
        </div>
      ) : (
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-full py-3 rounded-lg border-2 border-dashed border-gray-700 hover:border-green-500 bg-gray-800 hover:bg-gray-800/50 transition-all disabled:opacity-50"
        >
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-400">
              {isUploading ? 'Uploading...' : 'Click to upload'}
            </span>
          </div>
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png"
      />
    </div>
  );
}

// =====================================================
// CARRIER REGISTRATION COMPONENT (Enhanced with Trailer Sizes)
// =====================================================
function CarrierRegistration({ onRegistrationComplete, carrier }) {
  const equipmentOptions = ['Dry Van', 'Reefer', 'Flatbed', 'Step Deck', 'Box Truck', 'Tanker'];
  const trailerSizeOptions = ['26ft', '48ft', '53ft'];
  const regionOptions = ['Northeast', 'Southeast', 'Midwest', 'Southwest', 'West', 'All Regions'];
  
  const [formData, setFormData] = useState({
    companyName: carrier?.companyName || '',
    mcNumber: carrier?.mcNumber || '',
    dotNumber: carrier?.dotNumber || '',
    email: carrier?.email || '',
    phone: carrier?.phone || '',
    equipmentTypes: carrier?.equipmentTypes || [],
    trailerSizes: carrier?.trailerSizes || [],
    operatingRegions: carrier?.operatingRegions || []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const toggleEquipment = (equipment) => {
    setFormData(prev => ({
      ...prev,
      equipmentTypes: prev.equipmentTypes.includes(equipment.toLowerCase())
        ? prev.equipmentTypes.filter(e => e !== equipment.toLowerCase())
        : [...prev.equipmentTypes, equipment.toLowerCase()]
    }));
  };

  const toggleTrailerSize = (size) => {
    setFormData(prev => ({
      ...prev,
      trailerSizes: prev.trailerSizes.includes(size)
        ? prev.trailerSizes.filter(s => s !== size)
        : [...prev.trailerSizes, size]
    }));
  };

  const toggleRegion = (region) => {
    setFormData(prev => ({
      ...prev,
      operatingRegions: prev.operatingRegions.includes(region)
        ? prev.operatingRegions.filter(r => r !== region)
        : [...prev.operatingRegions, region]
    }));
  };

  const handleSubmit = async () => {
    setError('');
    if (!formData.companyName || !formData.mcNumber || !formData.dotNumber || !formData.email || !formData.phone) {
      setError('Please fill in all required fields');
      return;
    }
    if (formData.equipmentTypes.length === 0) {
      setError('Please select at least one equipment type');
      return;
    }
    if (formData.trailerSizes.length === 0) {
      setError('Please select at least one trailer size');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/carriers/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (data.success) {
        onRegistrationComplete(data.carrier);
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (err) {
      const mockCarrier = {
        id: carrier?.id || `carrier_${Date.now()}`,
        ...formData,
        status: 'verified',
        apiUsageRemaining: carrier?.apiUsageRemaining || 100,
        apiUsageCount: carrier?.apiUsageCount || 0,
        apiUsageLimit: 100,
        createdAt: carrier?.createdAt || new Date()
      };
      onRegistrationComplete(mockCarrier);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-6 py-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
            <Truck className="w-5 h-5 text-black" />
          </div>
          <div>
            <h1 className="text-2xl font-light text-white">Pure</h1>
            <p className="text-sm text-gray-400">{carrier ? 'Update Profile' : 'Carrier Registration'}</p>
          </div>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-light text-white mb-2">{carrier ? 'Update Your Profile' : 'Register Your Carrier'}</h2>
          <p className="text-gray-400">Get access to Pure's dispatch AI and load board integration.</p>
        </div>
        {error && (
          <div className="mb-6 bg-red-900/20 border border-red-500 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}
        <div className="space-y-6">
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <Building className="w-5 h-5 text-green-400" />
              Company Information
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Company Name *</label>
                <input type="text" value={formData.companyName} onChange={(e) => setFormData(prev => ({...prev, companyName: e.target.value}))} className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-gray-800 text-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none placeholder-gray-500" placeholder="ABC Trucking LLC" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">MC Number *</label>
                  <input type="text" value={formData.mcNumber} onChange={(e) => setFormData(prev => ({...prev, mcNumber: e.target.value}))} className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-gray-800 text-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none placeholder-gray-500" placeholder="MC-123456" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">DOT Number *</label>
                  <input type="text" value={formData.dotNumber} onChange={(e) => setFormData(prev => ({...prev, dotNumber: e.target.value}))} className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-gray-800 text-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none placeholder-gray-500" placeholder="1234567" />
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <Phone className="w-5 h-5 text-green-400" />
              Contact Information
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email Address *</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))} className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-gray-800 text-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none placeholder-gray-500" placeholder="dispatch@company.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number *</label>
                <input type="tel" value={formData.phone} onChange={(e) => setFormData(prev => ({...prev, phone: e.target.value}))} className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-gray-800 text-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none placeholder-gray-500" placeholder="(555) 123-4567" />
              </div>
            </div>
          </div>
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-green-400" />
              Equipment Types *
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {equipmentOptions.map((equipment) => (
                <button key={equipment} type="button" onClick={() => toggleEquipment(equipment)} className={`px-4 py-3 rounded-xl border-2 transition-all ${formData.equipmentTypes.includes(equipment.toLowerCase()) ? 'border-green-500 bg-green-500/10 text-green-400' : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600'}`}>
                  {equipment}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <Truck className="w-5 h-5 text-green-400" />
              Trailer Sizes *
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {trailerSizeOptions.map((size) => (
                <button key={size} type="button" onClick={() => toggleTrailerSize(size)} className={`px-4 py-3 rounded-xl border-2 transition-all ${formData.trailerSizes.includes(size) ? 'border-green-500 bg-green-500/10 text-green-400' : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600'}`}>
                  {size}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-green-400" />
              Operating Regions
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {regionOptions.map((region) => (
                <button key={region} type="button" onClick={() => toggleRegion(region)} className={`px-4 py-3 rounded-xl border-2 transition-all ${formData.operatingRegions.includes(region) ? 'border-green-500 bg-green-500/10 text-green-400' : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600'}`}>
                  {region}
                </button>
              ))}
            </div>
          </div>
          <button onClick={handleSubmit} disabled={isSubmitting} className="w-full bg-green-500 text-black py-4 rounded-full hover:bg-green-400 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors text-lg font-medium">
            {isSubmitting ? (carrier ? 'Updating...' : 'Registering...') : (carrier ? 'Update Profile' : 'Register & Continue')}
          </button>
          <p className="text-xs text-gray-500 text-center">By {carrier ? 'updating' : 'registering'}, you agree to our Terms of Service and Privacy Policy.</p>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// LOAD CARD COMPONENT
// =====================================================
function LoadCard({ load, onClaim, onNav, onFavorite, isFavorited, showStatus, compact }) {
  return (
    <div className={`bg-gray-900 rounded-xl border border-gray-800 ${compact ? 'p-4' : 'p-5'}`}>
      {showStatus && load.status && (
        <div className="mb-3">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            load.status === 'claimed' ? 'bg-green-900/30 text-green-400' : 'bg-gray-800 text-gray-400'
          }`}>
            {load.status === 'claimed' ? '✓ Claimed' : 'Viewed'}
          </span>
        </div>
      )}
      <div className={`flex items-center gap-4 ${compact ? 'mb-3' : 'mb-4'}`}>
        <div className="flex-1">
          <p className="text-xs text-gray-500 mb-1">Origin</p>
          <p className="font-medium text-white">{load.origin.city}, {load.origin.state}</p>
        </div>
        <div className="flex-shrink-0">
          <Navigation className="w-5 h-5 text-green-400" />
        </div>
        <div className="flex-1">
          <p className="text-xs text-gray-500 mb-1">Destination</p>
          <p className="font-medium text-white">{load.destination.city}, {load.destination.state}</p>
        </div>
      </div>
      <div className={`grid grid-cols-3 gap-4 ${compact ? 'mb-3' : 'mb-4'} pb-4 border-b border-gray-800`}>
        <div>
          <p className="text-xs text-gray-500 mb-1">Distance</p>
          <p className="font-medium text-white">{load.distance} mi</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Weight</p>
          <p className="font-medium text-white">{load.weight.toLocaleString()} lbs</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Rate</p>
          <p className="font-medium text-green-400">${load.rate.toLocaleString()}</p>
        </div>
      </div>
      <div className={`grid grid-cols-2 gap-4 ${compact ? 'mb-3' : 'mb-4'}`}>
        <div>
          <p className="text-xs text-gray-500 mb-1">Equipment</p>
          <p className="text-sm text-white">{load.equipment}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Pickup</p>
          <p className="text-sm text-white">{new Date(load.pickupDate).toLocaleDateString()}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => onClaim(load)} className="flex-1 bg-green-500 text-black py-2 rounded-lg hover:bg-green-400 transition-colors text-sm font-medium">
          Book Load
        </button>
        <button onClick={() => onNav(load.origin)} className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors">
          <Navigation className="w-4 h-4 text-green-400" />
        </button>
        <button onClick={() => onFavorite(load)} className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors">
          <Star className={`w-4 h-4 ${isFavorited ? 'text-yellow-400 fill-yellow-400' : 'text-gray-400'}`} />
        </button>
      </div>
    </div>
  );
}

// =====================================================
// MAIN PURE DISPATCHER COMPONENT
// =====================================================
export default function PureDispatcher() {
  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  
  // Existing state
  const [carrier, setCarrier] = useState(null);
  const [currentView, setCurrentView] = useState('home');
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  // Load board state
  const [loads, setLoads] = useState([]);
  const [loadHistory, setLoadHistory] = useState([]);
  const [favoriteLoads, setFavoriteLoads] = useState([]);
  const [isLoadingLoads, setIsLoadingLoads] = useState(false);
  
  // Document state
  const [documents, setDocuments] = useState({
    coi: null,
    noa: null,
    w9: null,
    license: null,
    medicalCard: null,
    other: null,
    pods: [],
    mechanicalIssues: []
  });
  const [podFiles, setPodFiles] = useState([]);
  const [isSubmittingPOD, setIsSubmittingPOD] = useState(false);

  const messagesEndRef = useRef(null);
  const profileMenuRef = useRef(null);
  const recognitionRef = useRef(null);

  // Check for existing session
  useEffect(() => {
    const savedCarrier = localStorage.getItem('pureCarrier');
    const savedDocs = localStorage.getItem('pureDocuments');
    const savedHistory = localStorage.getItem('pureLoadHistory');
    const savedFavorites = localStorage.getItem('pureFavoriteLoads');
    
    if (savedCarrier) {
      try {
        const carrierData = JSON.parse(savedCarrier);
        setCarrier(carrierData);
        setIsRegistered(true);
        setIsLoggedIn(true);
        setShowDashboard(false); // Skip dashboard if already registered
      } catch (e) {
        localStorage.removeItem('pureCarrier');
      }
    }
    
    if (savedDocs) {
      try {
        setDocuments(JSON.parse(savedDocs));
      } catch (e) {
        localStorage.removeItem('pureDocuments');
      }
    }

    if (savedHistory) {
      try {
        setLoadHistory(JSON.parse(savedHistory));
      } catch (e) {
        localStorage.removeItem('pureLoadHistory');
      }
    }

    if (savedFavorites) {
      try {
        setFavoriteLoads(JSON.parse(savedFavorites));
      } catch (e) {
        localStorage.removeItem('pureFavoriteLoads');
      }
    }

    // Check backend health
    fetch(`${BACKEND_URL}/health`)
      .then(res => res.json())
      .then(() => setBackendStatus('connected'))
      .catch(() => setBackendStatus('mock'));
  }, []);

  // Save documents whenever they change
  useEffect(() => {
    if (carrier) {
      localStorage.setItem('pureDocuments', JSON.stringify(documents));
    }
  }, [documents, carrier]);

  // Save load history
  useEffect(() => {
    if (carrier) {
      localStorage.setItem('pureLoadHistory', JSON.stringify(loadHistory));
    }
  }, [loadHistory, carrier]);

  // Save favorites
  useEffect(() => {
    if (carrier) {
      localStorage.setItem('pureFavoriteLoads', JSON.stringify(favoriteLoads));
    }
  }, [favoriteLoads, carrier]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Click outside profile menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Welcome voice message when user first arrives at chat
  useEffect(() => {
    if (isRegistered && !showDashboard && currentView === 'home' && messages.length === 0 && audioEnabled) {
      const timer = setTimeout(() => {
        const welcomeText = `Hey there, driver! I'm Pure, your AI dispatch assistant. I'm here to help you with fuel, weather, loads, and everything you need on the road. What can I do for you?`;
        forceSpeak(welcomeText, () => setIsSpeaking(true), () => setIsSpeaking(false));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isRegistered, showDashboard, currentView, messages.length, audioEnabled]);

  // Generate mock loads
  const generateMockLoads = () => {
    const origins = [
      { city: 'Chicago', state: 'IL' },
      { city: 'Dallas', state: 'TX' },
      { city: 'Atlanta', state: 'GA' },
      { city: 'Phoenix', state: 'AZ' },
      { city: 'Miami', state: 'FL' }
    ];
    const destinations = [
      { city: 'Los Angeles', state: 'CA' },
      { city: 'New York', state: 'NY' },
      { city: 'Seattle', state: 'WA' },
      { city: 'Boston', state: 'MA' },
      { city: 'Denver', state: 'CO' }
    ];
    const equipment = ['Dry Van', 'Reefer', 'Flatbed'];

    return Array.from({ length: 10 }, (_, i) => {
      const origin = origins[Math.floor(Math.random() * origins.length)];
      const destination = destinations[Math.floor(Math.random() * destinations.length)];
      const distance = Math.floor(Math.random() * 2000) + 500;
      const rate = Math.floor((distance * (1.5 + Math.random())) / 10) * 10;
      
      return {
        id: `load_${Date.now()}_${i}`,
        origin,
        destination,
        distance,
        weight: Math.floor(Math.random() * 40000) + 5000,
        rate,
        equipment: equipment[Math.floor(Math.random() * equipment.length)],
        pickupDate: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000)
      };
    });
  };

  const handleLogin = (carrierData) => {
    if (carrierData) {
      setCarrier(carrierData);
      setIsLoggedIn(true);
      setIsRegistered(true);
      setShowDashboard(true);
    } else {
      // New user - go to registration
      setIsLoggedIn(true);
      setIsRegistered(false);
    }
  };

  const handleRegistrationComplete = (carrierData) => {
    setCarrier(carrierData);
    setIsRegistered(true);
    setShowDashboard(true);
    localStorage.setItem('pureCarrier', JSON.stringify(carrierData));
    
    // Welcome voice message
    setTimeout(() => {
      const welcomeText = `Hey there! I'm Pure, your AI dispatcher. Welcome aboard, ${carrierData.companyName}! I'm here to help you find fuel, check weather, book loads, and handle everything you need on the road. Just ask me anything!`;
      forceSpeak(welcomeText, () => setIsSpeaking(true), () => setIsSpeaking(false));
    }, 1000);
  };

  const handleDashboardNavigate = (view) => {
    setCurrentView(view);
    setShowDashboard(false);
    
    // Voice greeting when going to chat
    if (view === 'home' && messages.length === 0) {
      setTimeout(() => {
        const greetingText = `Hey driver! I'm Pure, ready to help. Need fuel? Weather updates? Want to book a load? Just ask me!`;
        forceSpeak(greetingText, () => setIsSpeaking(true), () => setIsSpeaking(false));
      }, 500);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      // Close profile menu immediately
      setShowProfileMenu(false);
      
      // Stop any active speech and voice
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore if already stopped
        }
      }
      
      // Clear localStorage first
      localStorage.clear(); // Clear everything
      
      // Reset all state
      setIsLoggedIn(false);
      setShowDashboard(false);
      setIsRegistered(false);
      setCarrier(null);
      setMessages([]);
      setCurrentView('home');
      setLoads([]);
      setDocuments({
        coi: null,
        noa: null,
        w9: null,
        license: null,
        medicalCard: null,
        other: null,
        pods: [],
        mechanicalIssues: []
      });
      setLoadHistory([]);
      setFavoriteLoads([]);
      setInputText('');
      setIsTyping(false);
      setIsSpeaking(false);
      setIsListening(false);
      setPodFiles([]);
      
      // Force page reload to ensure clean state
      setTimeout(() => {
        window.location.reload();
      }, 100);
    }
  };

  const handleDocumentUpload = (docType, fileData) => {
    setDocuments(prev => ({
      ...prev,
      [docType]: fileData
    }));
  };

  const handleDocumentDelete = (docType) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      setDocuments(prev => ({
        ...prev,
        [docType]: null
      }));
    }
  };

  const handlePODFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    const newFiles = files.map(file => ({
      name: file.name,
      size: file.size,
      type: file.type,
      url: URL.createObjectURL(file),
      uploadedAt: new Date()
    }));
    setPodFiles(prev => [...prev, ...newFiles]);
  };

  const handleSubmitPOD = async () => {
    if (podFiles.length === 0) {
      alert('Please upload at least one file (BOL or picture)');
      return;
    }

    setIsSubmittingPOD(true);

    // Simulate sending to broker via Pure AI
    setTimeout(() => {
      const podSubmission = {
        id: `pod_${Date.now()}`,
        files: podFiles,
        submittedAt: new Date(),
        status: 'sent_to_broker'
      };

      setDocuments(prev => ({
        ...prev,
        pods: [...prev.pods, podSubmission]
      }));

      // Pure AI confirmation message
      const confirmMessage = {
        from: 'pure',
        text: `✅ Proof of delivery submitted successfully! I've sent ${podFiles.length} file(s) to the broker. You should receive confirmation within 24 hours.`,
        timestamp: new Date(),
        mood: 'positive',
        skill: null
      };
      setMessages(prev => [...prev, confirmMessage]);

      if (audioEnabled) {
        forceSpeak(confirmMessage.text, () => setIsSpeaking(true), () => setIsSpeaking(false));
      }

      setPodFiles([]);
      setIsSubmittingPOD(false);
      setCurrentView('home'); // Return to chat to see confirmation
    }, 1500);
  };

  const handleMechanicalIssueUpload = (e) => {
    const files = Array.from(e.target.files || []);
    const newIssues = files.map(file => ({
      id: `issue_${Date.now()}_${Math.random()}`,
      name: file.name,
      size: file.size,
      type: file.type,
      url: URL.createObjectURL(file),
      uploadedAt: new Date()
    }));
    
    setDocuments(prev => ({
      ...prev,
      mechanicalIssues: [...prev.mechanicalIssues, ...newIssues]
    }));
  };

  const handleSend = async () => {
    if (!inputText.trim() || isTyping) return;

    const userMessage = {
      from: 'user',
      text: inputText,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputText("");
    setIsTyping(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/pure/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: inputText, carrier })
      });
      const data = await response.json();
      
      const pureMessage = {
        from: 'pure',
        text: data.response,
        timestamp: new Date(),
        mood: data.mood || 'neutral',
        skill: data.skill || null,
        meta: data.meta || null
      };
      setMessages(prev => [...prev, pureMessage]);

      if (audioEnabled) {
        await forceSpeak(data.response, () => setIsSpeaking(true), () => setIsSpeaking(false));
      }
    } catch (err) {
      // Mock response
      const mockResponses = {
        fuel: "I found 3 fuel stations nearby:\n\n1. Loves Travel Stop - 2.3 miles, $3.45/gal\n2. Pilot Flying J - 3.1 miles, $3.42/gal\n3. TA Truck Stop - 4.5 miles, $3.48/gal\n\nShall I navigate you to the closest one?",
        weather: "The weather on your route looks good! Clear skies for the next 48 hours with temperatures in the 60s. No delays expected.",
        default: "I'm here to help! I can find fuel stations, check weather, book loads, email brokers, and more. What do you need?"
      };

      let responseText = mockResponses.default;
      const lowerInput = inputText.toLowerCase();
      if (lowerInput.includes('fuel') || lowerInput.includes('gas')) {
        responseText = mockResponses.fuel;
      } else if (lowerInput.includes('weather')) {
        responseText = mockResponses.weather;
      } else if (lowerInput.includes('email')) {
        // Email draft example
        const pureMessage = {
          from: 'pure',
          text: "I've drafted this email for you. Take a look and let me know if you want to send it.",
          timestamp: new Date(),
          mood: 'positive',
          skill: 'draftEmail',
          meta: {
            skill: 'draftEmail',
            action: 'draft',
            email: {
              recipient: 'broker@example.com',
              subject: 'Load Update',
              body: 'Hi,\n\nI wanted to update you on the status of load #12345. Everything is on schedule and I expect to arrive on time.\n\nBest regards,\n' + (carrier?.companyName || 'Your Company')
            }
          }
        };
        setMessages(prev => [...prev, pureMessage]);
        setIsTyping(false);
        return;
      }

      const pureMessage = {
        from: 'pure',
        text: responseText,
        timestamp: new Date(),
        mood: 'positive',
        skill: null
      };
      setMessages(prev => [...prev, pureMessage]);

      if (audioEnabled) {
        await forceSpeak(responseText, () => setIsSpeaking(true), () => setIsSpeaking(false));
      }
    } finally {
      setIsTyping(false);
    }
  };

  const handleVoiceInput = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = startListening(
      (transcript) => {
        setInputText(transcript);
        setIsListening(false);
      },
      () => setIsListening(false),
      (error) => {
        console.error('Speech recognition error:', error);
        setIsListening(false);
      }
    );

    if (recognition) {
      recognitionRef.current = recognition;
      setIsListening(true);
    }
  };

  const handleSendEmail = async (emailData) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/email/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailData.recipient,
          subject: emailData.subject,
          body: emailData.body,
          from: carrier?.email || 'noreply@puredispatch.com'
        })
      });
      const data = await response.json();
      
      const confirmMessage = {
        from: 'pure',
        text: `✅ Email sent successfully to ${emailData.recipient}!`,
        timestamp: new Date(),
        mood: 'positive',
        skill: null
      };
      setMessages(prev => [...prev, confirmMessage]);

      if (audioEnabled) {
        await forceSpeak(confirmMessage.text, () => setIsSpeaking(true), () => setIsSpeaking(false));
      }
    } catch (err) {
      const errorMessage = {
        from: 'pure',
        text: "I encountered an issue sending the email. Please try again or check your settings.",
        timestamp: new Date(),
        mood: 'neutral',
        skill: null
      };
      setMessages(prev => [...prev, errorMessage]);
      
      if (audioEnabled) {
        forceSpeak(errorMessage.text, () => setIsSpeaking(true), () => setIsSpeaking(false));
      }
    }
  };

  const handleEditEmail = (emailData) => {
    const editPrompt = prompt('What changes would you like to make to the email?');
    if (editPrompt) {
      setInputText(`Edit the email: ${editPrompt}`);
    }
  };

  const handleCancelEmail = () => {
    const confirmMessage = {
      from: 'pure',
      text: "No problem, I've cancelled the email draft.",
      timestamp: new Date(),
      mood: 'neutral',
      skill: null
    };
    setMessages(prev => [...prev, confirmMessage]);
    
    if (audioEnabled) {
      forceSpeak(confirmMessage.text, () => setIsSpeaking(true), () => setIsSpeaking(false));
    }
  };

  const handleRefreshLoads = () => {
    setIsLoadingLoads(true);
    setTimeout(() => {
      const newLoads = generateMockLoads();
      setLoads(newLoads);
      setIsLoadingLoads(false);
    }, 1000);
  };

  const handleClaimLoad = (load) => {
    const claimedLoad = { ...load, status: 'claimed', claimedAt: new Date() };
    setLoadHistory(prev => [claimedLoad, ...prev]);
    alert(`Load booked! Origin: ${load.origin.city}, ${load.origin.state} → Destination: ${load.destination.city}, ${load.destination.state}`);
  };

  const handleNavigateToLocation = (location) => {
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.city + ', ' + location.state)}`;
    window.open(mapsUrl, '_blank');
  };

  const handleToggleFavorite = (load) => {
    setFavoriteLoads(prev => {
      const isFavorited = prev.some(l => l.id === load.id);
      if (isFavorited) {
        return prev.filter(l => l.id !== load.id);
      } else {
        return [...prev, load];
      }
    });
  };

  // Initialize loads
  useEffect(() => {
    if (isRegistered && loads.length === 0) {
      handleRefreshLoads();
    }
  }, [isRegistered]);

  // Show login if not logged in
  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // Show registration if logged in but not registered
  if (!isRegistered) {
    return <CarrierRegistration onRegistrationComplete={handleRegistrationComplete} />;
  }

  // Show dashboard if user just logged in/registered
  if (showDashboard) {
    return <Dashboard carrier={carrier} onNavigate={handleDashboardNavigate} onLogout={handleLogout} />;
  }

  // =====================================================
  // DOCUMENTS VIEW
  // =====================================================
  if (currentView === 'documents') {
    return (
      <div className="min-h-screen bg-black">
        {/* Header */}
        <div className="border-b border-gray-800">
          <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                <Truck className="w-5 h-5 text-black" />
              </div>
              <div>
                <h1 className="text-2xl font-light text-white">Pure</h1>
                <p className="text-sm text-gray-400">Document Management</p>
              </div>
            </div>
            <button
              onClick={() => setCurrentView('home')}
              className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              Back to Home
            </button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Carrier Documents */}
          <div className="mb-8">
            <h2 className="text-2xl font-light text-white mb-4">Carrier Documents</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <DocumentUploadSection
                title="COI (Certificate of Insurance)"
                docType="coi"
                existingDoc={documents.coi}
                onUpload={handleDocumentUpload}
                onDelete={handleDocumentDelete}
                icon={FileText}
              />
              <DocumentUploadSection
                title="NOA (Notice of Assignment)"
                docType="noa"
                existingDoc={documents.noa}
                onUpload={handleDocumentUpload}
                onDelete={handleDocumentDelete}
                icon={FileText}
              />
              <DocumentUploadSection
                title="W9 Form"
                docType="w9"
                existingDoc={documents.w9}
                onUpload={handleDocumentUpload}
                onDelete={handleDocumentDelete}
                icon={FileText}
              />
              <DocumentUploadSection
                title="Driver's License"
                docType="license"
                existingDoc={documents.license}
                onUpload={handleDocumentUpload}
                onDelete={handleDocumentDelete}
                icon={FileText}
              />
              <DocumentUploadSection
                title="Medical Card"
                docType="medicalCard"
                existingDoc={documents.medicalCard}
                onUpload={handleDocumentUpload}
                onDelete={handleDocumentDelete}
                icon={FileText}
              />
              <DocumentUploadSection
                title="Other (TWIC, Hazmat, etc)"
                docType="other"
                existingDoc={documents.other}
                onUpload={handleDocumentUpload}
                onDelete={handleDocumentDelete}
                icon={FileText}
              />
            </div>
          </div>

          {/* Proof of Delivery Section */}
          <div className="mb-8">
            <h2 className="text-2xl font-light text-white mb-4">Proof of Delivery (POD)</h2>
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
              <p className="text-gray-400 mb-4">
                Upload BOL (Bill of Lading) and delivery pictures. Pure will send them to the broker for confirmation.
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-3">Upload Files</label>
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={handlePODFileSelect}
                  className="hidden"
                  id="pod-upload"
                />
                <label
                  htmlFor="pod-upload"
                  className="block w-full py-4 rounded-xl border-2 border-dashed border-gray-700 hover:border-green-500 bg-gray-800 hover:bg-gray-800/50 transition-all cursor-pointer"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-6 h-6 text-gray-400" />
                    <span className="text-sm text-gray-400">Click to upload BOL or pictures</span>
                  </div>
                </label>
              </div>

              {podFiles.length > 0 && (
                <div className="mb-4 space-y-2">
                  <p className="text-sm font-medium text-gray-300 mb-2">Files to submit ({podFiles.length}):</p>
                  {podFiles.map((file, idx) => (
                    <div key={idx} className="bg-gray-800 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-sm text-white">{file.name}</p>
                          <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setPodFiles(prev => prev.filter((_, i) => i !== idx))}
                        className="p-2 rounded-lg bg-red-900/30 hover:bg-red-900/50 transition-colors"
                      >
                        <X className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={handleSubmitPOD}
                disabled={podFiles.length === 0 || isSubmittingPOD}
                className="w-full bg-green-500 text-black py-3 rounded-xl hover:bg-green-400 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {isSubmittingPOD ? 'Submitting...' : `Submit POD to Broker (${podFiles.length} files)`}
              </button>
            </div>

            {/* POD History */}
            {documents.pods.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-medium text-white mb-3">Submission History</h3>
                <div className="space-y-3">
                  {documents.pods.map((pod) => (
                    <div key={pod.id} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-400">
                          {new Date(pod.submittedAt).toLocaleString()}
                        </span>
                        <span className="text-xs bg-green-900/30 text-green-400 px-2 py-1 rounded-full">
                          Sent to Broker
                        </span>
                      </div>
                      <p className="text-sm text-white">{pod.files.length} file(s) submitted</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Mechanical Issues Section */}
          <div>
            <h2 className="text-2xl font-light text-white mb-4">Mechanical Issues</h2>
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
              <p className="text-gray-400 mb-4">
                Upload pictures of mechanical problems or maintenance needs.
              </p>
              
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleMechanicalIssueUpload}
                className="hidden"
                id="mechanical-upload"
              />
              <label
                htmlFor="mechanical-upload"
                className="block w-full py-4 rounded-xl border-2 border-dashed border-gray-700 hover:border-green-500 bg-gray-800 hover:bg-gray-800/50 transition-all cursor-pointer mb-4"
              >
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-6 h-6 text-gray-400" />
                  <span className="text-sm text-gray-400">Click to upload issue pictures</span>
                </div>
              </label>

              {documents.mechanicalIssues.length > 0 && (
                <div className="grid md:grid-cols-3 gap-3">
                  {documents.mechanicalIssues.map((issue) => (
                    <div key={issue.id} className="bg-gray-800 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <button
                          onClick={() => setDocuments(prev => ({
                            ...prev,
                            mechanicalIssues: prev.mechanicalIssues.filter(i => i.id !== issue.id)
                          }))}
                          className="p-1 rounded bg-red-900/30 hover:bg-red-900/50"
                        >
                          <Trash2 className="w-3 h-3 text-red-400" />
                        </button>
                      </div>
                      <p className="text-xs text-white mb-1 truncate">{issue.name}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(issue.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =====================================================
  // PROFILE VIEW
  // =====================================================
  if (currentView === 'profile') {
    return <CarrierRegistration onRegistrationComplete={handleRegistrationComplete} carrier={carrier} />;
  }

  // =====================================================
  // LOAD BOARD VIEW
  // =====================================================
  if (currentView === 'loads') {
    return (
      <div className="min-h-screen bg-black">
        <div className="border-b border-gray-800">
          <div className="max-w-6xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                  <Truck className="w-5 h-5 text-black" />
                </div>
                <div>
                  <h1 className="text-2xl font-light text-white">Pure</h1>
                  <p className="text-sm text-gray-400">Available Loads</p>
                </div>
              </div>
              <button
                onClick={handleRefreshLoads}
                disabled={isLoadingLoads}
                className="px-4 py-2 rounded-lg bg-green-500 text-black hover:bg-green-400 disabled:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingLoads ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentView('home')}
                className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                Chat
              </button>
              <button className="px-4 py-2 rounded-lg bg-green-500 text-black">
                Loads
              </button>
              <button
                onClick={() => setCurrentView('history')}
                className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <History className="w-4 h-4" />
                History
              </button>
              <button
                onClick={() => setCurrentView('favorites')}
                className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <Star className="w-4 h-4" />
                Favorites
              </button>
              <button
                onClick={() => setCurrentView('documents')}
                className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Documents
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="grid md:grid-cols-2 gap-4">
            {loads.map(load => (
              <LoadCard
                key={load.id}
                load={load}
                onClaim={handleClaimLoad}
                onNav={handleNavigateToLocation}
                onFavorite={handleToggleFavorite}
                isFavorited={favoriteLoads.some(l => l.id === load.id)}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // =====================================================
  // HISTORY VIEW
  // =====================================================
  if (currentView === 'history') {
    return (
      <div className="min-h-screen bg-black">
        <div className="border-b border-gray-800">
          <div className="max-w-6xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                  <Truck className="w-5 h-5 text-black" />
                </div>
                <div>
                  <h1 className="text-2xl font-light text-white">Pure</h1>
                  <p className="text-sm text-gray-400">Load History</p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentView('home')}
                className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                Chat
              </button>
              <button
                onClick={() => setCurrentView('loads')}
                className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
              >
                Loads
              </button>
              <button className="px-4 py-2 rounded-lg bg-green-500 text-black flex items-center gap-2">
                <History className="w-4 h-4" />
                History
              </button>
              <button
                onClick={() => setCurrentView('favorites')}
                className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <Star className="w-4 h-4" />
                Favorites
              </button>
              <button
                onClick={() => setCurrentView('documents')}
                className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Documents
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-6">
          {loadHistory.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-16 h-16 text-gray-700 mx-auto mb-4" />
              <p className="text-gray-500">No load history yet. Book your first load!</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {loadHistory.map(load => (
                <LoadCard
                  key={load.id}
                  load={load}
                  onClaim={() => {}}
                  onNav={handleNavigateToLocation}
                  onFavorite={handleToggleFavorite}
                  isFavorited={favoriteLoads.some(l => l.id === load.id)}
                  showStatus
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // =====================================================
  // FAVORITES VIEW
  // =====================================================
  if (currentView === 'favorites') {
    return (
      <div className="min-h-screen bg-black">
        <div className="border-b border-gray-800">
          <div className="max-w-6xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                  <Truck className="w-5 h-5 text-black" />
                </div>
                <div>
                  <h1 className="text-2xl font-light text-white">Pure</h1>
                  <p className="text-sm text-gray-400">Favorite Loads</p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentView('home')}
                className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                Chat
              </button>
              <button
                onClick={() => setCurrentView('loads')}
                className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
              >
                Loads
              </button>
              <button
                onClick={() => setCurrentView('history')}
                className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <History className="w-4 h-4" />
                History
              </button>
              <button className="px-4 py-2 rounded-lg bg-green-500 text-black flex items-center gap-2">
                <Star className="w-4 h-4" />
                Favorites
              </button>
              <button
                onClick={() => setCurrentView('documents')}
                className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Documents
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-6">
          {favoriteLoads.length === 0 ? (
            <div className="text-center py-12">
              <Star className="w-16 h-16 text-gray-700 mx-auto mb-4" />
              <p className="text-gray-500">No favorite loads yet. Star loads to save them!</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {favoriteLoads.map(load => (
                <LoadCard
                  key={load.id}
                  load={load}
                  onClaim={handleClaimLoad}
                  onNav={handleNavigateToLocation}
                  onFavorite={handleToggleFavorite}
                  isFavorited={true}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // =====================================================
  // HOME / CHAT VIEW
  // =====================================================
  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                <Truck className="w-5 h-5 text-black" />
              </div>
              <div>
                <h1 className="text-2xl font-light text-white">Pure</h1>
                <p className="text-sm text-gray-400">{carrier?.companyName || 'Carrier'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-gray-500">API Usage</p>
                <p className="text-sm text-white">{carrier?.apiUsageRemaining || 0} / {carrier?.apiUsageLimit || 100}</p>
              </div>
              <div className="relative" ref={profileMenuRef}>
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors"
                >
                  <User className="w-5 h-5 text-green-400" />
                </button>
                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-gray-900 rounded-xl border border-gray-800 shadow-lg z-10">
                    <button
                      onClick={() => { setCurrentView('profile'); setShowProfileMenu(false); }}
                      className="w-full px-4 py-3 text-left text-sm text-white hover:bg-gray-800 flex items-center gap-2 rounded-t-xl"
                    >
                      <User className="w-4 h-4" />
                      Profile
                    </button>
                    <button
                      onClick={() => { setCurrentView('documents'); setShowProfileMenu(false); }}
                      className="w-full px-4 py-3 text-left text-sm text-white hover:bg-gray-800 flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      Documents
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-gray-800 flex items-center gap-2 rounded-b-xl"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 rounded-lg bg-green-500 text-black flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              Chat
            </button>
            <button
              onClick={() => setCurrentView('loads')}
              className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
            >
              Loads
            </button>
            <button
              onClick={() => setCurrentView('history')}
              className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <History className="w-4 h-4" />
              History
            </button>
            <button
              onClick={() => setCurrentView('favorites')}
              className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <Star className="w-4 h-4" />
              Favorites
            </button>
            <button
              onClick={() => setCurrentView('documents')}
              className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Documents
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 max-w-4xl mx-auto w-full">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-10 h-10 text-green-400" />
            </div>
            <h2 className="text-2xl font-light text-white mb-2">Hey there, driver!</h2>
            <p className="text-gray-400 mb-6">I'm Pure, your AI dispatch assistant. Ask me anything!</p>
            <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
              <button onClick={() => setInputText("Find fuel stations nearby")} className="p-3 bg-gray-900 rounded-xl border border-gray-800 hover:border-green-500 transition-colors text-left">
                <Fuel className="w-5 h-5 text-green-400 mb-2" />
                <p className="text-sm text-white">Find Fuel</p>
              </button>
              <button onClick={() => setInputText("What's the weather on my route?")} className="p-3 bg-gray-900 rounded-xl border border-gray-800 hover:border-green-500 transition-colors text-left">
                <CloudRain className="w-5 h-5 text-green-400 mb-2" />
                <p className="text-sm text-white">Check Weather</p>
              </button>
              <button onClick={() => setInputText("Show me available loads")} className="p-3 bg-gray-900 rounded-xl border border-gray-800 hover:border-green-500 transition-colors text-left">
                <Package className="w-5 h-5 text-green-400 mb-2" />
                <p className="text-sm text-white">Available Loads</p>
              </button>
              <button onClick={() => setInputText("Email the broker")} className="p-3 bg-gray-900 rounded-xl border border-gray-800 hover:border-green-500 transition-colors text-left">
                <Mail className="w-5 h-5 text-green-400 mb-2" />
                <p className="text-sm text-white">Email Broker</p>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] ${msg.from === 'user' ? 'bg-green-500 text-black' : 'bg-gray-900 text-white border border-gray-800'} rounded-2xl p-4`}>
                  {msg.from === 'pure' && msg.skill && (
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-800">
                      {(() => {
                        const SkillIcon = getSkillIcon(msg.skill);
                        return <SkillIcon className="w-4 h-4 text-green-400" />;
                      })()}
                      <span className="text-xs text-gray-400 uppercase">{msg.skill}</span>
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                  {msg.from === 'pure' && msg.mood && (
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-800">
                      <Zap className={`w-3 h-3 ${getMoodColor(msg.mood)}`} />
                      <span className={`text-xs ${getMoodColor(msg.mood)}`}>{msg.mood}</span>
                    </div>
                  )}
                  
                  {/* Email Draft Card */}
                  {msg.meta?.skill === 'draftEmail' && msg.meta?.action === 'draft' && (
                    <div className="mt-4 p-4 bg-gray-800 rounded-xl border border-gray-700">
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-gray-400 mb-1">To:</p>
                          <p className="text-sm text-white">{msg.meta.email.recipient}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Subject:</p>
                          <p className="text-sm text-white">{msg.meta.email.subject}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Message:</p>
                          <p className="text-sm text-white whitespace-pre-wrap">{msg.meta.email.body}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => handleSendEmail(msg.meta.email)}
                          className="flex-1 bg-green-500 text-black py-2 rounded-lg hover:bg-green-400 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                        >
                          <Check className="w-4 h-4" />
                          Approve & Send
                        </button>
                        <button
                          onClick={() => handleEditEmail(msg.meta.email)}
                          className="px-4 py-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
                        >
                          ✎ Edit
                        </button>
                        <button
                          onClick={handleCancelEmail}
                          className="px-4 py-2 rounded-lg bg-red-900/30 text-red-400 hover:bg-red-900/50 transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <p className="text-xs opacity-60 mt-2">{new Date(msg.timestamp).toLocaleTimeString()}</p>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-gray-800 p-6">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`p-3 rounded-full transition-colors ${audioEnabled ? 'bg-green-500 text-black' : 'bg-gray-800 text-gray-400'}`}
          >
            {isSpeaking ? <Volume2 className="w-5 h-5" /> : audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
          <button
            onClick={handleVoiceInput}
            disabled={isTyping}
            className={`p-3 rounded-full transition-colors ${isListening ? 'bg-red-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'} disabled:opacity-50`}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask Pure anything..."
            className="flex-1 bg-gray-900 text-white rounded-full px-6 py-3 border border-gray-800 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none placeholder-gray-500"
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || isTyping}
            className="bg-green-500 text-black p-3 rounded-full hover:bg-green-400 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <div className="max-w-4xl mx-auto mt-3 flex items-center justify-between text-xs text-gray-600">
          <span>Backend: {backendStatus === 'connected' ? '🟢 Connected' : '🟡 Mock Mode'}</span>
          <span>Pure Dispatch v2.0</span>
        </div>
      </div>
    </div>
  );
}
