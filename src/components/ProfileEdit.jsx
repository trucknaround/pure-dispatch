/**
 * Enhanced Profile Edit Component
 * 
 * Features:
 * - Editable personal information
 * - MC/DOT FMCSA verification
 * - Locked verified fields
 * - Auto-populate from FMCSA data
 */

import React, { useState, useEffect } from 'react';
import { User, Building2, Lock, CheckCircle, AlertCircle, Loader } from 'lucide-react';

export default function ProfileEdit({ userId, onSave, onCancel }) {
  // Personal Information
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');

  // Company Information
  const [companyName, setCompanyName] = useState('');
  const [mcNumber, setMcNumber] = useState('');
  const [dotNumber, setDotNumber] = useState('');
  const [ein, setEin] = useState('');
  const [numberOfTrucks, setNumberOfTrucks] = useState('');
  const [equipmentTypes, setEquipmentTypes] = useState('');

  // Verification State
  const [mcVerified, setMcVerified] = useState(false);
  const [dotVerified, setDotVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState('');

  // UI State
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Load existing profile data
  useEffect(() => {
    loadProfile();
  }, [userId]);

  async function loadProfile() {
    try {
      const response = await fetch(`/api/profile/get?userId=${userId}`);
      const data = await response.json();

      if (data.success) {
        // Personal Info
        setFullName(data.profile.fullName || '');
        setEmail(data.profile.email || '');
        setPhone(data.profile.phone || '');
        setAddress(data.profile.address || '');
        setCity(data.profile.city || '');
        setState(data.profile.state || '');
        setZipCode(data.profile.zipCode || '');

        // Company Info
        setCompanyName(data.profile.companyName || '');
        setMcNumber(data.profile.mcNumber || '');
        setDotNumber(data.profile.dotNumber || '');
        setEin(data.profile.ein || '');
        setNumberOfTrucks(data.profile.numberOfTrucks || '');
        setEquipmentTypes(data.profile.equipmentTypes || '');

        // Verification status
        setMcVerified(data.profile.mcVerified || false);
        setDotVerified(data.profile.dotVerified || false);
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    }
  }

  async function verifyCarrier() {
    if (!mcNumber && !dotNumber) {
      setVerificationError('Enter MC or DOT number to verify');
      return;
    }

    setVerifying(true);
    setVerificationError('');

    try {
      const response = await fetch('/api/verify-carrier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mcNumber, dotNumber }),
      });

      const data = await response.json();

      if (data.verified) {
        // Auto-populate from FMCSA data
        if (data.legalName) setCompanyName(data.legalName);
        if (data.mcNumber) {
          setMcNumber(data.mcNumber);
          setMcVerified(true);
        }
        if (data.dotNumber) {
          setDotNumber(data.dotNumber);
          setDotVerified(true);
        }
        if (data.phone) setPhone(data.phone);
        if (data.physicalAddress) {
          setAddress(data.physicalAddress.street);
          setCity(data.physicalAddress.city);
          setState(data.physicalAddress.state);
          setZipCode(data.physicalAddress.zip);
        }
        if (data.totalPowerUnits) setNumberOfTrucks(String(data.totalPowerUnits));

        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setVerificationError(data.error || 'Verification failed');
      }
    } catch (err) {
      setVerificationError('Verification service error');
      console.error('Verification error:', err);
    } finally {
      setVerifying(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError('');

    try {
      const response = await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          fullName,
          email,
          phone,
          address,
          city,
          state,
          zipCode,
          companyName,
          mcNumber,
          dotNumber,
          ein,
          numberOfTrucks,
          equipmentTypes,
          mcVerified,
          dotVerified,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          if (onSave) onSave(data.profile);
        }, 1000);
      } else {
        setError(data.error || 'Failed to save profile');
      }
    } catch (err) {
      setError('Save failed. Please try again.');
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-white mb-8">Edit Profile</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-green-400" />
            <h2 className="text-xl font-semibold text-white">Personal Information</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-green-400 focus:outline-none"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-green-400 focus:outline-none"
                placeholder="john@example.com"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-green-400 focus:outline-none"
                placeholder="(555) 123-4567"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1">Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-green-400 focus:outline-none"
                placeholder="123 Main Street"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-green-400 focus:outline-none"
                  placeholder="Atlanta"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">State</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-green-400 focus:outline-none"
                  placeholder="GA"
                  maxLength="2"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1">ZIP Code</label>
              <input
                type="text"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-green-400 focus:outline-none"
                placeholder="30303"
                maxLength="5"
              />
            </div>
          </div>
        </div>

        {/* Company Information */}
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-green-400" />
            <h2 className="text-xl font-semibold text-white">Company Information</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Company Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-green-400 focus:outline-none"
                placeholder="ABC Trucking LLC"
              />
            </div>

            {/* MC Number with Verification */}
            <div>
              <label className="block text-sm text-gray-300 mb-1">MC Number</label>
              <div className="relative">
                <input
                  type="text"
                  value={mcNumber}
                  onChange={(e) => !mcVerified && setMcNumber(e.target.value)}
                  disabled={mcVerified}
                  className={`w-full bg-gray-700 text-white px-4 py-2 rounded border ${
                    mcVerified ? 'border-green-500 cursor-not-allowed' : 'border-gray-600'
                  } focus:border-green-400 focus:outline-none pr-10`}
                  placeholder="123456"
                />
                {mcVerified && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <Lock className="w-4 h-4 text-green-400" />
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  </div>
                )}
              </div>
              {mcVerified && (
                <p className="text-xs text-gray-400 mt-1">
                  Verified. Contact support to change.
                </p>
              )}
            </div>

            {/* DOT Number with Verification */}
            <div>
              <label className="block text-sm text-gray-300 mb-1">DOT Number</label>
              <div className="relative">
                <input
                  type="text"
                  value={dotNumber}
                  onChange={(e) => !dotVerified && setDotNumber(e.target.value)}
                  disabled={dotVerified}
                  className={`w-full bg-gray-700 text-white px-4 py-2 rounded border ${
                    dotVerified ? 'border-green-500 cursor-not-allowed' : 'border-gray-600'
                  } focus:border-green-400 focus:outline-none pr-10`}
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
                <p className="text-xs text-gray-400 mt-1">
                  Verified. Contact support to change.
                </p>
              )}
            </div>

            {/* Verify Button */}
            {!mcVerified || !dotVerified ? (
              <button
                onClick={verifyCarrier}
                disabled={verifying || (!mcNumber && !dotNumber)}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded flex items-center justify-center gap-2"
              >
                {verifying ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Verify with FMCSA
                  </>
                )}
              </button>
            ) : null}

            {verificationError && (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                {verificationError}
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <CheckCircle className="w-4 h-4" />
                Carrier verified successfully!
              </div>
            )}

            <div>
              <label className="block text-sm text-gray-300 mb-1">EIN</label>
              <input
                type="text"
                value={ein}
                onChange={(e) => setEin(e.target.value)}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-green-400 focus:outline-none"
                placeholder="12-3456789"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1">Number of Trucks</label>
              <input
                type="number"
                value={numberOfTrucks}
                onChange={(e) => setNumberOfTrucks(e.target.value)}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-green-400 focus:outline-none"
                placeholder="5"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1">Equipment Types</label>
              <input
                type="text"
                value={equipmentTypes}
                onChange={(e) => setEquipmentTypes(e.target.value)}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-green-400 focus:outline-none"
                placeholder="Dry Van, Reefer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 mt-8">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        <button
          onClick={onCancel}
          className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
        >
          Cancel
        </button>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
          {error}
        </div>
      )}
    </div>
  );
}
