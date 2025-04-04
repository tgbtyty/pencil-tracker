import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import FurnitureListPage from './pages/FurnitureListPage';
import RetiredItemsPage from './pages/RetiredItemsPage';
import AddItemPage from './pages/AddItemPage';
import Navigation from './components/Navigation';
import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="app">
          <Navigation />
          <main className="content">
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              
              <Route path="/" element={
                <ProtectedRoute>
                  <HomePage />
                </ProtectedRoute>
              } />
              
              <Route path="/furniture" element={
                <ProtectedRoute>
                  <FurnitureListPage />
                </ProtectedRoute>
              } />
              
              <Route path="/furniture/retired" element={
                <ProtectedRoute>
                  <RetiredItemsPage />
                </ProtectedRoute>
              } />
              
              <Route path="/add-item" element={
                <ProtectedRoute>
                  <AddItemPage />
                </ProtectedRoute>
              } />
              
              {/* Redirect any unknown paths to home */}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;