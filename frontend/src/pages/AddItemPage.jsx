import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AddItemForm from '../components/AddItemForm';
import './AddItemPage.css';

function AddItemPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);
    
    try {
      // For now, let's just handle the basic text data
      const response = await fetch('/api/furniture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          categoryId: formData.categoryId,
          description: formData.description,
          beaconUUID: formData.beaconUUID
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create furniture item');
      }
      
      setSubmitSuccess(true);
      
      // Redirect to furniture list after a short delay
      setTimeout(() => {
        navigate('/furniture');
      }, 2000);
      
    } catch (error) {
      console.error('Error adding furniture:', error);
      alert('Failed to add furniture item. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="add-item-page">
      <h1>Add New Item</h1>
      <p>Register a new furniture item with a BLE beacon</p>
      
      {submitSuccess && (
        <div className="success-message">
          Item successfully added to the system!
        </div>
      )}
      
      <AddItemForm 
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}

export default AddItemPage;