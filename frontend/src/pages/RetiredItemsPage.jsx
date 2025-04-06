import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './RetiredItemsPage.css';

// Fix Leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function RetiredItemsPage() {
  const [retiredItems, setRetiredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  // Default warehouse location
  const warehouseLocation = {
    lat: 37.299250,
    lng: -121.872694
  };

  useEffect(() => {
    fetchRetiredItems();
    
    // Load warehouse location from localStorage if available
    const savedLocation = localStorage.getItem('warehouseLocation');
    if (savedLocation) {
      const parsed = JSON.parse(savedLocation);
      warehouseLocation.lat = parsed.lat;
      warehouseLocation.lng = parsed.lng;
    }
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
      
      // Close detail view if the deleted item was selected
      if (selectedItem && selectedItem.id === id) {
        setSelectedItem(null);
      }
      
      // Remove the item from the list
      setRetiredItems(retiredItems.filter(item => item.id !== id));
      
    } catch (err) {
      console.error('Error deleting item:', err);
      alert('Failed to delete item. Please try again.');
    }
  };
  
  const handleItemClick = async (item) => {
    // Fetch detailed information about the retired item
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Not authenticated');
      }
      
      const response = await fetch(`/api/furniture/${item.id}?retired=true`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch furniture details');
      }
      
      const detailedItem = await response.json();
      setSelectedItem(detailedItem);
    } catch (err) {
      console.error('Error fetching item details:', err);
      alert('Failed to load item details. Please try again.');
    }
  };
  
  const closeDetailView = () => {
    setSelectedItem(null);
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
        <div className="items-container">
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
                  <tr key={item.id} onClick={() => handleItemClick(item)} className="item-row">
                    <td>{item.name}</td>
                    <td>{item.category || 'Uncategorized'}</td>
                    <td>{formatDate(item.acquisition_date)}</td>
                    <td>{formatDate(item.retired_date)}</td>
                    <td>{item.times_deployed}</td>
                    <td>{item.beacon_uuid || 'Unknown'}</td>
                    <td>{item.last_location || 'Main Warehouse'}</td>
                    <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
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
          
          {selectedItem && (
            <div className="item-detail">
              <div className="detail-header">
                <h2>{selectedItem.name}</h2>
                <button onClick={closeDetailView} className="close-btn">×</button>
              </div>
              
              {/* Show the image gallery */}
              <div className="detail-image-gallery">
                {selectedItem.photos && selectedItem.photos.length > 0 ? (
                  selectedItem.photos.map((photo, index) => (
                    <div key={index} className="detail-image">
                      <img src={photo.s3_url} alt={`${selectedItem.name} ${index + 1}`} />
                    </div>
                  ))
                ) : (
                  <div className="no-images">No images available</div>
                )}
              </div>
              
              <div className="detail-content">
                <div className="detail-row">
                  <span className="detail-label">Category:</span>
                  <span className="detail-value">{selectedItem.category_name || 'Uncategorized'}</span>
                </div>
                
                <div className="detail-row">
                  <span className="detail-label">Description:</span>
                  <span className="detail-value">{selectedItem.description || 'No description'}</span>
                </div>
                
                <div className="detail-row">
                  <span className="detail-label">Last Used Beacon:</span>
                  <span className="detail-value">{selectedItem.beacon_uuid || 'Unknown'}</span>
                </div>
                
                <div className="detail-row">
                  <span className="detail-label">Acquisition Date:</span>
                  <span className="detail-value">{formatDate(selectedItem.acquisition_date)}</span>
                </div>
                
                <div className="detail-row">
                  <span className="detail-label">Retirement Date:</span>
                  <span className="detail-value">{formatDate(selectedItem.retired_date)}</span>
                </div>
                
                <div className="detail-row">
                  <span className="detail-label">Times Deployed:</span>
                  <span className="detail-value">{selectedItem.times_deployed}</span>
                </div>
                
                <div className="detail-row">
                  <span className="detail-label">Last Location:</span>
                  <span className="detail-value">{selectedItem.last_location || 'Main Warehouse'}</span>
                </div>
              </div>
              
              {/* Add a map showing the item's last known location */}
              <div className="detail-map">
                <h3>Last Known Location</h3>
                <div className="map-container">
                  <MapContainer
                    center={[warehouseLocation.lat, warehouseLocation.lng]}
                    zoom={15}
                    style={{ height: '200px', width: '100%' }}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    
                    <Marker position={[warehouseLocation.lat, warehouseLocation.lng]}>
                      <Popup>
                        <div>
                          <strong>{selectedItem.last_location || 'Main Warehouse'}</strong><br />
                          {selectedItem.name} was last seen here
                        </div>
                      </Popup>
                    </Marker>
                  </MapContainer>
                </div>
              </div>
              
              <div className="detail-actions">
                <button 
                  onClick={() => handlePermanentDelete(selectedItem.id)}
                  className="delete-btn full-width"
                >
                  Permanently Delete Item
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default RetiredItemsPage;