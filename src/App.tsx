import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './lib/auth';
import { CartProvider } from './lib/cart';
import { ToastProvider } from './components/Toast';
import { AdminAuthProvider } from './lib/adminAuth';

import Header from './components/Header';
import Footer from './components/Footer';
import WhatsAppButton from './components/WhatsAppButton';

import Home from './pages/Home';
import Menu from './pages/Menu';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Login from './pages/Login';
import Account from './pages/Account';
import Orders from './pages/Orders';
import Addresses from './pages/Addresses';
import Wishlist from './pages/Wishlist';
import WalletPage from './pages/Wallet';
import LoyaltyPage from './pages/Loyalty';
import SpinWin from './pages/SpinWin';
import ForgotPassword from './pages/ForgotPassword';

import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProducts from './pages/admin/AdminProducts';
import AdminCategories from './pages/admin/AdminCategories';
import AdminOrders from './pages/admin/AdminOrders';
import AdminReviews from './pages/admin/AdminReviews';
import AdminCustomers from './pages/admin/AdminCustomers';
import AdminBanners from './pages/admin/AdminBanners';
import AdminDeliveryAreas from './pages/admin/AdminDeliveryAreas';
import AdminCoupons from './pages/admin/AdminCoupons';
import AdminSettings from './pages/admin/AdminSettings';
import AdminEmployees from './pages/admin/AdminEmployees';
import AdminInventory from './pages/admin/AdminInventory';
import AdminSuppliers from './pages/admin/AdminSuppliers';
import AdminReports from './pages/admin/AdminReports';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminFlashDeals from './pages/admin/AdminFlashDeals';
import AdminHappyHour from './pages/admin/AdminHappyHour';
import AdminSpinWin from './pages/admin/AdminSpinWin';
import AdminCalendar from './pages/admin/AdminCalendar';
import { useAdminAuth } from './lib/adminAuth';

function ScrollToTop() {
  const loc = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [loc.pathname]);
  return null;
}

function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { customer, loading } = useAuth();
  const loc = useLocation();
  if (loading) return null;
  return customer ? <>{children}</> : <Navigate to={`/login?redirect=${encodeURIComponent(loc.pathname + loc.search)}`} />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { admin, loading } = useAdminAuth();
  if (loading) return null;
  return admin ? <>{children}</> : <Navigate to="/admin/login" />;
}

function AppRoutes() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Storefront */}
        <Route path="/" element={<StoreLayout><Home /></StoreLayout>} />
        <Route path="/menu" element={<StoreLayout><Menu /></StoreLayout>} />
        <Route path="/product/:id" element={<StoreLayout><ProductDetail /></StoreLayout>} />
        <Route path="/cart" element={<StoreLayout><Cart /></StoreLayout>} />
        <Route path="/checkout" element={<StoreLayout><Checkout /></StoreLayout>} />
        <Route path="/login" element={<StoreLayout><Login /></StoreLayout>} />
        <Route path="/account" element={<StoreLayout><PrivateRoute><Account /></PrivateRoute></StoreLayout>} />
        <Route path="/orders" element={<StoreLayout><PrivateRoute><Orders /></PrivateRoute></StoreLayout>} />
        <Route path="/orders/:id" element={<StoreLayout><PrivateRoute><Orders /></PrivateRoute></StoreLayout>} />
        <Route path="/addresses" element={<StoreLayout><PrivateRoute><Addresses /></PrivateRoute></StoreLayout>} />
        <Route path="/wishlist" element={<StoreLayout><PrivateRoute><Wishlist /></PrivateRoute></StoreLayout>} />
        <Route path="/wallet" element={<StoreLayout><PrivateRoute><WalletPage /></PrivateRoute></StoreLayout>} />
        <Route path="/loyalty" element={<StoreLayout><PrivateRoute><LoyaltyPage /></PrivateRoute></StoreLayout>} />
        <Route path="/spin-win" element={<StoreLayout><SpinWin /></StoreLayout>} />
        <Route path="/forgot-password" element={<StoreLayout><ForgotPassword /></StoreLayout>} />

        {/* Admin */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/products" element={<AdminRoute><AdminProducts /></AdminRoute>} />
        <Route path="/admin/categories" element={<AdminRoute><AdminCategories /></AdminRoute>} />
        <Route path="/admin/orders" element={<AdminRoute><AdminOrders /></AdminRoute>} />
        <Route path="/admin/reviews" element={<AdminRoute><AdminReviews /></AdminRoute>} />
        <Route path="/admin/customers" element={<AdminRoute><AdminCustomers /></AdminRoute>} />
        <Route path="/admin/banners" element={<AdminRoute><AdminBanners /></AdminRoute>} />
        <Route path="/admin/delivery-areas" element={<AdminRoute><AdminDeliveryAreas /></AdminRoute>} />
        <Route path="/admin/coupons" element={<AdminRoute><AdminCoupons /></AdminRoute>} />
        <Route path="/admin/settings" element={<AdminRoute><AdminSettings /></AdminRoute>} />
        <Route path="/admin/employees" element={<AdminRoute><AdminEmployees /></AdminRoute>} />
        <Route path="/admin/inventory" element={<AdminRoute><AdminInventory /></AdminRoute>} />
        <Route path="/admin/suppliers" element={<AdminRoute><AdminSuppliers /></AdminRoute>} />
        <Route path="/admin/reports" element={<AdminRoute><AdminReports /></AdminRoute>} />
        <Route path="/admin/analytics" element={<AdminRoute><AdminAnalytics /></AdminRoute>} />
        <Route path="/admin/flash-deals" element={<AdminRoute><AdminFlashDeals /></AdminRoute>} />
        <Route path="/admin/happy-hour" element={<AdminRoute><AdminHappyHour /></AdminRoute>} />
        <Route path="/admin/spin-win" element={<AdminRoute><AdminSpinWin /></AdminRoute>} />
        <Route path="/admin/calendar" element={<AdminRoute><AdminCalendar /></AdminRoute>} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <CartProvider>
          <AdminAuthProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </AdminAuthProvider>
        </CartProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
