
const Logo = ({ size = 'md', showText = true, className = '' }) => {
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  const textSizeMap = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl'
  };

  const logoSize = sizeMap[size] || sizeMap.md;
  const textSize = textSizeMap[size] || textSizeMap.md;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img 
        src="https://i.postimg.cc/g0VG0rdv/1765292235-removebg-preview.png"
        alt="Pure Dispatch Logo" 
        className={`${logoSize} object-contain`}
      />
      
      {showText && (
        <h1 className={`${textSize} font-bold text-white tracking-wide`}>
          Pure Dispatch
        </h1>
      )}
    </div>
  );
};
import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Truck, Send, User, Volume2, VolumeX, Clock, Zap, Mic, MicOff, MapPin, Fuel, Navigation, Package, Phone, CloudRain, AlertCircle, Building, Mail, RefreshCw, Star, History, Search, Filter, Download, LogOut, ChevronDown, Home, FileText, Upload, Check, X, Eye, Trash2, Lock, LogIn, Globe, PhoneCall, Settings, BellOff, DollarSign, TrendingUp, Bell, Shield, CheckCircle, Loader } from 'lucide-react';
// NOTE: These files need to be uploaded to your project:
        import VerificationDashboard from './VerificationDashboard';
// - src/utils/messageTracking.js (upload message-tracking-system.js here)
// - src/components/CallSettingsPanel.jsx (already created)
// Uncomment these imports after uploading the files:
/*
import { 
  MessageTracker, 
  CallSettings, 
  MESSAGE_PRIORITY,
  createTrackedMessage,
  formatCallMessage
} from './utils/messageTracking';
import CallSettingsPanel from './components/CallSettingsPanel';
*/

// Backend URL
const BACKEND_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:8080'
  : '';

// =====================================================
// ELEVENLABS VOICE - PURE'S AI VOICE
// =====================================================
//
// MOBILE COMPATIBILITY NOTE:
// - Mobile browsers (iOS Safari, Chrome Android) BLOCK autoplay audio
// - Voice ONLY works when triggered by direct user interaction (button click, form submit)
// - Auto-voice on login/page load will be BLOCKED on mobile
// - Voice WILL work when user sends a message (user interaction ✓)
// =====================================================

// Current audio instance (for stopping/managing playback)
let currentVoiceAudio = null;

/**
 * Pure's Voice using ElevenLabs AI
 * Professional, natural-sounding voice for Pure's responses
 * 
 * IMPORTANT: On mobile, this only works when called from user interaction
 * (e.g., after user clicks send button, not on automatic page events)
 * 
 * @param {string} text - Text to speak
 * @param {function} onStart - Callback when audio starts playing
 * @param {function} onEnd - Callback when audio finishes
 * @returns {Promise<boolean>} - True if succeeded, false if failed
 */
const forceSpeak = async (text, onStart, onEnd) => {
  try {
    // Stop any currently playing audio
    if (currentVoiceAudio) {
      currentVoiceAudio.pause();
      currentVoiceAudio = null;
    }

    // Validate text
    if (!text || text.trim().length === 0) {
      console.warn('forceSpeak: Empty text provided');
      if (onEnd) onEnd();
      return false;
    }

    // Limit text length
    const maxLength = 5000;
    const textToSpeak = text.length > maxLength 
      ? text.substring(0, maxLength) + '...' 
      : text;

    console.log('🎤 Requesting ElevenLabs voice for:', textToSpeak.substring(0, 50) + '...');

    // Call backend to generate voice
    const apiUrl = `${BACKEND_URL}/api/speak`;
    console.log('🎤 API URL:', apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text: textToSpeak })
    });

    console.log('🎤 API Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🎤 API Error:', response.status, errorText);
      throw new Error(`Backend returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('🎤 API Response received:', data.success ? 'Success' : 'Failed');

    if (!data.success || !data.audio) {
      throw new Error('Invalid response from voice API');
    }

    // Notify that audio is starting
    if (onStart) onStart();

    // Create and configure audio element
    currentVoiceAudio = new Audio(data.audio);
    currentVoiceAudio.volume = 0.85;          // ← VOLUME: Clear but not too loud
    currentVoiceAudio.playbackRate = 0.92;    // ← TIMING: 92% speed for smooth delivery

    // Setup event handlers
    currentVoiceAudio.onended = () => {
      console.log('🎤 Audio playback finished');
      currentVoiceAudio = null;
      if (onEnd) onEnd();
    };

    currentVoiceAudio.onerror = (error) => {
      console.error('🎤 Voice playback error:', error);
      currentVoiceAudio = null;
      if (onEnd) onEnd();
    };

    // Play the audio
    console.log('🎤 Playing ElevenLabs audio...');
    await currentVoiceAudio.play();
    console.log('🎤 Audio playback started successfully');
    return true;

  } catch (error) {
    console.error('🎤 ElevenLabs voice error:', error);
    console.log('🎤 Falling back to browser TTS...');
    
    // Fallback to browser text-to-speech if ElevenLabs fails
    return fallbackToSystemVoice(text, onStart, onEnd);
  }
};

/**
 * Fallback to browser's built-in text-to-speech
 * Used when ElevenLabs API is unavailable
 */
const fallbackToSystemVoice = (text, onStart, onEnd) => {
  console.log('🔊 Using browser TTS fallback');
  return new Promise((resolve) => {
    if (!window.speechSynthesis) {
      console.error('🔊 speechSynthesis not available');
      if (onEnd) onEnd();
      resolve(false);
      return;
    }

    window.speechSynthesis.cancel();
    
    setTimeout(() => {
      console.log('🔊 Creating browser TTS utterance');
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;      // Slightly slower for clarity
      utterance.pitch = 1.0;
      utterance.volume = 0.85;
      utterance.lang = 'en-US';
      
      utterance.onstart = () => { 
        console.log('🔊 Browser TTS started');
        if (onStart) onStart(); 
      };
      
      utterance.onend = () => { 
        console.log('🔊 Browser TTS finished');
        if (onEnd) onEnd(); 
        resolve(true); 
      };
      
      utterance.onerror = () => { 
        console.error('🔊 Browser TTS error');
        if (onEnd) onEnd(); 
        resolve(false); 
      };
      
      console.log('🔊 Speaking with browser TTS...');
      window.speechSynthesis.speak(utterance);
    }, 100);
  });
};

/**
 * Stop any currently playing voice
 */
const stopSpeaking = () => {
  // Stop ElevenLabs audio
  if (currentVoiceAudio) {
    currentVoiceAudio.pause();
    currentVoiceAudio = null;
  }
  
  // Stop browser TTS
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
};

// =====================================================

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
// GPS & LOCATION UTILITIES
// =====================================================

// Start GPS tracking
const startGPSTracking = (onLocation, onError) => {
  if (!navigator.geolocation) {
    onError('GPS not supported');
    return null;
  }

  const options = {
    enableHighAccuracy: true,
    timeout: 15000, // 15 seconds
    maximumAge: 5000 // Cache position for 5 seconds - reduces update frequency
  };

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      const locationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        speed: position.coords.speed,
        heading: position.coords.heading,
        altitude: position.coords.altitude,
        timestamp: position.timestamp
      };
      onLocation(locationData);
    },
    (error) => {
      let errorMessage = 'GPS error';
      switch(error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = 'GPS permission denied';
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = 'GPS position unavailable';
          break;
        case error.TIMEOUT:
          errorMessage = 'GPS timeout';
          break;
      }
      onError(errorMessage);
    },
    options
  );

  return watchId;
};

// Stop GPS tracking
const stopGPSTracking = (watchId) => {
  if (watchId !== null && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
  }
};

// Calculate distance between two points (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 3959; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Calculate ETA
const calculateETA = (currentLat, currentLon, destLat, destLon, avgSpeedMph = 55) => {
  const distance = calculateDistance(currentLat, currentLon, destLat, destLon);
  const hoursToDestination = distance / avgSpeedMph;
  const eta = new Date(Date.now() + hoursToDestination * 60 * 60 * 1000);
  return {
    distance: distance.toFixed(1),
    hours: Math.floor(hoursToDestination),
    minutes: Math.round((hoursToDestination % 1) * 60),
    eta: eta,
    etaString: eta.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  };
};

// Format location for display
const formatLocation = (lat, lon) => {
  return `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`;
};

// Convert speed from m/s to mph
const metersPerSecondToMph = (mps) => {
  if (mps === null || mps === undefined) return null;
  return (mps * 2.237).toFixed(1);
};

// Find nearby services using Overpass API (OpenStreetMap - FREE)
const findNearbyServices = async (latitude, longitude, radiusMiles = 25, type = 'fuel') => {
  try {
    let query = '';
    const radiusMeters = radiusMiles * 1609.34;
    
    switch(type) {
      case 'fuel':
        query = `[out:json];node[amenity=fuel](around:${radiusMeters},${latitude},${longitude});out;`;
        break;
      case 'rest':
        query = `[out:json];node[highway=rest_area](around:${radiusMeters},${latitude},${longitude});out;`;
        break;
      case 'parking':
        query = `[out:json];node[amenity=parking][hgv=yes](around:${radiusMeters},${latitude},${longitude});out;`;
        break;
      case 'food':
        query = `[out:json];node[amenity~"restaurant|fast_food"](around:${radiusMeters},${latitude},${longitude});out;`;
        break;
      case 'repair':
        query = `[out:json];node[shop=truck_repair](around:${radiusMeters},${latitude},${longitude});out;`;
        break;
      case 'weigh':
        query = `[out:json];node[amenity=weigh_station](around:${radiusMeters},${latitude},${longitude});out;`;
        break;
      default:
        query = `[out:json];node[amenity=fuel](around:${radiusMeters},${latitude},${longitude});out;`;
    }
    
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.elements.map(element => ({
        id: element.id,
        name: element.tags.name || 'Unnamed',
        lat: element.lat,
        lon: element.lon,
        distance: calculateDistance(latitude, longitude, element.lat, element.lon).toFixed(1),
        brand: element.tags.brand || '',
        operator: element.tags.operator || '',
        type: type,
        amenities: element.tags.amenity ? [element.tags.amenity] : []
      })).sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
    }
  } catch (error) {
    console.error('Service search error:', error);
  }
  
  // Fallback to mock data if API fails
  const mockServices = {
    fuel: [
      { name: "Pilot Travel Center", distance: "12.3", lat: latitude + 0.1, lon: longitude + 0.1, brand: "Pilot", type: "fuel" },
      { name: "Love's Travel Stop", distance: "18.7", lat: latitude + 0.15, lon: longitude + 0.15, brand: "Love's", type: "fuel" }
    ],
    rest: [
      { name: "Rest Area", distance: "8.2", lat: latitude + 0.05, lon: longitude + 0.05, type: "rest" }
    ],
    food: [
      { name: "McDonald's", distance: "5.3", lat: latitude + 0.03, lon: longitude + 0.03, type: "food" }
    ]
  };
  return mockServices[type] || [];
};

// Format location share for broker
const formatLocationShare = (locationData, driverName, loadNumber) => {
  const googleMapsLink = `https://www.google.com/maps?q=${locationData.latitude},${locationData.longitude}`;
  const timestamp = new Date(locationData.timestamp).toLocaleString();
  const speedText = locationData.speed ? `${metersPerSecondToMph(locationData.speed)} mph` : 'Stationary';
  
  return {
    text: `${driverName} - Load ${loadNumber}
Location: ${formatLocation(locationData.latitude, locationData.longitude)}
Speed: ${speedText}
Updated: ${timestamp}
Map: ${googleMapsLink}`,
    link: googleMapsLink,
    coordinates: { lat: locationData.latitude, lon: locationData.longitude }
  };
};

// =====================================================
// GPS CONTROL PANEL COMPONENT (Memoized for performance)
// =====================================================
const GPSControlPanel = React.memo(({ 
  location, 
  isTracking, 
  onStartTracking, 
  onStopTracking, 
  speed,
  currentLoad,
  onSendETAUpdate 
}) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Navigation className={`w-5 h-5 ${isTracking ? 'text-green-400' : 'text-gray-500'}`} />
          <span className="text-white font-medium">GPS Tracking</span>
        </div>
        <button
          onClick={isTracking ? onStopTracking : onStartTracking}
          className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
            isTracking 
              ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50' 
              : 'bg-green-500 text-black hover:bg-green-400'
          }`}
        >
          {isTracking ? 'Stop Tracking' : 'Start Tracking'}
        </button>
      </div>

      {isTracking && location && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-gray-800 rounded-lg p-2">
              <p className="text-gray-400 text-xs">Latitude</p>
              <p className="text-white font-mono">{location.latitude.toFixed(6)}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-2">
              <p className="text-gray-400 text-xs">Longitude</p>
              <p className="text-white font-mono">{location.longitude.toFixed(6)}</p>
            </div>
          </div>

          {speed !== null && speed > 0 && (
            <div className="bg-gray-800 rounded-lg p-2">
              <p className="text-gray-400 text-xs">Current Speed</p>
              <p className="text-green-400 text-lg font-medium">{speed} mph</p>
            </div>
          )}

          {currentLoad && (
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-300">Active Load</span>
                <span className="text-xs text-green-400 flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  En Route
                </span>
              </div>
              <p className="text-white text-sm mb-2 font-medium">{currentLoad.destination}</p>
              <button
                onClick={onSendETAUpdate}
                className="w-full px-3 py-2 bg-green-500 text-black rounded-lg hover:bg-green-400 transition-colors text-sm font-medium"
              >
                Send ETA Update to Broker
              </button>
            </div>
          )}

          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full px-3 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors text-sm flex items-center justify-center gap-2"
          >
            {showDetails ? 'Hide Details' : 'Show GPS Details'}
            <ChevronDown className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
          </button>

          {showDetails && (
            <div className="bg-gray-800 rounded-lg p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-400">Accuracy:</span>
                <span className="text-white">{location.accuracy.toFixed(0)}m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Last Update:</span>
                <span className="text-white">{new Date(location.timestamp).toLocaleTimeString()}</span>
              </div>
              {location.altitude !== null && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Altitude:</span>
                  <span className="text-white">{location.altitude.toFixed(0)}m</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!isTracking && (
        <p className="text-gray-500 text-sm text-center py-2">
          Enable GPS tracking to get real-time location, ETA updates, and nearby services
        </p>
      )}
    </div>
  );
});

// =====================================================
// NEARBY SERVICES COMPONENT (Memoized for performance)
// =====================================================
const NearbyServicesPanel = React.memo(({ location, onServiceRequest }) => {
  const [services, setServices] = useState([]);
  const [selectedType, setSelectedType] = useState('fuel');
  const [isLoading, setIsLoading] = useState(false);
  const hasSearchedRef = useRef(false);
  const lastSearchLocationRef = useRef(null);

  const serviceTypes = [
    { id: 'fuel', name: 'Fuel', icon: Fuel },
    { id: 'rest', name: 'Rest', icon: Home },
    { id: 'parking', name: 'Park', icon: Truck },
    { id: 'food', name: 'Food', icon: Package },
    { id: 'repair', name: 'Repair', icon: AlertCircle },
    { id: 'weigh', name: 'Weigh', icon: Package }
  ];

  const searchServices = async (type) => {
    if (!location) return;
    
    // Don't search if we're already loading
    if (isLoading) return;
    
    setIsLoading(true);
    const results = await findNearbyServices(location.latitude, location.longitude, 25, type);
    setServices(results);
    setIsLoading(false);
    lastSearchLocationRef.current = { lat: location.latitude, lon: location.longitude };
  };

  // Only search when service type changes, NOT on every location update
  useEffect(() => {
    if (location && selectedType && !hasSearchedRef.current) {
      searchServices(selectedType);
      hasSearchedRef.current = true;
    }
  }, [selectedType]);

  const handleTypeChange = (type) => {
    setSelectedType(type);
    if (location) {
      searchServices(type);
    }
  };

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
      <h3 className="text-white font-medium mb-3 flex items-center gap-2">
        <MapPin className="w-5 h-5 text-green-400" />
        Nearby Services
      </h3>

      <div className="grid grid-cols-3 gap-2 mb-3">
        {serviceTypes.map((type) => {
          const Icon = type.icon;
          return (
            <button
              key={type.id}
              onClick={() => handleTypeChange(type.id)}
              className={`p-2 rounded-lg border-2 transition-all ${
                selectedType === type.id
                  ? 'border-green-500 bg-green-500/10 text-green-400'
                  : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
              }`}
            >
              <Icon className="w-4 h-4 mx-auto mb-1" />
              <p className="text-xs">{type.name}</p>
            </button>
          );
        })}
      </div>

      {!location && (
        <p className="text-gray-500 text-sm text-center py-3">
          Enable GPS tracking to see nearby services
        </p>
      )}

      {isLoading && (
        <div className="text-center py-4">
          <RefreshCw className="w-6 h-6 text-green-400 animate-spin mx-auto" />
          <p className="text-gray-400 text-xs mt-2">Searching nearby...</p>
        </div>
      )}

      {!isLoading && services.length > 0 && (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {services.slice(0, 10).map((service) => (
            <div
              key={service.id}
              className="bg-gray-800 rounded-lg p-3 hover:bg-gray-750 transition-colors cursor-pointer"
              onClick={() => onServiceRequest && onServiceRequest(service)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{service.name}</p>
                  {service.brand && (
                    <p className="text-gray-400 text-xs">{service.brand}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-green-400 text-sm font-medium">{service.distance} mi</p>
                  <p className="text-gray-500 text-xs">away</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && services.length === 0 && location && (
        <p className="text-gray-500 text-sm text-center py-3">
          No {serviceTypes.find(t => t.id === selectedType)?.name.toLowerCase()} found within 25 miles
        </p>
      )}
    </div>
  );
});

// =====================================================
// LOGIN PAGE COMPONENT (Enhanced with Forgot Password & Reset)
// =====================================================
function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetData, setResetData] = useState(null);
  
  // Password Reset Page State
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [resetEmailFromUrl, setResetEmailFromUrl] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
        // Handle forgot password request
const handleForgotPassword = async (e) => {
  e.preventDefault();
  setError('');
  setIsLoading(true);

  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: resetEmail })
    });

    const data = await response.json();

    if (data.success) {
      setResetSent(true);
      setResetData(data);
    } else {
      setError(data.error || 'Failed to send reset email');
    }
  } catch (err) {
    console.error('Password reset error:', err);
    setError('Failed to send reset email. Please try again.');
  } finally {
    setIsLoading(false);
  }
};

// Handle password reset with token
const handlePasswordReset = async (e) => {
  e.preventDefault();
  setError('');

  if (!newPassword || !confirmPassword) {
    setError('Please fill in all fields');
    return;
  }

  if (newPassword.length < 8) {
    setError('Password must be at least 8 characters');
    return;
  }

  if (newPassword !== confirmPassword) {
    setError('Passwords do not match');
    return;
  }

  setIsLoading(true);

  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/update-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: resetEmailFromUrl,
        token: resetToken,
        newPassword
      })
    });

    const data = await response.json();

    if (data.success) {
      setResetSuccess(true);
      setTimeout(() => {
        window.location.href = window.location.origin;
      }, 2000);
    } else {
      setError(data.error || 'Failed to reset password');
    }
  } catch (err) {
    console.error('Password reset error:', err);
    setError('Failed to reset password. Please try again.');
  } finally {
    setIsLoading(false);
  }
};

  // Check URL for reset token on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const emailParam = urlParams.get('email');
    
    if (token && emailParam) {
      setShowResetPassword(true);
      setResetToken(token);
      setResetEmailFromUrl(emailParam);
    }
  }, []);

  const handleLogin = async (e) => {
  e.preventDefault();
  setError('');
  
  if (!email || !password) {
    setError('Please enter email and password');
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    setError('Please enter a valid email address');
    return;
  }

  if (password.length < 8) {
    setError('Password must be at least 8 characters');
    return;
  }

  setIsLoading(true);

  try {
    console.log('🔐 Database login for:', email);
    
    // Call backend login API
    const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Login failed:', errorData.error);
      setError('Invalid email or password');
      setIsLoading(false);
      return;
    }

    const data = await response.json();
    console.log('✅ Login successful, JWT received');

    // Save JWT token and email
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('userEmail', email);
    localStorage.setItem('userId', data.user.id);

    // Load carrier data from backend
    console.log('📦 Fetching carrier data from backend...');
    
    const carrierResponse = await fetch(`${BACKEND_URL}/api/auth/get-carrier`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${data.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (carrierResponse.ok) {
      const carrierData = await carrierResponse.json();
      console.log('✅ Carrier data loaded');
      
      // Cache carrier data
      localStorage.setItem('pureCarrier', JSON.stringify(carrierData.carrier));
      
      onLogin(carrierData.carrier);
    } else {
      console.log('📝 No carrier data - new registration needed');
      onLogin({ isNewUser: true });
    }
      console.error('❌ Password reset error:', error);
      setError('Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset Password Page
  if (showResetPassword) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-6">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-black" />
            </div>
            <h1 className="text-4xl font-light text-white mb-2">Reset Password</h1>
            <p className="text-gray-400">Enter your new password</p>
          </div>

          <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
            {resetSuccess ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-6 h-6 text-green-400" />
                </div>
                <h3 className="text-xl font-medium text-white mb-2">Password Updated!</h3>
                <p className="text-gray-400 mb-4">
                  Your password has been successfully updated.
                </p>
                <p className="text-sm text-gray-500">
                  Redirecting to login...
                </p>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-light text-white mb-6">Set New Password</h2>
                
                <div className="mb-4 bg-gray-800/50 rounded-xl p-3 border border-gray-700">
                  <p className="text-sm text-gray-400">Resetting password for:</p>
                  <p className="text-green-400 font-medium">{resetEmailFromUrl}</p>
                </div>

                {error && (
                  <div className="mb-4 bg-red-900/20 border border-red-500 rounded-xl p-3 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-300">{error}</p>
                  </div>
                )}

                <form onSubmit={handlePasswordReset} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
                      disabled={isLoading}
                    />
                    <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
                      disabled={isLoading}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-green-500 text-black py-3 rounded-full hover:bg-green-400 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {isLoading ? 'Updating Password...' : 'Update Password'}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <button
                    onClick={() => window.location.href = window.location.origin}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    ← Back to Login
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-6">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-black" />
            </div>
            <h1 className="text-4xl font-light text-white mb-2">Reset Password</h1>
            <p className="text-gray-400">We'll send you a reset link</p>
          </div>

          <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
            {resetSent ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-6 h-6 text-green-400" />
                </div>
                
                {resetData?.resetToken ? (
                  // TEMPORARY: Show reset token directly (until email is set up)
                  <>
                    <h3 className="text-xl font-medium text-white mb-2">Password Reset Ready</h3>
                    <p className="text-gray-400 mb-4">
                      Reset requested for <span className="text-green-400">{resetEmail}</span>
                    </p>
                    
                    <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-4 mb-4 text-left">
                      <p className="text-yellow-400 text-sm mb-3">
                        ⚠️ <strong>TEMPORARY MODE</strong> - Email sending not yet configured
                      </p>
                      <p className="text-white text-sm mb-2">To reset your password:</p>
                      <ol className="text-gray-300 text-sm space-y-2 ml-4 list-decimal">
                        <li>Copy the reset code below</li>
                        <li>Contact your administrator</li>
                        <li>They'll help you reset your password</li>
                      </ol>
                    </div>
                    
                    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-4">
                      <p className="text-gray-400 text-xs mb-2">Reset Code:</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-black px-3 py-2 rounded-lg text-green-400 text-sm font-mono break-all">
                          {resetData.resetToken}
                        </code>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(resetData.resetToken);
                            alert('Reset code copied to clipboard!');
                          }}
                          className="px-3 py-2 bg-green-500 text-black rounded-lg hover:bg-green-400 transition-colors text-sm whitespace-nowrap"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => {
                        setShowForgotPassword(false);
                        setResetSent(false);
                        setResetEmail('');
                        setResetData(null);
                      }}
                      className="w-full bg-green-500 text-black py-3 rounded-full hover:bg-green-400 transition-colors font-medium"
                    >
                      Back to Login
                    </button>
                  </>
                ) : (
                  // PRODUCTION: Email sent successfully
                  <>
                    <h3 className="text-xl font-medium text-white mb-2">Check Your Email</h3>
                    <p className="text-gray-400 mb-6">
                      We've sent password reset instructions to <span className="text-green-400">{resetEmail}</span>
                    </p>
                    <button
                      onClick={() => {
                        setShowForgotPassword(false);
                        setResetSent(false);
                        setResetEmail('');
                        setResetData(null);
                      }}
                      className="w-full bg-green-500 text-black py-3 rounded-full hover:bg-green-400 transition-colors font-medium"
                    >
                      Back to Login
                    </button>
                  </>
                )}
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-light text-white mb-6">Forgot Password</h2>
                
                {error && (
                  <div className="mb-4 bg-red-900/20 border border-red-500 rounded-xl p-3 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-300">{error}</p>
                  </div>
                )}

                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-gray-800 text-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none placeholder-gray-500"
                      placeholder="your@email.com"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-green-500 text-black py-3 rounded-full hover:bg-green-400 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {isLoading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <button
                    onClick={() => {
                      setShowForgotPassword(false);
                      setError('');
                    }}
                    className="text-sm text-gray-400 hover:text-green-400"
                  >
                    ← Back to Login
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Logo size="xl" showText={true} />
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
                autoComplete="email"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-300">Password</label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-xs text-green-400 hover:text-green-300"
                >
                  Forgot password?
                </button>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-gray-800 text-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none placeholder-gray-500"
                placeholder="••••••••"
                autoComplete="current-password"
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
           <Logo size="md" showText={true} />
            <div>
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
// PERSONAL REGISTRATION COMPONENT (STEP 1)
// =====================================================
function PersonalRegistration({ onComplete, existingData }) {
  const [formData, setFormData] = useState({
    name: existingData?.name || '',
    phone: existingData?.phone || '',
    email: existingData?.email || '',
    password: '',
    confirmPassword: '',
    weightLimit: existingData?.weightLimit || 44000,
    pickupLocation: existingData?.pickupLocation || { city: '', state: '' },
    pickupRadius: existingData?.pickupRadius || 50,
    destination: existingData?.destination || { city: '', state: '' },
    destinationRadius: existingData?.destinationRadius || 50,
    language: existingData?.language || 'English'
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.name || !formData.phone || !formData.email || !formData.password) {
      setError('Please fill in all required fields');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Phone validation (basic)
    const phoneRegex = /^[\d\s\-\(\)]+$/;
    if (!phoneRegex.test(formData.phone)) {
      setError('Please enter a valid phone number');
      return;
    }

    // Password validation
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      // Pass data to parent (don't include confirmPassword)
      const { confirmPassword, ...dataToSave } = formData;
      onComplete(dataToSave);
      setIsSubmitting(false);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-black">
     <div className="border-b border-gray-800">
  <div className="max-w-4xl mx-auto px-6 py-6 flex items-center gap-3">
    <Logo size="md" showText={true} />
    <div>
      <p className="text-sm text-gray-400">Personal Information - Step 1 of 2</p>
    </div>
  </div>
</div>
<div className="max-w-2xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-light text-white mb-2">Create Your Account</h2>
          <p className="text-gray-400">Enter your personal information and load preferences.</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-900/20 border border-red-500 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-green-400" />
              Personal Information
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Full Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-gray-800 text-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none placeholder-gray-500"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number *</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({...prev, phone: e.target.value}))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-gray-800 text-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none placeholder-gray-500"
                  placeholder="(555) 123-4567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email Address *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-gray-800 text-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none placeholder-gray-500"
                  placeholder="john@example.com"
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Password *</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({...prev, password: e.target.value}))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-gray-800 text-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none placeholder-gray-500"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Confirm Password *</label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({...prev, confirmPassword: e.target.value}))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-gray-800 text-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none placeholder-gray-500"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>
            </div>
          </div>

          {/* Weight Limit */}
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-green-400" />
              Load Preferences
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Maximum Weight Limit: {formData.weightLimit.toLocaleString()} lbs
              </label>
              <input
                type="range"
                min="0"
                max="44000"
                step="1000"
                value={formData.weightLimit}
                onChange={(e) => setFormData(prev => ({...prev, weightLimit: parseInt(e.target.value)}))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0 lbs</span>
                <span>44,000 lbs</span>
              </div>
            </div>
          </div>

          {/* Pickup Location */}
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-green-400" />
              Pickup Location
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">City</label>
                  <input
                    type="text"
                    value={formData.pickupLocation.city}
                    onChange={(e) => setFormData(prev => ({...prev, pickupLocation: {...prev.pickupLocation, city: e.target.value}}))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-gray-800 text-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none placeholder-gray-500"
                    placeholder="Chicago"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">State</label>
                  <input
                    type="text"
                    value={formData.pickupLocation.state}
                    onChange={(e) => setFormData(prev => ({...prev, pickupLocation: {...prev.pickupLocation, state: e.target.value}}))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-gray-800 text-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none placeholder-gray-500"
                    placeholder="IL"
                    maxLength="2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Pickup Radius: {formData.pickupRadius} miles
                </label>
                <input
                  type="range"
                  min="0"
                  max="200"
                  step="10"
                  value={formData.pickupRadius}
                  onChange={(e) => setFormData(prev => ({...prev, pickupRadius: parseInt(e.target.value)}))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0 mi</span>
                  <span>200 mi</span>
                </div>
              </div>
            </div>
          </div>

          {/* Destination */}
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <Navigation className="w-5 h-5 text-green-400" />
              Destination
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">City</label>
                  <input
                    type="text"
                    value={formData.destination.city}
                    onChange={(e) => setFormData(prev => ({...prev, destination: {...prev.destination, city: e.target.value}}))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-gray-800 text-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none placeholder-gray-500"
                    placeholder="Los Angeles"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">State</label>
                  <input
                    type="text"
                    value={formData.destination.state}
                    onChange={(e) => setFormData(prev => ({...prev, destination: {...prev.destination, state: e.target.value}}))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-gray-800 text-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none placeholder-gray-500"
                    placeholder="CA"
                    maxLength="2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Destination Radius: {formData.destinationRadius} miles
                </label>
                <input
                  type="range"
                  min="0"
                  max="200"
                  step="10"
                  value={formData.destinationRadius}
                  onChange={(e) => setFormData(prev => ({...prev, destinationRadius: parseInt(e.target.value)}))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0 mi</span>
                  <span>200 mi</span>
                </div>
              </div>
            </div>
          </div>

          {/* Language */}
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-green-400" />
              Language Preference
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData(prev => ({...prev, language: 'English'}))}
                className={`px-4 py-3 rounded-xl border-2 transition-all ${
                  formData.language === 'English'
                    ? 'border-green-500 bg-green-500/10 text-green-400'
                    : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({...prev, language: 'Spanish'}))}
                className={`px-4 py-3 rounded-xl border-2 transition-all ${
                  formData.language === 'Spanish'
                    ? 'border-green-500 bg-green-500/10 text-green-400'
                    : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600'
                }`}
              >
                Spanish (Español)
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-green-500 text-black py-4 rounded-full hover:bg-green-400 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors font-medium text-lg"
          >
            {isSubmitting ? 'Saving...' : 'Continue to Carrier Information →'}
          </button>
        </form>

        <p className="text-xs text-gray-600 text-center mt-6">
          Step 1 of 2 - Next: Carrier and equipment details
        </p>
      </div>
    </div>
  );
}
// =====================================================
// =====================================================
// ENHANCED CARRIER REGISTRATION COMPONENT
// With Personal Info, FMCSA Verification, and MC/DOT Locking
// =====================================================
function CarrierRegistration({ onRegistrationComplete, carrier, isEditing = false, onBack }) {
  const equipmentOptions = ['Dry Van', 'Reefer', 'Flatbed', 'Step Deck', 'Box Truck', 'Tanker'];
  const trailerSizeOptions = ['26ft', '48ft', '53ft'];
  const regionOptions = ['Northeast', 'Southeast', 'Midwest', 'Southwest', 'West', 'All Regions'];
  
  // Personal Information State
  const [personalInfo, setPersonalInfo] = useState({
    fullName: carrier?.fullName || '',
    email: carrier?.email || '',
    personalPhone: carrier?.personalPhone || '',
    address: carrier?.address || '',
    city: carrier?.city || '',
    state: carrier?.state || '',
    zipCode: carrier?.zipCode || ''
  });

  // Company Information State
  const [formData, setFormData] = useState({
    companyName: carrier?.companyName || '',
    mcNumber: carrier?.mcNumber || '',
    dotNumber: carrier?.dotNumber || '',
    phone: carrier?.phone || '',
    ein: carrier?.ein || '',
    numberOfTrucks: carrier?.numberOfTrucks || '',
    equipmentTypes: carrier?.equipmentTypes || [],
    trailerSizes: carrier?.trailerSizes || [],
    operatingRegions: carrier?.operatingRegions || []
  });

  // Verification State
  const [mcVerified, setMcVerified] = useState(carrier?.mcVerified || false);
  const [dotVerified, setDotVerified] = useState(carrier?.dotVerified || false);
  const [verifying, setVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [verificationSuccess, setVerificationSuccess] = useState(false);

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

  // NEW: FMCSA Verification Function
  const handleVerifyCarrier = async () => {
    if (!formData.mcNumber && !formData.dotNumber) {
      setVerificationError('Enter MC or DOT number to verify');
      return;
    }

    setVerifying(true);
    setVerificationError('');
    setVerificationSuccess(false);

    try {
      const response = await fetch('/api/verify-carrier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mcNumber: formData.mcNumber,
          dotNumber: formData.dotNumber
        })
      });

      const data = await response.json();

      if (data.verified) {
        // Auto-populate from FMCSA data
        if (data.legalName) {
          setFormData(prev => ({ ...prev, companyName: data.legalName }));
        }
        if (data.mcNumber) {
          setFormData(prev => ({ ...prev, mcNumber: data.mcNumber }));
          setMcVerified(true);
        }
        if (data.dotNumber) {
          setFormData(prev => ({ ...prev, dotNumber: data.dotNumber }));
          setDotVerified(true);
        }
        if (data.phone) {
          setFormData(prev => ({ ...prev, phone: data.phone }));
        }
        if (data.physicalAddress) {
          setPersonalInfo(prev => ({
            ...prev,
            address: data.physicalAddress.street || prev.address,
            city: data.physicalAddress.city || prev.city,
            state: data.physicalAddress.state || prev.state,
            zipCode: data.physicalAddress.zip || prev.zipCode
          }));
        }
        if (data.totalPowerUnits) {
          setFormData(prev => ({ ...prev, numberOfTrucks: String(data.totalPowerUnits) }));
        }

        setVerificationSuccess(true);
        setTimeout(() => setVerificationSuccess(false), 3000);
      } else {
        setVerificationError(data.error || 'Verification failed');
      }
    } catch (err) {
      setVerificationError('Verification service error');
      console.error('Verification error:', err);
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async () => {
    setError('');

    // Validate personal info (if editing)
    if (isEditing) {
      if (!personalInfo.fullName || !personalInfo.email) {
        setError('Full name and email are required');
        return;
      }
    }

    // Validate company info
    if (!formData.companyName || !formData.mcNumber || !formData.dotNumber || !formData.phone) {
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
        body: JSON.stringify({
          ...formData,
          ...personalInfo,
          mcVerified,
          dotVerified
        })
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
        ...personalInfo,
        mcVerified,
        dotVerified,
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
        <div className="max-w-4xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size="md" showText={true} />
            <div>
              <p className="text-sm text-gray-400">
                {isEditing ? 'Edit Profile' : 'Carrier Information - Step 2 of 2'}
              </p>
            </div>
          </div>
          {isEditing && onBack && (
            <button
              onClick={onBack}
              className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              Back to Chat
            </button>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-light text-white mb-2">
            {isEditing ? 'Edit Profile' : 'Carrier & Equipment Details'}
          </h2>
          <p className="text-gray-400">
            {isEditing 
              ? 'Update your personal and company information' 
              : 'Complete your carrier registration with company and equipment information'}
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-900/20 border border-red-500 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          {/* Personal Information Section */}
          {isEditing && (
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
              <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-green-400" />
                Personal Information
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Full Name *</label>
                  <input
                    type="text"
                    value={personalInfo.fullName}
                    onChange={(e) => setPersonalInfo(prev => ({ ...prev, fullName: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-gray-800 text-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none placeholder-gray-500"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email Address *</label>
                  <input
                    type="email"
                    value={personalInfo.email}
                    onChange={(e) => setPersonalInfo(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-gray-800 text-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none placeholder-gray-500"
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Personal Phone</label>
                  <input
                    type="tel"
                    value={personalInfo.personalPhone}
                    onChange={(e) => setPersonalInfo(prev => ({ ...prev, personalPhone: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-gray-800 text-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none placeholder-gray-500"
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Address</label>
                  <input
                    type="text"
                    value={personalInfo.address}
                    onChange={(e) => setPersonalInfo(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-gray-800 text-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none placeholder-gray-500"
                    placeholder="123 Main Street"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">City</label>
                    <input
                      type="text"
                      value={personalInfo.city}
                      onChange={(e) => setPersonalInfo(prev => ({ ...prev, city: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-gray-800 text-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none placeholder-gray-500"
                      placeholder="Atlanta"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">State</label>
                    <input
                      type="text"
                      value={personalInfo.state}
                      onChange={(e) => setPersonalInfo(prev => ({ ...prev, state: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-gray-800 text-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none placeholder-gray-500"
                      placeholder="GA"
                      maxLength="2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">ZIP</label>
                    <input
                      type="text"
                      value={personalInfo.zipCode}
                      onChange={(e) => setPersonalInfo(prev => ({ ...prev, zipCode: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-gray-800 text-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none placeholder-gray-500"
                      placeholder="30303"
                      maxLength="5"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Company Information */}
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <Building className="w-5 h-5 text-green-400" />
              Company Information
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Company Name *</label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-gray-800 text-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none placeholder-gray-500"
                  placeholder="ABC Trucking LLC"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* MC Number with Lock */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">MC Number *</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.mcNumber}
                      onChange={(e) => !mcVerified && setFormData(prev => ({ ...prev, mcNumber: e.target.value }))}
                      disabled={mcVerified}
                      className={`w-full px-4 py-3 rounded-xl border ${
                        mcVerified ? 'border-green-500 bg-gray-900 cursor-not-allowed' : 'border-gray-700 bg-gray-800'
                      } text-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none placeholder-gray-500 pr-10`}
                      placeholder="MC-123456"
                    />
                    {mcVerified && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <Lock className="w-4 h-4 text-green-400" />
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      </div>
                    )}
                  </div>
                  {mcVerified && (
                    <p className="text-xs text-gray-400 mt-1">Verified. Contact support to change.</p>
                  )}
                </div>

                {/* DOT Number with Lock */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">DOT Number *</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.dotNumber}
                      onChange={(e) => !dotVerified && setFormData(prev => ({ ...prev, dotNumber: e.target.value }))}
                      disabled={dotVerified}
                      className={`w-full px-4 py-3 rounded-xl border ${
                        dotVerified ? 'border-green-500 bg-gray-900 cursor-not-allowed' : 'border-gray-700 bg-gray-800'
                      } text-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none placeholder-gray-500 pr-10`}
                      placeholder="1234567"
                    />
                    {dotVerified && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <Lock className="w-4 h-4 text-green-400" />
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      </div>
                    )}
                  </div>
                  {dotVerified && (
                    <p className="text-xs text-gray-400 mt-1">Verified. Contact support to change.</p>
                  )}
                </div>
              </div>

              {/* Verify Button */}
              {(!mcVerified || !dotVerified) && (
                <button
                  onClick={handleVerifyCarrier}
                  disabled={verifying || (!formData.mcNumber && !formData.dotNumber)}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  {verifying ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Verifying with FMCSA...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Verify with FMCSA
                    </>
                  )}
                </button>
              )}

              {verificationError && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-900/20 p-3 rounded-xl">
                  <AlertCircle className="w-4 h-4" />
                  {verificationError}
                </div>
              )}

              {verificationSuccess && (
                <div className="flex items-center gap-2 text-green-400 text-sm bg-green-900/20 p-3 rounded-xl">
                  <CheckCircle className="w-4 h-4" />
                  Carrier verified successfully! Information auto-populated.
                </div>
              )}

              {isEditing && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">EIN</label>
                    <input
                      type="text"
                      value={formData.ein}
                      onChange={(e) => setFormData(prev => ({ ...prev, ein: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-gray-800 text-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none placeholder-gray-500"
                      placeholder="12-3456789"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Number of Trucks</label>
                    <input
                      type="number"
                      value={formData.numberOfTrucks}
                      onChange={(e) => setFormData(prev => ({ ...prev, numberOfTrucks: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-gray-800 text-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none placeholder-gray-500"
                      placeholder="5"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <Phone className="w-5 h-5 text-green-400" />
              Contact Information
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Company Number *</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-gray-800 text-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none placeholder-gray-500"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
          </div>

          {/* Equipment Types */}
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-green-400" />
              Equipment Types *
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {equipmentOptions.map((equipment) => (
                <button
                  key={equipment}
                  type="button"
                  onClick={() => toggleEquipment(equipment)}
                  className={`px-4 py-3 rounded-xl border-2 transition-all ${
                    formData.equipmentTypes.includes(equipment.toLowerCase())
                      ? 'border-green-500 bg-green-500/10 text-green-400'
                      : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600'
                  }`}
                >
                  {equipment}
                </button>
              ))}
            </div>
          </div>

          {/* Trailer Sizes */}
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <Truck className="w-5 h-5 text-green-400" />
              Trailer Sizes *
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {trailerSizeOptions.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => toggleTrailerSize(size)}
                  className={`px-4 py-3 rounded-xl border-2 transition-all ${
                    formData.trailerSizes.includes(size)
                      ? 'border-green-500 bg-green-500/10 text-green-400'
                      : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Operating Regions */}
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-green-400" />
              Operating Regions
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {regionOptions.map((region) => (
                <button
                  key={region}
                  type="button"
                  onClick={() => toggleRegion(region)}
                  className={`px-4 py-3 rounded-xl border-2 transition-all ${
                    formData.operatingRegions.includes(region)
                      ? 'border-green-500 bg-green-500/10 text-green-400'
                      : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600'
                  }`}
                >
                  {region}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full bg-green-500 text-black py-4 rounded-full hover:bg-green-400 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors text-lg font-medium"
          >
            {isSubmitting ? (carrier ? 'Updating...' : 'Registering...') : (carrier ? 'Update Profile' : 'Register & Continue')}
          </button>

          <p className="text-xs text-gray-500 text-center">
            By {carrier ? 'updating' : 'registering'}, you agree to our Terms of Service and Privacy Policy.
          </p>
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
        const [showVerificationDashboard, setShowVerificationDashboard] = useState(false);
  const [isVerifier, setIsVerifier] = useState(true);
  const [showDashboard, setShowDashboard] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registrationStep, setRegistrationStep] = useState('none'); // 'none', 'personal', 'carrier'
  const [personalData, setPersonalData] = useState(null);
  
  // Existing state
  const [carrier, setCarrier] = useState(null);
        const [user, setUser] = useState(null);
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

  // GPS & Location state
  const [location, setLocation] = useState(null);
  const [isTrackingLocation, setIsTrackingLocation] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [gpsSpeed, setGpsSpeed] = useState(null);
  const [nearbyServices, setNearbyServices] = useState([]);
  const [currentLoad, setCurrentLoad] = useState(null); // Active load with destination
  const gpsWatchIdRef = useRef(null);
  const gpsDebounceRef = useRef(null);
  const lastLocationRef = useRef(null);

  // NEW: Theme and Settings state
  const [theme, setTheme] = useState(() => localStorage.getItem('pureTheme') || 'dark');
  const [voiceSpeed, setVoiceSpeed] = useState(() => parseFloat(localStorage.getItem('pureVoiceSpeed')) || 0.92);
  const [voiceVolume, setVoiceVolume] = useState(() => parseFloat(localStorage.getItem('pureVoiceVolume')) || 0.85);
  const [notificationSettings, setNotificationSettings] = useState(() => {
    const saved = localStorage.getItem('pureNotifications');
    return saved ? JSON.parse(saved) : { loadAlerts: true, documentReminders: true, messageSounds: true };
  });

  // PURE CALLS - Message Tracking & Auto-Calling
  // NOTE: These will work once messageTracking.js is uploaded
  const [messageTracker] = useState(() => {
    // Placeholder - will be replaced with: new MessageTracker()
    return {
      start: () => console.log('📞 Message tracker placeholder'),
      stop: () => {},
      trackMessage: () => {},
      markAsRead: () => {},
      markAsResponded: () => {},
      markCallTriggered: () => {},
      loadFromStorage: () => {},
      cleanOldMessages: () => {}
    };
  });
  const [callSettings] = useState(() => {
    // Placeholder - will be replaced with: new CallSettings()
    return {
      canMakeCall: () => false,
      recordCall: () => {},
      getSettings: () => ({ enabled: false }),
      updateSettings: () => {},
      isQuietHours: () => false
    };
  });
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());

  const messagesEndRef = useRef(null);
  const profileMenuRef = useRef(null);
  const recognitionRef = useRef(null);
  // Load carrier data from localStorage on mount
useEffect(() => {
  const savedCarrier = localStorage.getItem('pureCarrier');
  if (savedCarrier) {
    try {
      const carrierData = JSON.parse(savedCarrier);
      console.log('✅ Loaded carrier from localStorage:', carrierData);
      setCarrier(carrierData);
    } catch (error) {
      console.error('❌ Error parsing carrier data:', error);
    }
  }
}, []);
  // Load carrier data from localStorage on mount
useEffect(() => {
  const savedCarrier = localStorage.getItem('pureCarrier');
  if (savedCarrier) {
    try {
      const carrierData = JSON.parse(savedCarrier);
      console.log('✅ Loaded carrier from localStorage:', carrierData);
      setCarrier(carrierData);
    } catch (error) {
      console.error('❌ Error parsing carrier data:', error);
    }
  }
}, []);

  // =====================================================
  // PURE CALLS - HELPER FUNCTIONS
  // =====================================================

  /**
   * Update user activity timestamp
   * Called whenever user interacts with the app
   */
  const updateActivityTimestamp = () => {
    const now = Date.now();
    setLastActivityTime(now);
    localStorage.setItem('lastActivityTime', now.toString());
  };

  /**
   * Check if user is currently active in the app
   * Returns true if user was active within last 2 minutes
   */
  const isUserActiveInApp = () => {
    const storedTime = localStorage.getItem('lastActivityTime');
    if (!storedTime) return false;
    
    const timeSinceActivity = Date.now() - parseInt(storedTime);
    return timeSinceActivity < 2 * 60 * 1000; // Active if < 2 minutes
  };

  /**
   * Handle call trigger - Called when message tracking determines a call is needed
   * This is the main function that initiates calls to drivers
   */
  const handleCallTrigger = async (message) => {
    console.log('📞 Call trigger received for message:', message.id);
    
    // Check if calls are allowed based on user settings
    if (!callSettings.canMakeCall(message.priority)) {
      console.log('📞 Call blocked by user settings');
      return;
    }

    // Verify we have driver's phone number
    if (!personalData?.phone) {
      console.error('📞 No phone number available for driver');
      return;
    }

    try {
      console.log('📞 Initiating call to:', personalData.phone);
      
      // Format the message for calling
      // NOTE: formatCallMessage is imported from messageTracking.js
      // For now, we'll format it manually
      const callText = `Hey driver, this is Pure calling from your dispatch app. ${message.text}`;
      
      // Make the call via Twilio API
      const response = await fetch(`${BACKEND_URL}/api/twilio/call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          driverPhone: personalData.phone,
          driverName: personalData.name || 'driver',
          messageText: callText,
          messageId: message.id,
          priority: message.priority
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Mark that call was triggered
        messageTracker.markCallTriggered(message.id, data.callSid);
        callSettings.recordCall();
        
        console.log('📞 Call initiated successfully:', data.callSid);
        console.log('📞 Status:', data.status);
        
        // Optional: Show notification to user
        // Could add a toast notification here
        
      } else {
        console.error('📞 Call failed:', data.error);
      }

    } catch (error) {
      console.error('📞 Call initiation error:', error);
    }
  };

  // =====================================================
  // END PURE CALLS FUNCTIONS
  // =====================================================

  // Check for existing session
  useEffect(() => {
    // Check if there's an ACTIVE session (not just saved data)
    const activeSession = localStorage.getItem('pureActiveSession');
    
    if (activeSession === 'true') {
      // User has active session - auto-login
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
    setShowDashboard(true);
    
    // ADDED: Also fetch user data from backend
    const authToken = localStorage.getItem('authToken');
    if (authToken) {
      fetch(`${BACKEND_URL}/api/profile/get`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      })
        .then(r => r.json())
        .then(data => {
          if (data.success && data.user) {
            setUser(data.user); // THIS LINE IS CRITICAL
          }
        })
        .catch(err => console.error('Failed to load user data:', err));
    }
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
    }
    // If no active session, user sees login page (even if data exists in localStorage)

    // Check backend health
    fetch(`${BACKEND_URL}/health`)
      .then(res => res.json())
      .then(() => setBackendStatus('connected'))
      .catch(() => setBackendStatus('mock'));
  }, []);

  // PURE CALLS - Initialize message tracker
  // Starts tracking messages and triggers calls when needed
  useEffect(() => {
    console.log('📞 Initializing Pure Calls system');
    
    // Start the message tracker
    messageTracker.start(handleCallTrigger, isUserActiveInApp);
    
    // Load saved tracking data
    messageTracker.loadFromStorage();
    
    // Clean old messages daily
    const cleanupInterval = setInterval(() => {
      messageTracker.cleanOldMessages();
    }, 24 * 60 * 60 * 1000); // Once per day
    
    // Update activity timestamp periodically while app is open
    const activityInterval = setInterval(() => {
      if (document.hasFocus()) {
        updateActivityTimestamp();
      }
    }, 30000); // Every 30 seconds
    
    // Cleanup on unmount
    return () => {
      messageTracker.stop();
      clearInterval(cleanupInterval);
      clearInterval(activityInterval);
    };
  }, []); // Only run once on mount

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
  // DISABLED: Mobile browsers block autoplay audio
  // Voice will play when user sends their first message instead
  /*
  useEffect(() => {
    if (isRegistered && !showDashboard && currentView === 'home' && messages.length === 0 && audioEnabled) {
      const timer = setTimeout(() => {
        const welcomeText = `Hey there, driver! I'm Pure, your AI dispatch assistant. I'm here to help you with fuel, weather, loads, and everything you need on the road. What can I do for you?`;
        forceSpeak(welcomeText, () => setIsSpeaking(true), () => setIsSpeaking(false));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isRegistered, showDashboard, currentView, messages.length, audioEnabled]);
  */

  // GPS Tracking
  useEffect(() => {
    if (isTrackingLocation && isRegistered) {
      const watchId = startGPSTracking(
        (locationData) => {
          setLocation(locationData);
          setLocationError(null);
          // Save location to localStorage for history
          localStorage.setItem('pureLastLocation', JSON.stringify(locationData));
        },
        (error) => {
          setLocationError(error);
          setIsTrackingLocation(false);
        }
      );
      gpsWatchIdRef.current = watchId;

      return () => {
        if (gpsWatchIdRef.current !== null) {
          stopGPSTracking(gpsWatchIdRef.current);
          gpsWatchIdRef.current = null;
        }
      };
    }
  }, [isTrackingLocation, isRegistered]);

  // Toggle GPS tracking
  const toggleGPSTracking = () => {
    if (isTrackingLocation) {
      handleStopGPSTracking();
    } else {
      handleStartGPSTracking();
    }
  };

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

  const handleLogin = (data) => {
    if (data && data.isNewUser) {
      // New user - start registration flow
      setIsLoggedIn(true);
      setRegistrationStep('personal');
      localStorage.setItem('pureActiveSession', 'true'); // Mark session as active
    } else if (data) {
      // Existing user - load their data
      setCarrier(data);
      setIsRegistered(true);
      setIsLoggedIn(true);
      setShowDashboard(true);
      setRegistrationStep('none');
      localStorage.setItem('pureActiveSession', 'true'); // Mark session as active
    } else {
      // Fallback - start registration
      setIsLoggedIn(true);
      setRegistrationStep('personal');
      localStorage.setItem('pureActiveSession', 'true'); // Mark session as active
    }
  };

  const handlePersonalRegistrationComplete = (data) => {
    setPersonalData(data);
    setRegistrationStep('carrier');
    
    // Save credentials for login
    localStorage.setItem('pureUserCredentials', JSON.stringify({
      email: data.email,
      password: data.password // In production, hash this server-side
    }));
  };

  const handleRegistrationComplete = (carrierData) => {
    // If editing profile, merge with existing carrier data
    // If new registration, merge with personal data
   const completeData = currentView === 'profile-edit' 
  ? {
      ...carrier,
      ...carrierData,
    }
  : {
      ...personalData,
      personalPhone: personalData?.phone || '',
      ...carrierData,
    };

// Create a completely new object to force React re-render
const freshCarrier = JSON.parse(JSON.stringify(completeData));

setCarrier(freshCarrier);
    setCarrier(completeData);
    setIsRegistered(true);
    localStorage.setItem('pureCarrier', JSON.stringify(completeData));
    localStorage.setItem('pureActiveSession', 'true'); // Mark session as active
    
    // If editing profile, go back to profile view
    // Otherwise, show dashboard (new registration)
    if (currentView === 'profile-edit') {
      setCurrentView('profile');
    } else {
      setShowDashboard(true);
      setRegistrationStep('none');
    }
    
    // Welcome voice message
    // DISABLED: Mobile browsers block autoplay audio
    // Voice will work when user interacts (sends message, clicks button, etc.)
    /*
    setTimeout(() => {
      const welcomeText = `Hey there! I'm Pure, your AI dispatcher. Welcome aboard, ${personalData?.name || 'driver'}! I'm here to help you find fuel, check weather, book loads, and handle everything you need on the road. Just ask me anything!`;
      forceSpeak(welcomeText, () => setIsSpeaking(true), () => setIsSpeaking(false));
    }, 1000);
    */
  };

  const handleDashboardNavigate = (view) => {
    setCurrentView(view);
    setShowDashboard(false);
    
    // Voice greeting when going to chat via button click
    // This works on mobile because it's triggered by direct user interaction!
    if (view === 'home' && messages.length === 0) {
      setTimeout(() => {
        const greetingText = `Hey there, driver! I'm Pure, your AI dispatch assistant. I'm here to help you with loads, fuel, weather, and everything you need on the road. What can I do for you today?`;
        forceSpeak(greetingText, () => setIsSpeaking(true), () => setIsSpeaking(false));
      }, 500);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      // Close profile menu immediately
      setShowProfileMenu(false);
      
      // Stop any active speech and voice (ElevenLabs or browser TTS)
      stopSpeaking();
      
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore if already stopped
        }
      }
      
      // DON'T clear localStorage - keep credentials and carrier data
      // User can log back in without re-registering
      // localStorage.clear(); // Commented out to preserve registration
      
      // Clear active session flag so user sees login page on next visit
      localStorage.removeItem('pureActiveSession');
      
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

  // =====================================================
  // GPS TRACKING HANDLERS
  // =====================================================

  const handleStartGPSTracking = () => {
    const watchId = startGPSTracking(
      (locationData) => {
        // Only update if location changed significantly (>50 meters or ~0.03 miles)
        // This prevents jumpiness from GPS drift
        const shouldUpdate = !lastLocationRef.current || 
          calculateDistance(
            lastLocationRef.current.latitude,
            lastLocationRef.current.longitude,
            locationData.latitude,
            locationData.longitude
          ) > 0.03; // ~50 meters minimum movement
        
        if (shouldUpdate) {
          // Update immediately for smooth tracking
          setLocation(locationData);
          lastLocationRef.current = locationData;
          setLocationError(null);
          
          // Update speed
          if (locationData.speed !== null && locationData.speed > 0) {
            const speedMph = metersPerSecondToMph(locationData.speed);
            setGpsSpeed(speedMph);
          } else {
            setGpsSpeed(null);
          }
        }
      },
      (error) => {
        setLocationError(error);
        setIsTrackingLocation(false);
      }
    );
    
    if (watchId !== null) {
      gpsWatchIdRef.current = watchId;
      setIsTrackingLocation(true);
      
      // Voice confirmation
      const confirmMsg = "GPS tracking enabled! I'll help you navigate and keep the broker updated on your ETA.";
      forceSpeak(confirmMsg, () => setIsSpeaking(true), () => setIsSpeaking(false));
    }
  };

  const handleStopGPSTracking = () => {
    // Clear any pending debounced update
    if (gpsDebounceRef.current) {
      clearTimeout(gpsDebounceRef.current);
      gpsDebounceRef.current = null;
    }
    
    if (gpsWatchIdRef.current !== null) {
      stopGPSTracking(gpsWatchIdRef.current);
      gpsWatchIdRef.current = null;
      setIsTrackingLocation(false);
      setLocation(null);
      setGpsSpeed(null);
      lastLocationRef.current = null;
      
      // Voice confirmation
      const confirmMsg = "GPS tracking stopped. Your privacy is important to me!";
      forceSpeak(confirmMsg, () => setIsSpeaking(true), () => setIsSpeaking(false));
    }
  };

  const handleSendETAUpdate = async () => {
    if (!location || !currentLoad || !carrier) {
      setMessages(prev => [...prev, {
        from: 'pure',
        text: "I need your current GPS location and an active load to send an ETA update. Enable GPS tracking and set an active load first.",
        timestamp: new Date(),
        mood: 'concerned'
      }]);
      return;
    }

    try {
      // Calculate ETA
      const eta = calculateETA(
        location.latitude,
        location.longitude,
        currentLoad.destLat,
        currentLoad.destLon
      );

      // Send email via API
      const response = await fetch(`${BACKEND_URL}/api/gps/send-eta-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brokerEmail: currentLoad.brokerEmail,
          carrierInfo: {
            companyName: carrier.companyName,
            name: personalData?.name || carrier.name || 'Driver',
            mcNumber: carrier.mcNumber,
            dotNumber: carrier.dotNumber,
            phone: carrier.phone
          },
          currentLocation: {
            latitude: location.latitude,
            longitude: location.longitude,
            speed: gpsSpeed
          },
          destination: {
            address: currentLoad.destination
          },
          eta: {
            distance: eta.distance,
            duration: (eta.hours * 60) + eta.minutes,
            eta: eta.etaString,
            hoursRemaining: `${eta.hours}.${Math.round((eta.minutes / 60) * 10)}`
          },
          loadNumber: currentLoad.loadNumber
        })
      });

      const data = await response.json();

      if (data.success) {
        setMessages(prev => [...prev, {
          from: 'pure',
          text: `ETA update sent to ${currentLoad.brokerEmail}! They know you're ${eta.distance} miles out and arriving around ${eta.etaString}. Safe travels, driver!`,
          timestamp: new Date(),
          mood: 'accomplished',
          skill: 'eta update'
        }]);
        
        forceSpeak(`ETA update sent! The broker knows you'll arrive in about ${eta.hours} hours.`, 
          () => setIsSpeaking(true), 
          () => setIsSpeaking(false)
        );
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('ETA update error:', error);
      setMessages(prev => [...prev, {
        from: 'pure',
        text: "I had trouble sending the ETA update. Check your connection and try again, or the API endpoint may not be deployed yet.",
        timestamp: new Date(),
        mood: 'concerned'
      }]);
    }
  };

  const handleServiceRequest = (service) => {
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${service.lat},${service.lon}`;
    
    setMessages(prev => [...prev, {
      from: 'pure',
      text: `Opening directions to ${service.name} (${service.distance} miles away)${service.brand ? ` - ${service.brand}` : ''}. Drive safe!`,
      timestamp: new Date(),
      mood: 'helpful',
      skill: 'navigation'
    }]);

    // Open Google Maps in new tab
    window.open(googleMapsUrl, '_blank');
    
    // Voice confirmation
    forceSpeak(`Navigating to ${service.name}, ${service.distance} miles away.`, 
      () => setIsSpeaking(true), 
      () => setIsSpeaking(false)
    );
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
      const [showVerificationDashboard, setShowVerificationDashboard] = useState(false);
const [isVerifier, setIsVerifier] = useState(false);

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

    // Update activity timestamp - user is actively using app
    updateActivityTimestamp();

    const userMessage = {
      from: 'user',
      text: inputText,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputText("");
    setIsTyping(true);

    // Mark previous message as responded (user is engaging)
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.from === 'pure' && lastMessage.id) {
        messageTracker.markAsResponded(lastMessage.id);
      }
    }

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

      // PURE CALLS - Track this message for potential calling
      // Determine priority based on content/metadata
      let priority = 'MEDIUM'; // Default priority
      
      // HIGH priority keywords (will trigger call after 5 min)
      const highPriorityKeywords = ['urgent', 'immediately', 'asap', 'hot load', 'expires in', 'time sensitive'];
      const isHighPriority = highPriorityKeywords.some(keyword => 
        data.response.toLowerCase().includes(keyword)
      );
      
      if (isHighPriority || data.meta?.urgent === true) {
        priority = 'HIGH';
      }
      
      // LOW priority (never calls) - tips, fun facts, general info
      const lowPriorityKeywords = ['tip:', 'did you know', 'fun fact', 'by the way'];
      const isLowPriority = lowPriorityKeywords.some(keyword => 
        data.response.toLowerCase().includes(keyword)
      );
      
      if (isLowPriority) {
        priority = 'LOW';
      }
      
      // Create tracked message
      // NOTE: This placeholder will be replaced with: createTrackedMessage(data.response, MESSAGE_PRIORITY[priority], {...})
      const trackedMessageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      messageTracker.trackMessage({
        id: trackedMessageId,
        text: data.response,
        priority: priority,
        from: 'pure',
        sentAt: Date.now(),
        readAt: null,
        respondedAt: null,
        callTriggered: false,
        metadata: { mood: data.mood, skill: data.skill }
      });
      
      console.log(`📊 Tracking message with ${priority} priority:`, trackedMessageId);

      if (audioEnabled) {
        await forceSpeak(data.response, () => setIsSpeaking(true), () => setIsSpeaking(false));
      }
    } catch (err) {
      // Mock responses with GPS integration
      const lowerInput = inputText.toLowerCase();
      
      // GPS-based responses
      if (lowerInput.includes('location') || lowerInput.includes('where am i')) {
// =====================================================
// VERIFICATION SYSTEM - Check if user is a verifier
// =====================================================
// =====================================================
// VERIFICATION SYSTEM - Direct Supabase Check
// =====================================================

              if (location) {
          const googleMapsLink = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
          const speedText = location.speed ? `traveling at ${metersPerSecondToMph(location.speed)} mph` : 'stationary';
          const responseText = `You're currently at ${formatLocation(location.latitude, location.longitude)}, ${speedText}. View on map: ${googleMapsLink}`;
          
          const pureMessage = {
            from: 'pure',
            text: responseText,
            timestamp: new Date(),
            mood: 'positive',
            skill: 'getLocation'
          };
          setMessages(prev => [...prev, pureMessage]);
          if (audioEnabled) {
            await forceSpeak(`You're at ${formatLocation(location.latitude, location.longitude)}, ${speedText}.`, () => setIsSpeaking(true), () => setIsSpeaking(false));
          }
        } else {
          const pureMessage = {
            from: 'pure',
            text: "I don't have your GPS location yet. Would you like me to start tracking? I can give you real-time ETAs, find nearby services, and share your location with brokers.",
            timestamp: new Date(),
            mood: 'neutral',
            skill: null
          };
          setMessages(prev => [...prev, pureMessage]);
        }
        setIsTyping(false);
        return;
      }
      
      // ETA calculation
      if (lowerInput.includes('eta') || lowerInput.includes('arrival') || lowerInput.includes('when will i arrive')) {
        if (location && currentLoad?.destination) {
          const destLat = currentLoad.destination.latitude || 40.7128; // Default NYC
          const destLon = currentLoad.destination.longitude || -74.0060;
          const etaData = calculateETA(location.latitude, location.longitude, destLat, destLon);
          const responseText = `Based on your current location, you're ${etaData.distance} miles from your destination. ETA: ${etaData.hours}h ${etaData.minutes}m (around ${etaData.etaString}) at average speed.`;
          
          const pureMessage = {
            from: 'pure',
            text: responseText,
            timestamp: new Date(),
            mood: 'positive',
            skill: 'calculateETA'
          };
          setMessages(prev => [...prev, pureMessage]);
          if (audioEnabled) {
            await forceSpeak(responseText, () => setIsSpeaking(true), () => setIsSpeaking(false));
          }
        } else if (!location) {
          const pureMessage = {
            from: 'pure',
            text: "I need your GPS location to calculate ETA. Enable location tracking and I'll keep you updated!",
            timestamp: new Date(),
            mood: 'neutral'
          };
          setMessages(prev => [...prev, pureMessage]);
        } else {
          const pureMessage = {
            from: 'pure',
            text: "I need your destination info to calculate ETA. Which load are you running?",
            timestamp: new Date(),
            mood: 'neutral'
          };
          setMessages(prev => [...prev, pureMessage]);
        }
        setIsTyping(false);
        return;
      }
      
      // Nearby fuel stations
      if (lowerInput.includes('fuel') || lowerInput.includes('gas') || lowerInput.includes('diesel')) {
        if (location) {
          const services = await findNearbyServices(location.latitude, location.longitude, 'fuel');
          let responseText = `Found ${services.length} fuel stops near you:\n\n`;
          services.forEach((service, idx) => {
            responseText += `${idx + 1}. ${service.name} - ${service.distance} miles\n   ${service.address}\n   Amenities: ${service.amenities.join(', ')}\n\n`;
          });
          responseText += "Need navigation to any of these?";
          
          const pureMessage = {
            from: 'pure',
            text: responseText,
            timestamp: new Date(),
            mood: 'positive',
            skill: 'findFuel'
          };
          setMessages(prev => [...prev, pureMessage]);
          if (audioEnabled) {
            await forceSpeak(`Found ${services.length} fuel stops near you. The closest is ${services[0]?.name} at ${services[0]?.distance} miles.`, () => setIsSpeaking(true), () => setIsSpeaking(false));
          }
        } else {
          const pureMessage = {
            from: 'pure',
            text: "Enable GPS tracking so I can find the nearest fuel stations for you!",
            timestamp: new Date(),
            mood: 'neutral'
          };
          setMessages(prev => [...prev, pureMessage]);
        }
        setIsTyping(false);
        return;
      }
      
      // Rest areas
      if (lowerInput.includes('rest') || lowerInput.includes('park') || lowerInput.includes('break')) {
        if (location) {
          const services = await findNearbyServices(location.latitude, location.longitude, 'rest');
          let responseText = `Found ${services.length} rest areas near you:\n\n`;
          services.forEach((service, idx) => {
            responseText += `${idx + 1}. ${service.name} - ${service.distance} miles\n   ${service.address}\n   ${service.amenities.join(', ')}\n\n`;
          });
          
          const pureMessage = {
            from: 'pure',
            text: responseText,
            timestamp: new Date(),
            mood: 'positive',
            skill: 'findRest'
          };
          setMessages(prev => [...prev, pureMessage]);
        } else {
          const pureMessage = {
            from: 'pure',
            text: "Turn on GPS tracking and I'll find rest areas for you!",
            timestamp: new Date(),
            mood: 'neutral'
          };
          setMessages(prev => [...prev, pureMessage]);
        }
        setIsTyping(false);
        return;
      }
      
      // Share location with broker
      if (lowerInput.includes('share location') || lowerInput.includes('send location') || lowerInput.includes('broker location')) {
        if (location) {
          const shareData = formatLocationShare(location, personalData?.name || carrier?.companyName || 'Driver', currentLoad?.id || 'Current Load');
          const pureMessage = {
            from: 'pure',
            text: `I've formatted your location to share:\n\n${shareData.text}\n\nWould you like me to email this to the broker?`,
            timestamp: new Date(),
            mood: 'positive',
            skill: 'shareLocation'
          };
          setMessages(prev => [...prev, pureMessage]);
        } else {
          const pureMessage = {
            from: 'pure',
            text: "Enable GPS tracking first, then I can share your location with brokers!",
            timestamp: new Date(),
            mood: 'neutral'
          };
          setMessages(prev => [...prev, pureMessage]);
        }
        setIsTyping(false);
        return;
      }
      
      // Weather on route
      if (lowerInput.includes('weather')) {
        const responseText = "The weather on your route looks good! Clear skies for the next 48 hours with temperatures in the 60s. No delays expected.";
        const pureMessage = {
          from: 'pure',
          text: responseText,
          timestamp: new Date(),
          mood: 'positive',
          skill: 'getWeatherRoute'
        };
        setMessages(prev => [...prev, pureMessage]);
        if (audioEnabled) {
          await forceSpeak(responseText, () => setIsSpeaking(true), () => setIsSpeaking(false));
        }
        setIsTyping(false);
        return;
      }
      
      // Email draft
      if (lowerInput.includes('email')) {
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
    
    // Set as active load for GPS tracking
    // In production, you'd geocode the destination address to get real coordinates
    // For now, using approximate coordinates based on major cities
    const cityCoords = {
      'Los Angeles, CA': { lat: 34.0522, lon: -118.2437 },
      'New York, NY': { lat: 40.7128, lon: -74.0060 },
      'Chicago, IL': { lat: 41.8781, lon: -87.6298 },
      'Houston, TX': { lat: 29.7604, lon: -95.3698 },
      'Phoenix, AZ': { lat: 33.4484, lon: -112.0740 },
      'Philadelphia, PA': { lat: 39.9526, lon: -75.1652 },
      'San Antonio, TX': { lat: 29.4241, lon: -98.4936 },
      'San Diego, CA': { lat: 32.7157, lon: -117.1611 },
      'Dallas, TX': { lat: 32.7767, lon: -96.7970 },
      'San Jose, CA': { lat: 37.3382, lon: -121.8863 },
      'Seattle, WA': { lat: 47.6062, lon: -122.3321 },
      'Denver, CO': { lat: 39.7392, lon: -104.9903 },
      'Boston, MA': { lat: 42.3601, lon: -71.0589 },
      'Miami, FL': { lat: 25.7617, lon: -80.1918 },
      'Atlanta, GA': { lat: 33.7490, lon: -84.3880 }
    };
    
    const destKey = `${load.destination.city}, ${load.destination.state}`;
    const coords = cityCoords[destKey] || { lat: 34.0, lon: -118.0 }; // Default to LA
    
    setCurrentLoad({
      loadNumber: load.id,
      destination: destKey,
      destLat: coords.lat,
      destLon: coords.lon,
      brokerEmail: 'broker@example.com', // In production, this would come from load data
      pickupDate: load.pickupDate,
      rate: load.rate
    });
    
    setMessages(prev => [...prev, {
      from: 'pure',
      text: `Load booked and set as active! ${load.origin.city}, ${load.origin.state} → ${destKey}. Enable GPS tracking and I'll help you navigate and send ETA updates to the broker automatically.`,
      timestamp: new Date(),
      mood: 'accomplished',
      skill: 'load booking'
    }]);
    
    alert(`Load booked! Origin: ${load.origin.city}, ${load.origin.state} → Destination: ${destKey}`);
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

  // Show registration steps if logged in
  if (isLoggedIn && registrationStep === 'personal') {
    return <PersonalRegistration onComplete={handlePersonalRegistrationComplete} existingData={personalData} />;
  }

  if (isLoggedIn && registrationStep === 'carrier') {
    return <CarrierRegistration onRegistrationComplete={handleRegistrationComplete} carrier={null} />;
  }

  // Legacy check for users who haven't completed registration
  if (!isRegistered) {
    return <CarrierRegistration onRegistrationComplete={handleRegistrationComplete} carrier={carrier} />;
  }

  // Show dashboard if user just logged in/registered
  if (showDashboard) {
    return <Dashboard carrier={carrier} onNavigate={handleDashboardNavigate} onLogout={handleLogout} />;
  }if (showVerificationDashboard) {
  return <VerificationDashboard />;
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
              <Logo size="md" showText={true} />
              <div>
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
    return (
      <div className={`min-h-screen ${theme === 'light' ? 'bg-gray-50' : 'bg-black'}`}>
        {/* Header */}
        <div className={`border-b ${theme === 'light' ? 'border-gray-200 bg-white' : 'border-gray-800 bg-black'}`}>
          <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${theme === 'light' ? 'bg-green-100' : 'bg-white'} rounded-full flex items-center justify-center`}>
                <User className={`w-5 h-5 ${theme === 'light' ? 'text-green-600' : 'text-black'}`} />
              </div>
              <div>
                <h1 className={`text-2xl font-light ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>Profile</h1>
                <p className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>Your account information</p>
              </div>
            </div>
            <button
              onClick={() => setCurrentView('home')}
              className={`px-4 py-2 rounded-lg ${theme === 'light' ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'} transition-colors flex items-center gap-2`}
            >
              <Home className="w-4 h-4" />
              Back to Home
            </button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Personal Information */}
            <div className={`${theme === 'light' ? 'bg-white border-gray-200' : 'bg-gray-900 border-gray-800'} rounded-2xl p-6 border`}>
              <h2 className={`text-xl font-medium ${theme === 'light' ? 'text-gray-900' : 'text-white'} mb-6 flex items-center gap-2`}>
                <User className="w-5 h-5 text-green-400" />
                Personal Information
              </h2>
              <div className="space-y-4">
                <div>
                  <label className={`text-sm font-medium ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'} block mb-1`}>Full Name</label>
                  <p className={`${theme === 'light' ? 'text-gray-900' : 'text-white'} font-medium`}>{user?.full_name || 'N/A'}</p>
                </div>
                <div>
                  <label className={`text-sm font-medium ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'} block mb-1`}>Email Address</label>
                  <p className={`${theme === 'light' ? 'text-gray-900' : 'text-white'} font-medium`}>{user?.email || 'N/A'}</p>
                </div>
                <div>
                  <label className={`text-sm font-medium ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'} block mb-1`}>Phone Number</label>
                  <p className={`${theme === 'light' ? 'text-gray-900' : 'text-white'} font-medium`}>{carrier?.personalphone || 'N/A'}</p>
                </div>
                <div>
                  <label className={`text-sm font-medium ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'} block mb-1`}>Address</label>
                  <p className={`${theme === 'light' ? 'text-gray-900' : 'text-white'} font-medium`}>{carrier?.address || 'N/A'}</p>
                </div>
                <div>
                  <label className={`text-sm font-medium ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'} block mb-1`}>City</label>
                  <p className={`${theme === 'light' ? 'text-gray-900' : 'text-white'} font-medium`}>{carrier?.city || 'N/A'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`text-sm font-medium ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'} block mb-1`}>State</label>
                    <p className={`${theme === 'light' ? 'text-gray-900' : 'text-white'} font-medium`}>{carrier?.state || 'N/A'}</p>
                  </div>
                  <div>
                    <label className={`text-sm font-medium ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'} block mb-1`}>ZIP Code</label>
                    <p className={`${theme === 'light' ? 'text-gray-900' : 'text-white'} font-medium`}>{carrier?.zip || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Company Information */}
            <div className={`${theme === 'light' ? 'bg-white border-gray-200' : 'bg-gray-900 border-gray-800'} rounded-2xl p-6 border`}>
              <h2 className={`text-xl font-medium ${theme === 'light' ? 'text-gray-900' : 'text-white'} mb-6 flex items-center gap-2`}>
                <Building className="w-5 h-5 text-green-400" />
                Company Information
              </h2>
              <div className="space-y-4">
                <div>
                  <label className={`text-sm font-medium ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'} block mb-1`}>Company Name</label>
                  <p className={`${theme === 'light' ? 'text-gray-900' : 'text-white'} font-medium`}>{carrier?.company_name || 'N/A'}</p>
                </div>
                <div>
                  <label className={`text-sm font-medium ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'} block mb-1`}>Company Number</label>
                  <p className={`${theme === 'light' ? 'text-gray-900' : 'text-white'} font-medium`}>{carrier?.phone || 'N/A'}</p>
                </div>
                <div>
                  <label className={`text-sm font-medium ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'} block mb-1`}>DOT Number</label>
                  <p className={`${theme === 'light' ? 'text-gray-900' : 'text-white'} font-medium`}>{carrier?.dot_number || 'N/A'}</p>
                </div>
                <div>
                  <label className={`text-sm font-medium ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'} block mb-1`}>MC Number</label>
                  <p className={`${theme === 'light' ? 'text-gray-900' : 'text-white'} font-medium`}>{carrier?.mc_number || 'N/A'}</p>
                </div>
                <div>
                  <label className={`text-sm font-medium ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'} block mb-1`}>EIN</label>
                  <p className={`${theme === 'light' ? 'text-gray-900' : 'text-white'} font-medium`}>{carrier?.ein || 'N/A'}</p>
                </div>
                <div>
                  <label className={`text-sm font-medium ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'} block mb-1`}>Number of Trucks</label>
                  <p className={`${theme === 'light' ? 'text-gray-900' : 'text-white'} font-medium`}>{carrier?.numberOftrucks || 'N/A'}</p>
                </div>
                <div>
                  <label className={`text-sm font-medium ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'} block mb-1`}>Equipment Types</label>
                  <p className={`${theme === 'light' ? 'text-gray-900' : 'text-white'} font-medium`}>{carrier?.equipmenttypes?.join(', ') || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Edit Profile Button */}
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => {
                // Navigate to carrier registration to edit
                setCurrentView('profile-edit');
              }}
              className={`px-6 py-3 rounded-xl ${theme === 'light' ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-green-500 text-black hover:bg-green-400'} transition-colors font-medium flex items-center gap-2`}
            >
              <User className="w-4 h-4" />
              Edit Profile
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =====================================================
  // PROFILE EDIT VIEW (Carrier Registration)
  // =====================================================
  if (currentView === 'profile-edit') {
    // Ensure carrier object has all required fields with defaults
    const carrierWithDefaults = {
      ...carrier,
      phone: carrier?.phone || '', // Company phone - ensure it exists
      companyName: carrier?.companyName || '',
      mcNumber: carrier?.mcNumber || '',
      dotNumber: carrier?.dotNumber || '',
      equipmentTypes: carrier?.equipmentTypes || [],
      trailerSizes: carrier?.trailerSizes || [],
      operatingRegions: carrier?.operatingRegions || []
    };
    
    return (
      <CarrierRegistration 
        onRegistrationComplete={handleRegistrationComplete} 
        carrier={carrierWithDefaults}
        isEditing={true}
        onBack={() => setCurrentView('home')} // Back to chat
      />
    );
  }

  // =====================================================
  // CALL SETTINGS VIEW - Pure Calls Configuration
  // =====================================================
  if (currentView === 'callSettings') {
    return (
      <div className="min-h-screen bg-black">
        <div className="border-b border-gray-800">
          <div className="max-w-4xl mx-auto px-6 py-6">
           <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Logo size="md" showText={true} />
                <div>
                  <p className="text-sm text-gray-400">Configure AI calling features</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentView('home')}
                  className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  Back to Chat
                </button>
                {isVerifier && (
                  <button
                    onClick={() => setShowVerificationDashboard(true)}
                    className="px-4 py-2 rounded-lg bg-purple-900/30 border border-purple-500/30 text-purple-400 hover:bg-purple-900/50 transition-colors flex items-center gap-2"
                  >
                    <Shield className="w-4 h-4" />
                    Verify Loads
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-6 py-6">
          {/* INFO BANNER */}
          <div className="mb-6 bg-gradient-to-r from-green-900/20 to-blue-900/20 border border-green-500/30 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <PhoneCall className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />

          <div>
                <h3 className="text-white font-medium mb-2">What is Pure Calls?</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Pure Calls is an advanced feature that automatically calls you when you don't respond to 
                  important messages. Perfect for when you're driving and can't check your phone - Pure will 
                  call you with urgent load opportunities, broker requests, and critical alerts.
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                  <Check className="w-4 h-4 text-green-400" />
                  <span>Works with any phone</span>
                  <Check className="w-4 h-4 text-green-400" />
                  <span>Natural AI voice</span>
                  <Check className="w-4 h-4 text-green-400" />
                  <span>Smart call timing</span>
                </div>
              </div>
            </div>
          </div>

          {/* PLACEHOLDER FOR CALL SETTINGS PANEL */}
          {/* NOTE: Uncomment this when CallSettingsPanel.jsx is uploaded */}
          {/*
          <CallSettingsPanel
            callSettings={callSettings}
            onUpdate={(settings) => {
              console.log('Settings updated:', settings);
              updateActivityTimestamp();
            }}
          />
          */}

          {/* TEMPORARY PLACEHOLDER UI */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
            <h3 className="text-white text-lg font-medium mb-4">Call Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                <div>
                  <p className="text-white font-medium">Enable Calls</p>
                  <p className="text-sm text-gray-400">Allow Pure to call you for urgent messages</p>
                </div>
                <div className="px-3 py-1 bg-yellow-900/30 text-yellow-400 text-sm rounded">
                  Coming Soon
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                <div>
                  <p className="text-white font-medium">Quiet Hours</p>
                  <p className="text-sm text-gray-400">No calls during sleep time</p>
                </div>
                <div className="px-3 py-1 bg-yellow-900/30 text-yellow-400 text-sm rounded">
                  Coming Soon
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                <div>
                  <p className="text-white font-medium">Call Priority</p>
                  <p className="text-sm text-gray-400">Choose which messages can trigger calls</p>
                </div>
                <div className="px-3 py-1 bg-yellow-900/30 text-yellow-400 text-sm rounded">
                  Coming Soon
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
              <p className="text-sm text-blue-300">
                <strong>Setup Required:</strong> Pure Calls will be available after you complete the 
                Twilio integration. See the deployment guide for instructions.
              </p>
            </div>
          </div>

          {/* SETUP STATUS */}
          <div className="mt-6 bg-gray-900 rounded-xl border border-gray-800 p-6">
            <h3 className="text-white text-lg font-medium mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Setup Status
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-yellow-900/30 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-yellow-400" />
                </div>
                <div>
                  <p className="text-white text-sm">Twilio Integration</p>
                  <p className="text-xs text-gray-400">Backend API endpoints needed</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-yellow-900/30 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-yellow-400" />
                </div>
                <div>
                  <p className="text-white text-sm">Message Tracking</p>
                  <p className="text-xs text-gray-400">System ready, awaiting activation</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-green-900/30 flex items-center justify-center">
                  <Check className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <p className="text-white text-sm">ElevenLabs Voice</p>
                  <p className="text-xs text-gray-400">Already configured and working!</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
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
  <Logo size="md" showText={true} />
  <div>
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
                    {isVerifier && (
                <button
                  onClick={() => setShowVerificationDashboard(true)}
                  className="px-4 py-2 rounded-lg bg-purple-900/30 text-purple-400 hover:bg-purple-900/50 transition-colors flex items-center gap-2"
                >
                  <Shield className="w-4 h-4" />
                  Verify Loads
                </button>
              )}
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
  <Logo size="md" showText={true} />
  <div>
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
  <Logo size="md" showText={true} />
  <div>
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
  // EARNINGS ANALYTICS VIEW
  // =====================================================
  if (currentView === 'earnings') {
    return (
      <div className={`min-h-screen ${theme === 'light' ? 'bg-gray-50' : 'bg-black'} flex flex-col`}>
        {/* Header */}
        <div className={`border-b ${theme === 'light' ? 'border-gray-200 bg-white' : 'border-gray-800 bg-black'}`}>
          <div className="max-w-4xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${theme === 'light' ? 'bg-green-100' : 'bg-white'} rounded-full flex items-center justify-center`}>
                  <DollarSign className={`w-5 h-5 ${theme === 'light' ? 'text-green-600' : 'text-black'}`} />
                </div>
                <div>
                  <h1 className={`text-2xl font-light ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>Earnings Analytics</h1>
                  <p className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>{carrier?.companyName || 'Carrier'}</p>
                </div>
              </div>
              <button
                onClick={() => setCurrentView('home')}
                className={`px-4 py-2 rounded-lg ${theme === 'light' ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'} transition-colors`}
              >
                Back to Chat
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 max-w-4xl mx-auto w-full">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* This Week */}
            <div className={`${theme === 'light' ? 'bg-white border-gray-200' : 'bg-gray-900 border-gray-800'} rounded-xl p-6 border`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>This Week</span>
                <div className="w-8 h-8 bg-green-500/10 rounded-full flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-green-400" />
                </div>
              </div>
              <p className={`text-3xl font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'} mb-1`}>
                ${(loadHistory.filter(l => {
                  const date = new Date(l.deliveryDate);
                  const weekAgo = new Date();
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  return date >= weekAgo;
                }).reduce((sum, l) => sum + l.rate, 0)).toLocaleString()}
              </p>
              <p className="text-sm text-green-400">
                +{loadHistory.filter(l => {
                  const date = new Date(l.deliveryDate);
                  const weekAgo = new Date();
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  return date >= weekAgo;
                }).length} loads
              </p>
            </div>

            {/* This Month */}
            <div className={`${theme === 'light' ? 'bg-white border-gray-200' : 'bg-gray-900 border-gray-800'} rounded-xl p-6 border`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>This Month</span>
                <div className="w-8 h-8 bg-blue-500/10 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                </div>
              </div>
              <p className={`text-3xl font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'} mb-1`}>
                ${(loadHistory.filter(l => {
                  const date = new Date(l.deliveryDate);
                  const monthAgo = new Date();
                  monthAgo.setMonth(monthAgo.getMonth() - 1);
                  return date >= monthAgo;
                }).reduce((sum, l) => sum + l.rate, 0)).toLocaleString()}
              </p>
              <p className="text-sm text-blue-400">
                +{loadHistory.filter(l => {
                  const date = new Date(l.deliveryDate);
                  const monthAgo = new Date();
                  monthAgo.setMonth(monthAgo.getMonth() - 1);
                  return date >= monthAgo;
                }).length} loads
              </p>
            </div>

            {/* All Time */}
            <div className={`${theme === 'light' ? 'bg-white border-gray-200' : 'bg-gray-900 border-gray-800'} rounded-xl p-6 border`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>All Time</span>
                <div className="w-8 h-8 bg-purple-500/10 rounded-full flex items-center justify-center">
                  <Package className="w-4 h-4 text-purple-400" />
                </div>
              </div>
              <p className={`text-3xl font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'} mb-1`}>
                ${(loadHistory.reduce((sum, l) => sum + l.rate, 0)).toLocaleString()}
              </p>
              <p className="text-sm text-purple-400">
                {loadHistory.length} total loads
              </p>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Average Per Load */}
            <div className={`${theme === 'light' ? 'bg-white border-gray-200' : 'bg-gray-900 border-gray-800'} rounded-xl p-6 border`}>
              <h3 className={`text-lg font-medium ${theme === 'light' ? 'text-gray-900' : 'text-white'} mb-4`}>Average Per Load</h3>
              <p className={`text-4xl font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                ${loadHistory.length > 0 ? Math.round(loadHistory.reduce((sum, l) => sum + l.rate, 0) / loadHistory.length).toLocaleString() : '0'}
              </p>
            </div>

            {/* Miles Driven */}
            <div className={`${theme === 'light' ? 'bg-white border-gray-200' : 'bg-gray-900 border-gray-800'} rounded-xl p-6 border`}>
              <h3 className={`text-lg font-medium ${theme === 'light' ? 'text-gray-900' : 'text-white'} mb-4`}>Total Miles</h3>
              <p className={`text-4xl font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                {(loadHistory.reduce((sum, l) => sum + (l.distance || 0), 0)).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Recent Loads */}
          <div className={`${theme === 'light' ? 'bg-white border-gray-200' : 'bg-gray-900 border-gray-800'} rounded-xl border overflow-hidden`}>
            <div className={`p-6 border-b ${theme === 'light' ? 'border-gray-200' : 'border-gray-800'}`}>
              <h3 className={`text-lg font-medium ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>Recent Loads</h3>
            </div>
            <div className={`divide-y ${theme === 'light' ? 'divide-gray-200' : 'divide-gray-800'} max-h-96 overflow-y-auto`}>
              {loadHistory.length === 0 ? (
                <div className="p-6 text-center">
                  <Package className={`w-12 h-12 ${theme === 'light' ? 'text-gray-300' : 'text-gray-700'} mx-auto mb-3`} />
                  <p className={theme === 'light' ? 'text-gray-600' : 'text-gray-400'}>No loads completed yet</p>
                </div>
              ) : (
                loadHistory.slice().reverse().slice(0, 10).map((load, index) => (
                  <div key={index} className={`p-4 ${theme === 'light' ? 'hover:bg-gray-50' : 'hover:bg-gray-800/50'} transition-colors`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1">
                        <p className={`font-medium ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                          {load.origin} → {load.destination}
                        </p>
                        <p className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                          {new Date(load.deliveryDate).toLocaleDateString()} • {load.distance || 'N/A'} miles
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>${load.rate.toLocaleString()}</p>
                        <p className={`text-xs ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                          ${load.distance ? (load.rate / load.distance).toFixed(2) : 'N/A'}/mi
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {loadHistory.length === 0 && (
            <div className={`${theme === 'light' ? 'bg-green-50 border-green-200' : 'bg-green-500/10 border-green-500/20'} border rounded-xl p-4 mt-4`}>
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div className={`text-sm ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                  <p className={`font-medium ${theme === 'light' ? 'text-gray-900' : 'text-white'} mb-1`}>Start tracking your earnings!</p>
                  <p className={theme === 'light' ? 'text-gray-600' : 'text-gray-400'}>Complete loads to see your earnings analytics here. Pure will automatically track all your deliveries.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // =====================================================
  // SETTINGS VIEW
  // =====================================================
  if (currentView === 'settings') {
    return (
      <div className={`min-h-screen ${theme === 'light' ? 'bg-gray-50' : 'bg-black'} flex flex-col`}>
        {/* Header */}
        <div className={`border-b ${theme === 'light' ? 'border-gray-200 bg-white' : 'border-gray-800 bg-black'}`}>
          <div className="max-w-4xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${theme === 'light' ? 'bg-green-100' : 'bg-white'} rounded-full flex items-center justify-center`}>
                  <Settings className={`w-5 h-5 ${theme === 'light' ? 'text-green-600' : 'text-black'}`} />
                </div>
                <div>
                  <h1 className={`text-2xl font-light ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>Settings</h1>
                  <p className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>Customize your experience</p>
                </div>
              </div>
              <button
                onClick={() => setCurrentView('home')}
                className={`px-4 py-2 rounded-lg ${theme === 'light' ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'} transition-colors`}
              >
                Back to Chat
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 max-w-4xl mx-auto w-full space-y-6">
          
          {/* Appearance */}
          <div className={`${theme === 'light' ? 'bg-white border-gray-200' : 'bg-gray-900 border-gray-800'} rounded-xl border`}>
            <div className={`p-6 border-b ${theme === 'light' ? 'border-gray-200' : 'border-gray-800'}`}>
              <h3 className={`text-lg font-medium ${theme === 'light' ? 'text-gray-900' : 'text-white'} flex items-center gap-2`}>
                <Globe className="w-5 h-5 text-green-400" />
                Appearance
              </h3>
            </div>
            <div className="p-6 space-y-4">
              {/* Theme Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className={`font-medium ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>Theme</p>
                  <p className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                    {theme === 'light' ? 'Light mode' : 'Dark mode'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    const newTheme = theme === 'dark' ? 'light' : 'dark';
                    setTheme(newTheme);
                    localStorage.setItem('pureTheme', newTheme);
                  }}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    theme === 'dark' ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      theme === 'dark' ? 'transform translate-x-6' : ''
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Voice Settings */}
          <div className={`${theme === 'light' ? 'bg-white border-gray-200' : 'bg-gray-900 border-gray-800'} rounded-xl border`}>
            <div className={`p-6 border-b ${theme === 'light' ? 'border-gray-200' : 'border-gray-800'}`}>
              <h3 className={`text-lg font-medium ${theme === 'light' ? 'text-gray-900' : 'text-white'} flex items-center gap-2`}>
                <Volume2 className="w-5 h-5 text-green-400" />
                Voice & Audio
              </h3>
            </div>
            <div className="p-6 space-y-4">
              {/* Voice Speed */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={`font-medium ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>Voice Speed</label>
                  <span className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>{(voiceSpeed * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.7"
                  max="1.3"
                  step="0.1"
                  value={voiceSpeed}
                  onChange={(e) => {
                    const newSpeed = parseFloat(e.target.value);
                    setVoiceSpeed(newSpeed);
                    localStorage.setItem('pureVoiceSpeed', newSpeed.toString());
                  }}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Voice Volume */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={`font-medium ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>Voice Volume</label>
                  <span className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>{(voiceVolume * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.3"
                  max="1.0"
                  step="0.1"
                  value={voiceVolume}
                  onChange={(e) => {
                    const newVolume = parseFloat(e.target.value);
                    setVoiceVolume(newVolume);
                    localStorage.setItem('pureVoiceVolume', newVolume.toString());
                  }}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className={`${theme === 'light' ? 'bg-white border-gray-200' : 'bg-gray-900 border-gray-800'} rounded-xl border`}>
            <div className={`p-6 border-b ${theme === 'light' ? 'border-gray-200' : 'border-gray-800'}`}>
              <h3 className={`text-lg font-medium ${theme === 'light' ? 'text-gray-900' : 'text-white'} flex items-center gap-2`}>
                <Bell className="w-5 h-5 text-green-400" />
                Notifications
              </h3>
            </div>
            <div className="p-6 space-y-4">
              {/* Load Alerts */}
              <div className="flex items-center justify-between">
                <div>
                  <p className={`font-medium ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>Load Alerts</p>
                  <p className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>Notify when new loads match your preferences</p>
                </div>
                <button
                  onClick={() => {
                    const newValue = !notificationSettings.loadAlerts;
                    setNotificationSettings(prev => ({ ...prev, loadAlerts: newValue }));
                    localStorage.setItem('pureNotifications', JSON.stringify({ ...notificationSettings, loadAlerts: newValue }));
                  }}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    notificationSettings.loadAlerts ? 'bg-green-500' : 'bg-gray-700'
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      notificationSettings.loadAlerts ? 'transform translate-x-6' : ''
                    }`}
                  />
                </button>
              </div>

              {/* Document Reminders */}
              <div className="flex items-center justify-between">
                <div>
                  <p className={`font-medium ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>Document Reminders</p>
                  <p className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>Remind when documents are expiring</p>
                </div>
                <button
                  onClick={() => {
                    const newValue = !notificationSettings.documentReminders;
                    setNotificationSettings(prev => ({ ...prev, documentReminders: newValue }));
                    localStorage.setItem('pureNotifications', JSON.stringify({ ...notificationSettings, documentReminders: newValue }));
                  }}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    notificationSettings.documentReminders ? 'bg-green-500' : 'bg-gray-700'
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      notificationSettings.documentReminders ? 'transform translate-x-6' : ''
                    }`}
                  />
                </button>
              </div>

              {/* Message Sounds */}
              <div className="flex items-center justify-between">
                <div>
                  <p className={`font-medium ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>Message Sounds</p>
                  <p className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>Play sound when Pure responds</p>
                </div>
                <button
                  onClick={() => {
                    const newValue = !notificationSettings.messageSounds;
                    setNotificationSettings(prev => ({ ...prev, messageSounds: newValue }));
                    localStorage.setItem('pureNotifications', JSON.stringify({ ...notificationSettings, messageSounds: newValue }));
                  }}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    notificationSettings.messageSounds ? 'bg-green-500' : 'bg-gray-700'
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      notificationSettings.messageSounds ? 'transform translate-x-6' : ''
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Privacy & Security */}
          <div className={`${theme === 'light' ? 'bg-white border-gray-200' : 'bg-gray-900 border-gray-800'} rounded-xl border`}>
            <div className={`p-6 border-b ${theme === 'light' ? 'border-gray-200' : 'border-gray-800'}`}>
              <h3 className={`text-lg font-medium ${theme === 'light' ? 'text-gray-900' : 'text-white'} flex items-center gap-2`}>
                <Lock className="w-5 h-5 text-green-400" />
                Privacy & Security
              </h3>
            </div>
            <div className="p-6 space-y-4">
              {/* Clear Chat History */}
              <button
                onClick={() => {
                  if (window.confirm('Clear all chat messages? This cannot be undone.')) {
                    setMessages([]);
                  }
                }}
                className={`w-full px-4 py-3 rounded-lg ${theme === 'light' ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'} transition-colors text-left flex items-center justify-between`}
              >
                <span>Clear Chat History</span>
                <Trash2 className="w-4 h-4" />
              </button>

              {/* Clear Load History */}
              <button
                onClick={() => {
                  if (window.confirm('Clear all load history? This cannot be undone.')) {
                    setLoadHistory([]);
                    localStorage.removeItem('pureLoadHistory');
                  }
                }}
                className={`w-full px-4 py-3 rounded-lg ${theme === 'light' ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'} transition-colors text-left flex items-center justify-between`}
              >
                <span>Clear Load History</span>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Account Info */}
          <div className={`${theme === 'light' ? 'bg-white border-gray-200' : 'bg-gray-900 border-gray-800'} rounded-xl border`}>
            <div className={`p-6 border-b ${theme === 'light' ? 'border-gray-200' : 'border-gray-800'}`}>
              <h3 className={`text-lg font-medium ${theme === 'light' ? 'text-gray-900' : 'text-white'} flex items-center gap-2`}>
                <User className="w-5 h-5 text-green-400" />
                Account Information
              </h3>
            </div>
            <div className="p-6 space-y-3">
              <div className="flex justify-between">
                <span className={theme === 'light' ? 'text-gray-600' : 'text-gray-400'}>Name</span>
                <span className={`font-medium ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>{carrier?.name || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className={theme === 'light' ? 'text-gray-600' : 'text-gray-400'}>Email</span>
                <span className={`font-medium ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>{carrier?.email || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className={theme === 'light' ? 'text-gray-600' : 'text-gray-400'}>Company</span>
                <span className={`font-medium ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>{carrier?.companyName || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className={theme === 'light' ? 'text-gray-600' : 'text-gray-400'}>DOT Number</span>
                <span className={`font-medium ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>{carrier?.dotNumber || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className={theme === 'light' ? 'text-gray-600' : 'text-gray-400'}>MC Number</span>
                <span className={`font-medium ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>{carrier?.mcNumber || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* About */}
          <div className={`${theme === 'light' ? 'bg-white border-gray-200' : 'bg-gray-900 border-gray-800'} rounded-xl border p-6`}>
            <div className="text-center">
              <div className={`w-16 h-16 ${theme === 'light' ? 'bg-green-100' : 'bg-white'} rounded-full flex items-center justify-center mx-auto mb-3`}>
                <Truck className={`w-8 h-8 ${theme === 'light' ? 'text-green-600' : 'text-black'}`} />
              </div>
              <h3 className={`text-lg font-medium ${theme === 'light' ? 'text-gray-900' : 'text-white'} mb-1`}>Pure Dispatch</h3>
              <p className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'} mb-4`}>Version 1.0.0</p>
              <p className={`text-xs ${theme === 'light' ? 'text-gray-500' : 'text-gray-500'}`}>
                © 2025 Pure Dispatch. All rights reserved.
              </p>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // =====================================================
  // HOME / CHAT VIEW
  // =====================================================
  return (
    <div className="h-screen bg-black flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-4">
           <div className="flex items-center gap-3">
  <Logo size="md" showText={true} />
  <div>
    <p className="text-sm text-gray-400">{carrier?.companyName || 'Carrier'}</p>
  </div>
</div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-gray-500">API Usage</p>
                <p className="text-sm text-white">{carrier?.apiUsageRemaining || 0} / {carrier?.apiUsageLimit || 100}</p>
              </div>
              {/* GPS Tracking Button */}
              <button
                onClick={toggleGPSTracking}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  isTrackingLocation 
                    ? 'bg-green-500 text-black hover:bg-green-400' 
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
                title={isTrackingLocation ? 'GPS Tracking Active' : 'Enable GPS Tracking'}
              >
                <Navigation className="w-5 h-5" />
              </button>
              {location && (
                <div className="text-right">
                  <p className="text-xs text-gray-500">Speed</p>
                  <p className="text-sm text-white">{location.speed ? `${metersPerSecondToMph(location.speed)} mph` : '0 mph'}</p>
                </div>
              )}
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
                      onClick={() => { setCurrentView('callSettings'); setShowProfileMenu(false); updateActivityTimestamp(); }}
                      className="w-full px-4 py-3 text-left text-sm text-white hover:bg-gray-800 flex items-center gap-2"
                      title="Pure Calls - Configure when Pure can call you"
                    >
                      <PhoneCall className="w-4 h-4 text-green-400" />
                      Call Settings
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
          {/* Navigation Buttons - Mobile Optimized */}
          <div className="flex gap-2 overflow-x-auto md:flex-wrap scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900 pb-2">
            <button className="px-4 py-2 rounded-lg bg-green-500 text-black flex items-center gap-2 whitespace-nowrap flex-shrink-0">
              <MessageCircle className="w-4 h-4" />
              Chat
            </button>
            {messages.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm('Clear all chat messages?')) {
                    setMessages([]);
                  }
                }}
                className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-red-900/50 hover:text-red-400 transition-colors flex items-center gap-2 whitespace-nowrap flex-shrink-0"
                title="Clear chat history"
              >
                <Trash2 className="w-4 h-4" />
                Clear
              </button>
            )}
            <button
              onClick={() => setCurrentView('loads')}
              className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors whitespace-nowrap flex-shrink-0"
            >
              Loads
            </button>
            <button
              onClick={() => setCurrentView('history')}
              className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-2 whitespace-nowrap flex-shrink-0"
            >
              <History className="w-4 h-4" />
              History
            </button>
            <button
              onClick={() => setCurrentView('favorites')}
              className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-2 whitespace-nowrap flex-shrink-0"
            >
              <Star className="w-4 h-4" />
              Favorites
            </button>
            <button
              onClick={() => setCurrentView('documents')}
              className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-2 whitespace-nowrap flex-shrink-0"
            >
              <FileText className="w-4 h-4" />
              Documents
            </button>
            <button
              onClick={() => setCurrentView('earnings')}
              className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-2 whitespace-nowrap flex-shrink-0"
            >
              <DollarSign className="w-4 h-4" />
              Earnings
            </button>
            <button
              onClick={() => setCurrentView('settings')}
              className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-2 whitespace-nowrap flex-shrink-0"
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </div>
        </div>
      </div>

      {/* GPS Control Panel */}
      <div className="border-b border-gray-800 bg-black">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <GPSControlPanel
            location={location}
            isTracking={isTrackingLocation}
            onStartTracking={handleStartGPSTracking}
            onStopTracking={handleStopGPSTracking}
            speed={gpsSpeed}
            currentLoad={currentLoad}
            onSendETAUpdate={handleSendETAUpdate}
          />
        </div>
      </div>

      {/* Nearby Services Panel */}
      {isTrackingLocation && location && (
        <div className="border-b border-gray-800 bg-black">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <NearbyServicesPanel
              location={location}
              onServiceRequest={handleServiceRequest}
            />
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 max-w-4xl mx-auto w-full bg-black">
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

      {/* Input - Mobile Optimized */}
      <div className="border-t border-gray-800 p-4 md:p-6">
        <div className="max-w-4xl mx-auto flex items-center gap-2 md:gap-3">
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`p-2 md:p-3 rounded-full transition-colors flex-shrink-0 ${audioEnabled ? 'bg-green-500 text-black' : 'bg-gray-800 text-gray-400'}`}
          >
            {isSpeaking ? <Volume2 className="w-4 h-4 md:w-5 md:h-5" /> : audioEnabled ? <Volume2 className="w-4 h-4 md:w-5 md:h-5" /> : <VolumeX className="w-4 h-4 md:w-5 md:h-5" />}
          </button>
          <button
            onClick={handleVoiceInput}
            disabled={isTyping}
            className={`p-2 md:p-3 rounded-full transition-colors flex-shrink-0 ${isListening ? 'bg-red-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'} disabled:opacity-50`}
          >
            {isListening ? <MicOff className="w-4 h-4 md:w-5 md:h-5" /> : <Mic className="w-4 h-4 md:w-5 md:h-5" />}
          </button>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask Pure anything..."
            className="flex-1 min-w-0 bg-gray-900 text-white rounded-full px-4 md:px-6 py-2 md:py-3 border border-gray-800 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none placeholder-gray-500 text-sm md:text-base"
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || isTyping}
            className="bg-green-500 text-black p-2 md:p-3 rounded-full hover:bg-green-400 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            <Send className="w-4 h-4 md:w-5 md:h-5" />
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
