import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './FurnitureListPage.css';

function FurnitureListPage() {
  const [furniture, setFurniture] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchFurniture();
  }, []);

  const fetchFurniture = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/furniture');
      if (!response.ok) {
        throw new Error('Failed to fetch furniture');
      }
      const data = await response.json();
      setFurniture(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching furniture:', err);
      setError('Failed to load furniture items. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to retire this furniture item?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/furniture/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete furniture');
      }
      
      // Refresh the list
      fetchFurniture();
    } catch (err) {
      console.error('Error deleting furniture:', err);
      alert('Failed to retire the furniture item. Please try again.');
    }
  };

  if (loading) {
    return <div className="loading">Loading furniture items...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="furniture-list-page">
      <div className="page-header">
        <h1>Furniture Inventory</h1>
        <Link to="/add-item" className="add-button">+ Add New Item</Link>
      </div>
      
      {furniture.length === 0 ? (
        <div className="empty-state">
          <p>No furniture items found. Add your first item!</p>
        </div>
      ) : (
        <div className="furniture-grid">
          {furniture.map((item) => (
            <div key={item.id} className="furniture-card">
              <div className="furniture-image">
                {item.photo_url ? (
                  <img src={item.photo_url} alt={item.name} />
                ) : (
                  <div className="no-image">No Image</div>
                )}
              </div>
              <div className="furniture-details">
                <h2>{item.name}</h2>
                <p className="category">Category: {item.category || 'Uncategorized'}</p>
                <p className="beacon">Beacon ID: {item.beacon_uuid || 'None'}</p>
                <p className="deployments">Times Deployed: {item.times_deployed}</p>
              </div>
              <div className="furniture-actions">
                <Link to={`/furniture/${item.id}`} className="view-button">View Details</Link>
                <button 
                  onClick={() => handleDelete(item.id)} 
                  className="delete-button"
                >
                  Retire Item
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default FurnitureListPage;