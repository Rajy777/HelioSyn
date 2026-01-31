"""
Data preprocessing utilities for solar prediction model
"""
import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, List, Tuple, Optional


class SolarDataProcessor:
    """Handles data preprocessing and feature engineering for solar prediction"""
    
    def __init__(self):
        self.feature_columns = []
        
    def parse_csv_data(self, data: List[Dict]) -> pd.DataFrame:
        """
        Parse CSV data from frontend into pandas DataFrame
        
        Args:
            data: List of dictionaries with timestamp, value, and optionally extras
            
        Returns:
            DataFrame with parsed data
        """
        flattened_data = []
        for item in data:
            row = {'timestamp': item.get('timestamp'), 'value': item.get('value')}
            if 'extras' in item and isinstance(item['extras'], dict):
                row.update(item['extras'])
            flattened_data.append(row)
            
        df = pd.DataFrame(flattened_data)
        
        # Convert timestamp to datetime if it's not already
        if 'timestamp' in df.columns:
            # Handle both hour-of-day (0-23) and actual timestamps
            if df['timestamp'].dtype in ['int64', 'float64']:
                # Assume it's hour of day, create dummy dates
                df['datetime'] = pd.to_datetime('2024-01-01') + pd.to_timedelta(df['timestamp'], unit='h')
            else:
                # Use dayfirst=True for international formats like DD.MM.YYYY
                df['datetime'] = pd.to_datetime(df['timestamp'], dayfirst=True, errors='coerce')
        
        # Drop rows where datetime couldn't be parsed
        if 'datetime' in df.columns:
            df = df.dropna(subset=['datetime'])
        
        return df
    
    def extract_time_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Extract time-based features from datetime column
        
        Args:
            df: DataFrame with datetime column
            
        Returns:
            DataFrame with additional time features
        """
        if 'datetime' not in df.columns:
            raise ValueError("DataFrame must have 'datetime' column")
        
        df = df.copy()
        
        # Hour of day (0-23)
        df['hour'] = df['datetime'].dt.hour
        
        # Day of year (1-365)
        df['day_of_year'] = df['datetime'].dt.dayofyear
        
        # Month (1-12)
        df['month'] = df['datetime'].dt.month
        
        # Season (0-3: Winter, Spring, Summer, Fall)
        df['season'] = (df['month'] % 12 // 3)
        
        # Cyclical encoding for hour (captures 24-hour cycle)
        df['hour_sin'] = np.sin(2 * np.pi * df['hour'] / 24)
        df['hour_cos'] = np.cos(2 * np.pi * df['hour'] / 24)
        
        # Cyclical encoding for day of year (captures annual cycle)
        df['day_sin'] = np.sin(2 * np.pi * df['day_of_year'] / 365)
        df['day_cos'] = np.cos(2 * np.pi * df['day_of_year'] / 365)
        
        return df
    
    def add_weather_features(self, df: pd.DataFrame, weather_data: Optional[List[Dict]] = None) -> pd.DataFrame:
        """
        Add weather-related features
        
        Args:
            df: DataFrame with time features
            weather_data: Optional weather data from frontend
            
        Returns:
            DataFrame with weather features
        """
        df = df.copy()
        
        if weather_data:
            weather_df = self.parse_csv_data(weather_data)
            weather_df = self.extract_time_features(weather_df)
            
            # Merge weather data based on hour
            df = df.merge(
                weather_df[['hour', 'value']].rename(columns={'value': 'temperature'}),
                on='hour',
                how='left'
            )
        else:
            # Generate synthetic temperature if not provided
            # Simple sinusoidal pattern: cooler at night, warmer during day
            df['temperature'] = 26 + 16 * np.sin(2 * np.pi * (df['hour'] - 6) / 24)
        
        return df
    
    def add_lag_features(self, df: pd.DataFrame, target_col: str = 'value', lags: List[int] = [1, 2, 3, 24]) -> pd.DataFrame:
        """
        Add lagged values as features (previous hours' solar output)
        
        Args:
            df: DataFrame with target column
            target_col: Name of the target column
            lags: List of lag periods (in hours)
            
        Returns:
            DataFrame with lag features
        """
        df = df.copy()
        
        for lag in lags:
            df[f'{target_col}_lag_{lag}'] = df[target_col].shift(lag)
        
        return df
    
    def add_rolling_features(self, df: pd.DataFrame, target_col: str = 'value', windows: List[int] = [3, 6, 12]) -> pd.DataFrame:
        """
        Add rolling statistics as features
        
        Args:
            df: DataFrame with target column
            target_col: Name of the target column
            windows: List of window sizes (in hours)
            
        Returns:
            DataFrame with rolling features
        """
        df = df.copy()
        
        for window in windows:
            df[f'{target_col}_rolling_mean_{window}'] = df[target_col].rolling(window=window, min_periods=1).mean()
            df[f'{target_col}_rolling_std_{window}'] = df[target_col].rolling(window=window, min_periods=1).std()
        
        return df
    
    def prepare_training_data(
        self, 
        solar_data: List[Dict],
        weather_data: Optional[List[Dict]] = None,
        include_lags: bool = True,
        include_rolling: bool = True
    ) -> Tuple[pd.DataFrame, List[str]]:
        """
        Complete preprocessing pipeline for training data
        
        Args:
            solar_data: Historical solar generation data
            weather_data: Optional weather data
            include_lags: Whether to include lag features
            include_rolling: Whether to include rolling features
            
        Returns:
            Tuple of (processed DataFrame, list of feature column names)
        """
        # Parse and extract time features
        df = self.parse_csv_data(solar_data)
        df = self.extract_time_features(df)
        
        # Add weather features
        df = self.add_weather_features(df, weather_data)
        
        # Add lag and rolling features if requested
        if include_lags:
            df = self.add_lag_features(df)
        
        if include_rolling:
            df = self.add_rolling_features(df)
        
        # Define feature columns (exclude target and datetime)
        feature_cols = [col for col in df.columns if col not in ['value', 'datetime', 'timestamp']]
        
        # Remove rows with NaN values (from lag/rolling features)
        df = df.dropna()
        
        self.feature_columns = feature_cols
        
        return df, feature_cols
    
    def prepare_prediction_data(
        self,
        hours: List[int],
        weather_data: Optional[List[Dict]] = None,
        last_known_values: Optional[List[float]] = None,
        start_timestamp: Optional[str] = None
    ) -> pd.DataFrame:
        """
        Prepare data for prediction
        
        Args:
            hours: List of hours to predict (0-23)
            weather_data: Optional weather forecast data
            last_known_values: Last known solar values for lag features
            start_timestamp: ISO date string for seasonality alignment
            
        Returns:
            DataFrame ready for prediction
        """
        # Create base dataframe with hours
        df = pd.DataFrame({'hour': hours})
        
        # Seasonality Alignment
        base_date = pd.to_datetime('2024-01-01')
        if start_timestamp:
            try:
                # Only use if it looks like a real date (has - or / or :)
                if any(char in str(start_timestamp) for char in ['-', '/', ':']):
                    base_date = pd.to_datetime(start_timestamp)
            except:
                pass # Fallback to default
        
        # Generate datetimes correctly starting from base_date
        # We need to handle wrap-around for the next 24 hours
        datetimes = []
        current_date = base_date
        for h in hours:
            # If the hour is less than the previous hour, we've wrapped around to the next day
            if datetimes and h <= datetimes[-1].hour:
                current_date += pd.Timedelta(days=1)
            datetimes.append(current_date.replace(hour=h, minute=0, second=0, microsecond=0))
            
        df['datetime'] = datetimes
        
        # Extract time features (Month, Day of Year etc now aligned!)
        df = self.extract_time_features(df)
        
        # Add weather features
        if weather_data:
            w_df = self.parse_csv_data(weather_data)
            w_df = self.extract_time_features(w_df)
            
            # Merge weather data
            df = df.merge(
                w_df[['hour', 'value']].rename(columns={'value': 'temperature'}),
                on='hour',
                how='left'
            )
            # Fill any gaps
            df['temperature'] = df['temperature'].fillna(26 + 16 * np.sin(2 * np.pi * (df['hour'] - 6) / 24))
        else:
            df['temperature'] = 26 + 16 * np.sin(2 * np.pi * (df['hour'] - 6) / 24)
        
        # Initialize lag features with provided last_known_values
        lags = [1, 2, 3, 24]
        if last_known_values:
            for i, lag in enumerate(lags):
                val = last_known_values[i] if i < len(last_known_values) else 0
                df[f'value_lag_{lag}'] = val
        else:
            for lag in lags:
                df[f'value_lag_{lag}'] = 0
        
        # Rolling features proxy
        last_mean = np.mean(last_known_values) if last_known_values else 0
        last_std = np.std(last_known_values) if last_known_values else 0
        for window in [3, 6, 12]:
            df[f'value_rolling_mean_{window}'] = last_mean
            df[f'value_rolling_std_{window}'] = last_std
            
        # Ensure all features that were in training are here
        for col in self.feature_columns:
            if col not in df.columns:
                df[col] = 0
                
        return df[self.feature_columns]
