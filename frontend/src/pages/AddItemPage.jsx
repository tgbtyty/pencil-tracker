import { useState } from 'react';
import './AddItemForm.css';

function AddItemForm({ onSubmit, isSubmitting }) {
  const [beaconUUID, setBeaconUUID] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState([]);
  const [name, setName] = useState('');
  const [beaconValidated, setBeaconValidated] = useState(false);

  // Simulated categories - would come from API in real app
  const categories = [
    { id: 1, name: 'Sofa' },
    { id: 2, name: 'Chair' },
    { id: 3, name: 'Table' },
    { id: 4, name: 'Bed' },
    { id: 5, name: 'Cabinet' }
  ];

  const validateBeacon = () => {
    // This would check if the beacon exists and is available
    // For now we'll just simulate validation
    if (beaconUUID.length > 8) {
      setBeaconValidated(true);
    } else {
      alert('Please enter a valid Beacon UUID');
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    setImages(files);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!beaconValidated) {
      alert('Please validate the beacon UUID first');
      return;
    }
    
    const formData = {
      beaconUUID,
      category,
      name,
      description,
      images
    };
    
    onSubmit(formData);
  };

  return (
    <form className="add-item-form" onSubmit={handleSubmit}>
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
              placeholder="Enter beacon UUID"
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
              onChange={(e) => setCategory(e.target.value)}
              required
            >
              <option value="">Select category...</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
              <option value="new">+ Add new category</option>
            </select>
          </div>
          
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
            />
            <div className="image-preview">
              {images.length > 0 && (
                <span>{images.length} files selected</span>
              )}
            </div>
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