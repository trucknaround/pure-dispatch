// ============================================================
// FIX #1 — Replace the handleLogin function (~line 2824)
// 
// FIND THIS:
//   const handleLogin = (data) => {
//     if (data && data.isNewUser) {
//       ...
//       checkSubscription();
//     } else if (data) {
//       ...
//       checkSubscription();
//     } else {
//       ...
//       checkSubscription();
//     }
//   };
//
// REPLACE WITH:
// ============================================================

const handleLogin = (data) => {
  if (data && data.isNewUser) {
    // New user - start registration flow (no subscription check needed yet)
    setIsLoggedIn(true);
    setRegistrationStep('personal');
    localStorage.setItem('pureActiveSession', 'true');
  } else if (data) {
    // Existing user - load their data, then check subscription
    setCarrier(data);
    setIsRegistered(true);
    setIsLoggedIn(true);
    localStorage.setItem('pureActiveSession', 'true');
    // Check subscription BEFORE showing dashboard
    checkSubscription().then(() => {
      // If checkSubscription didn't redirect to 'subscribe', show dashboard
      // We check after a tick to let state settle
    });
  } else {
    // Fallback - start registration
    setIsLoggedIn(true);
    setRegistrationStep('personal');
    localStorage.setItem('pureActiveSession', 'true');
  }
};


// ============================================================
// FIX #2 — Replace the useEffect session restore block
//
// FIND THIS (in the useEffect that checks for existing session):
//
//   if (savedCarrier) {
//     try {
//       const carrierData = JSON.parse(savedCarrier);
//       setCarrier(carrierData);
//       setIsRegistered(true);
//       setIsLoggedIn(true);
//       setShowDashboard(true);
//       checkSubscription();
//       ...
//
// REPLACE THE ENTIRE if (savedCarrier) block WITH:
// ============================================================

if (savedCarrier) {
  try {
    const carrierData = JSON.parse(savedCarrier);
    setCarrier(carrierData);
    setIsRegistered(true);
    setIsLoggedIn(true);

    // Check subscription status before deciding what to show
    const token = localStorage.getItem('authToken');
    if (token) {
      fetch('https://pure-dispatch-landing.vercel.app/api/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(r => r.json())
        .then(userData => {
          setSubscriptionStatus(userData.subscription_status);
          if (userData.subscription_status !== 'active') {
            setCurrentView('subscribe');
          } else {
            setShowDashboard(true);
            setCurrentView('home');
          }
        })
        .catch(err => {
          console.error('Subscription check failed:', err);
          setShowDashboard(true); // Fallback: let them in on error
        });

      // Also fetch user profile data
      fetch(`${BACKEND_URL}/api/profile/get`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(r => r.json())
        .then(data => {
          if (data.success && data.user) {
            setUser(data.user);
          }
        })
        .catch(err => console.error('Failed to load user data:', err));
    } else {
      // No token = not authenticated, show login
      setCurrentView('login');
      setIsLoggedIn(false);
    }
  } catch (e) {
    localStorage.removeItem('pureCarrier');
  }
}


// ============================================================
// FIX #3 — Replace the Subscribe page's "Subscribe Now" button
//
// FIND THIS (in the subscribe view around the onClick handler):
//
//   onClick={async () => {
//     try {
//       const { data: { session } } = await supabase.auth.getSession();
//       if (!session) {
//         alert('Please log in first');
//         return;
//       }
//       const response = await fetch('https://pure-dispatch-landing.vercel.app/api/create-checkout-session', {
//         method: 'POST',
//         headers: {
//           'Authorization': `Bearer ${session.access_token}`,
//           ...
//
// REPLACE THE ENTIRE onClick WITH:
// ============================================================

onClick={async () => {
  try {
    const token = localStorage.getItem('authToken');

    if (!token) {
      alert('Please log in first');
      setCurrentView('login');
      setIsLoggedIn(false);
      return;
    }

    const response = await fetch('https://pure-dispatch-landing.vercel.app/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (data.url) {
      window.location.href = data.url;
    } else {
      console.error('Checkout session error:', data);
      alert('Failed to create checkout session. Please try again.');
    }
  } catch (error) {
    console.error('Checkout error:', error);
    alert('Something went wrong. Please try again.');
  }
}}
