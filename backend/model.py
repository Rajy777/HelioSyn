"""
XGBoost model for solar power prediction
"""
import xgboost as xgb
import numpy as np
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from typing import Dict, List, Tuple, Optional
import os


class SolarPredictionModel:
    """XGBoost-based solar power prediction model"""
    
    def __init__(self, model_path: str = 'models/solar_xgboost.json'):
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
        
        # XGBoost hyperparameters optimized for time-series
        self.params = {
            'objective': 'reg:squarederror',
            'max_depth': 6,
            'learning_rate': 0.1,
            'n_estimators': 200,
            'subsample': 0.8,
            'colsample_bytree': 0.8,
            'min_child_weight': 3,
            'gamma': 0.1,
            'reg_alpha': 0.1,
            'reg_lambda': 1.0,
            'random_state': 42
        }
        
        # Try to load existing model
        self._load_model()
    
    def train(
        self, 
        X: pd.DataFrame, 
        y: pd.Series,
        test_size: float = 0.2,
        validation_split: float = 0.1
    ) -> Dict[str, float]:
        """
        Train the XGBoost model
        
        Args:
            X: Feature matrix
            y: Target variable (solar power output)
            test_size: Proportion of data for testing
            validation_split: Proportion of training data for validation
            
        Returns:
            Dictionary of training metrics
        """
        # Split data into train and test
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=42, shuffle=False
        )
        
        # Further split training data for validation
        X_train, X_val, y_train, y_val = train_test_split(
            X_train, y_train, test_size=validation_split, random_state=42, shuffle=False
        )
        
        print(f"Training set size: {len(X_train)}")
        print(f"Validation set size: {len(X_val)}")
        print(f"Test set size: {len(X_test)}")
        
        # Create XGBoost model
        self.model = xgb.XGBRegressor(**self.params)
        
        # Train with early stopping
        self.model.fit(
            X_train, y_train,
            eval_set=[(X_val, y_val)],
            verbose=False
        )
        
        # Make predictions
        y_train_pred = self.model.predict(X_train)
        y_val_pred = self.model.predict(X_val)
        y_test_pred = self.model.predict(X_test)
        
        # Calculate metrics (convert NumPy types to standard Python floats for JSON serialization)
        self.training_metrics = {
            'train_rmse': float(np.sqrt(mean_squared_error(y_train, y_train_pred))),
            'train_mae': float(mean_absolute_error(y_train, y_train_pred)),
            'train_r2': float(r2_score(y_train, y_train_pred)),
            'val_rmse': float(np.sqrt(mean_squared_error(y_val, y_val_pred))),
            'val_mae': float(mean_absolute_error(y_val, y_val_pred)),
            'val_r2': float(r2_score(y_val, y_val_pred)),
            'test_rmse': float(np.sqrt(mean_squared_error(y_test, y_test_pred))),
            'test_mae': float(mean_absolute_error(y_test, y_test_pred)),
            'test_r2': float(r2_score(y_test, y_test_pred))
        }
        
        # Store feature importance (convert to standard float)
        self.feature_importance = {
            name: float(imp) for name, imp in zip(X.columns, self.model.feature_importances_)
        }
        
        self.is_trained = True
        
        # Save the model
        self._save_model()
        
        print("\n=== Training Metrics ===")
        print(f"Train RMSE: {self.training_metrics['train_rmse']:.4f} kW")
        print(f"Val RMSE: {self.training_metrics['val_rmse']:.4f} kW")
        print(f"Test RMSE: {self.training_metrics['test_rmse']:.4f} kW")
        print(f"Test R²: {self.training_metrics['test_r2']:.4f}")
        
        return self.training_metrics
    
    def predict(self, X: pd.DataFrame) -> np.ndarray:
        """
        Make predictions using the trained model
        
        Args:
            X: Feature matrix
            
        Returns:
            Array of predictions
        """
        if not self.is_trained:
            raise ValueError("Model must be trained before making predictions")
        
        predictions = self.model.predict(X)
        
        # Ensure predictions are non-negative
        predictions = np.maximum(predictions, 0)
        
        return predictions

    def predict_recursive(self, X_template: pd.DataFrame) -> np.ndarray:
        """
        Make recursive multi-step predictions.
        Updates lag features internally for each step.
        
        Args:
            X_template: Feature matrix with base features (time, weather) 
                      and initial lag/rolling features for the first row.
            
        Returns:
            Array of recursive predictions
        """
        if not self.is_trained:
            raise ValueError("Model must be trained before making predictions")
            
        X = X_template.copy()
        
        # Ensure all columns are float to prevent TypeError: Invalid value for dtype 'int64'
        for col in X.columns:
            if X[col].dtype == 'int64' or X[col].dtype == 'int32':
                X[col] = X[col].astype(float)
        
        predictions = []
        
        for i in range(len(X)):
            # 1. Predict current step
            current_X = X.iloc[[i]]
            pred = self.model.predict(current_X)[0]
            pred = max(0, pred)
            predictions.append(pred)
            
            # 2. Update lags for FUTURE rows
            # value_lag_1 is the prediction we just made
            # value_lag_2 is what was lag_1
            # and so on
            for j in range(i + 1, len(X)):
                dist = j - i
                if dist == 1:
                    if 'value_lag_1' in X.columns: X.iloc[j, X.columns.get_loc('value_lag_1')] = pred
                elif dist == 2:
                    if 'value_lag_2' in X.columns: X.iloc[j, X.columns.get_loc('value_lag_2')] = pred
                elif dist == 3:
                    if 'value_lag_3' in X.columns: X.iloc[j, X.columns.get_loc('value_lag_3')] = pred
                elif dist == 24:
                    if 'value_lag_24' in X.columns: X.iloc[j, X.columns.get_loc('value_lag_24')] = pred
                    
                # Update rolling means as well (approximate)
                for window in [3, 6, 12]:
                    mean_col = f'value_rolling_mean_{window}'
                    if mean_col in X.columns:
                        # Simple moving average update using recent predictions
                        recent = predictions[-window:]
                        X.iloc[j, X.columns.get_loc(mean_col)] = np.mean(recent)
                        
        return np.array(predictions)

    def predict_with_confidence(self, X: pd.DataFrame, n_iterations: int = 100) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Make predictions with confidence intervals.
        Uses recursive prediction for the mean.
        """
        # Generate recursive predictions for the central estimate
        predictions = self.predict_recursive(X)
        
        # Simple confidence interval based on training error
        std_error = self.training_metrics.get('test_rmse', 0.5)
        
        # Increase uncertainty over time (recursive forecasts drift)
        uncertainty_growth = np.linspace(1.0, 2.0, len(predictions))
        
        lower_bound = np.maximum(predictions - (1.96 * std_error * uncertainty_growth), 0)
        upper_bound = predictions + (1.96 * std_error * uncertainty_growth)
        
        return predictions, lower_bound, upper_bound
    
    def get_feature_importance(self, top_n: int = 10) -> Dict[str, float]:
        """
        Get top N most important features
        
        Args:
            top_n: Number of top features to return
            
        Returns:
            Dictionary of feature names and their importance scores
        """
        if not self.feature_importance:
            return {}
        
        # Sort by importance
        sorted_features = sorted(
            self.feature_importance.items(),
            key=lambda x: x[1],
            reverse=True
        )
        
        return dict(sorted_features[:top_n])
    
    def _save_model(self):
        """Save the trained model to disk"""
        try:
            # Ensure model path is absolute to prevent issues in serverless environments
            if not os.path.isabs(self.model_path):
                 base_dir = os.path.dirname(os.path.abspath(__file__))
                 full_path = os.path.join(base_dir, self.model_path)
            else:
                 full_path = self.model_path

            try:
                # Create models directory if it doesn't exist
                os.makedirs(os.path.dirname(full_path), exist_ok=True)
                
                # Save model
                self.model.save_model(full_path)
                
                # Save metadata
                metadata = {
                    'feature_importance': self.feature_importance,
                    'training_metrics': self.training_metrics,
                    'is_trained': self.is_trained,
                    'feature_columns': list(self.feature_importance.keys())
                }
                joblib.dump(metadata, full_path.replace('.json', '_metadata.pkl'))
                
                print(f"Model saved to {full_path}")
            except (IOError, PermissionError) as pe:
                print(f"Read-only filesystem detected ({pe}). Attempting to save to /tmp...")
                # Fallback to /tmp for ephemeral persistence in serverless environments
                tmp_path = os.path.join('/tmp', os.path.basename(full_path))
                self.model.save_model(tmp_path)
                joblib.dump(metadata, tmp_path.replace('.json', '_metadata.pkl'))
                print(f"Model saved temporarily to {tmp_path}")
                
        except Exception as e:
            print(f"Error saving model: {e}")
    
    def _load_model(self):
        """Load a trained model from disk"""
        try:
            # Handle relative paths in serverless environments
            if not os.path.isabs(self.model_path):
                base_dir = os.path.dirname(os.path.abspath(__file__))
                full_path = os.path.join(base_dir, self.model_path)
            else:
                full_path = self.model_path

            # Check if a newer version exists in /tmp (ephemeral persistence)
            tmp_path = os.path.join('/tmp', os.path.basename(full_path))
            load_path = tmp_path if os.path.exists(tmp_path) else full_path

            if os.path.exists(load_path):
                self.model = xgb.XGBRegressor()
                self.model.load_model(load_path)
                
                # Load metadata
                metadata_path = load_path.replace('.json', '_metadata.pkl')
                if os.path.exists(metadata_path):
                    metadata = joblib.load(metadata_path)
                    self.feature_importance = metadata.get('feature_importance', {})
                    self.training_metrics = metadata.get('training_metrics', {})
                    self.is_trained = metadata.get('is_trained', False)
                    self.feature_columns = metadata.get('feature_columns', list(self.feature_importance.keys()))
                
                print(f"Model loaded from {load_path}")
        except Exception as e:
            print(f"No existing model found or error loading: {e}")
    
    def get_status(self) -> Dict:
        """
        Get model status and metrics
        
        Returns:
            Dictionary with model status information
        """
        return {
            'is_trained': self.is_trained,
            'metrics': self.training_metrics,
            'top_features': self.get_feature_importance(top_n=5)
        }
