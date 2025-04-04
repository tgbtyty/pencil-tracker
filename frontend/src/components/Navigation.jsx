import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import './Navigation.css';

function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  
  // Check auth status whenever location changes
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    setIsLoggedIn(token !== null);
    setUserData(user ? JSON.parse(user) : null);
    
    // Redirect to login if not authenticated
    if (!token && location.pathname !== '/login') {
      navigate('/login');
    }
  }, [location, navigate]);
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setUserData(null);
    navigate('/login');
  };

  return (
    <nav className="navigation">
      <div className="nav-brand">Furniture Tracking System</div>
      
      {isLoggedIn ? (
        <>
          <ul className="nav-links">
            <li>
              <Link to="/furniture">Inventory</Link>
            </li>
            <li>
              <Link to="/furniture/retired">Retired Items</Link>
            </li>
            <li>
              <Link to="/add-item">Add New Item</Link>
            </li>
          </ul>
          
          <div className="nav-user">
            <span className="user-email">{userData?.email}</span>
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </div>
        </>
      ) : (
        <ul className="nav-links">
          <li>
            <Link to="/login">Login</Link>
          </li>
        </ul>
      )}
    </nav>
  );
}

export default Navigation;