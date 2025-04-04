import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import FurnitureListPage from './pages/FurnitureListPage';
import AddItemPage from './pages/AddItemPage';
import Navigation from './components/Navigation';
import './App.css';

function App() {
  // Simple check for authentication
  const isAuthenticated = () => {
    return localStorage.getItem('token') !== null;
  };

  return (
    <Router>
      <div className="app">
        <Navigation />
        <main className="content">
          <Routes>
            {/* Public route */}
            <Route path="/login" element={
              isAuthenticated() ? <Navigate to="/" /> : <LoginPage />
            } />
            
            {/* Protected routes */}
            <Route path="/" element={
              isAuthenticated() ? <HomePage /> : <Navigate to="/login" />
            } />
            
            <Route path="/furniture" element={
              isAuthenticated() ? <FurnitureListPage /> : <Navigate to="/login" />
            } />
            
            <Route path="/add-item" element={
              isAuthenticated() ? <AddItemPage /> : <Navigate to="/login" />
            } />
            
            {/* Redirect unknown routes to home */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;