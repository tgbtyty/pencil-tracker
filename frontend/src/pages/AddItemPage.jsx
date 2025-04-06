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
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }
      
      const response = await fetch('/api/furniture', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData // Send the FormData directly for multipart/form-data
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create furniture item');
      }
      
      const result = await response.json();
      
      setSubmitSuccess(true);
      
      // Redirect to furniture list after a short delay
      setTimeout(() => {
        navigate('/furniture');
      }, 2000);
      
    } catch (error) {
      console.error('Error adding furniture:', error);
      alert('Failed to add furniture item: ' + error.message);
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