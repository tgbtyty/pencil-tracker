import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Circle, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './FurnitureListPage.css';

// Fix Leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function FurnitureListPage() {
  const [furniture, setFurniture] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Default warehouse location
  const warehouseLocation = {
    lat: 37.299250,
    lng: -121.872694
  };

  useEffect(() => {
    fetchFurniture();
    
    // Load warehouse location from localStorage if available
    const savedLocation = localStorage.getItem('warehouseLocation');
    if (savedLocation) {
      const parsed = JSON.parse(savedLocation);
      warehouseLocation.lat = parsed.lat;
      warehouseLocation.lng = parsed.lng;
    }
  }, []);

  const fetchFurniture = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Not authenticated');
      }
      
      const response = await fetch('/api/furniture', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
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
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Not authenticated');
      }
      
      const response = await fetch(`/api/furniture/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete furniture');
      }
      
      // Close detail view if the deleted item was selected
      if (selectedItem && selectedItem.id === id) {
        setSelectedItem(null);
      }
      
      // Refresh the list
      fetchFurniture();
    } catch (err) {
      console.error('Error deleting furniture:', err);
      alert('Failed to retire the furniture item. Please try again.');
    }
  };
  
  const handleItemClick = async (item) => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Not authenticated');
      }
      
      const response = await fetch(`/api/furniture/${item.id}`, {
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
  
  // Function to get photos for an item - returns an array of photo URLs
  const getItemPhotos = (item) => {
    if (!item || !item.photos) return [];
    return item.photos.map(photo => photo.s3_url);
  };
  
  const filteredFurniture = furniture.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
        <div className="header-actions">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search by name or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <Link to="/add-item" className="add-button">+ Add New Item</Link>
        </div>
      </div>
      
      {furniture.length === 0 ? (
        <div className="empty-state">
          <p>No furniture items found. Add your first item!</p>
        </div>
      ) : (
        <div className="furniture-container">
          <div className="furniture-list">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Beacon ID</th>
                  <th>Added</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFurniture.map((item) => (
                  <tr key={item.id} onClick={() => handleItemClick(item)} className="furniture-row">
                    <td>{item.name}</td>
                    <td>{item.category || 'Uncategorized'}</td>
                    <td>{item.beacon_uuid || 'None'}</td>
                    <td>{formatDate(item.acquisition_date)}</td>
                    <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => handleDelete(item.id)} 
                        className="delete-button"
                      >
                        Retire
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {selectedItem && (
            <div className="furniture-detail">
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
                  <span className="detail-label">Beacon ID:</span>
                  <span className="detail-value">{selectedItem.beacon_uuid || 'None'}</span>
                </div>
                
                <div className="detail-row">
                  <span className="detail-label">Acquisition Date:</span>
                  <span className="detail-value">{formatDate(selectedItem.acquisition_date)}</span>
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
              
              {/* Add a map showing the item's location */}
              <div className="detail-map">
                <h3>Item Location</h3>
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
                          {selectedItem.name} is located here
                        </div>
                      </Popup>
                    </Marker>
                    
                    {/* 300m radius around the location */}
                    <Circle
                      center={[warehouseLocation.lat, warehouseLocation.lng]}
                      radius={300}
                      pathOptions={{ 
                        fillColor: 'blue', 
                        fillOpacity: 0.1,
                        color: 'blue',
                        weight: 1
                      }}
                    />
                  </MapContainer>
                </div>
              </div>
              
              <div className="detail-actions">
                <button 
                  onClick={() => handleDelete(selectedItem.id)}
                  className="retire-btn"
                >
                  Retire Item
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default FurnitureListPage;