import { BrowserRouter, Routes, Route, Navigate, NavLink, Link } from 'react-router-dom';
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
      <Link to="/" className="navbar-brand">
        <div className="navbar-brand-logo" style={{fontWeight:"bold",fontSize:"1.1rem"}}>DP</div>
        <span>DemoApp</span>
        <span className="navbar-brand-badge">DPDPA Target</span>
      </Link>
      {user ? (
        <div className="navbar-links">
          <NavLink to="/profile" className={({ isActive }) => isActive ? 'active' : ''}>Profile</NavLink>
          <NavLink to="/products" className={({ isActive }) => isActive ? 'active' : ''}>Products</NavLink>
          <NavLink to="/orders" className={({ isActive }) => isActive ? 'active' : ''}>Orders</NavLink>
          <NavLink to="/consents" className={({ isActive }) => isActive ? 'active' : ''}>Consents</NavLink>
          <NavLink to="/privacy-rights" className={({ isActive }) => isActive ? 'active' : ''}>My Rights</NavLink>
          <NavLink to="/privacy-policy" className={({ isActive }) => isActive ? 'active' : ''}>Privacy Notice</NavLink>
          <button onClick={logout} className="btn-logout">Logout</button>
        </div>
      ) : (
        <div className="navbar-links">
          <NavLink to="/login" className={({ isActive }) => isActive ? 'active' : ''}>Login</NavLink>
          <NavLink to="/register" className={({ isActive }) => isActive ? 'active' : ''}>Register</NavLink>
          <NavLink to="/privacy-policy" className={({ isActive }) => isActive ? 'active' : ''}>Privacy Notice</NavLink>
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
