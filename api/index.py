import json
from backend.model import SolarPredictionModel
from backend.data_processor import SolarDataProcessor
import traceback

# Initialize model and data processor at module level
model = SolarPredictionModel()
processor = SolarDataProcessor()

if model.is_trained:
    processor.feature_columns = getattr(model, 'feature_columns', [])

def handler(environ, start_response):
    path = environ.get('PATH_INFO', '')
    method = environ.get('REQUEST_METHOD', 'GET')
    
    # Simple Router
    if path == '/api/health':
        return response_json(start_response, {'status': 'healthy', 'service': 'HelioSyn Native API'})
    
    if path == '/api/model/status':
        return response_json(start_response, {'success': True, 'data': model.get_status()})
    
    if method == 'POST':
        try:
            request_body_size = int(environ.get('CONTENT_LENGTH', 0))
            request_body = environ['wsgi.input'].read(request_body_size)
            data = json.loads(request_body)
            
            if path == '/api/train':
                return handle_train(start_response, data)
            elif path == '/api/predict':
                return handle_predict(start_response, data)
                
        except Exception as e:
            return response_json(start_response, {'success': False, 'error': str(e), 'trace': traceback.format_exc()}, status='500 Internal Server Error')
            
    if path == '/api/feature-importance':
        importance = model.get_feature_importance(top_n=10)
        return response_json(start_response, {'success': True, 'feature_importance': importance})

    return response_json(start_response, {'error': 'Not Found'}, status='404 Not Found')

def handle_train(start_response, data):
    if not data or 'solar_data' not in data:
        return response_json(start_response, {'success': False, 'error': 'Missing solar_data'}, status='400 Bad Request')
    
    X, y, feature_cols = processor.prepare_training_data(
        solar_data=data['solar_data'],
        weather_data=data.get('weather_data'),
        include_lags=True,
        include_rolling=True
    )
    metrics = model.train(X, y, feature_names=feature_cols)
    return response_json(start_response, {
        'success': True, 
        'metrics': metrics, 
        'feature_importance': model.get_feature_importance()
    })

def handle_predict(start_response, data):
    if not data or 'hours' not in data:
        return response_json(start_response, {'success': False, 'error': 'Missing hours'}, status='400 Bad Request')
    
    if not model.is_trained:
        return response_json(start_response, {'success': False, 'error': 'Model not trained'}, status='400 Bad Request')
    
    X = processor.prepare_prediction_data(
        hours=data['hours'],
        weather_data=data.get('weather_data'),
        last_known_values=data.get('last_known_values'),
        start_timestamp=data.get('start_timestamp')
    )
    predictions, lower, upper = model.predict_with_confidence(X)
    
    results = []
    for i, hour in enumerate(data['hours']):
        results.append({
            'hour': hour,
            'predicted_power': float(predictions[i]),
            'lower_bound': float(lower[i]),
            'upper_bound': float(upper[i])
        })
        
    return response_json(start_response, {
        'success': True,
        'predictions': results,
        'model_metrics': model.training_metrics
    })

def response_json(start_response, data, status='200 OK'):
    body = json.dumps(data).encode('utf-8')
    headers = [
        ('Content-Type', 'application/json'),
        ('Content-Length', str(len(body))),
        ('Access-Control-Allow-Origin', '*'),
        ('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'),
        ('Access-Control-Allow-Headers', 'Content-Type')
    ]
    start_response(status, headers)
    return [body]

# Alias for Vercel
app = handler
