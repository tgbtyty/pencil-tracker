import { useState, useEffect } from 'react';
import DetectorMap from '../components/DetectorMap';
import ItemCounter from '../components/ItemCounter';
import './HomePage.css';

function HomePage() {
  // This would be fetched from the API in a real application
  const [detectors, setDetectors] = useState([
    { 
      id: 1, 
      name: 'Main Warehouse', 
      locationType: 'warehouse', 
      latitude: 37.7749, 
      longitude: -122.4194,
      itemCount: 42
    },
    { 
      id: 2, 
      name: 'Truck #1', 
      locationType: 'vehicle', 
      latitude: 37.7833, 
      longitude: -122.4167,
      itemCount: 8
    },
    { 
      id: 3, 
      name: '123 Pine St', 
      locationType: 'house', 
      latitude: 37.7850, 
      longitude: -122.4300,
      itemCount: 15
    }
  ]);

  // In a real app, this would fetch from your API
  useEffect(() => {
    // fetchDetectors()
    //   .then(data => setDetectors(data))
    //   .catch(error => console.error('Error fetching detectors:', error));
  }, []);

  return (
    <div className="home-page">
      <h1>Detector Locations</h1>
      <p>Current locations of all detectors and item counts</p>
      
      <div className="detectors-grid">
        {detectors.map(detector => (
          <div key={detector.id} className="detector-card">
            <h2>{detector.name}</h2>
            <p>Type: {detector.locationType}</p>
            <ItemCounter count={detector.itemCount} />
            <DetectorMap 
              latitude={detector.latitude} 
              longitude={detector.longitude} 
              name={detector.name}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default HomePage;