import { useState } from 'react';
import AddItemForm from '../components/AddItemForm';
import './AddItemPage.css';

function AddItemPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);
    
    // This would be an API call in a real application
    console.log('Form data to submit:', formData);
    
    // Simulate API delay
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitSuccess(true);
      
      // Reset success message after 3 seconds
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 3000);
    }, 1500);
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