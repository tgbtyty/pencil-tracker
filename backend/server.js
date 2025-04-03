const express = require('express');
const path = require('path');
const cors = require('cors');
const { Pool } = require('pg');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME || 'furniture_tracker',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
  ssl: {
    rejectUnauthorized: false // For development only
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// API routes
app.get('/api/detectors', async (req, res) => {
  try {
    // This is a simplified version - the real implementation would join tables
    // to get the count of items per detector
    const { rows } = await pool.query(`
      SELECT d.id, d.name, d.location_type as "locationType", 
             d.latitude, d.longitude, 
             COUNT(lh.beacon_id) as "itemCount"
      FROM detectors d
      LEFT JOIN (
        SELECT DISTINCT ON (beacon_id) beacon_id, detector_id
        FROM location_history
        ORDER BY beacon_id, recorded_at DESC
      ) lh ON d.id = lh.detector_id
      WHERE d.is_active = true
      GROUP BY d.id
      ORDER BY d.name
    `);
    
    res.json(rows);
  } catch (error) {
    console.error('Error fetching detectors:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/furniture/categories', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM furniture_categories ORDER BY name');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/furniture/categories', async (req, res) => {
  try {
    const { name } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO furniture_categories (name) VALUES ($1) RETURNING *',
      [name]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Error adding category:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/beacons/validate/:uuid', async (req, res) => {
  try {
    const { uuid } = req.params;
    const { rows } = await pool.query(
      'SELECT * FROM beacons WHERE beacon_uuid = $1',
      [uuid]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Beacon not found' });
    }
    
    const beacon = rows[0];
    if (beacon.current_furniture_id) {
      // Beacon is in use, get furniture details
      const { rows: furnitureRows } = await pool.query(
        'SELECT * FROM furniture WHERE id = $1',
        [beacon.current_furniture_id]
      );
      
      if (furnitureRows.length > 0) {
        return res.json({
          inUse: true,
          furniture: furnitureRows[0]
        });
      }
    }
    
    // Beacon exists but not in use
    res.json({
      inUse: false,
      beacon
    });
    
  } catch (error) {
    console.error('Error validating beacon:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Catch-all route to serve the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});