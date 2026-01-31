# HelioSyn - AI-Powered Solar Energy Optimization

HelioSyn is an advanced solar energy optimization platform that uses XGBoost machine learning for accurate solar power prediction and intelligent scheduling to maximize renewable energy usage.

## 🌟 Features

- **XGBoost ML Predictions**: Accurate solar power forecasting using gradient boosting
- **Smart Scheduling**: AI-driven appliance scheduling to maximize solar energy usage
- **Real-time Optimization**: Physics-based simulation with thermal management
- **Interactive Dashboards**: Beautiful visualizations for energy metrics and predictions
- **Confidence Intervals**: Prediction uncertainty quantification
- **Feature Importance**: Understand which factors drive solar predictions

## 🏗️ Architecture

### Frontend (React + TypeScript)
- Modern React 19 with TypeScript
- Recharts for data visualization
- TailwindCSS for styling
- Vite for fast development

### Backend (Python + Flask)
- Flask REST API
- XGBoost for ML predictions
- Pandas for data processing
- Feature engineering pipeline

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.8+ and pip

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd HelioSyn
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd backend
   python -m venv venv
   
   # Windows
   venv\Scripts\activate
   
   # Linux/Mac
   source venv/bin/activate
   
   pip install -r requirements.txt
   cd ..
   ```

4. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

### Running the Application

#### Option 1: Run Both Servers Together (Recommended)
```bash
npm run dev:full
```

This will start:
- Frontend dev server on `http://localhost:5173`
- Backend API server on `http://localhost:5000`

#### Option 2: Run Servers Separately

**Terminal 1 - Frontend:**
```bash
npm run dev
```

**Terminal 2 - Backend:**
```bash
npm run backend
```

## 📊 Using ML Solar Prediction

### 1. Train the Model

1. Navigate to the Dashboard
2. Upload your solar generation history CSV
3. Optionally upload weather data CSV
4. Click "Train XGBoost" in the ML Solar Prediction section
5. Wait for training to complete (you'll see metrics like RMSE and R²)

### 2. View Predictions

1. Navigate to Results page
2. The XGBoost Solar Power Forecast chart will display automatically
3. View 24-hour predictions with confidence intervals
4. Compare predicted vs actual values (if available)

### 3. CSV Data Format

**Solar Data:**
```csv
timestamp,value
0,0.0
1,0.5
2,1.2
...
23,0.1
```

**Weather Data:**
```csv
timestamp,value
0,25.0
1,24.5
2,24.0
...
23,26.0
```

## 🔧 API Endpoints

### Health Check
```http
GET /api/health
```

### Get Model Status
```http
GET /api/model/status
```

### Train Model
```http
POST /api/train
Content-Type: application/json

{
  "solar_data": [{"timestamp": 0, "value": 0.5}, ...],
  "weather_data": [{"timestamp": 0, "value": 25.0}, ...]
}
```

### Make Predictions
```http
POST /api/predict
Content-Type: application/json

{
  "hours": [0, 1, 2, ..., 23],
  "weather_data": [...],
  "last_known_values": [5.2, 4.8, 4.5, 3.2]
}
```

### Get Feature Importance
```http
GET /api/feature-importance?top_n=10
```

## 🧠 ML Model Features

The XGBoost model uses the following features for prediction:

- **Time Features**: Hour, day of year, month, season
- **Cyclical Encoding**: Sin/cos transformations for temporal patterns
- **Weather**: Temperature data
- **Lag Features**: Previous 1, 2, 3, and 24 hours of solar output
- **Rolling Statistics**: Mean and standard deviation over 3, 6, 12 hour windows

## 📈 Model Performance

After training, the model provides:
- **RMSE** (Root Mean Square Error): Prediction accuracy in kW
- **MAE** (Mean Absolute Error): Average prediction error
- **R² Score**: Model fit quality (0-1, higher is better)
- **Feature Importance**: Rankings of most influential features

## 🎨 UI Components

### Dashboard
- File upload for solar, weather, load, and tariff data
- Appliance registry with power ratings and priorities
- ML model training interface with status indicators
- Advanced simulation parameters

### Results
- Energy savings comparison (Smart vs Baseline)
- Carbon footprint reduction metrics
- Grid dependency visualization
- Thermal safety comparison
- XGBoost solar power forecast with confidence intervals
- Detailed job execution timeline

## 🛠️ Development

### Project Structure
```
HelioSyn/
├── backend/
│   ├── api.py              # Flask REST API
│   ├── model.py            # XGBoost model
│   ├── data_processor.py   # Feature engineering
│   ├── requirements.txt    # Python dependencies
│   └── README.md           # Backend documentation
├── src/
│   ├── components/
│   │   ├── FileUpload.tsx
│   │   └── PredictionChart.tsx
│   ├── lib/
│   │   ├── predictionService.ts
│   │   ├── simulation.ts
│   │   └── physicsModels.ts
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   └── Results.tsx
│   └── main.tsx
├── .env                    # Environment variables
├── package.json
└── README.md
```

### Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## 🐛 Troubleshooting

### Backend API Not Connecting
- Ensure Python backend is running on port 5000
- Check `VITE_PREDICTION_API_URL` in `.env`
- Verify no firewall is blocking the connection

### Model Training Fails
- Ensure solar data CSV is properly formatted
- Check that data has enough samples (minimum 50 recommended)
- Verify Python dependencies are installed correctly

### Predictions Show Errors
- Train the model first before requesting predictions
- Ensure backend API is running and healthy
- Check browser console for detailed error messages

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues and questions, please open an issue on GitHub.

---

Built with ❤️ using React, TypeScript, Python, and XGBoost
