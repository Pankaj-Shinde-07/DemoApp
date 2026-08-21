import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Register   from './pages/Register';
import Login      from './pages/Login';
import Profile    from './pages/Profile';
import Products   from './pages/Products';
import Orders     from './pages/Orders';
import Consents   from './pages/Consents';
import Deletion   from './pages/Deletion';
import AdminLogin    from './pages/AdminLogin';
import AdminPanel    from './pages/AdminPanel';
import PrivacyPolicy from './pages/PrivacyPolicy';
import PrivacyRights from './pages/PrivacyRights';
import PrivacyBanner from './components/PrivacyBanner';
import './App.css';

function ProtectedRoute({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" />;
}

function AdminRoute({ children }) {
  const adminToken = localStorage.getItem('demoapp_admin_token');
  return adminToken ? children : <Navigate to="/admin/login" />;
}

function Navbar() {
  const { user, logout } = useAuth();
  return (
    <nav className="navbar">
      <span className="navbar-brand">🛡️ DemoApp</span>
      {user ? (
        <div className="navbar-links">
          <Link to="/profile">Profile</Link>
          <Link to="/products">Products</Link>
          <Link to="/orders">Orders</Link>
          <Link to="/consents">Consents</Link>
          <Link to="/privacy-rights">My Rights</Link>
          <Link to="/privacy-policy" style={{ opacity: 0.85 }}>Privacy Notice</Link>
          <button onClick={logout} className="btn-logout">Logout</button>
        </div>
      ) : (
        <div className="navbar-links">
          <Link to="/login">Login</Link>
          <Link to="/register">Register</Link>
          <Link to="/privacy-policy" style={{ opacity: 0.85 }}>Privacy Notice</Link>
        </div>
      )}
    </nav>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Navbar />
        <PrivacyBanner />
        <div className="main-content">
          <Routes>
            <Route path="/register"    element={<Register />} />
            <Route path="/login"       element={<Login />} />
            <Route path="/profile"     element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/products"    element={<ProtectedRoute><Products /></ProtectedRoute>} />
            <Route path="/orders"      element={<ProtectedRoute><Orders /></ProtectedRoute>} />
            <Route path="/consents"    element={<ProtectedRoute><Consents /></ProtectedRoute>} />
            <Route path="/deletion"        element={<ProtectedRoute><Deletion /></ProtectedRoute>} />
            <Route path="/privacy-rights"  element={<ProtectedRoute><PrivacyRights /></ProtectedRoute>} />
            <Route path="/admin/login"     element={<AdminLogin />} />
            <Route path="/admin"           element={<AdminRoute><AdminPanel /></AdminRoute>} />
            <Route path="/privacy-policy"  element={<PrivacyPolicy />} />
            <Route path="*"                element={<Navigate to="/login" />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
