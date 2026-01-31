"""
Flask API for solar power prediction using XGBoost
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
from model import SolarPredictionModel
from data_processor import SolarDataProcessor
import numpy as np
import traceback

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend communication

# Initialize model and data processor
model = SolarPredictionModel()
processor = SolarDataProcessor()

# Sync feature columns if model is already trained (from disk)
if model.is_trained:
    processor.feature_columns = getattr(model, 'feature_columns', [])


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'HelioSyn Solar Prediction API',
        'version': '1.0.0'
    })


@app.route('/api/model/status', methods=['GET'])
def get_model_status():
    """Get current model status and metrics"""
    try:
        status = model.get_status()
        return jsonify({
            'success': True,
            'data': status
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/train', methods=['POST'])
def train_model():
    """
    Train the XGBoost model with historical data
    
    Expected JSON payload:
    {
        "solar_data": [{"timestamp": 0, "value": 0.5}, ...],
        "weather_data": [{"timestamp": 0, "value": 25.0}, ...] (optional)
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'solar_data' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing solar_data in request'
            }), 400
        
        solar_data = data['solar_data']
        weather_data = data.get('weather_data', None)
        
        print(f"Received {len(solar_data)} solar data points")
        
        # Prepare training data
        df, feature_cols = processor.prepare_training_data(
            solar_data=solar_data,
            weather_data=weather_data,
            include_lags=True,
            include_rolling=True
        )
        
        print(f"Prepared {len(df)} samples with {len(feature_cols)} features")
        
        # Extract features and target
        X = df[feature_cols]
        y = df['value']
        
        # Train the model
        metrics = model.train(X, y)
        
        return jsonify({
            'success': True,
            'message': 'Model trained successfully',
            'metrics': metrics,
            'feature_importance': model.get_feature_importance(top_n=10)
        })
        
    except Exception as e:
        print(f"Error during training: {e}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500


@app.route('/api/predict', methods=['POST'])
def predict():
    """
    Make solar power predictions
    
    Expected JSON payload:
    {
        "hours": [0, 1, 2, ..., 23],
        "weather_data": [{"timestamp": 0, "value": 25.0}, ...] (optional),
        "last_known_values": [5.2, 4.8, 4.5, 3.2] (optional, for lag features)
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'hours' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing hours in request'
            }), 400
        
        if not model.is_trained:
            return jsonify({
                'success': False,
                'error': 'Model is not trained. Please train the model first.'
            }), 400
        
        hours = data['hours']
        weather_data = data.get('weather_data', None)
        last_known_values = data.get('last_known_values', None)
        start_timestamp = data.get('start_timestamp', None)
        
        # Prepare prediction data
        X = processor.prepare_prediction_data(
            hours=hours,
            weather_data=weather_data,
            last_known_values=last_known_values,
            start_timestamp=start_timestamp
        )
        
        # Make predictions with confidence intervals
        predictions, lower_bound, upper_bound = model.predict_with_confidence(X)
        
        # Format response
        results = []
        for i, hour in enumerate(hours):
            results.append({
                'hour': hour,
                'predicted_power': float(predictions[i]),
                'lower_bound': float(lower_bound[i]),
                'upper_bound': float(upper_bound[i])
            })
        
        return jsonify({
            'success': True,
            'predictions': results,
            'model_metrics': {
                'test_rmse': model.training_metrics.get('test_rmse', 0),
                'test_r2': model.training_metrics.get('test_r2', 0)
            }
        })
        
    except Exception as e:
        print(f"Error during prediction: {e}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500


@app.route('/api/feature-importance', methods=['GET'])
def get_feature_importance():
    """Get feature importance from the trained model"""
    try:
        if not model.is_trained:
            return jsonify({
                'success': False,
                'error': 'Model is not trained yet'
            }), 400
        
        top_n = request.args.get('top_n', default=10, type=int)
        importance = model.get_feature_importance(top_n=top_n)
        
        return jsonify({
            'success': True,
            'feature_importance': importance
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


if __name__ == '__main__':
    print("=" * 60)
    print("HelioSyn Solar Prediction API")
    print("=" * 60)
    print("Starting Flask server on http://localhost:5000")
    print("Endpoints:")
    print("  GET  /api/health - Health check")
    print("  GET  /api/model/status - Get model status")
    print("  POST /api/train - Train the model")
    print("  POST /api/predict - Make predictions")
    print("  GET  /api/feature-importance - Get feature importance")
    print("=" * 60)
    
    app.run(debug=True, host='0.0.0.0', port=5000)
