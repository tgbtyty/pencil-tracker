const express = require('express');
const path = require('path');
const cors = require('cors');
const { Pool } = require('pg');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Load environment variables
require('dotenv').config();

// Log connection details for debugging (you can remove this later)
console.log('Attempting to connect to database with:', {
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  port: process.env.DB_PORT
});
// Database connection
// Database connection
const pool = new Pool({
    host: process.env.DB_HOST,
    database: process.env.DB_NAME || 'furniture_tracker',
    user: process.env.DB_USER || 'master',  // Changed default from 'admin' to 'master'
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

// Add these endpoints to your server.js file

// Get all furniture items
app.get('/api/furniture', async (req, res) => {
    try {
      const { rows } = await pool.query(`
        SELECT f.id, f.name, f.description, fc.name as category, 
               f.acquisition_date, f.times_deployed, 
               b.beacon_uuid, 
               (SELECT s3_url FROM furniture_photos WHERE furniture_id = f.id LIMIT 1) as photo_url
        FROM furniture f
        LEFT JOIN furniture_categories fc ON f.category_id = fc.id
        LEFT JOIN beacons b ON f.current_beacon_id = b.id
        WHERE f.is_active = true
        ORDER BY f.name
      `);
      res.json(rows);
    } catch (error) {
      console.error('Error fetching furniture:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Get a specific furniture item
  app.get('/api/furniture/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { rows } = await pool.query(`
        SELECT f.*, fc.name as category_name, b.beacon_uuid
        FROM furniture f
        LEFT JOIN furniture_categories fc ON f.category_id = fc.id
        LEFT JOIN beacons b ON f.current_beacon_id = b.id
        WHERE f.id = $1
      `, [id]);
      
      if (rows.length === 0) {
        return res.status(404).json({ message: 'Furniture not found' });
      }
      
      // Get photos for this furniture item
      const { rows: photoRows } = await pool.query(
        'SELECT id, s3_url, upload_date FROM furniture_photos WHERE furniture_id = $1',
        [id]
      );
      
      const furniture = rows[0];
      furniture.photos = photoRows;
      
      res.json(furniture);
    } catch (error) {
      console.error('Error fetching furniture item:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Add a new furniture item
  app.post('/api/furniture', async (req, res) => {
    // For now, we'll handle just the basic furniture data
    // In a real implementation, you'd also handle file uploads to S3
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { name, categoryId, description, beaconUUID } = req.body;
      
      // Check if the beacon exists and is available
      const { rows: beaconRows } = await client.query(
        'SELECT id FROM beacons WHERE beacon_uuid = $1 AND current_furniture_id IS NULL',
        [beaconUUID]
      );
      
      if (beaconRows.length === 0) {
        return res.status(400).json({ message: 'Beacon not found or already in use' });
      }
      
      const beaconId = beaconRows[0].id;
      
      // Insert new furniture item
      const { rows } = await client.query(
        `INSERT INTO furniture 
          (name, category_id, description, acquisition_date, times_deployed, is_active, current_beacon_id) 
         VALUES 
          ($1, $2, $3, CURRENT_DATE, 0, true, $4) 
         RETURNING id`,
        [name, categoryId, description, beaconId]
      );
      
      const furnitureId = rows[0].id;
      
      // Update the beacon to point to this furniture
      await client.query(
        'UPDATE beacons SET current_furniture_id = $1 WHERE id = $2',
        [furnitureId, beaconId]
      );
      
      // If there are photos, we'd handle S3 upload here
      // For now, we'll just commit the transaction
      
      await client.query('COMMIT');
      
      res.status(201).json({ 
        id: furnitureId,
        message: 'Furniture item added successfully' 
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error adding furniture:', error);
      res.status(500).json({ message: 'Server error' });
    } finally {
      client.release();
    }
  });
  
  // Delete/retire a furniture item
  app.delete('/api/furniture/:id', async (req, res) => {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { id } = req.params;
      
      // First get the beacon ID
      const { rows } = await client.query(
        'SELECT current_beacon_id FROM furniture WHERE id = $1',
        [id]
      );
      
      if (rows.length === 0) {
        return res.status(404).json({ message: 'Furniture not found' });
      }
      
      const beaconId = rows[0].current_beacon_id;
      
      // Mark furniture as inactive and set retired date
      await client.query(
        'UPDATE furniture SET is_active = false, retired_date = CURRENT_DATE, current_beacon_id = NULL WHERE id = $1',
        [id]
      );
      
      // Free up the beacon
      await client.query(
        'UPDATE beacons SET current_furniture_id = NULL WHERE id = $1',
        [beaconId]
      );
      
      await client.query('COMMIT');
      
      res.json({ message: 'Furniture retired successfully' });
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error retiring furniture:', error);
      res.status(500).json({ message: 'Server error' });
    } finally {
      client.release();
    }
  });
  
  // List all beacons
  app.get('/api/beacons', async (req, res) => {
    try {
      const { rows } = await pool.query(`
        SELECT b.id, b.beacon_uuid, b.is_active, 
               f.id as furniture_id, f.name as furniture_name
        FROM beacons b
        LEFT JOIN furniture f ON b.current_furniture_id = f.id
        ORDER BY b.beacon_uuid
      `);
      res.json(rows);
    } catch (error) {
      console.error('Error fetching beacons:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Add a new beacon
  app.post('/api/beacons', async (req, res) => {
    try {
      const { beaconUUID } = req.body;
      
      // Check if beacon already exists
      const { rows: existingRows } = await pool.query(
        'SELECT id FROM beacons WHERE beacon_uuid = $1',
        [beaconUUID]
      );
      
      if (existingRows.length > 0) {
        return res.status(400).json({ message: 'Beacon UUID already exists' });
      }
      
      const { rows } = await pool.query(
        'INSERT INTO beacons (beacon_uuid, is_active) VALUES ($1, true) RETURNING id',
        [beaconUUID]
      );
      
      res.status(201).json({ 
        id: rows[0].id,
        message: 'Beacon added successfully' 
      });
      
    } catch (error) {
      console.error('Error adding beacon:', error);
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