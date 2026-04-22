"""
LightGBM model for solar power prediction
Replacing Scikit-Learn to reduce bundle size and remove Scipy dependency.
"""
import numpy as np
import pickle
import os
import lightgbm as lgb
from typing import Dict, List, Tuple, Optional

def manual_train_test_split(X, y, test_size=0.2, random_state=42, shuffle=False):
    """Manual NumPy-based train_test_split to remove sklearn dependency"""
    if shuffle:
        np.random.seed(random_state)
        indices = np.random.permutation(len(X))
        X = X[indices]
        y = y[indices]
    
    split_idx = int(len(X) * (1 - test_size))
    return X[:split_idx], X[split_idx:], y[:split_idx], y[split_idx:]

def calculate_metrics(y_true, y_pred):
    """Manual metrics calculation to remove sklearn dependency"""
    y_true = np.array(y_true)
    y_pred = np.array(y_pred)
    
    mse = np.mean((y_true - y_pred)**2)
    rmse = np.sqrt(mse)
    mae = np.mean(np.abs(y_true - y_pred))
    
    # R-squared
    ss_res = np.sum((y_true - y_pred)**2)
    ss_tot = np.sum((y_true - np.mean(y_true))**2)
    r2 = 1 - (ss_res / (ss_tot + 1e-10))
    
    return {
        'rmse': float(rmse),
        'mae': float(mae),
        'r2': float(r2)
    }

class SolarPredictionModel:
    """LightGBM-based solar power prediction model"""
    
    def __init__(self, model_path: str = 'models/solar_model.pkl'):
        """
        Initialize the solar prediction model
        
        Args:
            model_path: Path to save/load the trained model
        """
        self.model_path = model_path
        self.model = None
        self.is_trained = False
        self.feature_importance = {}
        self.training_metrics = {}
        self.feature_columns = []
        
        # LightGBM hyperparameters
        self.params = {
            'objective': 'regression',
            'metric': 'rmse',
            'boosting_type': 'gbdt',
            'num_leaves': 31,
            'learning_rate': 0.05,
            'feature_fraction': 0.9,
            'bagging_fraction': 0.8,
            'bagging_freq': 5,
            'verbose': -1,
            'random_state': 42,
            'n_estimators': 200
        }
        
        # Try to load existing model
        self._load_model()
    
    def train(
        self, 
        X: np.ndarray, 
        y: np.ndarray,
        feature_names: List[str],
        test_size: float = 0.2,
        validation_split: float = 0.1
    ) -> Dict[str, float]:
        """
        Train the LightGBM model
        """
        self.feature_columns = feature_names
        
        # Split data into train and test
        X_train, X_test, y_train, y_test = manual_train_test_split(
            X, y, test_size=test_size, shuffle=False
        )
        
        # Further split training data for validation
        X_train, X_val, y_train, y_val = manual_train_test_split(
            X_train, y_train, test_size=validation_split, shuffle=False
        )
        
        print(f"Training set size: {len(X_train)}")
        print(f"Validation set size: {len(X_val)}")
        print(f"Test set size: {len(X_test)}")
        
        # Create and train LightGBM model
        self.model = lgb.LGBMRegressor(**self.params)
        
        # Train the model
        self.model.fit(
            X_train, y_train,
            eval_set=[(X_val, y_val)],
            callbacks=[lgb.early_stopping(stopping_rounds=20)]
        )
        
        # Make predictions
        y_train_pred = self.model.predict(X_train)
        y_val_pred = self.model.predict(X_val)
        y_test_pred = self.model.predict(X_test)
        
        # Calculate metrics
        train_metrics = calculate_metrics(y_train, y_train_pred)
        val_metrics = calculate_metrics(y_val, y_val_pred)
        test_metrics = calculate_metrics(y_test, y_test_pred)
        
        self.training_metrics = {
            'train_rmse': train_metrics['rmse'],
            'train_mae': train_metrics['mae'],
            'train_r2': train_metrics['r2'],
            'val_rmse': val_metrics['rmse'],
            'val_mae': val_metrics['mae'],
            'val_r2': val_metrics['r2'],
            'test_rmse': test_metrics['rmse'],
            'test_mae': test_metrics['mae'],
            'test_r2': test_metrics['r2']
        }
        
        # Store feature importance
        importances = self.model.feature_importances_
        self.feature_importance = {
            name: float(imp) for name, imp in zip(feature_names, importances)
        }
        
        self.is_trained = True
        self._save_model()
        
        return self.training_metrics
    
    def predict(self, X: np.ndarray) -> np.ndarray:
        """Make predictions"""
        if not self.is_trained:
            raise ValueError("Model must be trained before making predictions")
        
        predictions = self.model.predict(X)
        return np.maximum(predictions, 0)

    def predict_recursive(self, X: np.ndarray) -> np.ndarray:
        """Make recursive multi-step predictions"""
        if not self.is_trained:
            raise ValueError("Model must be trained before making predictions")
            
        X = X.copy()
        predictions = []
        
        # Identify indices of lag columns
        feature_names = self.feature_columns
        lag_indices = {
            f'value_lag_{lag}': feature_names.index(f'value_lag_{lag}') 
            for lag in [1, 2, 3, 24] if f'value_lag_{lag}' in feature_names
        }
        
        rolling_mean_indices = {
            f'value_rolling_mean_{w}': feature_names.index(f'value_rolling_mean_{w}')
            for w in [3, 6, 12] if f'value_rolling_mean_{w}' in feature_names
        }
        
        for i in range(len(X)):
            current_X = X[[i]]
            pred = self.model.predict(current_X)[0]
            pred = max(0, pred)
            predictions.append(pred)
            
            for j in range(i + 1, len(X)):
                dist = j - i
                lag_key = f'value_lag_{dist}'
                if lag_key in lag_indices:
                    X[j, lag_indices[lag_key]] = pred
                    
                for w_key, w_idx in rolling_mean_indices.items():
                    window = int(w_key.split('_')[-1])
                    recent = predictions[-window:]
                    X[j, w_idx] = np.mean(recent) if recent else 0
                        
        return np.array(predictions)

    def predict_with_confidence(self, X: np.ndarray, n_iterations: int = 100) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """Make predictions with confidence intervals"""
        predictions = self.predict_recursive(X)
        std_error = self.training_metrics.get('test_rmse', 0.5)
        uncertainty_growth = np.linspace(1.0, 2.0, len(predictions))
        
        lower_bound = np.maximum(predictions - (1.96 * std_error * uncertainty_growth), 0)
        upper_bound = predictions + (1.96 * std_error * uncertainty_growth)
        
        return predictions, lower_bound, upper_bound
    
    def get_feature_importance(self, top_n: int = 10) -> Dict[str, float]:
        """Get top N features"""
        if not self.feature_importance:
            return {}
        sorted_features = sorted(self.feature_importance.items(), key=lambda x: x[1], reverse=True)
        return dict(sorted_features[:top_n])
    
    def _save_model(self):
        """Save model using pickle"""
        try:
            full_path = self.model_path if os.path.isabs(self.model_path) else os.path.join(os.path.dirname(os.path.abspath(__file__)), self.model_path)
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            
            model_data = {
                'model_obj': self.model,
                'feature_importance': self.feature_importance,
                'training_metrics': self.training_metrics,
                'is_trained': self.is_trained,
                'feature_columns': self.feature_columns
            }
            
            with open(full_path, 'wb') as f:
                pickle.dump(model_data, f)
            print(f"Model saved to {full_path}")
        except Exception as e:
            print(f"Error saving model: {e}")
    
    def _load_model(self):
        """Load model using pickle"""
        try:
            full_path = self.model_path if os.path.isabs(self.model_path) else os.path.join(os.path.dirname(os.path.abspath(__file__)), self.model_path)
            tmp_path = os.path.join('/tmp', os.path.basename(full_path))
            load_path = tmp_path if os.path.exists(tmp_path) else full_path

            if os.path.exists(load_path):
                with open(load_path, 'rb') as f:
                    model_data = pickle.load(f)
                
                self.model = model_data.get('model_obj')
                self.feature_importance = model_data.get('feature_importance', {})
                self.training_metrics = model_data.get('training_metrics', {})
                self.is_trained = model_data.get('is_trained', False)
                self.feature_columns = model_data.get('feature_columns', [])
                
                print(f"Model loaded from {load_path}")
        except Exception as e:
            print(f"No existing model found: {e}")

    def get_status(self) -> Dict:
        return {
            'is_trained': self.is_trained,
            'metrics': self.training_metrics,
            'top_features': self.get_feature_importance(top_n=5)
        }
