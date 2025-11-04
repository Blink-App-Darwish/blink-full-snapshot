import React, { useEffect, useState } from 'react';
import MobileLogin from './MobileLogin';
import Layout from './Layout.jsx';
import Home from './Home';
import EnablerProfile from './EnablerProfile';
import Browse from './Browse';
import CreateEvent from './CreateEvent';
import MyEvents from './MyEvents';
import Wishlist from './Wishlist';
import Calendar from './Calendar';
import Messages from './Messages';
import Profile from './Profile';
import RoleSelection from './RoleSelection';
import CreateEnablerProfile from './CreateEnablerProfile';
import EventDetail from './EventDetail';
import BookingFlow from './BookingFlow';
import Settings from './Settings';
import EnablerDashboard from './EnablerDashboard';
import EnablerShop from './EnablerShop';
import EnablerBookings from './EnablerBookings';
import EnablerFinance from './EnablerFinance';
import EnablerCalendar from './EnablerCalendar';
import EnablerReviews from './EnablerReviews';
import EnablerAnalytics from './EnablerAnalytics';
import Blink from './Blink';
import ReelView from './ReelView';
import BlinkReadyEvents from './BlinkReadyEvents';
import EventBooking from './EventBooking';
import PortfolioCreator from './PortfolioCreator';
import PortfolioView from './PortfolioView';
import ReelsViewer from './ReelsViewer';
import EnablerContracts from './EnablerContracts';
import CreateContract from './CreateContract';
import ContractDetail from './ContractDetail';
import GuidedEventCreation from './GuidedEventCreation';
import BrainOrientation from './BrainOrientation';
import HostBrain from './HostBrain';
import GuidedEnablerSelection from './GuidedEnablerSelection';
import IdeaBoard from './IdeaBoard';
import TaskManager from './TaskManager';
import FinanceTracker from './FinanceTracker';
import EditEventDetails from './EditEventDetails';
import ProfileSetup from './ProfileSetup';
import DependencyAnalysis from './DependencyAnalysis';
import NegotiationSetup from './NegotiationSetup';
import StructuredNegotiate from './StructuredNegotiate';
import SmartPackageCreator from './SmartPackageCreator';
import EditEnablerProfile from './EditEnablerProfile';
import HostCalendar from './HostCalendar';
import CalendarSetupWizard from './CalendarSetupWizard';
import ReservationAdmin from './ReservationAdmin';
import ReviewSubmit from './ReviewSubmit';
import WishlistView from './WishlistView';
import DeploymentSetup from './DeploymentSetup';
import TestingSuite from './TestingSuite';
import DeveloperDocs from './DeveloperDocs';
import AdminDashboard from './AdminDashboard';
import SystemAnalysis from './SystemAnalysis';
import CalendarOAuthCallback from './CalendarOAuthCallback';
import JobsApi from './JobsApi';
import JobsDashboard from './JobsDashboard';
import NegotiationDashboard from './NegotiationDashboard';
import CalendarDiagnostics from './CalendarDiagnostics';
import AddExpense from './AddExpense';
import BugTestSuite from './BugTestSuite';
import SelectNegotiationFramework from './SelectNegotiationFramework';
import ReviewEventBooking from './ReviewEventBooking';
import EventDetailsCollection from './EventDetailsCollection';
import AccountProfile from './AccountProfile';
import PaymentsFinancials from './PaymentsFinancials';
import SupportHelp from './SupportHelp';
import RoleSelector from './RoleSelector';
import ConflictInbox from './ConflictInbox';
import EventNamingTest from './EventNamingTest';
import TestABE from './TestABE';
import EnablerWorkflowView from './EnablerWorkflowView';
import HostPreparationView from './HostPreparationView';
import LiveEventView from './LiveEventView';
import PostEventView from './PostEventView';
import PerformanceAnalyticsView from './PerformanceAnalyticsView';
import ProductionReadiness from './ProductionReadiness';
import { base44 } from '@/api/base44Client';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import BrainTest from './BrainTest';
import { isMobileApp, initializeAuth } from '@/utils/auth';

function App() {
  const [authState, setAuthState] = useState('loading');
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      const result = await initializeAuth();

      if (result.authenticated) {
        setUser(result.user);
        setAuthState('authenticated');
      } else if (result.requiresInAppAuth) {
        setAuthState('mobile_login');
      } else {
        base44.auth.redirectToLogin(window.location.pathname);
      }
    };

    checkAuth();
  }, []);

  if (authState === 'loading') {
    return <LoadingScreen />;
  }

  if (authState === 'mobile_login') {
    return (
      <MobileLogin
        onSuccess={(user) => {
          setUser(user);
          setAuthState('authenticated');
        }}
      />
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>{/* Your existing routes */}</Routes>
      </Router>
    </QueryClientProvider>
  );
}

// CRITICAL: Set mobile flag BEFORE any components load
const isMobile =
  typeof navigator !== 'undefined' &&
  /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const isCapacitor =
  typeof window !== 'undefined' && window.location.protocol === 'capacitor:';
const isMobileDevice = isMobile || isCapacitor;

console.log('🚀 Pages Entry Point:', { isMobile, isCapacitor, isMobileDevice });

// Set global flag to prevent auth calls
if (isMobileDevice && typeof window !== 'undefined') {
  window.BLINK_MOBILE_MODE = true;
  console.log('✅ Set BLINK_MOBILE_MODE = true');
}

export default function Pages() {
  const mobileMode =
    typeof window !== 'undefined' && window.BLINK_MOBILE_MODE === true;
  const [mobileAuthState, setMobileAuthState] = useState('checking');
  const [currentUser, setCurrentUser] = useState(null);

  console.log('📱 Pages Component - Auth State:', {});

  // DEBUG: Log route setup
  useEffect(() => {
    console.log('🔧 ========================================');
    console.log('🔧 ROUTES DEBUG: Setting up routes...');
    console.log('🔧 Brain routes imported directly (not lazy)');
    console.log('🔧 BrainOrientation:', typeof BrainOrientation);
    console.log('🔧 HostBrain:', typeof HostBrain);
    console.log('🔧 BrainTest:', typeof BrainTest);
    console.log('🔧 ========================================');
  }, []);

  console.log('📱 CONTINUE:', {
    mobileMode,
    mobileAuthState,
  });

  // Initialize native services when app mounts
  useEffect(() => {
    console.log('🔗 App mounted - initializing services...');

    if (mobileMode) {
      import('../services/NativeServices')
        .then((module) => {
          console.log('✅ NativeServices module loaded');
          module.initializeNativeServices();
        })
        .catch((error) => {
          console.error('❌ Error loading NativeServices:', error);
        });

      checkMobileAuthState();
    }
  }, [mobileMode]);

  const checkMobileAuthState = async () => {
    try {
      console.log('🔍 Checking mobile auth state...');
      const token = localStorage.getItem('auth_token');

      if (!token) {
        console.log('❌ No auth token - show login');
        setMobileAuthState('login');
        return;
      }

      console.log('✅ Token found, checking user...');
      const user = await base44.auth.me();
      console.log('👤 Current user:', user);
      setCurrentUser(user);

      if (!user.user_type) {
        console.log('🔄 No user_type - show role selection');
        setMobileAuthState('role_selection');
      } else if (!user.profile_completed) {
        console.log('🔄 Profile not completed - show profile setup');
        setMobileAuthState('profile_setup');
      } else {
        console.log('✅ Fully authenticated - show main app');
        setMobileAuthState('authenticated');
      }
    } catch (error) {
      console.error('❌ Error checking auth state:', error);
      setMobileAuthState('login');
    }
  };

  // MOBILE: Always wrap in Router
  if (mobileMode) {
    console.log('📱 MOBILE MODE - Rendering auth state:', mobileAuthState);

    return (
      <Router>
        <Routes>
          {/* Checking auth state - show loading */}
          {mobileAuthState === 'checking' && (
            <Route
              path="*"
              element={
                <div className="min-h-screen bg-white flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center animate-pulse">
                      <div className="w-3 h-3 rounded-full bg-white"></div>
                    </div>
                    <p className="text-sm text-gray-500">Loading...</p>
                  </div>
                </div>
              }
            />
          )}

          {/* Login needed */}
          {mobileAuthState === 'login' && (
            <Route path="*" element={<MobileLogin />} />
          )}

          {/* Role selection needed */}
          {mobileAuthState === 'role_selection' && (
            <Route path="*" element={<RoleSelection />} />
          )}

          {/* Profile setup needed */}
          {mobileAuthState === 'profile_setup' && (
            <Route path="*" element={<ProfileSetup />} />
          )}

          {/* Authenticated - show main app with Layout - ALL ROUTES FOR MOBILE */}
          {mobileAuthState === 'authenticated' && (
            <>
              <Route
                path="/"
                element={
                  <Layout>
                    <Home />
                  </Layout>
                }
              />
              <Route
                path="/home"
                element={
                  <Layout>
                    <Home />
                  </Layout>
                }
              />
              <Route
                path="/profile"
                element={
                  <Layout>
                    <Profile />
                  </Layout>
                }
              />
              <Route
                path="/settings"
                element={
                  <Layout>
                    <Settings />
                  </Layout>
                }
              />
              <Route
                path="/myevents"
                element={
                  <Layout>
                    <MyEvents />
                  </Layout>
                }
              />
              <Route
                path="/blink"
                element={
                  <Layout>
                    <Blink />
                  </Layout>
                }
              />
              <Route
                path="/browse"
                element={
                  <Layout>
                    <Browse />
                  </Layout>
                }
              />
              <Route
                path="/createevent"
                element={
                  <Layout>
                    <CreateEvent />
                  </Layout>
                }
              />
              <Route
                path="/eventdetail"
                element={
                  <Layout>
                    <EventDetail />
                  </Layout>
                }
              />
              <Route
                path="/enablerdashboard"
                element={
                  <Layout>
                    <EnablerDashboard />
                  </Layout>
                }
              />
              <Route
                path="/enablershop"
                element={
                  <Layout>
                    <EnablerShop />
                  </Layout>
                }
              />
              <Route
                path="/brainorientation"
                element={
                  <Layout>
                    <BrainOrientation />
                  </Layout>
                }
              />
              <Route
                path="/hostbrain"
                element={
                  <Layout>
                    <HostBrain />
                  </Layout>
                }
              />
              <Route
                path="/enablerprofile"
                element={
                  <Layout>
                    <EnablerProfile />
                  </Layout>
                }
              />
              <Route
                path="/guidedeventcreation"
                element={
                  <Layout>
                    <GuidedEventCreation />
                  </Layout>
                }
              />
              <Route
                path="/guidedenablerselection"
                element={
                  <Layout>
                    <GuidedEnablerSelection />
                  </Layout>
                }
              />
              <Route
                path="/eventdetailscollection"
                element={
                  <Layout>
                    <EventDetailsCollection />
                  </Layout>
                }
              />
              <Route
                path="/wishlist"
                element={
                  <Layout>
                    <Wishlist />
                  </Layout>
                }
              />
              <Route
                path="/calendar"
                element={
                  <Layout>
                    <Calendar />
                  </Layout>
                }
              />
              <Route
                path="/messages"
                element={
                  <Layout>
                    <Messages />
                  </Layout>
                }
              />
              <Route
                path="/roleselection"
                element={
                  <Layout>
                    <RoleSelection />
                  </Layout>
                }
              />
              <Route
                path="/createenablerprofile"
                element={
                  <Layout>
                    <CreateEnablerProfile />
                  </Layout>
                }
              />
              <Route
                path="/bookingflow"
                element={
                  <Layout>
                    <BookingFlow />
                  </Layout>
                }
              />
              <Route
                path="/enablerbookings"
                element={
                  <Layout>
                    <EnablerBookings />
                  </Layout>
                }
              />
              <Route
                path="/enablerfinance"
                element={
                  <Layout>
                    <EnablerFinance />
                  </Layout>
                }
              />
              <Route
                path="/enablercalendar"
                element={
                  <Layout>
                    <EnablerCalendar />
                  </Layout>
                }
              />
              <Route
                path="/enablerreviews"
                element={
                  <Layout>
                    <EnablerReviews />
                  </Layout>
                }
              />
              <Route
                path="/enableranalytics"
                element={
                  <Layout>
                    <EnablerAnalytics />
                  </Layout>
                }
              />
              <Route
                path="/reelview"
                element={
                  <Layout>
                    <ReelView />
                  </Layout>
                }
              />
              <Route
                path="/blinkreadyevents"
                element={
                  <Layout>
                    <BlinkReadyEvents />
                  </Layout>
                }
              />
              <Route
                path="/eventbooking"
                element={
                  <Layout>
                    <EventBooking />
                  </Layout>
                }
              />
              <Route
                path="/portfoliocreator"
                element={
                  <Layout>
                    <PortfolioCreator />
                  </Layout>
                }
              />
              <Route
                path="/portfolioview"
                element={
                  <Layout>
                    <PortfolioView />
                  </Layout>
                }
              />
              <Route
                path="/reelsviewer"
                element={
                  <Layout>
                    <ReelsViewer />
                  </Layout>
                }
              />
              <Route
                path="/enablercontracts"
                element={
                  <Layout>
                    <EnablerContracts />
                  </Layout>
                }
              />
              <Route
                path="/createcontract"
                element={
                  <Layout>
                    <CreateContract />
                  </Layout>
                }
              />
              <Route
                path="/contractdetail"
                element={
                  <Layout>
                    <ContractDetail />
                  </Layout>
                }
              />
              <Route
                path="/ideaboard"
                element={
                  <Layout>
                    <IdeaBoard />
                  </Layout>
                }
              />
              <Route
                path="/taskmanager"
                element={
                  <Layout>
                    <TaskManager />
                  </Layout>
                }
              />
              <Route
                path="/financetracker"
                element={
                  <Layout>
                    <FinanceTracker />
                  </Layout>
                }
              />
              <Route
                path="/editeventdetails"
                element={
                  <Layout>
                    <EditEventDetails />
                  </Layout>
                }
              />
              <Route
                path="/dependencyanalysis"
                element={
                  <Layout>
                    <DependencyAnalysis />
                  </Layout>
                }
              />
              <Route
                path="/negotiationsetup"
                element={
                  <Layout>
                    <NegotiationSetup />
                  </Layout>
                }
              />
              <Route
                path="/structurednegotiate"
                element={
                  <Layout>
                    <StructuredNegotiate />
                  </Layout>
                }
              />
              <Route
                path="/smartpackagecreator"
                element={
                  <Layout>
                    <SmartPackageCreator />
                  </Layout>
                }
              />
              <Route
                path="/editenablerprofile"
                element={
                  <Layout>
                    <EditEnablerProfile />
                  </Layout>
                }
              />
              <Route
                path="/hostcalendar"
                element={
                  <Layout>
                    <HostCalendar />
                  </Layout>
                }
              />
              <Route
                path="/calendarsetupwizard"
                element={
                  <Layout>
                    <CalendarSetupWizard />
                  </Layout>
                }
              />
              <Route
                path="/reservationadmin"
                element={
                  <Layout>
                    <ReservationAdmin />
                  </Layout>
                }
              />
              <Route
                path="/reviewsubmit"
                element={
                  <Layout>
                    <ReviewSubmit />
                  </Layout>
                }
              />
              <Route
                path="/wishlistview"
                element={
                  <Layout>
                    <WishlistView />
                  </Layout>
                }
              />
              <Route
                path="/deploymentsetup"
                element={
                  <Layout>
                    <DeploymentSetup />
                  </Layout>
                }
              />
              <Route
                path="/testingsuite"
                element={
                  <Layout>
                    <TestingSuite />
                  </Layout>
                }
              />
              <Route
                path="/developerdocs"
                element={
                  <Layout>
                    <DeveloperDocs />
                  </Layout>
                }
              />
              <Route
                path="/admindashboard"
                element={
                  <Layout>
                    <AdminDashboard />
                  </Layout>
                }
              />
              <Route
                path="/systemanalysis"
                element={
                  <Layout>
                    <SystemAnalysis />
                  </Layout>
                }
              />
              <Route
                path="/calendaroauthcallback"
                element={
                  <Layout>
                    <CalendarOAuthCallback />
                  </Layout>
                }
              />
              <Route
                path="/jobsapi"
                element={
                  <Layout>
                    <JobsApi />
                  </Layout>
                }
              />
              <Route
                path="/jobsdashboard"
                element={
                  <Layout>
                    <JobsDashboard />
                  </Layout>
                }
              />
              <Route
                path="/negotiationdashboard"
                element={
                  <Layout>
                    <NegotiationDashboard />
                  </Layout>
                }
              />
              <Route
                path="/calendardiagnostics"
                element={
                  <Layout>
                    <CalendarDiagnostics />
                  </Layout>
                }
              />
              <Route
                path="/addexpense"
                element={
                  <Layout>
                    <AddExpense />
                  </Layout>
                }
              />
              <Route
                path="/bugtestsuite"
                element={
                  <Layout>
                    <BugTestSuite />
                  </Layout>
                }
              />
              <Route
                path="/selectnegotiationframework"
                element={
                  <Layout>
                    <SelectNegotiationFramework />
                  </Layout>
                }
              />
              <Route
                path="/revieweventbooking"
                element={
                  <Layout>
                    <ReviewEventBooking />
                  </Layout>
                }
              />
              <Route
                path="/accountprofile"
                element={
                  <Layout>
                    <AccountProfile />
                  </Layout>
                }
              />
              <Route
                path="/paymentsfinancials"
                element={
                  <Layout>
                    <PaymentsFinancials />
                  </Layout>
                }
              />
              <Route
                path="/supporthelp"
                element={
                  <Layout>
                    <SupportHelp />
                  </Layout>
                }
              />
              <Route
                path="/roleselector"
                element={
                  <Layout>
                    <RoleSelector />
                  </Layout>
                }
              />
              <Route
                path="/conflictinbox"
                element={
                  <Layout>
                    <ConflictInbox />
                  </Layout>
                }
              />
              <Route
                path="/eventnamingtest"
                element={
                  <Layout>
                    <EventNamingTest />
                  </Layout>
                }
              />
              <Route
                path="/testabe"
                element={
                  <Layout>
                    <TestABE />
                  </Layout>
                }
              />
              <Route
                path="/enablerworkflowview"
                element={
                  <Layout>
                    <EnablerWorkflowView />
                  </Layout>
                }
              />
              <Route
                path="/hostpreparationview"
                element={
                  <Layout>
                    <HostPreparationView />
                  </Layout>
                }
              />
              <Route
                path="/liveeventview"
                element={
                  <Layout>
                    <LiveEventView />
                  </Layout>
                }
              />
              <Route
                path="/posteventview"
                element={
                  <Layout>
                    <PostEventView />
                  </Layout>
                }
              />
              <Route
                path="/performanceanalyticsview"
                element={
                  <Layout>
                    <PerformanceAnalyticsView />
                  </Layout>
                }
              />
              <Route
                path="/productionreadiness"
                element={
                  <Layout>
                    <ProductionReadiness />
                  </Layout>
                }
              />
              <Route
                path="/braintest"
                element={
                  <Layout>
                    <BrainTest />
                  </Layout>
                }
              />
              <Route path="/mobilelogin" element={<MobileLogin />} />
              <Route path="/MobileLogin" element={<MobileLogin />} />
            </>
          )}
        </Routes>
      </Router>
    );
  }

  // DESKTOP: Full app
  console.log('💻 DESKTOP - Loading full app with Router');

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/mobilelogin" element={<MobileLogin />} />
          <Route path="/MobileLogin" element={<MobileLogin />} />
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Home />} />
          <Route path="/braintest" element={<BrainTest />} />
          <Route path="/brainorientation" element={<BrainOrientation />} />
          <Route path="/hostbrain" element={<HostBrain />} />
          <Route path="/enablerprofile" element={<EnablerProfile />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/createevent" element={<CreateEvent />} />
          <Route path="/myevents" element={<MyEvents />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/roleselection" element={<RoleSelection />} />
          <Route
            path="/createenablerprofile"
            element={<CreateEnablerProfile />}
          />
          <Route path="/eventdetail" element={<EventDetail />} />
          <Route path="/bookingflow" element={<BookingFlow />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/enablerdashboard" element={<EnablerDashboard />} />
          <Route path="/enablershop" element={<EnablerShop />} />
          <Route path="/enablerbookings" element={<EnablerBookings />} />
          <Route path="/enablerfinance" element={<EnablerFinance />} />
          <Route path="/enablercalendar" element={<EnablerCalendar />} />
          <Route path="/enablerreviews" element={<EnablerReviews />} />
          <Route path="/enableranalytics" element={<EnablerAnalytics />} />
          <Route path="/blink" element={<Blink />} />
          <Route path="/reelview" element={<ReelView />} />
          <Route path="/blinkreadyevents" element={<BlinkReadyEvents />} />
          <Route path="/eventbooking" element={<EventBooking />} />
          <Route path="/portfoliocreator" element={<PortfolioCreator />} />
          <Route path="/portfolioview" element={<PortfolioView />} />
          <Route path="/reelsviewer" element={<ReelsViewer />} />
          <Route path="/enablercontracts" element={<EnablerContracts />} />
          <Route path="/createcontract" element={<CreateContract />} />
          <Route path="/contractdetail" element={<ContractDetail />} />
          <Route
            path="/guidedeventcreation"
            element={<GuidedEventCreation />}
          />
          <Route
            path="/guidedenablerselection"
            element={<GuidedEnablerSelection />}
          />
          <Route path="/ideaboard" element={<IdeaBoard />} />
          <Route path="/taskmanager" element={<TaskManager />} />
          <Route path="/financetracker" element={<FinanceTracker />} />
          <Route path="/editeventdetails" element={<EditEventDetails />} />
          <Route path="/profilesetup" element={<ProfileSetup />} />
          <Route path="/dependencyanalysis" element={<DependencyAnalysis />} />
          <Route path="/negotiationsetup" element={<NegotiationSetup />} />
          <Route
            path="/structurednegotiate"
            element={<StructuredNegotiate />}
          />
          <Route
            path="/smartpackagecreator"
            element={<SmartPackageCreator />}
          />
          <Route path="/editenablerprofile" element={<EditEnablerProfile />} />
          <Route path="/hostcalendar" element={<HostCalendar />} />
          <Route
            path="/calendarsetupwizard"
            element={<CalendarSetupWizard />}
          />
          <Route path="/reservationadmin" element={<ReservationAdmin />} />
          <Route path="/reviewsubmit" element={<ReviewSubmit />} />
          <Route path="/wishlistview" element={<WishlistView />} />
          <Route path="/deploymentsetup" element={<DeploymentSetup />} />
          <Route path="/testingsuite" element={<TestingSuite />} />
          <Route path="/developerdocs" element={<DeveloperDocs />} />
          <Route path="/admindashboard" element={<AdminDashboard />} />
          <Route path="/systemanalysis" element={<SystemAnalysis />} />
          <Route
            path="/calendaroauthcallback"
            element={<CalendarOAuthCallback />}
          />
          <Route path="/jobsapi" element={<JobsApi />} />
          <Route path="/jobsdashboard" element={<JobsDashboard />} />
          <Route
            path="/negotiationdashboard"
            element={<NegotiationDashboard />}
          />
          <Route
            path="/calendardiagnostics"
            element={<CalendarDiagnostics />}
          />
          <Route path="/addexpense" element={<AddExpense />} />
          <Route path="/bugtestsuite" element={<BugTestSuite />} />
          <Route
            path="/selectnegotiationframework"
            element={<SelectNegotiationFramework />}
          />
          <Route path="/revieweventbooking" element={<ReviewEventBooking />} />
          <Route
            path="/eventdetailscollection"
            element={<EventDetailsCollection />}
          />
          <Route path="/accountprofile" element={<AccountProfile />} />
          <Route path="/paymentsfinancials" element={<PaymentsFinancials />} />
          <Route path="/supporthelp" element={<SupportHelp />} />
          <Route path="/roleselector" element={<RoleSelector />} />
          <Route path="/conflictinbox" element={<ConflictInbox />} />
          <Route path="/eventnamingtest" element={<EventNamingTest />} />
          <Route path="/testabe" element={<TestABE />} />
          <Route
            path="/enablerworkflowview"
            element={<EnablerWorkflowView />}
          />
          <Route
            path="/hostpreparationview"
            element={<HostPreparationView />}
          />
          <Route path="/liveeventview" element={<LiveEventView />} />
          <Route path="/posteventview" element={<PostEventView />} />
          <Route
            path="/performanceanalyticsview"
            element={<PerformanceAnalyticsView />}
          />
          <Route
            path="/productionreadiness"
            element={<ProductionReadiness />}
          />
        </Routes>
      </Layout>
    </Router>
  );
}
