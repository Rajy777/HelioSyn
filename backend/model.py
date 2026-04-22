"""
Pure NumPy Random Forest model for solar power prediction.
Replaces LightGBM and Scikit-Learn to ensure the Lambda bundle size remains <50MB
and completely eliminates OS-level library dependencies (like libgomp.so) on Vercel.
"""
import numpy as np
import pickle
import os
from typing import Dict, List, Tuple, Optional

def manual_train_test_split(X, y, test_size=0.2, random_state=42, shuffle=False):
    """Manual NumPy-based train_test_split"""
    if shuffle:
        np.random.seed(random_state)
        indices = np.random.permutation(len(X))
        X = X[indices]
        y = y[indices]
    
    split_idx = int(len(X) * (1 - test_size))
    return X[:split_idx], X[split_idx:], y[:split_idx], y[split_idx:]

def calculate_metrics(y_true, y_pred):
    """Manual metrics calculation"""
    y_true = np.array(y_true)
    y_pred = np.array(y_pred)
    
    mse = np.mean((y_true - y_pred)**2)
    rmse = np.sqrt(mse)
    mae = np.mean(np.abs(y_true - y_pred))
    
    ss_res = np.sum((y_true - y_pred)**2)
    ss_tot = np.sum((y_true - np.mean(y_true))**2)
    r2 = 1 - (ss_res / (ss_tot + 1e-10))
    
    return {
        'rmse': float(rmse),
        'mae': float(mae),
        'r2': float(r2)
    }

class NumpyDecisionTree:
    """A minimal regression tree implementation using pure NumPy"""
    def __init__(self, max_depth=5, min_samples_split=2):
        self.max_depth = max_depth
        self.min_samples_split = min_samples_split
        self.tree = None

    def fit(self, X, y, depth=0):
        n_samples, n_features = X.shape
        if n_samples >= self.min_samples_split and depth < self.max_depth and np.var(y) > 0:
            best_split = self._best_split(X, y, n_features)
            if best_split["var_red"] > 0:
                left_subtree = self.fit(best_split["X_left"], best_split["y_left"], depth + 1)
                right_subtree = self.fit(best_split["X_right"], best_split["y_right"], depth + 1)
                return {"feature_idx": best_split["feature_idx"], "threshold": best_split["threshold"],
                        "left": left_subtree, "right": right_subtree, "value": None}
        
        leaf_value = np.mean(y) if len(y) > 0 else 0
        return {"value": leaf_value}

    def _best_split(self, X, y, n_features):
        best_split = {"var_red": -1}
        max_var_red = -float("inf")
        
        # Only check a subset of features for faster training
        feature_indices = np.random.choice(n_features, max(1, int(np.sqrt(n_features))), replace=False)
        
        for feature_idx in feature_indices:
            feature_values = X[:, feature_idx]
            possible_thresholds = np.unique(feature_values)
            if len(possible_thresholds) > 10:
                possible_thresholds = np.quantile(possible_thresholds, np.linspace(0.1, 0.9, 10))
            
            for threshold in possible_thresholds:
                left_indices = np.where(feature_values <= threshold)[0]
                right_indices = np.where(feature_values > threshold)[0]
                if len(left_indices) > 0 and len(right_indices) > 0:
                    y_left, y_right = y[left_indices], y[right_indices]
                    var_red = self._variance_reduction(y, y_left, y_right)
                    if var_red > max_var_red:
                        best_split = {
                            "feature_idx": feature_idx, "threshold": threshold,
                            "X_left": X[left_indices], "y_left": y_left,
                            "X_right": X[right_indices], "y_right": y_right,
                            "var_red": var_red
                        }
                        max_var_red = var_red
        return best_split

    def _variance_reduction(self, parent, l_child, r_child):
        weight_l = len(l_child) / len(parent)
        weight_r = len(r_child) / len(parent)
        return np.var(parent) - (weight_l * np.var(l_child) + weight_r * np.var(r_child))

    def predict(self, X):
        return np.array([self._predict_single(x, self.tree) for x in X])

    def _predict_single(self, x, getattr_tree):
        if getattr_tree["value"] is not None:
            return getattr_tree["value"]
        feature_val = x[getattr_tree["feature_idx"]]
        if feature_val <= getattr_tree["threshold"]:
            return self._predict_single(x, getattr_tree["left"])
        else:
            return self._predict_single(x, getattr_tree["right"])


class NumpyRandomForest:
    """A minimal random forest regression implementation using pure NumPy"""
    def __init__(self, n_estimators=10, max_depth=6, min_samples_split=2):
        self.n_estimators = n_estimators
        self.max_depth = max_depth
        self.min_samples_split = min_samples_split
        self.trees = []
        
    def fit(self, X, y):
        self.trees = []
        for _ in range(self.n_estimators):
            tree = NumpyDecisionTree(self.max_depth, self.min_samples_split)
            indices = np.random.choice(len(X), len(X), replace=True)
            X_sample, y_sample = X[indices], y[indices]
            tree.tree = tree.fit(X_sample, y_sample)
            self.trees.append(tree)
            
    def predict(self, X):
        if not self.trees:
            return np.zeros(len(X))
        tree_preds = np.array([tree.predict(X) for tree in self.trees])
        return np.mean(tree_preds, axis=0)

class SolarPredictionModel:
    """Pure NumPy Serverless-friendly solar power prediction model"""
    
    def __init__(self, model_path: str = 'models/solar_model.pkl'):
        self.model_path = model_path
        self.model = NumpyRandomForest(n_estimators=15, max_depth=7)
        self.is_trained = False
        self.feature_importance = {}
        self.training_metrics = {}
        self.feature_columns = []
        
        self._load_model()
    
    def train(
        self, 
        X: np.ndarray, 
        y: np.ndarray,
        feature_names: List[str],
        test_size: float = 0.2,
        validation_split: float = 0.1
    ) -> Dict[str, float]:
        self.feature_columns = feature_names
        
        X_train, X_test, y_train, y_test = manual_train_test_split(
            X, y, test_size=test_size, shuffle=False
        )
        
        X_train, X_val, y_train, y_val = manual_train_test_split(
            X_train, y_train, test_size=validation_split, shuffle=False
        )
        
        print("Training Pure NumPy Random Forest Engine...")
        self.model.fit(X_train, y_train)
        
        y_train_pred = self.model.predict(X_train)
        y_val_pred = self.model.predict(X_val)
        y_test_pred = self.model.predict(X_test)
        
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
        
        self._compute_permutation_importance(X_val, y_val)
        self.is_trained = True
        self._save_model()
        
        return self.training_metrics

    def _compute_permutation_importance(self, X_val, y_val):
        """Calculate feature importances using permutation logic (pure numpy)"""
        baseline_rmse = calculate_metrics(y_val, self.model.predict(X_val))['rmse']
        importances = []
        for i in range(X_val.shape[1]):
            X_val_perm = X_val.copy()
            np.random.shuffle(X_val_perm[:, i])
            perm_rmse = calculate_metrics(y_val, self.model.predict(X_val_perm))['rmse']
            importances.append(max(0, perm_rmse - baseline_rmse))
            
        importances = np.array(importances)
        sum_imp = np.sum(importances)
        if sum_imp > 0:
            importances = importances / sum_imp
            
        self.feature_importance = {name: float(imp) for name, imp in zip(self.feature_columns, importances)}
    
    def predict(self, X: np.ndarray) -> np.ndarray:
        if not self.is_trained:
            raise ValueError("Model must be trained before making predictions")
        predictions = self.model.predict(X)
        return np.maximum(predictions, 0)

    def predict_recursive(self, X: np.ndarray) -> np.ndarray:
        if not self.is_trained:
            raise ValueError("Model must be trained before making predictions")
            
        X = X.copy()
        predictions = []
        
        feature_names = self.feature_columns
        lag_indices = {f'value_lag_{lag}': feature_names.index(f'value_lag_{lag}') 
                       for lag in [1, 2, 3, 24] if f'value_lag_{lag}' in feature_names}
        
        rolling_mean_indices = {f'value_rolling_mean_{w}': feature_names.index(f'value_rolling_mean_{w}')
                                for w in [3, 6, 12] if f'value_rolling_mean_{w}' in feature_names}
        
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
        predictions = self.predict_recursive(X)
        std_error = self.training_metrics.get('test_rmse', 0.5)
        uncertainty_growth = np.linspace(1.0, 2.0, len(predictions))
        
        lower_bound = np.maximum(predictions - (1.96 * std_error * uncertainty_growth), 0)
        upper_bound = predictions + (1.96 * std_error * uncertainty_growth)
        
        return predictions, lower_bound, upper_bound
    
    def get_feature_importance(self, top_n: int = 10) -> Dict[str, float]:
        if not self.feature_importance:
            return {}
        sorted_features = sorted(self.feature_importance.items(), key=lambda x: x[1], reverse=True)
        return dict(sorted_features[:top_n])
    
    def _save_model(self):
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
