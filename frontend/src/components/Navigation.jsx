import { Link } from 'react-router-dom';
import './Navigation.css';

function Navigation() {
  return (
    <nav className="navigation">
      <div className="nav-brand">Furniture Tracking System</div>
      <ul className="nav-links">
        <li>
          <Link to="/">Home</Link>
        </li>
        <li>
          <Link to="/add-item">Add New Item</Link>
        </li>
      </ul>
    </nav>
  );
}

export default Navigation;