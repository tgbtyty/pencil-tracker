import { Link, useNavigate } from 'react-router-dom';
import './Navigation.css';

function Navigation() {
  const navigate = useNavigate();
  
  // Check if user is logged in
  const isLoggedIn = localStorage.getItem('token') !== null;
  const userData = isLoggedIn ? JSON.parse(localStorage.getItem('user')) : null;
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <nav className="navigation">
      <div className="nav-brand">Furniture Tracking System</div>
      
      {isLoggedIn ? (
        <>
          <ul className="nav-links">
            <li>
              <Link to="/">Home</Link>
            </li>
            <li>
              <Link to="/furniture">Inventory</Link>
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