from flask import Flask, request, jsonify
from flask_cors import CORS  # Import CORS
from pymongo import MongoClient  # Import MongoDB
from bson import ObjectId  # Import ObjectId for handling MongoDB document IDs
import numpy as np
import pickle

# Initialize Flask app
app = Flask(__name__)

# Enable CORS for all routes
CORS(app)

# Connect to MongoDB
client = MongoClient("mongodb://localhost:27017/")  # Replace with your MongoDB connection string if hosted remotely
db = client["agroassist_db"]  # Database name
predictions_collection = db["predictions"]  # Collection name

# Load your machine learning model and scalers
model = pickle.load(open('model.pkl', 'rb'))
sc = pickle.load(open('standscaler.pkl', 'rb'))
ms = pickle.load(open('minmaxscaler.pkl', 'rb'))

@app.route("/")
def index():
    return "API is running."

@app.route("/predict", methods=['POST'])
def predict():
    # Parse input data from request
    data = request.json
    N = float(data['Nitrogen'])
    P = float(data['Phosporus'])
    K = float(data['Potassium'])
    temp = float(data['Temperature'])
    humidity = float(data['Humidity'])
    ph = float(data['Ph'])
    rainfall = float(data['Rainfall'])

    # Feature processing
    feature_list = [N, P, K, temp, humidity, ph, rainfall]
    single_pred = np.array(feature_list).reshape(1, -1)
    scaled_features = ms.transform(single_pred)
    final_features = sc.transform(scaled_features)
    
    # Generate predictions
    probabilities = model.predict_proba(final_features)[0]
    top_5_indices = probabilities.argsort()[-5:][::-1]

    crop_dict = {1: "Rice", 2: "Maize", 3: "Jute", 4: "Cotton", 5: "Coconut", 6: "Papaya",
                 7: "Orange", 8: "Apple", 9: "Muskmelon", 10: "Watermelon", 11: "Grapes",
                 12: "Mango", 13: "Banana", 14: "Pomegranate", 15: "Lentil", 16: "Blackgram",
                 17: "Mungbean", 18: "Mothbeans", 19: "Pigeonpeas", 20: "Kidneybeans",
                 21: "Chickpea", 22: "Coffee"}

    top_5_crops = [{"crop": crop_dict.get(i+1, "Unknown"), "probability": probabilities[i]} for i in top_5_indices]

    # Save input and predictions to MongoDB
    document = {
        "input_data": {
            "Nitrogen": N,
            "Phosporus": P,
            "Potassium": K,
            "Temperature": temp,
            "Humidity": humidity,
            "Ph": ph,
            "Rainfall": rainfall
        },
        "predictions": top_5_crops,
        "selected_crops": []  # Placeholder for selected crops
    }
    inserted_doc = predictions_collection.insert_one(document)

    return jsonify({"top_5_crops": top_5_crops, "document_id": str(inserted_doc.inserted_id)})

@app.route("/store-selected-crops", methods=['POST'])
def store_selected_crops():
    # Parse selected crops and document ID from request
    data = request.json
    selected_crops = data.get("selected_crops", [])
    document_id = data.get("document_id")

    if not selected_crops:
        return jsonify({"message": "No crops selected!"}), 400

    if not document_id:
        return jsonify({"message": "Document ID is required!"}), 400

    try:
        # Convert document_id to ObjectId and update the document in MongoDB
        result = predictions_collection.update_one(
            {"_id": ObjectId(document_id)},  # Use ObjectId to query the document
            {"$set": {"selected_crops": selected_crops}}
        )

        if result.modified_count == 1:
            return jsonify({"message": "Selected crops updated successfully!"})
        else:
            return jsonify({"message": "Document not found or not updated!"}), 404

    except Exception as e:
        return jsonify({"message": f"An error occurred: {str(e)}"}), 500

if __name__ == "__main__":
    app.run(debug=True)
