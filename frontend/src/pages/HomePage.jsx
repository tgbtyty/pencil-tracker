import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './HomePage.css';
import L from 'leaflet';

// Fix Leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function HomePage() {
  const [furniture, setFurniture] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Convert DMS to decimal degrees for the warehouse location
  // 37°17'57.3"N 121°52'21.7"W
  const warehouseLocation = {
    lat: 37.299250,
    lng: -121.872694,
    name: 'Main Warehouse',
    id: 'warehouse-1'
  };
  
  useEffect(() => {
    fetchFurniture();
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
  
  // Calculate the number of items in the warehouse (all furniture for now)
  const warehouseItemCount = furniture.length;

  if (loading) {
    return <div className="loading">Loading detector locations...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="home-page">
      <h1>Detector Locations</h1>
      <p>Current locations of all detectors and item counts</p>
      
      <div className="map-container">
        <MapContainer
          center={[warehouseLocation.lat, warehouseLocation.lng]}
          zoom={15}
          style={{ height: '500px', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          <Marker position={[warehouseLocation.lat, warehouseLocation.lng]}>
            <Popup>
              <div>
                <strong>{warehouseLocation.name}</strong><br />
                Items: {warehouseItemCount}
              </div>
            </Popup>
          </Marker>
          
          {/* 300m radius around the warehouse */}
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
      
      <div className="detectors-grid">
        <div className="detector-card">
          <h2>{warehouseLocation.name}</h2>
          <p>Location: {warehouseLocation.lat.toFixed(6)}, {warehouseLocation.lng.toFixed(6)}</p>
          <div className="item-count">
            <span className="count">{warehouseItemCount}</span>
            <span className="label">Items Detected</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;