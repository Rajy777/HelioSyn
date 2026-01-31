import pandas as pd
import numpy as np
from datetime import datetime, timedelta

# Create 1 year of hourly data
start_date = datetime(2023, 1, 1)
hours = 24 * 365
dates = [start_date + timedelta(hours=i) for i in range(hours)]

df = pd.DataFrame({'timestamp': dates})

# Generate realistic Radiation (0-1000 W/m2)
# Bell curve during day, 0 at night, seasonal variation
day_of_year = df['timestamp'].dt.dayofyear
hour = df['timestamp'].dt.hour

# Seasonal factor (more in summer)
seasonal_factor = 0.7 + 0.3 * np.sin(2 * np.pi * (day_of_year - 80) / 365)

# Daily radiation
rad = 1000 * seasonal_factor * np.maximum(0, np.sin(2 * np.pi * (hour - 6) / 24))
# Add some cloudy days randomness
df['radiation_wm2'] = rad * np.random.uniform(0.5, 1.0, hours)

# Generate Solar Power (kW) proportional to radiation
# Max 10kW system
df['solar_power_kw'] = (df['radiation_wm2'] / 1000) * 10 * np.random.uniform(0.9, 1.0, hours)

# Save to CSV
df.to_csv('sample_solar_data.csv', index=False)
print("sample_solar_data.csv created successfully!")
