import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, XCircle, Clock, AlertTriangle, Phone, Mail, 
  Building2, TrendingUp, Shield, FileCheck, ExternalLink, 
  RefreshCw, Search, Filter
} from 'lucide-react';

// ============================================
// VERIFICATION DASHBOARD COMPONENT
// ============================================
// Full UI for human verification team
// ============================================

const VerificationDashboard = () => {
  const [verifications, setVerifications] = useState([]);
  const [selectedVerification, setSelectedVerification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState(null);
  const [filter, setFilter] = useState('pending');
  const [verifying, setVerifying] = useState(false);

  // Form state for verification
  const [brokerAvailable, setBrokerAvailable] = useState(false);
  const [rateAccurate, setRateAccurate] = useState(false);
  const [complianceGood, setComplianceGood] = useState(false);
  const [verifiedRate, setVerifiedRate] = useState('');
  const [brokerNotes, setBrokerNotes] = useState('');
  const [complianceNotes, setComplianceNotes] = useState('');
  const [fmcsaStatus, setFmcsaStatus] = useState('active');
  const [insuranceVerified, setInsuranceVerified] = useState(false);
  const [verifierNotes, setVerifierNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  // Get auth token from localStorage
  const token = localStorage.getItem('authToken');

  // ============================================
  // LOAD VERIFICATIONS
  // ============================================
  const loadVerifications = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/verification/pending?status=${filter}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setVerifications(data.verifications);
        setStatistics(data.statistics);
      }
    } catch (error) {
      console.error('Failed to load verifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVerifications();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadVerifications, 30000);
    return () => clearInterval(interval);
  }, [filter]);

  // ============================================
  // VERIFY OR REJECT LOAD
  // ============================================
  const handleVerify = async (action) => {
    if (!selectedVerification) return;
    
    setVerifying(true);
    try {
      const payload = {
        verificationId: selectedVerification.id,
        action: action
      };

      if (action === 'verify') {
        if (!brokerAvailable || !rateAccurate || !complianceGood) {
          alert('Please complete all verification checks');
          setVerifying(false);
          return;
        }

        payload.brokerAvailabilityVerified = brokerAvailable;
        payload.rateAccuracyVerified = rateAccurate;
        payload.complianceVerified = complianceGood;
        payload.verifiedRate = parseFloat(verifiedRate) || selectedVerification.rate;
        payload.verifiedRatePerMile = payload.verifiedRate / selectedVerification.miles;
        payload.brokerResponseNotes = brokerNotes;
        payload.complianceNotes = complianceNotes;
        payload.fmcsaStatus = fmcsaStatus;
        payload.insuranceVerified = insuranceVerified;
        payload.verifierNotes = verifierNotes;
      } else {
        if (!rejectionReason) {
          alert('Please provide a rejection reason');
          setVerifying(false);
          return;
        }
        payload.rejectionReason = rejectionReason;
        payload.verifierNotes = verifierNotes;
      }

      const response = await fetch('/api/verification/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        alert(action === 'verify' ? 'Load verified successfully!' : 'Load rejected');
        setSelectedVerification(null);
        resetForm();
        loadVerifications();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Verification error:', error);
      alert('Failed to process verification');
    } finally {
      setVerifying(false);
    }
  };

  // ============================================
  // RESET FORM
  // ============================================
  const resetForm = () => {
    setBrokerAvailable(false);
    setRateAccurate(false);
    setComplianceGood(false);
    setVerifiedRate('');
    setBrokerNotes('');
    setComplianceNotes('');
    setFmcsaStatus('active');
    setInsuranceVerified(false);
    setVerifierNotes('');
    setRejectionReason('');
  };

  // ============================================
  // QUICK ACTIONS
  // ============================================
  const callBroker = (phone) => {
    if (phone) {
      window.location.href = `tel:${phone}`;
    }
  };

  const emailBroker = (email) => {
    if (email) {
      window.location.href = `mailto:${email}`;
    }
  };

  const checkFMCSA = (mcNumber) => {
    if (mcNumber) {
      window.open(`https://safer.fmcsa.dot.gov/query.asp?searchtype=ANY&query_type=queryCarrierSnapshot&query_param=MC_MX&query_string=${mcNumber}`, '_blank');
    }
  };

  // ============================================
  // PRIORITY BADGE
  // ============================================
  const PriorityBadge = ({ priority }) => {
    const colors = {
      urgent: 'bg-red-500 text-white',
      high: 'bg-orange-500 text-white',
      normal: 'bg-blue-500 text-white',
      low: 'bg-gray-500 text-white'
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${colors[priority]}`}>
        {priority}
      </span>
    );
  };

  // ============================================
  // AI FLAGS DISPLAY
  // ============================================
  const AIFlags = ({ flags }) => {
    if (!flags || flags.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-1 mt-2">
        {flags.map((flag, idx) => (
          <span key={idx} className="px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded text-xs">
            {flag.replace(/_/g, ' ')}
          </span>
        ))}
      </div>
    );
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Load Verification Dashboard</h1>
            <p className="text-gray-400">Review and verify loads before driver assignment</p>
          </div>
          <button
            onClick={loadVerifications}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Statistics */}
        {statistics && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
              <div className="text-2xl font-bold text-green-500">{statistics.pending}</div>
              <div className="text-sm text-gray-400">Pending</div>
            </div>
            <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
              <div className="text-2xl font-bold text-blue-500">{statistics.inReview}</div>
              <div className="text-sm text-gray-400">In Review</div>
            </div>
            <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
              <div className="text-2xl font-bold text-red-500">{statistics.urgent}</div>
              <div className="text-sm text-gray-400">Urgent</div>
            </div>
            <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
              <div className="text-2xl font-bold text-green-500">{statistics.verified}</div>
              <div className="text-sm text-gray-400">Verified</div>
            </div>
            <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
              <div className="text-2xl font-bold text-red-500">{statistics.rejected}</div>
              <div className="text-sm text-gray-400">Rejected</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {['pending', 'in_review', 'verified', 'rejected'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg ${
                filter === status
                  ? 'bg-green-500 text-black'
                  : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
              }`}
            >
              {status.replace('_', ' ').toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Load Queue */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
          <h2 className="text-xl font-bold mb-4">Load Queue</h2>
          
          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading...</div>
          ) : verifications.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No verifications found</div>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {verifications.map((verification) => (
                <div
                  key={verification.id}
                  onClick={() => {
                    setSelectedVerification(verification);
                    setVerifiedRate(verification.rate?.toString() || '');
                    resetForm();
                  }}
                  className={`p-4 rounded-lg border cursor-pointer transition ${
                    selectedVerification?.id === verification.id
                      ? 'border-green-500 bg-green-500/10'
                      : 'border-gray-700 hover:border-gray-600 bg-gray-800'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold">{verification.load_id}</span>
                        <PriorityBadge priority={verification.priority} />
                      </div>
                      <div className="text-sm text-gray-400">
                        {verification.origin?.city}, {verification.origin?.state} → {verification.destination?.city}, {verification.destination?.state}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-500">
                        ${verification.rate?.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-400">
                        ${(verification.rate / verification.miles).toFixed(2)}/mi
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-400 mb-2">
                    <span>{verification.miles} mi</span>
                    <span>•</span>
                    <span>{verification.equipment_type}</span>
                    {verification.ai_confidence_score && (
                      <>
                        <span>•</span>
                        <span>AI: {(verification.ai_confidence_score * 100).toFixed(0)}%</span>
                      </>
                    )}
                  </div>

                  <AIFlags flags={verification.ai_flags} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Verification Panel */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
          <h2 className="text-xl font-bold mb-4">Verification Details</h2>

          {!selectedVerification ? (
            <div className="text-center py-16 text-gray-400">
              Select a load to verify
            </div>
          ) : (
            <div className="space-y-6">
              {/* Load Info */}
              <div>
                <h3 className="text-lg font-bold mb-3">Load Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Load ID:</span>
                    <span className="font-mono">{selectedVerification.load_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Distance:</span>
                    <span>{selectedVerification.miles} miles</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Rate:</span>
                    <span className="font-bold text-green-500">${selectedVerification.rate?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Rate/Mile:</span>
                    <span>${(selectedVerification.rate / selectedVerification.miles).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Commodity:</span>
                    <span>{selectedVerification.commodity}</span>
                  </div>
                </div>
              </div>

              {/* Broker Info */}
              <div>
                <h3 className="text-lg font-bold mb-3">Broker Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Name:</span>
                    <span>{selectedVerification.broker_name}</span>
                  </div>
                  {selectedVerification.broker_mc_number && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">MC Number:</span>
                      <div className="flex items-center gap-2">
                        <span>{selectedVerification.broker_mc_number}</span>
                        <button
                          onClick={() => checkFMCSA(selectedVerification.broker_mc_number)}
                          className="p-1 bg-blue-500 hover:bg-blue-600 rounded"
                          title="Check FMCSA"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                  {selectedVerification.broker_phone && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Phone:</span>
                      <div className="flex items-center gap-2">
                        <span>{selectedVerification.broker_phone}</span>
                        <button
                          onClick={() => callBroker(selectedVerification.broker_phone)}
                          className="p-1 bg-green-500 hover:bg-green-600 rounded"
                          title="Call broker"
                        >
                          <Phone className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                  {selectedVerification.broker_email && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Email:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs">{selectedVerification.broker_email}</span>
                        <button
                          onClick={() => emailBroker(selectedVerification.broker_email)}
                          className="p-1 bg-blue-500 hover:bg-blue-600 rounded"
                          title="Email broker"
                        >
                          <Mail className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* AI Notes */}
              {selectedVerification.ai_notes && (
                <div>
                  <h3 className="text-lg font-bold mb-2">AI Notes</h3>
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3 text-sm text-yellow-300">
                    {selectedVerification.ai_notes}
                  </div>
                </div>
              )}

              {/* Verification Form */}
              <div className="border-t border-gray-800 pt-6">
                <h3 className="text-lg font-bold mb-4">Verification Checklist</h3>

                {/* Broker Availability */}
                <div className="mb-4">
                  <label className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={brokerAvailable}
                      onChange={(e) => setBrokerAvailable(e.target.checked)}
                      className="w-5 h-5"
                    />
                    <span className="font-bold">Broker Availability Confirmed</span>
                  </label>
                  <textarea
                    placeholder="Notes: Called broker, confirmed load is available..."
                    value={brokerNotes}
                    onChange={(e) => setBrokerNotes(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm"
                    rows={2}
                  />
                </div>

                {/* Rate Accuracy */}
                <div className="mb-4">
                  <label className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={rateAccurate}
                      onChange={(e) => setRateAccurate(e.target.checked)}
                      className="w-5 h-5"
                    />
                    <span className="font-bold">Rate Accuracy Verified</span>
                  </label>
                  <input
                    type="number"
                    placeholder="Verified rate"
                    value={verifiedRate}
                    onChange={(e) => setVerifiedRate(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm mb-2"
                  />
                </div>

                {/* Compliance */}
                <div className="mb-4">
                  <label className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={complianceGood}
                      onChange={(e) => setComplianceGood(e.target.checked)}
                      className="w-5 h-5"
                    />
                    <span className="font-bold">Compliance Verified</span>
                  </label>
                  
                  <select
                    value={fmcsaStatus}
                    onChange={(e) => setFmcsaStatus(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm mb-2"
                  >
                    <option value="active">FMCSA: Active</option>
                    <option value="inactive">FMCSA: Inactive</option>
                    <option value="suspended">FMCSA: Suspended</option>
                  </select>

                  <label className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={insuranceVerified}
                      onChange={(e) => setInsuranceVerified(e.target.checked)}
                      className="w-5 h-5"
                    />
                    <span>Insurance Verified</span>
                  </label>

                  <textarea
                    placeholder="Compliance notes: MC verified on FMCSA, no violations..."
                    value={complianceNotes}
                    onChange={(e) => setComplianceNotes(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm"
                    rows={2}
                  />
                </div>

                {/* Verifier Notes */}
                <div className="mb-4">
                  <label className="block mb-2 font-bold">Additional Notes</label>
                  <textarea
                    placeholder="Overall assessment..."
                    value={verifierNotes}
                    onChange={(e) => setVerifierNotes(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm"
                    rows={3}
                  />
                </div>

                {/* Rejection Reason */}
                <div className="mb-4">
                  <label className="block mb-2 font-bold text-red-400">Rejection Reason (if rejecting)</label>
                  <textarea
                    placeholder="Why this load is being rejected..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm"
                    rows={2}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => handleVerify('verify')}
                    disabled={verifying || !brokerAvailable || !rateAccurate || !complianceGood}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-bold"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    {verifying ? 'Processing...' : 'Verify Load'}
                  </button>
                  <button
                    onClick={() => handleVerify('reject')}
                    disabled={verifying || !rejectionReason}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-600 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-bold"
                  >
                    <XCircle className="w-5 h-5" />
                    {verifying ? 'Processing...' : 'Reject Load'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerificationDashboard;
