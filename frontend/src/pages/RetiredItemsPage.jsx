// src/pages/RetiredItemsPage.jsx
import { useState, useEffect } from 'react';
import './RetiredItemsPage.css';

function RetiredItemsPage() {
  const [retiredItems, setRetiredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRetiredItems();
  }, []);

  const fetchRetiredItems = async () => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }
      
      const response = await fetch('/api/furniture/retired', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch retired items');
      }
      
      const data = await response.json();
      setRetiredItems(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching retired items:', err);
      setError('Failed to load retired items. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handlePermanentDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this item? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }
      
      const response = await fetch(`/api/furniture/permanent-delete/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete item');
      }
      
      // Remove the item from the list
      setRetiredItems(retiredItems.filter(item => item.id !== id));
      
    } catch (err) {
      console.error('Error deleting item:', err);
      alert('Failed to delete item. Please try again.');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  if (loading) {
    return <div className="loading">Loading retired items...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="retired-items-page">
      <h1>Retired Furniture Items</h1>
      <p>Items that have been retired from inventory</p>
      
      {retiredItems.length === 0 ? (
        <div className="empty-state">
          <p>No retired items found.</p>
        </div>
      ) : (
        <div className="retired-items">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Acquisition Date</th>
                <th>Retirement Date</th>
                <th>Times Used</th>
                <th>Last Beacon</th>
                <th>Last Location</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {retiredItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.category || 'Uncategorized'}</td>
                  <td>{formatDate(item.acquisition_date)}</td>
                  <td>{formatDate(item.retired_date)}</td>
                  <td>{item.times_deployed}</td>
                  <td>{item.beacon_uuid || 'Unknown'}</td>
                  <td>{item.last_location || 'Main Warehouse'}</td>
                  <td>
                    <button 
                      onClick={() => handlePermanentDelete(item.id)}
                      className="delete-btn"
                      title="Permanently delete this item"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default RetiredItemsPage;