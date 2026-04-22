"""
Data preprocessing utilities for solar prediction model (NumPy-only version)
"""
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional


class SolarDataProcessor:
    """Handles data preprocessing and feature engineering for solar prediction using NumPy"""
    
    def __init__(self):
        self.feature_columns = []
        
    def parse_csv_data(self, data: List[Dict]) -> List[Dict]:
        """
        Parse raw data from frontend into a list of dictionaries with datetime objects
        """
        parsed = []
        for item in data:
            row = {'timestamp': item.get('timestamp'), 'value': float(item.get('value', 0))}
            if 'extras' in item and isinstance(item['extras'], dict):
                row.update(item['extras'])
            
            # Convert timestamp to datetime
            ts = row.get('timestamp')
            dt = None
            if isinstance(ts, (int, float)):
                # Assume it's hour of day (0-23)
                dt = datetime(2024, 1, 1) + timedelta(hours=int(ts))
            elif isinstance(ts, str):
                try:
                    # Try various formats
                    if 'T' in ts:
                        dt = datetime.fromisoformat(ts.replace('Z', ''))
                    else:
                        for fmt in ('%d.%m.%Y %H:%M', '%Y-%m-%d %H:%M:%S', '%d/%m/%Y %H:%M'):
                            try:
                                dt = datetime.strptime(ts, fmt)
                                break
                            except:
                                continue
                except:
                    dt = None
            
            if dt:
                row['datetime'] = dt
                parsed.append(row)
                
        return parsed
    
    def extract_time_features(self, data: List[Dict]) -> List[Dict]:
        """
        Extract time-based features
        """
        for row in data:
            dt = row['datetime']
            row['hour'] = dt.hour
            row['day_of_year'] = dt.timetuple().tm_yday
            row['month'] = dt.month
            row['season'] = (row['month'] % 12 // 3)
            
            # Cyclical encoding
            row['hour_sin'] = np.sin(2 * np.pi * row['hour'] / 24)
            row['hour_cos'] = np.cos(2 * np.pi * row['hour'] / 24)
            row['day_sin'] = np.sin(2 * np.pi * row['day_of_year'] / 365.25)
            row['day_cos'] = np.cos(2 * np.pi * row['day_of_year'] / 365.25)
            
        return data
    
    def add_weather_features(self, data: List[Dict], weather_data: Optional[List[Dict]] = None) -> List[Dict]:
        """
        Add weather-related features
        """
        weather_map = {}
        if weather_data:
            parsed_weather = self.parse_csv_data(weather_data)
            for w in parsed_weather:
                weather_map[w['datetime'].hour] = w['value']
        
        for row in data:
            h = row['datetime'].hour
            if h in weather_map:
                row['temperature'] = weather_map[h]
            else:
                # Synthetic temperature fallback
                row['temperature'] = 26 + 16 * np.sin(2 * np.pi * (h - 6) / 24)
                
        return data
    
    def add_lag_features(self, data: List[Dict], lags: List[int] = [1, 2, 3, 24]) -> List[Dict]:
        """
        Add lagged values (previous hours' output)
        """
        values = [row['value'] for row in data]
        for lag in lags:
            col_name = f'value_lag_{lag}'
            for i in range(len(data)):
                if i >= lag:
                    data[i][col_name] = values[i - lag]
                else:
                    data[i][col_name] = np.nan # Will be dropped later
        return data
    
    def add_rolling_features(self, data: List[Dict], windows: List[int] = [3, 6, 12]) -> List[Dict]:
        """
        Add rolling statistics
        """
        values = [row['value'] for row in data]
        for window in windows:
            mean_col = f'value_rolling_mean_{window}'
            std_col = f'value_rolling_std_{window}'
            for i in range(len(data)):
                start = max(0, i - window + 1)
                subset = values[start:i+1]
                data[i][mean_col] = np.mean(subset)
                data[i][std_col] = np.std(subset) if len(subset) > 1 else 0.0
        return data
    
    def prepare_training_data(
        self, 
        solar_data: List[Dict],
        weather_data: Optional[List[Dict]] = None,
        include_lags: bool = True,
        include_rolling: bool = True
    ) -> Tuple[np.ndarray, np.ndarray, List[str]]:
        """
        Complete pipeline for training data. Returns (X, y, feature_cols)
        """
        data = self.parse_csv_data(solar_data)
        data = self.extract_time_features(data)
        data = self.add_weather_features(data, weather_data)
        
        if include_lags:
            data = self.add_lag_features(data)
        if include_rolling:
            data = self.add_rolling_features(data)
            
        # Define feature columns
        exclude = {'value', 'datetime', 'timestamp'}
        all_keys = set()
        for row in data:
            all_keys.update(row.keys())
        self.feature_columns = sorted([k for k in all_keys if k not in exclude])
        
        # Build X and y, dropping rows with NaN (from lags)
        X_list = []
        y_list = []
        for row in data:
            features = []
            has_nan = False
            for col in self.feature_columns:
                val = row.get(col, 0.0)
                if isinstance(val, float) and np.isnan(val):
                    has_nan = True
                    break
                features.append(float(val))
            
            if not has_nan:
                X_list.append(features)
                y_list.append(row['value'])
                
        return np.array(X_list), np.array(y_list), self.feature_columns
    
    def prepare_prediction_data(
        self,
        hours: List[int],
        weather_data: Optional[List[Dict]] = None,
        last_known_values: Optional[List[float]] = None,
        start_timestamp: Optional[str] = None
    ) -> np.ndarray:
        """
        Prepare data for prediction
        """
        base_date = datetime(2024, 1, 1)
        if start_timestamp:
            try:
                if any(char in str(start_timestamp) for char in ['-', '/', ':']):
                    base_date = datetime.fromisoformat(start_timestamp.replace('Z', ''))
            except:
                pass
        
        data = []
        current_date = base_date
        for i, h in enumerate(hours):
            if i > 0 and h <= hours[i-1]:
                current_date += timedelta(days=1)
            dt = current_date.replace(hour=h, minute=0, second=0, microsecond=0)
            data.append({'datetime': dt, 'hour': h, 'value': 0.0})
            
        data = self.extract_time_features(data)
        data = self.add_weather_features(data, weather_data)
        
        # Handle Lags
        lags = [1, 2, 3, 24]
        for lag_idx, lag in enumerate(lags):
            val = last_known_values[lag_idx] if last_known_values and lag_idx < len(last_known_values) else 0.0
            for row in data:
                row[f'value_lag_{lag}'] = val
                
        # Rolling stats proxy
        last_mean = np.mean(last_known_values) if last_known_values else 0.0
        last_std = np.std(last_known_values) if last_known_values else 0.0
        for window in [3, 6, 12]:
            for row in data:
                row[f'value_rolling_mean_{window}'] = last_mean
                row[f'value_rolling_std_{window}'] = last_std
                
        # Build X array
        X_list = []
        for row in data:
            features = [float(row.get(col, 0.0)) for col in self.feature_columns]
            X_list.append(features)
            
        return np.array(X_list)
