
import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Search, MapPin, Users, DollarSign, Calendar, ArrowLeft, ArrowRight, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { motion } from "framer-motion";
import { determineVenueStatus, getVenueStatusDisplay } from "../components/VenueLogic";

const ALL_CITIES = [
  {"city": "New York", "country": "United States"},
  {"city": "Los Angeles", "country": "United States"},
  {"city": "Chicago", "country": "United States"},
  {"city": "Houston", "country": "United States"},
  {"city": "Miami", "country": "United States"},
  {"city": "San Francisco", "country": "United States"},
  {"city": "Seattle", "country": "United States"},
  {"city": "Boston", "country": "United States"},
  {"city": "Las Vegas", "country": "United States"},
  {"city": "Dubai", "country": "United Arab Emirates"},
  {"city": "Abu Dhabi", "country": "United Arab Emirates"},
  {"city": "London", "country": "United Kingdom"},
  {"city": "Manchester", "country": "United Kingdom"},
  {"city": "Paris", "country": "France"},
  {"city": "Berlin", "country": "Germany"},
  {"city": "Madrid", "country": "Spain"},
  {"city": "Barcelona", "country": "Spain"},
  {"city": "Rome", "country": "Italy"},
  {"city": "Milan", "country": "Italy"},
  {"city": "Amsterdam", "country": "Netherlands"},
  {"city": "Brussels", "country": "Belgium"},
  {"city": "Vienna", "country": "Austria"},
  {"city": "Zurich", "country": "Switzerland"},
  {"city": "Stockholm", "country": "Sweden"},
  {"city": "Copenhagen", "country": "Denmark"},
  {"city": "Oslo", "country": "Norway"},
  {"city": "Helsinki", "country": "Finland"},
  {"city": "Dublin", "country": "Ireland"},
  {"city": "Lisbon", "country": "Portugal"},
  {"city": "Athens", "country": "Greece"},
  {"city": "Istanbul", "country": "Turkey"},
  {"city": "Cairo", "country": "Egypt"},
  {"city": "Riyadh", "country": "Saudi Arabia"},
  {"city": "Jeddah", "country": "Saudi Arabia"},
  {"city": "Doha", "country": "Qatar"},
  {"city": "Kuwait City", "country": "Kuwait"},
  {"city": "Muscat", "country": "Oman"},
  {"city": "Manama", "country": "Bahrain"},
  {"city": "Beirut", "country": "Lebanon"},
  {"city": "Amman", "country": "Jordan"},
  {"city": "Tel Aviv", "country": "Israel"},
  {"city": "Jerusalem", "country": "Israel"},
  {"city": "Tokyo", "country": "Japan"},
  {"city": "Osaka", "country": "Japan"},
  {"city": "Seoul", "country": "South Korea"},
  {"city": "Beijing", "country": "China"},
  {"city": "Shanghai", "country": "China"},
  {"city": "Hong Kong", "country": "Hong Kong"},
  {"city": "Singapore", "country": "Singapore"},
  {"city": "Bangkok", "country": "Thailand"},
  {"city": "Kuala Lumpur", "country": "Malaysia"},
  {"city": "Jakarta", "country": "Indonesia"},
  {"city": "Manila", "country": "Philippines"},
  {"city": "Mumbai", "country": "India"},
  {"city": "Delhi", "country": "India"},
  {"city": "Bangalore", "country": "India"},
  {"city": "Hyderabad", "country": "India"},
  {"city": "Chennai", "country": "India"},
  {"city": "Kolkata", "country": "India"},
  {"city": "Pune", "country": "India"},
  {"city": "Sydney", "country": "Australia"},
  {"city": "Melbourne", "country": "Australia"},
  {"city": "Brisbane", "country": "Australia"},
  {"city": "Perth", "country": "Australia"},
  {"city": "Auckland", "country": "New Zealand"},
  {"city": "Toronto", "country": "Canada"},
  {"city": "Vancouver", "country": "Canada"},
  {"city": "Montreal", "country": "Canada"},
  {"city": "Mexico City", "country": "Mexico"},
  {"city": "Sao Paulo", "country": "Brazil"},
  {"city": "Rio de Janeiro", "country": "Brazil"},
  {"city": "Buenos Aires", "country": "Argentina"},
  {"city": "Santiago", "country": "Chile"},
  {"city": "Lima", "country": "Peru"},
  {"city": "Bogota", "country": "Colombia"},
  {"city": "Johannesburg", "country": "South Africa"},
  {"city": "Cape Town", "country": "South Africa"},
  {"city": "Nairobi", "country": "Kenya"},
  {"city": "Lagos", "country": "Nigeria"},
  {"city": "Casablanca", "country": "Morocco"},
  {"city": "Marrakech", "country": "Morocco"}
];


export default function EventDetailsCollection() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [venueStatus, setVenueStatus] = useState('pending_venue');
  
  const [budgetRange, setBudgetRange] = useState([1000, 10000]);
  const [eventDate, setEventDate] = useState("");
  
  const [searchCity, setSearchCity] = useState("");
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [selectedCity, setSelectedCity] = useState(null);
  const [subLocation, setSubLocation] = useState("");
  const [specificAddress, setSpecificAddress] = useState("");
  const [showAddressField, setShowAddressField] = useState(false);
  
  const [guestRange, setGuestRange] = useState([50, 200]);
  
  const [loadError, setLoadError] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);

  useEffect(() => {
    console.log("🔍 EventDetailsCollection mounted");
    loadDataFromAllSources();
  }, []);

  const loadDataFromAllSources = () => {
    console.log('==========================================');
    console.log('🔍 LOADING DATA FROM ALL SOURCES');
    console.log('==========================================');
    
    let loadedData = null;
    let loadMethod = null;
    
    // METHOD 1: Try router state (most immediate)
    try {
      console.log('📱 METHOD 1: Checking router state...');
      console.log('Location state:', location.state);
      
      if (location.state?.guidedEventData) {
        loadedData = location.state.guidedEventData;
        loadedData.categories = loadedData.selected_categories; // Ensure categories field is present
        loadMethod = 'Router State (guidedEventData)';
        console.log('✅ Found guidedEventData in router state');
      } else if (location.state?.categories) {
        loadedData = {
          categories: location.state.categories,
          selected_categories: location.state.categories, // Ensure selected_categories field is present
          venue_status: location.state.venue_status || 'pending_venue',
          timestamp: Date.now()
        };
        loadMethod = 'Router State (categories)';
        console.log('✅ Found categories in router state');
      }
    } catch (e) {
      console.log('⚠️ METHOD 1 failed:', e.message);
    }
    
    // METHOD 2: Try URL parameters
    if (!loadedData || !loadedData.categories || loadedData.categories.length === 0) {
      try {
        console.log('📱 METHOD 2: Checking URL parameters...');
        const categoriesParam = searchParams.get('categories');
        const venueStatusParam = searchParams.get('venue_status');
        
        console.log('URL params:', { categoriesParam, venueStatusParam });
        
        if (categoriesParam) {
          const categories = decodeURIComponent(categoriesParam).split(',').filter(c => c.trim());
          loadedData = {
            categories: categories,
            selected_categories: categories, // Ensure selected_categories field is present
            venue_status: venueStatusParam ? decodeURIComponent(venueStatusParam) : 'pending_venue',
            timestamp: Date.now(),
            ...(loadedData || {}) // Merge with any existing partial data if any
          };
          loadMethod = 'URL Parameters';
          console.log('✅ Found data in URL params');
        }
      } catch (e) {
        console.log('⚠️ METHOD 2 failed:', e.message);
      }
    }
    
    // METHOD 3: Try localStorage - guidedEventCategories
    if (!loadedData || !loadedData.categories || loadedData.categories.length === 0) {
      try {
        console.log('📱 METHOD 3: Checking localStorage (guidedEventCategories)...');
        const stored = localStorage.getItem('guidedEventCategories');
        console.log('localStorage guidedEventCategories:', stored ? 'FOUND' : 'NOT FOUND');
        
        if (stored) {
          const data = JSON.parse(stored);
          const age = data.timestamp ? Date.now() - data.timestamp : 0;
          
          console.log('Data age:', Math.floor(age / 1000), 'seconds');
          
          if (age < 30 * 60 * 1000 || !data.timestamp) { // 30 minutes or no timestamp
            loadedData = data;
            loadedData.categories = loadedData.selected_categories || loadedData.categories; // Ensure categories field
            loadMethod = 'localStorage (guidedEventCategories)';
            console.log('✅ Found valid data in localStorage');
          } else {
            console.log('⚠️ Data too old, removing');
            localStorage.removeItem('guidedEventCategories');
          }
        }
      } catch (e) {
        console.log('⚠️ METHOD 3 failed:', e.message);
      }
    }
    
    // METHOD 4: Try sessionStorage - guidedEventCategories
    if (!loadedData || !loadedData.categories || loadedData.categories.length === 0) {
      try {
        console.log('📱 METHOD 4: Checking sessionStorage (guidedEventCategories)...');
        const stored = sessionStorage.getItem('guidedEventCategories');
        console.log('sessionStorage guidedEventCategories:', stored ? 'FOUND' : 'NOT FOUND');
        
        if (stored) {
          loadedData = JSON.parse(stored);
          loadedData.categories = loadedData.selected_categories || loadedData.categories; // Ensure categories field
          loadMethod = 'sessionStorage (guidedEventCategories)';
          console.log('✅ Found data in sessionStorage');
        }
      } catch (e) {
        console.log('⚠️ METHOD 4 failed:', e.message);
      }
    }
    
    // METHOD 5: Try backup key - blink_event_categories
    if (!loadedData || !loadedData.categories || loadedData.categories.length === 0) {
      try {
        console.log('📱 METHOD 5: Checking backup key (blink_event_categories)...');
        const stored = localStorage.getItem('blink_event_categories');
        console.log('Backup key:', stored ? 'FOUND' : 'NOT FOUND');
        
        if (stored) {
          // Attempt to parse old data, structure might differ slightly
          const oldData = JSON.parse(stored);
          loadedData = {
            categories: oldData.categories || [],
            selected_categories: oldData.categories || [],
            venue_status: oldData.venue_status || 'pending_venue',
            timestamp: Date.now()
          };
          loadMethod = 'localStorage (backup key)';
          console.log('✅ Found data in backup key');
        }
      } catch (e) {
        console.log('⚠️ METHOD 5 failed:', e.message);
      }
    }

    // Set debug info
    const debug = {
      loadMethod,
      url: window.location.href,
      routerState: location.state,
      sessionStorage: sessionStorage.getItem('guidedEventCategories'),
      localStorage: localStorage.getItem('guidedEventCategories'),
      backupKey: localStorage.getItem('blink_event_categories'),
      searchParams: Object.fromEntries(searchParams.entries()),
      timestamp: new Date().toISOString()
    };
    
    console.log('📊 DEBUG INFO:', debug);
    setDebugInfo(debug);
    
    // Final result - populate states
    const categories = loadedData?.categories || loadedData?.selected_categories || [];
    
    if (categories.length > 0) {
      console.log('✅ DATA LOADED SUCCESSFULLY via', loadMethod);
      console.log('Full Loaded Data:', loadedData);
      console.log('Categories:', categories);
      console.log('Venue Status:', loadedData.venue_status);
      console.log('==========================================');
      
      setSelectedCategories(categories);
      setVenueStatus(loadedData.venue_status || 'pending_venue');
      setEventDate(loadedData.event_date || "");
      setSelectedCity(loadedData.selected_city || null);
      if (loadedData.selected_city) {
        setSearchCity(`${loadedData.selected_city.city}, ${loadedData.selected_city.country}`);
      } else {
        setSearchCity("");
      }
      setSubLocation(loadedData.sub_location || "");
      setSpecificAddress(loadedData.specific_address || "");
      setShowAddressField(!!loadedData.specific_address); // Show address field if data exists
      setGuestRange([loadedData.guest_min || 50, loadedData.guest_max || 200]);
      setBudgetRange([loadedData.budget_min || 1000, loadedData.budget_max || 10000]);

      setLoadError(false);

      // If data was successfully loaded from router state or URL params, save it to persistent storage
      // Also re-save if loaded from an old key to update format and timestamp
      if (loadMethod === 'Router State (guidedEventData)' || loadMethod === 'Router State (categories)' || loadMethod === 'URL Parameters' || loadMethod === 'localStorage (backup key)') {
        const dataToStore = {
          ...loadedData,
          categories: categories, // ensure current categories are saved
          selected_categories: categories, // ensure current categories are saved
          timestamp: Date.now()
        }; // ensure timestamp is updated
        try {
          sessionStorage.setItem('guidedEventCategories', JSON.stringify(dataToStore));
          localStorage.setItem('guidedEventCategories', JSON.stringify(dataToStore));
          console.log(`📡 Stored data in sessionStorage and localStorage from ${loadMethod}`);
          // Clear old backup key after successful migration/storage
          localStorage.removeItem('blink_event_categories');
          sessionStorage.removeItem('blink_event_categories');
        } catch (e) {
          console.error('❌ Failed to save data to storage:', e);
        }
      }

    } else {
      console.error('❌ NO DATA FOUND FROM ANY SOURCE for categories');
      console.log('==========================================');
      setLoadError(true);
    }
  };

  const handleRetry = () => {
    console.log("🔄 Retrying data load...");
    setLoadError(false);
    loadDataFromAllSources();
  };

  const handleStartOver = () => {
    console.log("🔄 Starting over from category selection");
    // Clear all storage related to the guided flow
    localStorage.removeItem('guidedEventCategories');
    sessionStorage.removeItem('guidedEventCategories');
    localStorage.removeItem('blink_event_categories'); // Ensure old key is gone
    sessionStorage.removeItem('blink_event_categories'); // Ensure old key is gone
    navigate(createPageUrl("GuidedEventCreation"), { replace: true });
  };

  const filteredCities = searchCity.trim()
    ? ALL_CITIES.filter(city =>
        city.city.toLowerCase().includes(searchCity.toLowerCase()) ||
        city.country.toLowerCase().includes(searchCity.toLowerCase())
      ).slice(0, 10)
    : [];

  const handleCitySelect = (city) => {
    setSelectedCity(city);
    setSearchCity(`${city.city}, ${city.country}`);
    setShowCityDropdown(false);
  };

  const handleBack = () => {
    // Construct current state to save
    const dataToStore = {
      selected_categories: selectedCategories,
      venue_status: venueStatus,
      event_date: eventDate,
      selected_city: selectedCity,
      sub_location: subLocation,
      specific_address: specificAddress,
      guest_min: guestRange[0],
      guest_max: guestRange[1],
      budget_min: budgetRange[0],
      budget_max: budgetRange[1],
      timestamp: Date.now(), // Always update timestamp on save
    };
    try {
      sessionStorage.setItem('guidedEventCategories', JSON.stringify(dataToStore));
      localStorage.setItem('guidedEventCategories', JSON.stringify(dataToStore));
      console.log("💾 Saved current state to storage before navigating back:", dataToStore);
    } catch (e) {
      console.error("❌ Failed to save state to storage on back navigation:", e);
    }
    navigate(createPageUrl("GuidedEventCreation"));
  };

  const handleContinue = async () => {
    // Validation
    if (!selectedCategories || selectedCategories.length === 0) {
      alert("No services selected. Please go back to Step 1.");
      return;
    }
    if (!selectedCity) {
      alert("Please select a city");
      return;
    }
    if (!eventDate) {
      alert("Please select an event date");
      return;
    }
    const locationDisplayString = specificAddress || `${subLocation ? subLocation + ', ' : ''}${selectedCity.city}, ${selectedCity.country}`;
    if (!locationDisplayString.trim()) { // This check should mostly pass if city is selected
      alert("Please provide a valid event location");
      return;
    }

    console.log('==========================================');
    console.log('📝 STEP 2: SAVING EVENT DETAILS');
    console.log('==========================================');
    
    try {
      // Load existing data from storage to merge
      const storedDataString = localStorage.getItem('guidedEventCategories') || sessionStorage.getItem('guidedEventCategories');
      let existingData = {};
      if (storedDataString) {
          existingData = JSON.parse(storedDataString);
          console.log('✅ Loaded existing state from guidedEventCategories:', existingData);
      } else {
          console.warn('⚠️ No existing guidedEventCategories found, starting with fresh data for this step.');
      }
      
      // Merge with new details from this form
      const completeEventData = {
        ...existingData, // Preserve previous steps' data (e.g., event_name if pre-generated)
        // Data collected in this step:
        selected_categories: selectedCategories, // Should already be in existingData, but ensure current state is used
        categories: selectedCategories, // Keep categories field consistent with load logic
        venue_status: venueStatus, // Should already be in existingData, but ensure current state is used
        event_name: existingData.event_name || 'Unnamed Event', // Placeholder if not yet generated/entered
        event_date: eventDate,
        selected_city: selectedCity, // Store the city object
        sub_location: subLocation,
        specific_address: specificAddress,
        location_display_string: locationDisplayString, // A combined string for display/API
        guest_min: guestRange[0],
        guest_max: guestRange[1],
        budget_min: budgetRange[0],
        budget_max: budgetRange[1],
        // Fields not collected in this UI, but may be present from previous/future steps or required by outline
        theme: existingData.theme || '',
        vibe: existingData.vibe || '',
        special_requirements: existingData.special_requirements || '',
        // Flow control metadata:
        step: 2,
        completed: true,
        timestamp: Date.now()
      };
      
      console.log('📦 Complete event data to save:', completeEventData);
      
      // Save to BOTH storages for persistence
      const dataString = JSON.stringify(completeEventData);
      localStorage.setItem('guidedEventCategories', dataString);
      sessionStorage.setItem('guidedEventCategories', dataString);
      
      console.log('✅ Saved to localStorage:', 'guidedEventCategories');
      console.log('✅ Saved to sessionStorage:', 'guidedEventCategories');
      
      // Update flow stage for the overall guided process
      sessionStorage.setItem('event_flow_stage', 'enablers');
      
      console.log('==========================================');
      
      // Small delay as per outline
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Navigate to the next step, passing key categories/venue_status as URL params as backup
      const categoriesParam = encodeURIComponent(selectedCategories.join(','));
      const venueParam = encodeURIComponent(venueStatus);
      navigate(`${createPageUrl("GuidedEnablerSelection")}?categories=${categoriesParam}&venue_status=${venueParam}`);
      
    } catch (error) {
      console.error('❌ CRITICAL ERROR in EventDetailsCollection (Step 2):', error);
      alert(`Failed to save event details: ${error.message || error}`);
    }
  };

  const venueStatusDisplay = getVenueStatusDisplay(venueStatus);

  // Error state
  if (loadError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-cyan-50 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-lg w-full bg-white rounded-2xl shadow-xl overflow-hidden"
        >
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white">
            <AlertCircle className="w-12 h-12 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-center">Data Loading Failed</h2>
          </div>

          <div className="p-6 space-y-4">
            <p className="text-gray-600 text-center">
              Your event details were lost. This can happen if:
            </p>
            
            <ul className="text-sm text-gray-600 space-y-2 ml-4 list-disc">
              <li>The page was refreshed during navigation</li>
              <li>You used the browser back button</li>
              <li>The session expired (30+ minutes inactive for saved data)</li>
              <li>Your browser blocks localStorage/sessionStorage</li>
              <li>Direct access via an old or incomplete URL</li>
            </ul>

            {debugInfo && (
              <details className="bg-gray-50 rounded-lg p-3">
                <summary className="cursor-pointer text-xs font-medium text-gray-700 mb-2">
                  🔍 Technical Details (Click to expand)
                </summary>
                <pre className="text-[10px] text-gray-600 overflow-x-auto max-h-60">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </details>
            )}

            <div className="space-y-2">
              <Button
                onClick={handleRetry}
                variant="outline"
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>

              <Button
                onClick={handleStartOver}
                className="w-full bg-emerald-500 hover:bg-emerald-600"
              >
                🔄 Start Over
              </Button>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-800">
                <strong>💡 Tip:</strong> For best results, complete the event creation flow without refreshing or navigating away unnecessarily.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-cyan-50">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-white/70 backdrop-blur-xl border-b border-emerald-100/50 z-10">
        <div className="max-w-md mx-auto px-4 py-2 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="rounded-full h-8 w-8"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-base font-light text-gray-900">Event Details</h1>
        </div>

        {/* Progress Bar */}
        <div className="max-w-md mx-auto px-4 pb-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 bg-emerald-500 rounded-full"></div>
            <div className="flex-1 h-1 bg-emerald-500 rounded-full"></div>
            <div className="flex-1 h-1 bg-gray-200 rounded-full"></div>
            <div className="flex-1 h-1 bg-gray-200 rounded-full"></div>
          </div>
          <p className="text-[10px] text-gray-500 mt-1 text-center">Step 2 of 4: Event Details</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-4 pt-24 pb-32">
        <div className="text-center mb-8">
          <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📝</span>
          </div>
          <h2 className="text-2xl font-light text-gray-900 mb-2">Tell us about your event</h2>
          <p className="text-sm text-gray-600">We'll use this to find the perfect pros for you</p>
        </div>

        <div className="space-y-6">
          {/* Venue Status Indicator */}
          <div 
            className="p-4 rounded-xl border-2 flex items-center gap-3"
            style={{
              backgroundColor: venueStatusDisplay.bgColor,
              borderColor: venueStatusDisplay.borderColor
            }}
          >
            <span className="text-2xl">{venueStatusDisplay.icon}</span>
            <div>
              <p className={`text-sm font-semibold ${venueStatusDisplay.color}`}>
                {venueStatusDisplay.text}
              </p>
              <p className="text-xs text-gray-600 mt-0.5">
                {selectedCategories.length} service{selectedCategories.length !== 1 ? 's' : ''} selected
              </p>
            </div>
          </div>

          {/* Location Selection */}
          <div>
            <Label className="text-sm font-semibold text-gray-900 mb-2 block">
              <MapPin className="w-4 h-4 inline mr-1" />
              Where's your event?
            </Label>
            <div className="relative">
              <Input
                placeholder="Search city or country..."
                value={searchCity}
                onChange={(e) => {
                  setSearchCity(e.target.value);
                  setShowCityDropdown(true);
                }}
                onFocus={() => setShowCityDropdown(true)}
                className="pr-10"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              
              {showCityDropdown && filteredCities.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 max-h-60 overflow-y-auto z-20">
                  {filteredCities.map((city, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleCitySelect(city)}
                      className="w-full px-4 py-3 text-left hover:bg-emerald-50 transition-colors border-b border-gray-100 last:border-0"
                    >
                      <p className="font-medium text-gray-900">{city.city}</p>
                      <p className="text-xs text-gray-500">{city.country}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedCity && (
              <div className="mt-3 space-y-2">
                <Input
                  placeholder="Neighborhood or area (optional)"
                  value={subLocation}
                  onChange={(e) => setSubLocation(e.target.value)}
                  className="text-sm"
                />
                
                {!showAddressField ? (
                  <button
                    onClick={() => setShowAddressField(true)}
                    className="text-xs text-emerald-600 hover:underline"
                  >
                    + Add specific address
                  </button>
                ) : (
                  <Input
                    placeholder="Specific address or venue name"
                    value={specificAddress}
                    onChange={(e) => setSpecificAddress(e.target.value)}
                    className="text-sm"
                  />
                )}
              </div>
            )}
          </div>

          {/* Event Date */}
          <div>
            <Label className="text-sm font-semibold text-gray-900 mb-2 block">
              <Calendar className="w-4 h-4 inline mr-1" />
              When's your event?
            </Label>
            <Input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Guest Count */}
          <div>
            <Label className="text-sm font-semibold text-gray-900 mb-2 block">
              <Users className="w-4 h-4 inline mr-1" />
              Expected guests
            </Label>
            <div className="px-2">
              <Slider
                value={guestRange}
                onValueChange={setGuestRange}
                min={10}
                max={500}
                step={10}
                className="mb-2"
              />
              <div className="flex justify-between text-sm text-gray-600">
                <span>{guestRange[0]} guests</span>
                <span>{guestRange[1]} guests</span>
              </div>
            </div>
          </div>

          {/* Budget Range */}
          <div>
            <Label className="text-sm font-semibold text-gray-900 mb-2 block">
              <DollarSign className="w-4 h-4 inline mr-1" />
              Your budget
            </Label>
            <div className="px-2">
              <Slider
                value={budgetRange}
                onValueChange={setBudgetRange}
                min={500}
                max={50000}
                step={500}
                className="mb-2"
              />
              <div className="flex justify-between text-sm text-gray-600">
                <span>${budgetRange[0].toLocaleString()}</span>
                <span>${budgetRange[1].toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Continue Button */}
      {selectedCity && eventDate && (
        <div className="fixed right-4 z-50 pointer-events-none" style={{ bottom: 'calc(4.5rem + env(safe-area-inset-bottom, 0px))' }}>
          <Button
            onClick={handleContinue}
            className="pointer-events-auto px-6 py-3 text-sm font-bold rounded-full shadow-2xl hover:shadow-[0_0_40px_rgba(75,158,158,0.6)] transition-all flex items-center justify-center gap-2 border-2 active:scale-95 hover:scale-105"
            style={{
              background: 'rgba(255, 255, 255, 0.3)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderColor: '#1FAB89',
              color: '#155E63',
              boxShadow: '0 0 25px rgba(27, 171, 137, 0.4), 0 8px 16px rgba(0, 0, 0, 0.15)'
            }}
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
