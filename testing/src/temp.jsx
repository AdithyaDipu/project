import React, { useState } from 'react';

function CropRecommendation() {
  const [formData, setFormData] = useState({
    Nitrogen: '',
    Phosporus: '',
    Potassium: '',
    Temperature: '',
    Humidity: '',
    Ph: '',
    Rainfall: '',
  });

  const [result, setResult] = useState(null);
  const [selectedCrops, setSelectedCrops] = useState([]);
  const [documentId, setDocumentId] = useState(null);
  const [status, setStatus] = useState('');

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Handle prediction request
  const handlePredict = async (e) => {
    e.preventDefault();
    setStatus('Predicting...');
    try {
      const response = await fetch('http://127.0.0.1:5000/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      setResult(data.top_5_crops);
      setDocumentId(data.document_id); // Save the document ID for later
      setStatus('Prediction successful! Select crops to save.');
    } catch (error) {
      console.error('Error fetching prediction:', error);
      setStatus('An error occurred while predicting. Please try again.');
    }
  };

  // Handle crop selection
  const handleSelectCrop = (crop) => {
    setSelectedCrops((prev) =>
      prev.includes(crop) ? prev.filter((c) => c !== crop) : [...prev, crop]
    );
  };

  // Handle saving selected crops
  const handleSaveCrops = async () => {
    if (!documentId) {
      setStatus('Document ID is missing!');
      return;
    }

    setStatus('Saving selected crops...');
    try {
      const response = await fetch('http://127.0.0.1:5000/store-selected-crops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selected_crops: selectedCrops, document_id: documentId }),
      });
      const data = await response.json();
      setStatus(data.message);
    } catch (error) {
      console.error('Error saving selected crops:', error);
      setStatus('An error occurred while saving selected crops.');
    }
  };

  return (
    <div>
      <h1>Crop Recommendation System</h1>
      <form onSubmit={handlePredict}>
        <input
          type="number"
          name="Nitrogen"
          placeholder="Nitrogen"
          value={formData.Nitrogen}
          onChange={handleChange}
          required
        />
        <input
          type="number"
          name="Phosporus"
          placeholder="Phosphorus"
          value={formData.Phosporus}
          onChange={handleChange}
          required
        />
        <input
          type="number"
          name="Potassium"
          placeholder="Potassium"
          value={formData.Potassium}
          onChange={handleChange}
          required
        />
        <input
          type="number"
          name="Temperature"
          placeholder="Temperature"
          value={formData.Temperature}
          onChange={handleChange}
          required
        />
        <input
          type="number"
          name="Humidity"
          placeholder="Humidity"
          value={formData.Humidity}
          onChange={handleChange}
          required
        />
        <input
          type="number"
          name="Ph"
          placeholder="pH"
          value={formData.Ph}
          onChange={handleChange}
          required
        />
        <input
          type="number"
          name="Rainfall"
          placeholder="Rainfall"
          value={formData.Rainfall}
          onChange={handleChange}
          required
        />
        <button type="submit">Predict</button>
      </form>

      <p>{status}</p>

      {result && (
        <div>
          <h2>Top 5 Crop Recommendations</h2>
          <ul>
            {result.map((item, index) => (
              <li key={index}>
                <label>
                  <input
                    type="checkbox"
                    value={item.crop}
                    checked={selectedCrops.includes(item.crop)}
                    onChange={() => handleSelectCrop(item.crop)}
                  />
                  {item.crop} (Probability: {item.probability.toFixed(2)})
                </label>
              </li>
            ))}
          </ul>
          <button onClick={handleSaveCrops}>Save Selected Crops</button>
        </div>
      )}
    </div>
  );
}

export default CropRecommendation;
