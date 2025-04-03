import { useEffect, useRef } from 'react';
import './DetectorMap.css';

// Simple placeholder map component
// In a real application, you would use a library like Leaflet or Google Maps
function DetectorMap({ latitude, longitude, name }) {
  const mapRef = useRef(null);

  useEffect(() => {
    // In a real app, this would initialize a map
    // For now, we're just creating a simple visual placeholder
    if (mapRef.current) {
      const ctx = mapRef.current.getContext('2d');
      ctx.fillStyle = '#e0e0e0';
      ctx.fillRect(0, 0, 300, 200);
      
      // Draw a marker
      ctx.fillStyle = '#ff6347';
      ctx.beginPath();
      ctx.arc(150, 100, 10, 0, 2 * Math.PI);
      ctx.fill();
      
      // Add text
      ctx.fillStyle = '#000';
      ctx.font = '12px Arial';
      ctx.fillText(`${name} (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`, 10, 20);
    }
  }, [latitude, longitude, name]);

  return (
    <div className="detector-map">
      <canvas ref={mapRef} width="300" height="200"></canvas>
    </div>
  );
}

export default DetectorMap;