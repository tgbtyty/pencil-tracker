const express = require('express');
const path = require('path');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Secret key for JWT - in production, use environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'pencil-dogs-secret-key';

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const { v4: uuidv4 } = require('uuid');

// Configure AWS
AWS.config.update({
  region: process.env.AWS_REGION || 'us-east-2',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const s3 = new AWS.S3();

// Configure multer for S3 upload
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_BUCKET || 'furniture-tracking-photos-pencil-tracker',
    acl: 'public-read',
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      const fileExtension = file.originalname.split('.').pop();
      cb(null, `furniture/${uuidv4()}.${fileExtension}`);
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// ADD THIS MIDDLEWARE DEFINITION HERE
// Middleware to verify JWT token
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ message: 'No token provided' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend/dist')));

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
               f.acquisition_date, f.times_deployed, f.last_location,
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

  app.get('/api/furniture/retired', authMiddleware, async (req, res) => {
    try {
      const { rows } = await pool.query(`
        SELECT f.id, f.name, f.description, fc.name as category, 
               f.acquisition_date, f.retired_date, f.times_deployed, 
               b.beacon_uuid, 
               (SELECT s3_url FROM furniture_photos WHERE furniture_id = f.id LIMIT 1) as photo_url
        FROM furniture f
        LEFT JOIN furniture_categories fc ON f.category_id = fc.id
        LEFT JOIN beacons b ON b.id = (
          SELECT beacon_id FROM deployment_history 
          WHERE furniture_id = f.id 
          ORDER BY deployed_at DESC 
          LIMIT 1
        )
        WHERE f.is_active = false
        ORDER BY COALESCE(f.retired_date, CURRENT_DATE) DESC
      `);
      res.json(rows);
    } catch (error) {
      console.error('Error fetching retired furniture:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
// Update the specific item endpoint to handle retired items
app.get('/api/furniture/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const isRetired = req.query.retired === 'true';
      
      let query = `
        SELECT f.*, fc.name as category_name
        FROM furniture f
        LEFT JOIN furniture_categories fc ON f.category_id = fc.id
        WHERE f.id = $1
      `;
      
      // If it's a retired item, we won't have a current_beacon_id
      if (!isRetired) {
        query = `
          SELECT f.*, fc.name as category_name, b.beacon_uuid
          FROM furniture f
          LEFT JOIN furniture_categories fc ON f.category_id = fc.id
          LEFT JOIN beacons b ON f.current_beacon_id = b.id
          WHERE f.id = $1
        `;
      } else {
        // For retired items, try to get the last beacon used
        query = `
          SELECT f.*, fc.name as category_name,
            (SELECT beacon_uuid FROM beacons WHERE id IN (
              SELECT DISTINCT beacon_id FROM deployment_history 
              WHERE furniture_id = f.id
              ORDER BY deployed_at DESC LIMIT 1
            )) as beacon_uuid
          FROM furniture f
          LEFT JOIN furniture_categories fc ON f.category_id = fc.id
          WHERE f.id = $1
        `;
      }
      
      const { rows } = await pool.query(query, [id]);
      
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
      
      // If last_location is null, default to 'Main Warehouse'
      if (!furniture.last_location) {
        furniture.last_location = 'Main Warehouse';
      }
      
      res.json(furniture);
    } catch (error) {
      console.error('Error fetching furniture item:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
// Add a new furniture item with image upload
app.post('/api/furniture', upload.array('images', 5), async (req, res) => {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { name, categoryId, description, beaconUUID } = req.body;
      
      // Check if the beacon exists and is available
      const { rows: beaconRows } = await client.query(
        'SELECT id, current_furniture_id FROM beacons WHERE beacon_uuid = $1',
        [beaconUUID]
      );
      
      if (beaconRows.length === 0) {
        return res.status(404).json({ message: 'Beacon not found' });
      }
      
      const beacon = beaconRows[0];
      
      // If the beacon is associated with another furniture, check if it's been retired in the request
      if (beacon.current_furniture_id) {
        // This should be handled by the client - they should call /api/furniture/retire/:id first
        return res.status(400).json({ 
          message: 'Beacon is currently associated with another furniture item',
          needsRetirement: true,
          furnitureId: beacon.current_furniture_id
        });
      }
      
      // Get the warehouse location from the detectors table
      let warehouseLocation = 'Main Warehouse';
      const { rows: warehouseRows } = await client.query(
        "SELECT location_name FROM detectors WHERE name = 'Main Warehouse' LIMIT 1"
      );
      
      if (warehouseRows.length > 0) {
        warehouseLocation = warehouseRows[0].location_name;
      }
      
      // Insert the new furniture with the warehouse location
      const { rows: furnitureRows } = await client.query(
        `INSERT INTO furniture 
          (name, category_id, description, acquisition_date, times_deployed, is_active, current_beacon_id, last_location) 
         VALUES 
          ($1, $2, $3, CURRENT_DATE, 0, true, $4, $5) 
         RETURNING id`,
        [name, categoryId, description, beacon.id, warehouseLocation]
      );
      
      const furnitureId = furnitureRows[0].id;
      
      // Update the beacon to point to this furniture
      await client.query(
        'UPDATE beacons SET current_furniture_id = $1 WHERE id = $2',
        [furnitureId, beacon.id]
      );
      
      // Process uploaded images if any
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          await client.query(
            'INSERT INTO furniture_photos (furniture_id, s3_url, upload_date) VALUES ($1, $2, CURRENT_TIMESTAMP)',
            [furnitureId, file.location]
          );
        }
      }
      
      await client.query('COMMIT');
      
      res.status(201).json({ 
        id: furnitureId,
        message: 'Furniture item added successfully',
        images: req.files ? req.files.map(file => file.location) : []
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error adding furniture:', error);
      res.status(500).json({ message: 'Server error' });
    } finally {
      client.release();
    }
  });


  
// User Login
app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // Find user by email
      const { rows } = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );
      
      if (rows.length === 0) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      const user = rows[0];
      
      // Special case for our hardcoded user during development
      let isValidPassword = false;
      if (email === 'support@pencildogs.com' && password === 'Pencil2025') {
        isValidPassword = true;
      } else {
        // For other users, compare hashed password
        isValidPassword = await bcrypt.compare(password, user.password);
      }
      
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      });
      
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Protected route example
  app.get('/api/auth/profile', authMiddleware, (req, res) => {
    res.json({ user: req.user });
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

  // Initialize admin user (only use this in development)
app.get('/api/init-admin-user', async (req, res) => {
    try {
      // Check if admin user already exists
      const { rows: existingUsers } = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        ['support@pencildogs.com']
      );
      
      if (existingUsers.length > 0) {
        return res.json({ message: 'Admin user already exists', userId: existingUsers[0].id });
      }
      
      // Create users table if it doesn't exist
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          name VARCHAR(100),
          role VARCHAR(50) DEFAULT 'user',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Hash password
      const hashedPassword = await bcrypt.hash('Pencil2025', 10);
      
      // Insert admin user
      const { rows } = await pool.query(
        'INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4) RETURNING id',
        ['support@pencildogs.com', hashedPassword, 'Support User', 'admin']
      );
      
      res.json({ message: 'Admin user created successfully', userId: rows[0].id });
    } catch (error) {
      console.error('Error creating admin user:', error);
      res.status(500).json({ message: 'Server error' });
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

// Validate a beacon UUID
app.get('/api/beacons/validate/:uuid', async (req, res) => {
    try {
      const { uuid } = req.params;
      
      // Check if the UUID contains the required phrase "PNCLDGS"
      if (!uuid.includes('PNCLDGS')) {
        return res.status(400).json({ 
          valid: false,
          message: 'Invalid beacon UUID format. UUID must contain PNCLDGS.' 
        });
      }
      
      // Check if the beacon already exists in the database
      const { rows } = await pool.query(
        'SELECT b.id, b.beacon_uuid, b.current_furniture_id, f.name as furniture_name ' +
        'FROM beacons b ' +
        'LEFT JOIN furniture f ON b.current_furniture_id = f.id ' +
        'WHERE b.beacon_uuid = $1',
        [uuid]
      );
      
      if (rows.length === 0) {
        // Beacon doesn't exist yet, we need to create it
        const newBeacon = await pool.query(
          'INSERT INTO beacons (beacon_uuid, is_active) VALUES ($1, true) RETURNING id',
          [uuid]
        );
        
        return res.json({ 
          valid: true,
          inUse: false,
          beaconId: newBeacon.rows[0].id,
          message: 'New beacon registered successfully'
        });
      }
      
      // Beacon exists
      const beacon = rows[0];
      
      if (beacon.current_furniture_id) {
        // Beacon is already in use
        return res.json({
          valid: true,
          inUse: true,
          beaconId: beacon.id,
          furnitureId: beacon.current_furniture_id,
          furnitureName: beacon.furniture_name,
          message: `This beacon is currently used on: ${beacon.furniture_name}`
        });
      }
      
      // Beacon exists but is not in use
      return res.json({
        valid: true,
        inUse: false,
        beaconId: beacon.id,
        message: 'Beacon is available for use'
      });
      
    } catch (error) {
      console.error('Error validating beacon:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Retire furniture and free up the beacon
  app.post('/api/furniture/retire/:id', async (req, res) => {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { id } = req.params;
      
      // Get the furniture and beacon details
      const { rows } = await client.query(
        'SELECT f.id, f.name, f.current_beacon_id, b.beacon_uuid ' +
        'FROM furniture f ' +
        'JOIN beacons b ON f.current_beacon_id = b.id ' +
        'WHERE f.id = $1',
        [id]
      );
      
      if (rows.length === 0) {
        return res.status(404).json({ message: 'Furniture not found' });
      }
      
      const furniture = rows[0];
      
      // Mark furniture as retired
      await client.query(
        'UPDATE furniture SET is_active = false, retired_date = CURRENT_DATE, current_beacon_id = NULL WHERE id = $1',
        [id]
      );
      
      // Free up the beacon
      await client.query(
        'UPDATE beacons SET current_furniture_id = NULL WHERE id = $1',
        [furniture.current_beacon_id]
      );
      
      await client.query('COMMIT');
      
      res.json({
        message: `Furniture "${furniture.name}" has been retired`,
        beaconUUID: furniture.beacon_uuid
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error retiring furniture:', error);
      res.status(500).json({ message: 'Server error' });
    } finally {
      client.release();
    }
  });

  
  // Add a new furniture item with an existing beacon
  app.post('/api/furniture', async (req, res) => {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { name, categoryId, description, beaconUUID } = req.body;
      
      // Check if the beacon exists
      const { rows: beaconRows } = await client.query(
        'SELECT id, current_furniture_id FROM beacons WHERE beacon_uuid = $1',
        [beaconUUID]
      );
      
      if (beaconRows.length === 0) {
        return res.status(404).json({ message: 'Beacon not found' });
      }
      
      const beacon = beaconRows[0];
      
      // If the beacon is associated with another furniture, check if it's been retired in the request
      if (beacon.current_furniture_id) {
        // This should be handled by the client - they should call /api/furniture/retire/:id first
        return res.status(400).json({ 
          message: 'Beacon is currently associated with another furniture item',
          needsRetirement: true,
          furnitureId: beacon.current_furniture_id
        });
      }
      
      // Insert the new furniture
      const { rows: furnitureRows } = await client.query(
        `INSERT INTO furniture 
          (name, category_id, description, acquisition_date, times_deployed, is_active, current_beacon_id) 
         VALUES 
          ($1, $2, $3, CURRENT_DATE, 0, true, $4) 
         RETURNING id`,
        [name, categoryId, description, beacon.id]
      );
      
      const furnitureId = furnitureRows[0].id;
      
      // Update the beacon to point to this furniture
      await client.query(
        'UPDATE beacons SET current_furniture_id = $1 WHERE id = $2',
        [furnitureId, beacon.id]
      );
      
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

  app.put('/api/furniture/:id/location', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { location } = req.body;
      
      if (!location || typeof location !== 'string') {
        return res.status(400).json({ message: 'Valid location is required' });
      }
      
      const { rows } = await pool.query(
        'UPDATE furniture SET last_location = $1 WHERE id = $2 RETURNING id, name, last_location',
        [location, id]
      );
      
      if (rows.length === 0) {
        return res.status(404).json({ message: 'Furniture not found' });
      }
      
      res.json({
        message: 'Location updated successfully',
        furniture: rows[0]
      });
      
    } catch (error) {
      console.error('Error updating furniture location:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Permanently delete a retired furniture item
app.delete('/api/furniture/permanent-delete/:id', authMiddleware, async (req, res) => {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { id } = req.params;
      
      // First check if the item is already retired
      const { rows } = await client.query(
        'SELECT is_active FROM furniture WHERE id = $1',
        [id]
      );
      
      if (rows.length === 0) {
        return res.status(404).json({ message: 'Furniture not found' });
      }
      
      if (rows[0].is_active) {
        return res.status(400).json({ 
          message: 'Cannot permanently delete active furniture. Retire it first.' 
        });
      }
      
      // Delete furniture photos
      await client.query(
        'DELETE FROM furniture_photos WHERE furniture_id = $1',
        [id]
      );
      
      // Delete from deployment history
      await client.query(
        'DELETE FROM deployment_history WHERE furniture_id = $1',
        [id]
      );
      
      // Finally delete the furniture item
      await client.query(
        'DELETE FROM furniture WHERE id = $1',
        [id]
      );
      
      await client.query('COMMIT');
      
      res.json({ message: 'Furniture permanently deleted' });
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error permanently deleting furniture:', error);
      res.status(500).json({ message: 'Server error' });
    } finally {
      client.release();
    }
  });

// Add this to server.js
app.post('/api/location_history/batch', authMiddleware, async (req, res) => {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Extract data from the request using the updated schema
      const { detector_uuid, name, location_type, location_name, latitude, longitude, beacons, timestamp } = req.body;
      const now = new Date();
      
      // Check if detector exists
      const { rows: detectorRows } = await client.query(
        'SELECT id FROM detectors WHERE detector_uuid = $1',
        [detector_uuid]
      );
      
      let detectorId;
      
      if (detectorRows.length === 0) {
        // Create new detector
        const { rows } = await client.query(
          'INSERT INTO detectors (detector_uuid, name, location_type, location_name, latitude, longitude, last_reported, is_active) VALUES ($1, $2, $3, $4, $5, $6, NOW(), true) RETURNING id',
          [detector_uuid, name, location_type, location_name, latitude, longitude]
        );
        detectorId = rows[0].id;
        console.log(`Created new detector: ${detectorId} (${detector_uuid})`);
      } else {
        // Update existing detector
        detectorId = detectorRows[0].id;
        await client.query(
          'UPDATE detectors SET name = $2, location_name = $3, latitude = $4, longitude = $5, last_reported = NOW() WHERE id = $1',
          [detectorId, name, location_name, latitude, longitude]
        );
        console.log(`Updated detector: ${detectorId} (${detector_uuid})`);
      }
      
      // Process each beacon
      for (const beaconData of beacons) {
        const beaconUuid = beaconData.beacon_uuid;
        
        // Check if beacon exists
        const { rows: beaconRows } = await client.query(
          'SELECT id FROM beacons WHERE beacon_uuid = $1',
          [beaconUuid]
        );
        
        let beaconId;
        
        if (beaconRows.length === 0) {
          // Create new beacon
          const { rows } = await client.query(
            'INSERT INTO beacons (beacon_uuid, is_active, last_seen_detector_id, last_seen_time) VALUES ($1, true, $2, NOW()) RETURNING id',
            [beaconUuid, detectorId]
          );
          beaconId = rows[0].id;
          console.log(`Created new beacon: ${beaconId} (${beaconUuid})`);
        } else {
          // Update existing beacon
          beaconId = beaconRows[0].id;
          await client.query(
            'UPDATE beacons SET last_seen_detector_id = $2, last_seen_time = NOW() WHERE id = $1',
            [beaconId, detectorId]
          );
          console.log(`Updated beacon: ${beaconId} (${beaconUuid})`);
        }
        
        // Record location history
        await client.query(
          'INSERT INTO location_history (beacon_id, detector_id, recorded_at, signal_strength) VALUES ($1, $2, NOW(), $3)',
          [beaconId, detectorId, beaconData.signal_strength || null]
        );
        console.log(`Recorded location for beacon: ${beaconId}`);
      }
      
      await client.query('COMMIT');
      
      res.json({
        success: true,
        message: `Location data recorded for ${beacons.length} beacons`,
        detectorId: detectorId
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error recording location data:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    } finally {
      client.release();
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