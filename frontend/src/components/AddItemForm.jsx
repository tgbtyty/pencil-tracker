import { useState, useEffect } from 'react';
import './AddItemForm.css';

function AddItemForm({ onSubmit, isSubmitting }) {
  const [beaconUUID, setBeaconUUID] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState([]);
  const [name, setName] = useState('');
  const [beaconValidated, setBeaconValidated] = useState(false);
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [imagePreviewUrls, setImagePreviewUrls] = useState([]);

  // Fetch categories when component mounts
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/furniture/categories');
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const validateBeacon = async () => {
    if (!beaconUUID.trim()) {
      setValidationError('Please enter a beacon UUID');
      return;
    }

    try {
      const response = await fetch(`/api/beacons/validate/${beaconUUID}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setValidationError('Beacon not found. Please check the UUID.');
          return;
        }
        throw new Error('Failed to validate beacon');
      }
      
      const data = await response.json();
      
      if (!data.valid) {
        setValidationError(data.message || 'Invalid beacon UUID. Remember it must contain "PNCLDGS".');
        return;
      }
      
      if (data.inUse) {
        if (window.confirm(`This beacon is currently used on: ${data.furnitureName}. Do you want to retire this item and reuse the beacon?`)) {
          await retireFurniture(data.furnitureId);
        } else {
          setValidationError('Please use a different beacon');
          return;
        }
      }
      
      setBeaconValidated(true);
      setValidationError('');
    } catch (error) {
      console.error('Error validating beacon:', error);
      setValidationError('Error validating beacon. Please try again.');
    }
  };

  const retireFurniture = async (furnitureId) => {
    try {
      const response = await fetch(`/api/furniture/retire/${furnitureId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to retire furniture');
      }
      
      const data = await response.json();
      alert(data.message);
      
      // Now the beacon is available
      setBeaconValidated(true);
      setValidationError('');
    } catch (error) {
      console.error('Error retiring furniture:', error);
      setValidationError('Failed to retire previous furniture. Please try again.');
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) {
      return;
    }

    try {
      const response = await fetch('/api/furniture/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newCategory }),
      });

      if (!response.ok) {
        throw new Error('Failed to add category');
      }

      const addedCategory = await response.json();
      setCategories([...categories, addedCategory]);
      setCategory(addedCategory.id.toString());
      setNewCategory('');
      setShowNewCategoryForm(false);
    } catch (error) {
      console.error('Error adding category:', error);
      alert('Failed to add new category. Please try again.');
    }
  };

  const handleCategoryChange = (e) => {
    const value = e.target.value;
    if (value === 'new') {
      setShowNewCategoryForm(true);
      setCategory('');
    } else {
      setCategory(value);
      setShowNewCategoryForm(false);
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    setImages(files);
    
    // Generate preview URLs for the selected images
    const previewUrls = files.map(file => URL.createObjectURL(file));
    setImagePreviewUrls(previewUrls);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!beaconValidated) {
      setValidationError('Please validate the beacon UUID first');
      return;
    }
    
    if (!name.trim()) {
      setValidationError('Please enter an item name');
      return;
    }
    
    if (!category) {
      setValidationError('Please select a category');
      return;
    }
    
    const formData = new FormData();
    formData.append('name', name);
    formData.append('categoryId', category);
    formData.append('description', description);
    formData.append('beaconUUID', beaconUUID);
    
    // Append images to the FormData object
    images.forEach((image, index) => {
      formData.append('images', image);
    });
    
    try {
      await onSubmit(formData);
      
      // Clean up image preview URLs
      imagePreviewUrls.forEach(url => URL.revokeObjectURL(url));
      setImagePreviewUrls([]);
    } catch (error) {
      console.error('Error submitting form:', error);
      setValidationError('Failed to add item. Please try again.');
    }
  };

  return (
    <form className="add-item-form" onSubmit={handleSubmit}>
      {validationError && (
        <div className="validation-error">{validationError}</div>
      )}
      
      <div className="form-section">
        <h2>Step 1: Register Beacon</h2>
        <div className="form-group">
          <label htmlFor="beaconUUID">Beacon UUID</label>
          <div className="beacon-input">
            <input
              type="text"
              id="beaconUUID"
              value={beaconUUID}
              onChange={(e) => setBeaconUUID(e.target.value)}
              disabled={beaconValidated}
              placeholder="Enter beacon UUID (must contain PNCLDGS)"
              className="beacon-uuid-input"
              required
            />
            {!beaconValidated && (
              <button 
                type="button"
                onClick={validateBeacon}
                className="validate-btn"
              >
                Validate
              </button>
            )}
          </div>
          {beaconValidated && (
            <div className="validation-success">
              ✓ Beacon validated successfully!
            </div>
          )}
        </div>
      </div>

      {beaconValidated && (
        <div className="form-section">
          <h2>Step 2: Item Details</h2>
          
          <div className="form-group">
            <label htmlFor="name">Item Name</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter item name"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="category">Furniture Category</label>
            <select
              id="category"
              value={category}
              onChange={handleCategoryChange}
              required
            >
              <option value="">Select category...</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id.toString()}>
                  {cat.name}
                </option>
              ))}
              <option value="new">+ Add new category</option>
            </select>
          </div>
          
          {showNewCategoryForm && (
            <div className="form-group new-category-form">
              <label htmlFor="newCategory">New Category Name</label>
              <div className="new-category-input">
                <input
                  type="text"
                  id="newCategory"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Enter new category name"
                />
                <button 
                  type="button"
                  onClick={handleAddCategory}
                  className="add-category-btn"
                >
                  Add
                </button>
              </div>
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter item description"
              rows={4}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="images">Upload Images</label>
            <input
              type="file"
              id="images"
              onChange={handleImageUpload}
              multiple
              accept="image/*"
              className="file-input"
            />
            
            {imagePreviewUrls.length > 0 && (
              <div className="image-preview-container">
                {imagePreviewUrls.map((url, index) => (
                  <div key={index} className="image-preview-item">
                    <img src={url} alt={`Preview ${index + 1}`} />
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="form-actions">
            <button
              type="submit"
              disabled={isSubmitting}
              className="submit-btn"
            >
              {isSubmitting ? 'Registering...' : 'Register Item'}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}

export default AddItemForm;