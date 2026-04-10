import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { MenuProvider } from "./context/MenuContext";
import { useAuth } from "./context/AuthContext";
import { preloadModels } from "./lib/embeddingService";
import HamburgerMenu from "./components/HamburgerMenu";
import SideNav from "./components/SideNav";
import SplashScreen from "./pages/SplashScreen";
import LoginScreen from "./pages/LoginScreen";
import RegisterScreen from "./pages/RegisterScreen";
import HomeScreen from "./pages/HomeScreen";
import MapScreen from "./pages/MapScreen";
import ChatScreen from "./pages/ChatScreen";
import ProfileScreen from "./pages/ProfileScreen";
import NotificationsScreen from "./pages/NotificationsScreen";
import FiltersScreen from "./pages/FiltersScreen";
import ReportScreen from "./pages/ReportScreen";
import PetDetailScreen from "./pages/PetDetailScreen";
import HelpCentersScreen from "./pages/HelpCentersScreen";
import HappyEndingsScreen from "./pages/HappyEndingsScreen";
import AuthCallbackScreen from "./pages/AuthCallbackScreen";
import AdoptionsScreen from "./pages/AdoptionsScreen";
import SettingsScreen from "./pages/SettingsScreen";
import EditProfileScreen from "./pages/EditProfileScreen";
import ConversationScreen from "./pages/ConversationScreen";
import MyReportsScreen from "./pages/MyReportsScreen";
import ServicesScreen from "./pages/ServicesScreen";
import StoreScreen from "./pages/StoreScreen";
import PremiumScreen from "./pages/PremiumScreen";
import AllReportsScreen from "./pages/AllReportsScreen";
import HelpScreen from "./pages/HelpScreen";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminAdoptionsScreen from "./pages/admin/AdminAdoptionsScreen";
import AdminServicesScreen from "./pages/admin/AdminServicesScreen";
import AdminStoreScreen from "./pages/admin/AdminStoreScreen";
import AdminHappyEndingsScreen from "./pages/admin/AdminHappyEndingsScreen";
import AdminHelpCentersScreen from "./pages/admin/AdminHelpCentersScreen";

function ModelPreloader() {
  const { user } = useAuth();
  useEffect(() => {
    if (user) preloadModels(); // precarga en background cuando el usuario se loguea
  }, [user]);
  return null;
}

function AppShell() {
  return (
    <div className="lg:flex lg:h-screen lg:overflow-hidden">
      <ModelPreloader />
      <SideNav />
      <HamburgerMenu />
      <main className="flex-1 min-w-0 lg:overflow-auto">
        <Routes>
          <Route path="/" element={<Navigate to="/splash" replace />} />
          <Route path="/splash" element={<SplashScreen />} />
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/register" element={<RegisterScreen />} />
          <Route path="/home" element={<HomeScreen />} />
          <Route path="/map" element={<MapScreen />} />
          <Route path="/chat" element={<ChatScreen />} />
          <Route path="/chat/:id" element={<ConversationScreen />} />
          <Route path="/profile" element={<ProfileScreen />} />
          <Route path="/notifications" element={<NotificationsScreen />} />
          <Route path="/filters" element={<FiltersScreen />} />
          <Route path="/report" element={<ReportScreen />} />
          <Route path="/pet/:id" element={<PetDetailScreen />} />
          <Route path="/centros" element={<HelpCentersScreen />} />
          <Route path="/finales" element={<HappyEndingsScreen />} />
          <Route path="/auth/callback" element={<AuthCallbackScreen />} />
          <Route path="/my-reports" element={<MyReportsScreen />} />
          <Route path="/adoptions" element={<AdoptionsScreen />} />
          <Route path="/services" element={<ServicesScreen />} />
          <Route path="/store" element={<StoreScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="/edit-profile" element={<EditProfileScreen />} />
          <Route path="/premium" element={<PremiumScreen />} />
          <Route path="/all-reports" element={<AllReportsScreen />} />
          <Route path="/help" element={<HelpScreen />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
    <MenuProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="adoptions" element={<AdminAdoptionsScreen />} />
          <Route path="services" element={<AdminServicesScreen />} />
          <Route path="store" element={<AdminStoreScreen />} />
          <Route path="happy-endings" element={<AdminHappyEndingsScreen />} />
          <Route path="help-centers" element={<AdminHelpCentersScreen />} />
        </Route>
        <Route path="*" element={<AppShell />} />
      </Routes>
    </BrowserRouter>
    </MenuProvider>
    </AuthProvider>
    </ThemeProvider>
  );
}
