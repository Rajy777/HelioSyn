# HelioSyn Backend - Solar Prediction API

XGBoost-based solar power prediction service for HelioSyn.

## Setup

### 1. Create Virtual Environment

```bash
cd backend
python -m venv venv
```

### 2. Activate Virtual Environment

**Windows:**
```bash
venv\Scripts\activate
```

**Linux/Mac:**
```bash
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

## Running the API

```bash
python api.py
```

The API will start on `http://localhost:5000`

## API Endpoints

### Health Check
```
GET /api/health
```

### Get Model Status
```
GET /api/model/status
```

### Train Model
```
POST /api/train
Content-Type: application/json

{
  "solar_data": [
    {"timestamp": 0, "value": 0.0},
    {"timestamp": 1, "value": 0.5},
    ...
  ],
  "weather_data": [
    {"timestamp": 0, "value": 25.0},
    ...
  ]
}
```

### Make Predictions
```
POST /api/predict
Content-Type: application/json

{
  "hours": [0, 1, 2, ..., 23],
  "weather_data": [...],
  "last_known_values": [5.2, 4.8, 4.5, 3.2]
}
```

### Get Feature Importance
```
GET /api/feature-importance?top_n=10
```

## Model Features

The XGBoost model uses the following features:
- **Time Features**: Hour, day of year, month, season
- **Cyclical Encoding**: Sin/cos transformations for temporal patterns
- **Weather**: Temperature data
- **Lag Features**: Previous 1, 2, 3, and 24 hours
- **Rolling Statistics**: Mean and std over 3, 6, 12 hour windows

## Model Performance

After training, the model provides:
- RMSE (Root Mean Square Error)
- MAE (Mean Absolute Error)
- R² Score
- Feature importance rankings
