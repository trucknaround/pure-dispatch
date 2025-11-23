import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Truck, Send, User, Volume2, VolumeX, Clock, Zap, Mic, MicOff, MapPin, Fuel, Navigation, Package, Phone, CloudRain, AlertCircle, Building, Mail, RefreshCw, Star, History, Search, Filter, Download, LogOut, ChevronDown, Home, FileText } from 'lucide-react';

// Backend URL - automatically uses same domain in production, localhost in development
const BACKEND_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:8080'
  : ''; // Empty string uses same domain in production (Vercel serverless functions)

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
    logIncident: AlertCircle
  };
  return icons[skillName] || MapPin;
};

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
          <p className={`${compact ? 'text-base' : 'text-lg'} font-semibold text-white flex items-center gap-2`}>
            <MapPin className="w-4 h-4 text-green-400" />
            {load.origin.city}, {load.origin.state}
          </p>
        </div>
        <Navigation className="w-5 h-5 text-gray-600" />
        <div className="flex-1 text-right">
          <p className="text-xs text-gray-500 mb-1">Destination</p>
          <p className={`${compact ? 'text-base' : 'text-lg'} font-semibold text-white flex items-center justify-end gap-2`}>
            {load.destination.city}, {load.destination.state}
            <MapPin className="w-4 h-4 text-green-400" />
          </p>
        </div>
      </div>
      <div className={`grid grid-cols-4 gap-3 ${compact ? 'mb-3' : 'mb-4'}`}>
        <div className="bg-green-900/20 rounded-lg p-3 border border-green-900/30">
          <p className="text-xs text-gray-400 mb-1">Rate</p>
          <p className={`${compact ? 'text-lg' : 'text-xl'} font-bold text-green-400`}>${load.rate.toLocaleString()}</p>
          <p className="text-xs text-gray-500">${load.ratePerMile}/mi</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-3">
          <p className="text-xs text-gray-400 mb-1">Miles</p>
          <p className={`${compact ? 'text-lg' : 'text-xl'} font-bold text-white`}>{load.miles}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-3">
          <p className="text-xs text-gray-400 mb-1">Weight</p>
          <p className={`${compact ? 'text-lg' : 'text-xl'} font-bold text-white`}>{(load.weight / 1000).toFixed(0)}k</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-3">
          <p className="text-xs text-gray-400 mb-1">Type</p>
          <p className="text-sm font-semibold text-white">{load.equipmentType}</p>
        </div>
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-gray-800">
        <div>
          <p className="text-xs text-gray-500">Broker</p>
          <p className="text-sm font-medium text-white">{load.broker.name}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onFavorite} className={`p-2 rounded-lg transition-colors ${isFavorited ? 'bg-yellow-900/30 hover:bg-yellow-900/40 text-yellow-400' : 'bg-gray-800 hover:bg-gray-700 text-gray-400'}`}>
            <Star className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
          </button>
          <button onClick={onNav} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors text-sm font-medium flex items-center gap-1.5">
            <Navigation className="w-4 h-4" />
            Nav
          </button>
          <button onClick={onClaim} className="px-4 py-2 bg-green-500 hover:bg-green-400 text-black rounded-lg transition-colors text-sm font-medium">
            {load.status === 'claimed' ? 'Claimed' : 'Claim'}
          </button>
        </div>
      </div>
      <p className="text-xs text-gray-600 mt-3 text-center">Load ID: {load.loadId} • Posted {new Date(load.postedAt).toLocaleTimeString()}</p>
    </div>
  );
}

function EmptyState({ icon: Icon, message }) {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 text-center">
      <Icon className="w-12 h-12 text-gray-700 mx-auto mb-3" />
      <p className="text-gray-500">{message}</p>
    </div>
  );
}

function CarrierRegistration({ onRegistrationComplete }) {
  const [formData, setFormData] = useState({
    companyName: '', mcNumber: '', dotNumber: '', email: '', phone: '', equipmentTypes: [], operatingRegions: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const equipmentOptions = ['Dry Van', 'Reefer', 'Flatbed', 'Step Deck', 'Box Truck', 'Tanker'];
  const regionOptions = ['Northeast', 'Southeast', 'Midwest', 'Southwest', 'West', 'All Regions'];

  const toggleEquipment = (equipment) => {
    const normalized = equipment.toLowerCase();
    const newTypes = formData.equipmentTypes.includes(normalized) ? formData.equipmentTypes.filter(e => e !== normalized) : [...formData.equipmentTypes, normalized];
    setFormData(prev => ({ ...prev, equipmentTypes: newTypes }));
  };

  const toggleRegion = (region) => {
    const newRegions = formData.operatingRegions.includes(region) ? formData.operatingRegions.filter(r => r !== region) : [...formData.operatingRegions, region];
    setFormData(prev => ({ ...prev, operatingRegions: newRegions }));
  };

  const handleSubmit = async () => {
    if (!formData.companyName || !formData.mcNumber || !formData.dotNumber || !formData.email || !formData.phone) {
      setError('Please fill in all required fields');
      return;
    }
    if (formData.equipmentTypes.length === 0) {
      setError('Please select at least one equipment type');
      return;
    }
    setIsSubmitting(true);
    setError('');
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
        id: `carrier_${Date.now()}`,
        ...formData,
        status: 'verified',
        apiUsageRemaining: 100,
        apiUsageCount: 0,
        apiUsageLimit: 100,
        createdAt: new Date()
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
            <p className="text-sm text-gray-400">Carrier Registration</p>
          </div>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-light text-white mb-2">Register Your Carrier</h2>
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
            {isSubmitting ? 'Registering...' : 'Register & Continue'}
          </button>
          <p className="text-xs text-gray-500 text-center">By registering, you agree to our Terms of Service and Privacy Policy.</p>
        </div>
      </div>
    </div>
  );
}

export default function PureDispatcher() {
  const [isRegistered, setIsRegistered] = useState(false);
  const [carrier, setCarrier] = useState(null);
  const [featuredLoad, setFeaturedLoad] = useState(null);
  const [showLoadBoard, setShowLoadBoard] = useState(false);
  const [loadHistory, setLoadHistory] = useState([]);
  const [favoriteLoads, setFavoriteLoads] = useState([]);
  const [activeTab, setActiveTab] = useState('featured');
  const [currentView, setCurrentView] = useState('home');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEquipment, setFilterEquipment] = useState('all');
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceReady, setVoiceReady] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [isLoadingLoad, setIsLoadingLoad] = useState(false);
  const messagesEndRef = useRef(null);
  const hasSpokenWelcome = useRef(false);
  const recognitionRef = useRef(null);
  const profileMenuRef = useRef(null);

  const [driver] = useState({
    driverId: "driver-1",
    name: "Mike",
    preferredRegions: ["South", "Midwest"],
    loadTypes: ["dry van", "reefer"],
    recentMood: "neutral",
    relationshipLevel: 4,
    lastKnownLat: 35.4676,
    lastKnownLng: -97.5164
  });

  const getMockLoad = (equipmentType) => {
    const mockLoads = {
      'dry van': {
        loadId: 'MOCK-DV-001',
        origin: { city: 'Dallas', state: 'TX', lat: 32.7767, lng: -96.7970 },
        destination: { city: 'Atlanta', state: 'GA', lat: 33.7490, lng: -84.3880 },
        equipmentType: 'Dry Van',
        rate: 2450,
        ratePerMile: 2.45,
        miles: 1000,
        weight: 42000,
        pickupDate: new Date(Date.now() + 86400000),
        commodity: 'General Freight',
        broker: { name: 'Premium Logistics LLC', phone: '555-0123', email: 'dispatch@premiumlogistics.com' },
        postedAt: new Date()
      },
      'reefer': {
        loadId: 'MOCK-RF-002',
        origin: { city: 'Phoenix', state: 'AZ', lat: 33.4484, lng: -112.0740 },
        destination: { city: 'Seattle', state: 'WA', lat: 47.6062, lng: -122.3321 },
        equipmentType: 'Reefer',
        rate: 3200,
        ratePerMile: 2.67,
        miles: 1200,
        weight: 38000,
        pickupDate: new Date(Date.now() + 43200000),
        commodity: 'Produce',
        broker: { name: 'Cold Chain Express', phone: '555-0456', email: 'loads@coldchainexpress.com' },
        postedAt: new Date()
      },
      'flatbed': {
        loadId: 'MOCK-FB-003',
        origin: { city: 'Houston', state: 'TX', lat: 29.7604, lng: -95.3698 },
        destination: { city: 'Chicago', state: 'IL', lat: 41.8781, lng: -87.6298 },
        equipmentType: 'Flatbed',
        rate: 2800,
        ratePerMile: 2.80,
        miles: 1000,
        weight: 45000,
        pickupDate: new Date(Date.now() + 172800000),
        commodity: 'Steel Coils',
        broker: { name: 'Heavy Haul Logistics', phone: '555-0789', email: 'dispatch@heavyhaullogistics.com' },
        postedAt: new Date()
      }
    };
    return mockLoads[equipmentType.toLowerCase()] || mockLoads['dry van'];
  };

  useEffect(() => {
    const savedCarrier = localStorage.getItem('pureCarrier');
    const savedHistory = localStorage.getItem('pureLoadHistory');
    const savedFavorites = localStorage.getItem('pureFavoriteLoads');
    
    if (savedCarrier) {
      try {
        const carrierData = JSON.parse(savedCarrier);
        setCarrier(carrierData);
        setIsRegistered(true);
        setTimeout(() => {
          const primaryEquipment = carrierData.equipmentTypes[0] || 'dry van';
          const mockLoad = getMockLoad(primaryEquipment);
          setFeaturedLoad(mockLoad);
        }, 500);
      } catch (e) {
        localStorage.removeItem('pureCarrier');
      }
    }
    if (savedHistory) {
      try { setLoadHistory(JSON.parse(savedHistory)); } catch (e) { localStorage.removeItem('pureLoadHistory'); }
    }
    if (savedFavorites) {
      try { setFavoriteLoads(JSON.parse(savedFavorites)); } catch (e) { localStorage.removeItem('pureFavoriteLoads'); }
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isRegistered) return;
    const checkBackend = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/health`);
        if (response.ok) { setBackendStatus('connected'); } else { setBackendStatus('offline'); }
      } catch (error) {
        setBackendStatus('offline');
      }
    };
    checkBackend();
  }, [isRegistered]);

  useEffect(() => {
    if (!isRegistered) return;
    if ('speechSynthesis' in window) {
      const loadVoices = () => { window.speechSynthesis.getVoices(); };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [isRegistered]);

  useEffect(() => {
    if (!isRegistered) return;
    const welcomeMsg = {
      from: "pure",
      text: `Hello ${carrier?.companyName || 'Driver'}! This is Pure. Tap the screen and I'll speak to you.`,
      timestamp: new Date(),
      mood: "neutral"
    };
    setMessages([welcomeMsg]);
    setVoiceReady(true);
  }, [isRegistered, carrier?.companyName]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleRegistrationComplete = (carrierData) => {
    const carrierWithTracking = {
      ...carrierData,
      apiUsageCount: 0,
      apiUsageLimit: 100,
      lastLoadViewedAt: null
    };
    setCarrier(carrierWithTracking);
    setIsRegistered(true);
    localStorage.setItem('pureCarrier', JSON.stringify(carrierWithTracking));
    const primaryEquipment = carrierWithTracking.equipmentTypes[0] || 'dry van';
    const mockLoad = getMockLoad(primaryEquipment);
    setFeaturedLoad(mockLoad);
    addToHistory(mockLoad);
  };

  const addToHistory = (load) => {
    const historyEntry = { ...load, viewedAt: new Date(), status: 'viewed' };
    const updatedHistory = [historyEntry, ...loadHistory].slice(0, 50);
    setLoadHistory(updatedHistory);
    localStorage.setItem('pureLoadHistory', JSON.stringify(updatedHistory));
  };

  const toggleFavorite = (load) => {
    const isFavorite = favoriteLoads.some(fav => fav.loadId === load.loadId);
    let updatedFavorites;
    if (isFavorite) {
      updatedFavorites = favoriteLoads.filter(fav => fav.loadId !== load.loadId);
    } else {
      const favoriteEntry = { ...load, favoritedAt: new Date() };
      updatedFavorites = [favoriteEntry, ...favoriteLoads];
    }
    setFavoriteLoads(updatedFavorites);
    localStorage.setItem('pureFavoriteLoads', JSON.stringify(updatedFavorites));
  };

  const isFavorited = (loadId) => {
    return favoriteLoads.some(fav => fav.loadId === loadId);
  };

  const markLoadClaimed = (loadId) => {
    const updatedHistory = loadHistory.map(load => 
      load.loadId === loadId ? { ...load, status: 'claimed', claimedAt: new Date() } : load
    );
    setLoadHistory(updatedHistory);
    localStorage.setItem('pureLoadHistory', JSON.stringify(updatedHistory));
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      localStorage.removeItem('pureCarrier');
      localStorage.removeItem('pureLoadHistory');
      localStorage.removeItem('pureFavoriteLoads');
      window.location.reload();
    }
  };

  const exportLoadHistory = () => {
    const data = {
      carrier: carrier,
      history: loadHistory,
      favorites: favoriteLoads,
      exportedAt: new Date()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pure-load-history-${carrier.companyName.replace(/\s+/g, '-')}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getFilteredLoads = (loads) => {
    let filtered = [...loads];
    if (filterEquipment !== 'all') {
      filtered = filtered.filter(load => load.equipmentType.toLowerCase() === filterEquipment.toLowerCase());
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(load =>
        load.origin.city.toLowerCase().includes(query) ||
        load.origin.state.toLowerCase().includes(query) ||
        load.destination.city.toLowerCase().includes(query) ||
        load.destination.state.toLowerCase().includes(query) ||
        load.broker.name.toLowerCase().includes(query) ||
        load.loadId.toLowerCase().includes(query)
      );
    }
    return filtered;
  };

  const loadFeaturedLoad = async (carrierData) => {
    setIsLoadingLoad(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/carriers/${carrierData.id}/featured-load`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.load) {
          setFeaturedLoad(data.load);
          addToHistory(data.load);
          const updatedCarrier = { ...carrierData, apiUsageCount: carrierData.apiUsageCount + 1, lastLoadViewedAt: new Date() };
          setCarrier(updatedCarrier);
          localStorage.setItem('pureCarrier', JSON.stringify(updatedCarrier));
          setIsLoadingLoad(false);
          return;
        }
      }
    } catch (error) {
      console.log('Backend unavailable, using mock data');
    }
    const primaryEquipment = carrierData.equipmentTypes[0] || 'dry van';
    const mockLoad = getMockLoad(primaryEquipment);
    setFeaturedLoad(mockLoad);
    addToHistory(mockLoad);
    const updatedCarrier = { ...carrierData, apiUsageCount: carrierData.apiUsageCount + 1, lastLoadViewedAt: new Date() };
    setCarrier(updatedCarrier);
    localStorage.setItem('pureCarrier', JSON.stringify(updatedCarrier));
    setIsLoadingLoad(false);
  };

  const handleRefreshLoad = () => {
    if (carrier) { loadFeaturedLoad(carrier); }
  };

  const handleClaimLoad = () => {
    if (featuredLoad) {
      markLoadClaimed(featuredLoad.loadId);
      alert(`✅ Load marked as claimed!\n\nContact broker:\n${featuredLoad.broker.name}\n${featuredLoad.broker.phone}\n${featuredLoad.broker.email}\n\nLoad ID: ${featuredLoad.loadId}`);
    }
  };

  const handleGetNavigation = () => {
    if (featuredLoad) {
      const navUrl = `https://www.google.com/maps/dir/?api=1&origin=${featuredLoad.origin.lat},${featuredLoad.origin.lng}&destination=${featuredLoad.destination.lat},${featuredLoad.destination.lng}&travelmode=driving`;
      window.open(navUrl, '_blank');
    }
  };

  const handleFirstInteraction = async () => {
    if (!hasSpokenWelcome.current && audioEnabled && voiceReady) {
      hasSpokenWelcome.current = true;
      setIsSpeaking(true);
      await forceSpeak("Hello! This is Pure, your virtual dispatcher. I'm ready to help you with loads, routes, fuel stops, weather, or anything else you need. Just send me a message!", null, () => setIsSpeaking(false));
    }
  };

  const callBackendAPI = async (message) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/pure/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId: driver.driverId, message: message, wantAudio: false })
      });
      if (!response.ok) throw new Error('Backend request failed');
      const data = await response.json();
      return data;
    } catch (error) {
      return null;
    }
  };

  const handleSendWithText = async (text) => {
    const trimmedText = text.trim();
    if (!trimmedText) return;
    if (!hasSpokenWelcome.current) { hasSpokenWelcome.current = true; }
    const userMessage = { from: "driver", text: trimmedText, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInputText("");
    setIsTyping(true);
    if (window.speechSynthesis) { window.speechSynthesis.cancel(); }
    const backendResponse = await callBackendAPI(trimmedText);
    setTimeout(async () => {
      let responseText = "";
      let responseMood = "neutral";
      let skillMeta = null;
      if (backendResponse && backendResponse.text) {
        responseText = backendResponse.text;
        responseMood = backendResponse.mood || "neutral";
        skillMeta = backendResponse.meta || null;
      } else {
        responseText = `${driver.name}, I'm having trouble connecting to my systems right now. Can you try that again? I'm still here for you.`;
        responseMood = "neutral";
      }
      const pureMessage = { from: "pure", text: responseText, timestamp: new Date(), mood: responseMood, skill: skillMeta?.skill || null, skillData: skillMeta?.result || null };
      setMessages(prev => [...prev, pureMessage]);
      setIsTyping(false);
      if (audioEnabled) {
        setIsSpeaking(true);
        await forceSpeak(responseText, null, () => setIsSpeaking(false));
      }
    }, 800);
  };

  const handleSend = async () => { await handleSendWithText(inputText); };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleAudio = () => {
    const newState = !audioEnabled;
    setAudioEnabled(newState);
    if (!newState) {
      window.speechSynthesis?.cancel();
      setIsSpeaking(false);
    } else if (!hasSpokenWelcome.current) {
      handleFirstInteraction();
    }
  };

  const testVoice = async () => {
    setIsSpeaking(true);
    await forceSpeak(`Testing! This is Pure speaking. Can you hear me?`, null, () => setIsSpeaking(false));
  };

  const startVoiceInput = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isListening || isTyping) return;
    if (isSpeaking) {
      window.speechSynthesis?.cancel();
      setIsSpeaking(false);
    }
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('⚠️ Voice input not supported. Please use Chrome or Safari.');
      return;
    }
    setIsListening(true);
    const handleResult = (transcript) => {
      setIsListening(false);
      if (transcript && transcript.trim()) { handleSendWithText(transcript); }
    };
    const handleEnd = () => setIsListening(false);
    const handleError = (error) => {
      setIsListening(false);
      if (error === 'not-supported') {
        alert('⚠️ Voice input not supported. Please use Chrome or Safari.');
      } else if (error === 'no-speech') {
        alert('No speech detected. Please try again.');
      } else if (error === 'not-allowed' || error === 'permission-denied') {
        alert('Microphone permission denied. Please enable microphone access.');
      }
    };
    recognitionRef.current = startListening(handleResult, handleEnd, handleError);
  };

  if (!isRegistered) {
    return <CarrierRegistration onRegistrationComplete={handleRegistrationComplete} />;
  }

  return (
    <div className="flex flex-col h-screen bg-black" onClick={handleFirstInteraction}>
      <div className="border-b border-gray-800 bg-black">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
              <Truck className="w-4 h-4 text-black" />
            </div>
            <div>
              <h1 className="text-xl font-medium text-white">{carrier?.companyName || 'Pure'}</h1>
              <p className="text-xs text-gray-400">{carrier?.mcNumber || 'Virtual Dispatcher'}</p>
            </div>
            {isSpeaking && (
              <div className="flex items-center gap-1">
                <span className="w-1 h-3 bg-green-500 rounded-full animate-pulse" />
                <span className="w-1 h-4 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
                <span className="w-1 h-3 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {currentView === 'home' && (
              <button onClick={() => setShowLoadBoard(!showLoadBoard)} className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-colors ${showLoadBoard ? 'bg-green-500 text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
                <Package className="w-3 h-3" />
                {showLoadBoard ? 'Hide Load' : 'View Load'}
              </button>
            )}
            <div className="text-right">
              <p className="text-xs text-gray-400">API Calls</p>
              <p className="text-sm font-semibold text-white">{carrier?.apiUsageLimit - carrier?.apiUsageCount || 100}</p>
            </div>
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${backendStatus === 'connected' ? 'bg-green-900/30 text-green-400' : backendStatus === 'offline' ? 'bg-red-900/30 text-red-400' : 'bg-gray-800 text-gray-400'}`}>
              {backendStatus === 'connected' ? '● Live' : backendStatus === 'offline' ? '● Mock' : '● Checking'}
            </div>
            {currentView === 'home' && (
              <>
                <button onClick={(e) => { e.stopPropagation(); testVoice(); }} className="px-3 py-1.5 bg-green-500 text-black text-xs rounded-full hover:bg-green-400 flex items-center gap-1.5">
                  <Zap className="w-3 h-3" />
                  Test
                </button>
                <button onClick={(e) => { e.stopPropagation(); toggleAudio(); }} className={`w-9 h-9 rounded-full hover:bg-gray-800 flex items-center justify-center transition-colors ${audioEnabled ? 'bg-gray-800' : ''}`}>
                  {audioEnabled ? <Volume2 className="w-5 h-5 text-green-500" /> : <VolumeX className="w-5 h-5 text-gray-500" />}
                </button>
              </>
            )}
            <div className="relative" ref={profileMenuRef}>
              <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-800 rounded-lg transition-colors">
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                  <User className="w-4 h-4 text-black" />
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
              </button>
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-gray-900 rounded-xl shadow-lg border border-gray-800 py-2 z-50">
                  <div className="px-4 py-3 border-b border-gray-800">
                    <p className="font-semibold text-white">{carrier?.companyName}</p>
                    <p className="text-xs text-gray-400">{carrier?.mcNumber}</p>
                    <p className="text-xs text-gray-400">{carrier?.email}</p>
                  </div>
                  <div className="px-2 py-2">
                    <button onClick={() => { setCurrentView('home'); setShowProfileMenu(false); }} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${currentView === 'home' ? 'bg-green-500/10 text-green-400' : 'hover:bg-gray-800 text-gray-300'}`}>
                      <Home className="w-4 h-4" />
                      <span className="text-sm font-medium">Home</span>
                    </button>
                    <button onClick={() => { setCurrentView('profile'); setShowProfileMenu(false); }} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${currentView === 'profile' ? 'bg-green-500/10 text-green-400' : 'hover:bg-gray-800 text-gray-300'}`}>
                      <User className="w-4 h-4" />
                      <span className="text-sm font-medium">Profile</span>
                    </button>
                    <button onClick={() => { setCurrentView('documents'); setShowProfileMenu(false); }} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${currentView === 'documents' ? 'bg-green-500/10 text-green-400' : 'hover:bg-gray-800 text-gray-300'}`}>
                      <FileText className="w-4 h-4" />
                      <span className="text-sm font-medium">Documents</span>
                    </button>
                    <button onClick={() => { setCurrentView('loadhistory'); setShowProfileMenu(false); setShowLoadBoard(true); setActiveTab('history'); }} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${currentView === 'loadhistory' ? 'bg-green-500/10 text-green-400' : 'hover:bg-gray-800 text-gray-300'}`}>
                      <History className="w-4 h-4" />
                      <span className="text-sm font-medium">Load History</span>
                      {loadHistory.length > 0 && <span className="ml-auto px-2 py-0.5 bg-green-900/30 text-green-400 text-xs rounded-full">{loadHistory.length}</span>}
                    </button>
                    <div className="my-2 border-t border-gray-800"></div>
                    <div className="px-3 py-2 text-xs text-gray-400">
                      <div className="flex justify-between mb-1">
                        <span>API Usage</span>
                        <span className="font-semibold text-white">{carrier?.apiUsageCount || 0} / {carrier?.apiUsageLimit || 100}</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-1.5">
                        <div className="bg-green-500 h-1.5 rounded-full transition-all" style={{ width: `${((carrier?.apiUsageCount || 0) / (carrier?.apiUsageLimit || 100)) * 100}%` }}></div>
                      </div>
                    </div>
                    <button onClick={() => { setShowProfileMenu(false); exportLoadHistory(); }} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-800 rounded-lg transition-colors text-left">
                      <Download className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-300">Export Data</span>
                    </button>
                    <div className="my-2 border-t border-gray-800"></div>
                    <button onClick={() => { setShowProfileMenu(false); handleLogout(); }} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-red-900/30 rounded-lg transition-colors text-left">
                      <LogOut className="w-4 h-4 text-red-400" />
                      <span className="text-sm text-red-400 font-medium">Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {currentView === 'home' && showLoadBoard && (
        <div className="border-b-2 border-gray-800 bg-gradient-to-br from-gray-900 to-black">
          <div className="max-w-3xl mx-auto px-6 py-6">
            <div className="flex items-center gap-2 mb-4">
              <button onClick={() => setActiveTab('featured')} className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'featured' ? 'bg-green-500 text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
                <Package className="w-4 h-4" />
                Featured
              </button>
              <button onClick={() => setActiveTab('history')} className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'history' ? 'bg-green-500 text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
                <History className="w-4 h-4" />
                History
                {loadHistory.length > 0 && <span className="px-2 py-0.5 bg-green-900/30 text-green-400 text-xs rounded-full">{loadHistory.length}</span>}
              </button>
              <button onClick={() => setActiveTab('favorites')} className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'favorites' ? 'bg-green-500 text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
                <Star className="w-4 h-4" />
                Favorites
                {favoriteLoads.length > 0 && <span className="px-2 py-0.5 bg-yellow-900/30 text-yellow-400 text-xs rounded-full">{favoriteLoads.length}</span>}
              </button>
            </div>

            {activeTab === 'featured' && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-green-400" />
                    <h2 className="text-lg font-semibold text-white">Featured Load</h2>
                    <span className="px-2 py-0.5 bg-green-900/30 text-green-400 text-xs rounded-full">{carrier?.equipmentTypes[0] || 'All'}</span>
                  </div>
                  <button onClick={handleRefreshLoad} disabled={isLoadingLoad} className="px-3 py-1.5 bg-green-500 hover:bg-green-400 text-black text-sm rounded-lg transition-colors flex items-center gap-2">
                    <RefreshCw className={`w-4 h-4 ${isLoadingLoad ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
                {featuredLoad ? (
                  <LoadCard load={featuredLoad} onClaim={handleClaimLoad} onNav={handleGetNavigation} onFavorite={() => toggleFavorite(featuredLoad)} isFavorited={isFavorited(featuredLoad.loadId)} />
                ) : (
                  <EmptyState icon={Package} message="No loads available" />
                )}
              </>
            )}

            {activeTab === 'history' && (
              <>
                <div className="mb-4 flex gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by city, broker, or load ID..." className="w-full pl-10 pr-4 py-2 border border-gray-700 bg-gray-800 text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none" />
                  </div>
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <select value={filterEquipment} onChange={(e) => setFilterEquipment(e.target.value)} className="pl-10 pr-8 py-2 border border-gray-700 bg-gray-800 text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none appearance-none">
                      <option value="all">All Types</option>
                      <option value="dry van">Dry Van</option>
                      <option value="reefer">Reefer</option>
                      <option value="flatbed">Flatbed</option>
                    </select>
                  </div>
                </div>
                {getFilteredLoads(loadHistory).length > 0 ? (
                  <div className="space-y-3">
                    {getFilteredLoads(loadHistory).map((load, idx) => (
                      <LoadCard key={idx} load={load} onClaim={() => markLoadClaimed(load.loadId)} onNav={() => { const navUrl = `https://www.google.com/maps/dir/?api=1&origin=${load.origin.lat},${load.origin.lng}&destination=${load.destination.lat},${load.destination.lng}&travelmode=driving`; window.open(navUrl, '_blank'); }} onFavorite={() => toggleFavorite(load)} isFavorited={isFavorited(load.loadId)} showStatus={true} compact={true} />
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={searchQuery || filterEquipment !== 'all' ? Search : History} message={searchQuery || filterEquipment !== 'all' ? 'No loads match your search' : 'No load history yet'} />
                )}
              </>
            )}

            {activeTab === 'favorites' && (
              <>
                <div className="mb-4 flex gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search favorites..." className="w-full pl-10 pr-4 py-2 border border-gray-700 bg-gray-800 text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none" />
                  </div>
                </div>
                {getFilteredLoads(favoriteLoads).length > 0 ? (
                  <div className="space-y-3">
                    {getFilteredLoads(favoriteLoads).map((load, idx) => (
                      <LoadCard key={idx} load={load} onClaim={() => { markLoadClaimed(load.loadId); alert(`✅ Load marked as claimed!\n\nContact broker:\n${load.broker.name}\n${load.broker.phone}`); }} onNav={() => { const navUrl = `https://www.google.com/maps/dir/?api=1&origin=${load.origin.lat},${load.origin.lng}&destination=${load.destination.lat},${load.destination.lng}&travelmode=driving`; window.open(navUrl, '_blank'); }} onFavorite={() => toggleFavorite(load)} isFavorited={true} compact={true} />
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={searchQuery || filterEquipment !== 'all' ? Search : Star} message={searchQuery || filterEquipment !== 'all' ? 'No favorites match your search' : 'No favorite loads yet. Star loads to save them!'} />
                )}
              </>
            )}
          </div>
        </div>
      )}

      {currentView === 'home' && (
        <>
          <div className="flex-1 overflow-y-auto bg-black">
            <div className="max-w-3xl mx-auto px-6 py-12">
              <div className="space-y-8">
                {messages.map((msg, idx) => (
                  <div key={idx}>
                    <div className={`flex ${msg.from === "driver" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[70%] ${msg.from === "driver" ? "" : "flex items-start gap-3"}`}>
                        {msg.from === "pure" && (
                          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0 mt-1">
                            <MessageCircle className="w-4 h-4 text-black" />
                          </div>
                        )}
                        <div>
                          <div className={`${msg.from === "driver" ? "bg-green-500 text-black rounded-3xl px-5 py-3" : "bg-gray-900 text-white rounded-3xl px-5 py-3 border border-gray-800"}`}>
                            {msg.skill && (
                              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-700">
                                {React.createElement(getSkillIcon(msg.skill), { className: "w-4 h-4 text-green-400" })}
                                <span className="text-xs font-semibold text-green-400 uppercase">{msg.skill}</span>
                              </div>
                            )}
                            <p className="text-base leading-relaxed whitespace-pre-wrap font-normal">{msg.text}</p>
                          </div>
                          <div className={`flex items-center gap-1.5 mt-1.5 px-2 ${msg.from === "driver" ? "justify-end" : "justify-start"}`}>
                            <Clock className="w-3 h-3 text-gray-600" />
                            <span className="text-xs text-gray-600">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {msg.mood && msg.from === "pure" && (
                              <>
                                <span className="w-1 h-1 rounded-full bg-gray-700 ml-1"></span>
                                <span className={`text-xs font-medium ${getMoodColor(msg.mood)}`}>{msg.mood}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0 mt-1">
                        <MessageCircle className="w-4 h-4 text-black" />
                      </div>
                      <div className="bg-gray-900 rounded-3xl px-5 py-4 flex items-center gap-1 border border-gray-800">
                        <span className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 bg-black">
            <div className="max-w-3xl mx-auto px-6 py-5">
              <div className="flex items-end gap-3">
                <button onClick={startVoiceInput} disabled={isTyping} className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors flex-shrink-0 shadow-lg ${isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-400'}`}>
                  {isListening ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-black" />}
                </button>
                <div className="flex-1 bg-gray-900 rounded-full px-5 py-3 focus-within:bg-gray-800 transition-colors border border-gray-800">
                  <textarea value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyPress={handleKeyPress} placeholder={isListening ? "🎤 Listening..." : "Type or tap mic to speak..."} disabled={isListening} className="w-full bg-transparent text-white placeholder-gray-500 resize-none focus:outline-none text-base disabled:opacity-50" rows={1} style={{ minHeight: "24px", maxHeight: "120px" }} />
                </div>
                <button onClick={handleSend} disabled={!inputText.trim() || isTyping || isListening} className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-400 disabled:bg-gray-800 disabled:cursor-not-allowed flex items-center justify-center transition-colors flex-shrink-0 shadow-lg">
                  <Send className="w-6 h-6 text-black" />
                </button>
              </div>
              <div className="mt-4 text-center">
                {isListening ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce"></div>
                    <p className="text-sm text-red-500 font-semibold">LISTENING - SPEAK NOW</p>
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-600">🎤 "Find fuel" • "Book load Dallas to Atlanta" • "Weather in Kansas City"</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {currentView === 'profile' && (
        <div className="flex-1 overflow-y-auto bg-black">
          <div className="max-w-4xl mx-auto px-6 py-12">
            <h2 className="text-3xl font-light text-white mb-8">Carrier Profile</h2>
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 mb-6">
              <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                <Building className="w-5 h-5 text-green-400" />
                Company Information
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Company Name</p>
                  <p className="text-lg font-medium text-white">{carrier?.companyName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">MC Number</p>
                  <p className="text-lg font-medium text-white">{carrier?.mcNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">DOT Number</p>
                  <p className="text-lg font-medium text-white">{carrier?.dotNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Status</p>
                  <span className="px-3 py-1 bg-green-900/30 text-green-400 rounded-full text-sm font-medium">✓ Verified</span>
                </div>
              </div>
            </div>
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 mb-6">
              <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                <Mail className="w-5 h-5 text-green-400" />
                Contact Information
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Email</p>
                  <p className="text-lg font-medium text-white">{carrier?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Phone</p>
                  <p className="text-lg font-medium text-white">{carrier?.phone}</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8">
              <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                <Package className="w-5 h-5 text-green-400" />
                Equipment & Operations
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-400 mb-2">Equipment Types</p>
                  <div className="flex flex-wrap gap-2">
                    {carrier?.equipmentTypes.map((type, idx) => (
                      <span key={idx} className="px-3 py-1 bg-green-900/30 text-green-400 rounded-full text-sm capitalize">{type}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-2">Operating Regions</p>
                  <div className="flex flex-wrap gap-2">
                    {carrier?.operatingRegions.map((region, idx) => (
                      <span key={idx} className="px-3 py-1 bg-purple-900/30 text-purple-400 rounded-full text-sm">{region}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {currentView === 'documents' && (
        <div className="flex-1 overflow-y-auto bg-black">
          <div className="max-w-4xl mx-auto px-6 py-12">
            <h2 className="text-3xl font-light text-white mb-8">Documents</h2>
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-12 text-center">
              <FileText className="w-16 h-16 text-gray-700 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-white mb-2">Document Management Coming Soon</h3>
              <p className="text-gray-400 mb-6">Upload and manage your carrier documents, insurance certificates, and compliance paperwork.</p>
              <button className="px-6 py-3 bg-green-500 text-black rounded-lg hover:bg-green-400 transition-colors font-medium">Upload Document</button>
            </div>
          </div>
        </div>
      )}

      {currentView === 'loadhistory' && (
        <div className="flex-1 overflow-y-auto bg-black">
          <div className="max-w-4xl mx-auto px-6 py-12">
            <h2 className="text-3xl font-light text-white mb-8">Complete Load Management</h2>
            <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl border-2 border-gray-800 p-6">
              <div className="flex items-center gap-2 mb-6">
                <button onClick={() => setActiveTab('featured')} className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'featured' ? 'bg-green-500 text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
                  <Package className="w-4 h-4" />
                  Featured
                </button>
                <button onClick={() => setActiveTab('history')} className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'history' ? 'bg-green-500 text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
                  <History className="w-4 h-4" />
                  History
                  {loadHistory.length > 0 && <span className="px-2 py-0.5 bg-green-900/30 text-green-400 text-xs rounded-full">{loadHistory.length}</span>}
                </button>
                <button onClick={() => setActiveTab('favorites')} className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'favorites' ? 'bg-green-500 text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
                  <Star className="w-4 h-4" />
                  Favorites
                  {favoriteLoads.length > 0 && <span className="px-2 py-0.5 bg-yellow-900/30 text-yellow-400 text-xs rounded-full">{favoriteLoads.length}</span>}
                </button>
              </div>
              {activeTab === 'featured' && featuredLoad && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Current Featured Load</h3>
                    <button onClick={handleRefreshLoad} disabled={isLoadingLoad} className="px-3 py-1.5 bg-green-500 hover:bg-green-400 text-black text-sm rounded-lg transition-colors flex items-center gap-2">
                      <RefreshCw className={`w-4 h-4 ${isLoadingLoad ? 'animate-spin' : ''}`} />
                      Refresh
                    </button>
                  </div>
                  <LoadCard load={featuredLoad} onClaim={handleClaimLoad} onNav={handleGetNavigation} onFavorite={() => toggleFavorite(featuredLoad)} isFavorited={isFavorited(featuredLoad.loadId)} />
                </>
              )}
              {activeTab === 'history' && (
                <>
                  <div className="mb-4 flex gap-3">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by city, broker, or load ID..." className="w-full pl-10 pr-4 py-2 border border-gray-700 bg-gray-800 text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none" />
                    </div>
                    <div className="relative">
                      <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <select value={filterEquipment} onChange={(e) => setFilterEquipment(e.target.value)} className="pl-10 pr-8 py-2 border border-gray-700 bg-gray-800 text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none appearance-none">
                        <option value="all">All Types</option>
                        <option value="dry van">Dry Van</option>
                        <option value="reefer">Reefer</option>
                        <option value="flatbed">Flatbed</option>
                      </select>
                    </div>
                  </div>
                  {getFilteredLoads(loadHistory).length > 0 ? (
                    <div className="space-y-3">
                      {getFilteredLoads(loadHistory).map((load, idx) => (
                        <LoadCard key={idx} load={load} onClaim={() => markLoadClaimed(load.loadId)} onNav={() => { const navUrl = `https://www.google.com/maps/dir/?api=1&origin=${load.origin.lat},${load.origin.lng}&destination=${load.destination.lat},${load.destination.lng}&travelmode=driving`; window.open(navUrl, '_blank'); }} onFavorite={() => toggleFavorite(load)} isFavorited={isFavorited(load.loadId)} showStatus={true} compact={true} />
                      ))}
                    </div>
                  ) : (
                    <EmptyState icon={History} message="No load history yet" />
                  )}
                </>
              )}
              {activeTab === 'favorites' && (
                <>
                  <div className="mb-4 flex gap-3">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search favorites..." className="w-full pl-10 pr-4 py-2 border border-gray-700 bg-gray-800 text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none" />
                    </div>
                  </div>
                  {getFilteredLoads(favoriteLoads).length > 0 ? (
                    <div className="space-y-3">
                      {getFilteredLoads(favoriteLoads).map((load, idx) => (
                        <LoadCard key={idx} load={load} onClaim={() => { markLoadClaimed(load.loadId); alert(`✅ Load marked as claimed!\n\nContact broker:\n${load.broker.name}\n${load.broker.phone}`); }} onNav={() => { const navUrl = `https://www.google.com/maps/dir/?api=1&origin=${load.origin.lat},${load.origin.lng}&destination=${load.destination.lat},${load.destination.lng}&travelmode=driving`; window.open(navUrl, '_blank'); }} onFavorite={() => toggleFavorite(load)} isFavorited={true} compact={true} />
                      ))}
                    </div>
                  ) : (
                    <EmptyState icon={Star} message="No favorite loads yet" />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}