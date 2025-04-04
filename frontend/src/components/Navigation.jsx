import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Navigation.css';

function Navigation() {
  const { user, logout } = useAuth();

  return (
    <nav className="navigation">
      <div className="nav-brand">Furniture Tracking System</div>
      
      {user ? (
        <>
          <ul className="nav-links">
            <li>
              <Link to="/">Home</Link>
            </li>
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
            <span className="user-email">{user.email}</span>
            <button onClick={logout} className="logout-btn">Logout</button>
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