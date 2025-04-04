import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import FurnitureListPage from './pages/FurnitureListPage';
import RetiredItemsPage from './pages/RetiredItemsPage';
import AddItemPage from './pages/AddItemPage';
import Navigation from './components/Navigation';
import './App.css';

function App() {
  const isAuthenticated = () => {
    return localStorage.getItem('token') !== null;
  };
  
  // Force a refresh when the component mounts to apply authentication
  useEffect(() => {
    const checkAuth = () => {
      const isAuth = isAuthenticated();
      console.log("Authentication check:", isAuth);
    };
    
    checkAuth();
  }, []);

  return (
    <Router>
      <div className="app">
        <Navigation />
        <main className="content">
          <Routes>
            <Route path="/login" element={
              isAuthenticated() ? <Navigate to="/furniture" /> : <LoginPage />
            } />
            
            <Route path="/furniture" element={
              isAuthenticated() ? <FurnitureListPage /> : <Navigate to="/login" />
            } />
            
            <Route path="/furniture/retired" element={
              isAuthenticated() ? <RetiredItemsPage /> : <Navigate to="/login" />
            } />
            
            <Route path="/add-item" element={
              isAuthenticated() ? <AddItemPage /> : <Navigate to="/login" />
            } />
            
            <Route path="/" element={
  isAuthenticated() ? <HomePage /> : <Navigate to="/login" />
} />
            
            <Route path="*" element={<Navigate to={isAuthenticated() ? "/furniture" : "/login"} />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;