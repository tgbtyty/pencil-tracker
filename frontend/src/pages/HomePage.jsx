// src/pages/HomePage.jsx
import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Popup, useMapEvents } from 'react-leaflet';
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

// Map click handler component
function MapClickHandler({ onLocationSet }) {
  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng;
      onLocationSet({ lat, lng });
    },
  });
  return null;
}

function HomePage() {
  const [detectors, setDetectors] = useState([]);
  const [furniture, setFurniture] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [warehouseLocation, setWarehouseLocation] = useState({
    lat: 37.299250,
    lng: -121.872694,
    name: 'Main Warehouse',
    id: 'warehouse-1'
  });
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [newLat, setNewLat] = useState('');
  const [newLng, setNewLng] = useState('');
  const mapRef = useRef(null);
  
  useEffect(() => {
    // Load warehouse location from localStorage if available
    const savedLocation = localStorage.getItem('warehouseLocation');
    if (savedLocation) {
      setWarehouseLocation(JSON.parse(savedLocation));
    }
    
    // Fetch detectors and furniture data
    fetchData();
  }, []);
  
  const fetchData = async () => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }
      
      // Fetch detectors
      const detectorsResponse = await fetch('/api/detectors', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!detectorsResponse.ok) {
        throw new Error('Failed to fetch detectors');
      }
      
      const detectorsData = await detectorsResponse.json();
      
      // If no detectors, create a default warehouse detector
      if (detectorsData.length === 0) {
        const warehouse = {
          id: 'warehouse-default',
          name: 'Main Warehouse',
          locationType: 'warehouse',
          latitude: warehouseLocation.lat,
          longitude: warehouseLocation.lng,
          itemCount: 0
        };
        setDetectors([warehouse]);
      } else {
        setDetectors(detectorsData);
      }
      
      // Fetch furniture to count items
      const furnitureResponse = await fetch('/api/furniture', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!furnitureResponse.ok) {
        throw new Error('Failed to fetch furniture');
      }
      
      const furnitureData = await furnitureResponse.json();
      setFurniture(furnitureData);
      
      setError(null);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load detector data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleLocationChange = (location) => {
    setWarehouseLocation({
      ...warehouseLocation,
      lat: location.lat,
      lng: location.lng
    });
    
    // Save to localStorage
    localStorage.setItem('warehouseLocation', JSON.stringify({
      ...warehouseLocation,
      lat: location.lat,
      lng: location.lng
    }));
    
    // Center map on new location
    if (mapRef.current) {
      mapRef.current.setView([location.lat, location.lng], 15);
    }
  };
  
  const handleSubmitCoordinates = (e) => {
    e.preventDefault();
    const lat = parseFloat(newLat);
    const lng = parseFloat(newLng);
    
    if (isNaN(lat) || isNaN(lng)) {
      alert('Please enter valid coordinates');
      return;
    }
    
    handleLocationChange({ lat, lng });
    setIsEditingLocation(false);
    setNewLat('');
    setNewLng('');
  };
  
  // Use the warehouse location if no detectors available
  const mapCenterLatitude = detectors.length > 0 
    ? detectors[0].latitude || warehouseLocation.lat 
    : warehouseLocation.lat;
    
  const mapCenterLongitude = detectors.length > 0 
    ? detectors[0].longitude || warehouseLocation.lng 
    : warehouseLocation.lng;

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
      
      <div className="location-controls">
        <button 
          onClick={() => setIsEditingLocation(!isEditingLocation)}
          className="location-btn"
        >
          {isEditingLocation ? 'Cancel' : 'Set Warehouse Location'}
        </button>
        
        {isEditingLocation && (
          <form onSubmit={handleSubmitCoordinates} className="coordinates-form">
            <div className="form-group">
              <label>Latitude:</label>
              <input 
                type="text" 
                value={newLat} 
                onChange={(e) => setNewLat(e.target.value)}
                placeholder="e.g. 37.299250"
                required
              />
            </div>
            <div className="form-group">
              <label>Longitude:</label>
              <input 
                type="text" 
                value={newLng} 
                onChange={(e) => setNewLng(e.target.value)}
                placeholder="e.g. -121.872694"
                required
              />
            </div>
            <button type="submit" className="submit-btn">Update Location</button>
          </form>
        )}
        
        {isEditingLocation && (
          <div className="map-help">
            <p>You can also click directly on the map to set the warehouse location.</p>
          </div>
        )}
      </div>
      
      <div className="map-container">
        <MapContainer
          center={[mapCenterLatitude, mapCenterLongitude]}
          zoom={15}
          style={{ height: '500px', width: '100%' }}
          whenCreated={(map) => { mapRef.current = map; }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          {/* Display all detectors on the map */}
          {detectors.map(detector => (
            <div key={detector.id || 'warehouse'}>
              <Marker 
                position={[
                  detector.latitude || detector.lat || warehouseLocation.lat, 
                  detector.longitude || detector.lng || warehouseLocation.lng
                ]}
              >
                <Popup>
                  <div>
                    <strong>{detector.name}</strong><br />
                    Items: {detector.itemCount || 0}<br />
                    Coordinates: {(detector.latitude || detector.lat).toFixed(6)}, 
                               {(detector.longitude || detector.lng).toFixed(6)}
                  </div>
                </Popup>
              </Marker>
              
              {/* 300m radius around each detector */}
              <Circle
                center={[
                  detector.latitude || detector.lat || warehouseLocation.lat, 
                  detector.longitude || detector.lng || warehouseLocation.lng
                ]}
                radius={300}
                pathOptions={{ 
                  fillColor: 'blue', 
                  fillOpacity: 0.1,
                  color: 'blue',
                  weight: 1
                }}
              />
            </div>
          ))}
          
          {isEditingLocation && <MapClickHandler onLocationSet={handleLocationChange} />}
        </MapContainer>
      </div>
      
      <div className="detectors-grid">
        {detectors.map(detector => (
          <div key={detector.id || 'warehouse'} className="detector-card">
            <h2>{detector.name}</h2>
            <p>Type: {detector.locationType || 'warehouse'}</p>
            <p>Location: {(detector.latitude || detector.lat).toFixed(6)}, 
                        {(detector.longitude || detector.lng).toFixed(6)}</p>
            <div className="item-count">
              <span className="count">{detector.itemCount || furniture.length || 0}</span>
              <span className="label">Items Detected</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default HomePage;