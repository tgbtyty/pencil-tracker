import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import AddItemPage from './pages/AddItemPage';
import FurnitureListPage from './pages/FurnitureListPage';
import Navigation from './components/Navigation';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <Navigation />
        <main className="content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/furniture" element={<FurnitureListPage />} />
            <Route path="/add-item" element={<AddItemPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;