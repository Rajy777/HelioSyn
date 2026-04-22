import urllib.request
import json

data = {
    "solar_data": [
        {"timestamp": 0, "value": 1.0},
        {"timestamp": 1, "value": 2.5},
        {"timestamp": 2, "value": 3.0},
        {"timestamp": 3, "value": 4.5},
        {"timestamp": 4, "value": 5.0},
        {"timestamp": 5, "value": 6.0},
        {"timestamp": 6, "value": 7.0},
        {"timestamp": 7, "value": 8.0},
        {"timestamp": 8, "value": 9.0},
        {"timestamp": 9, "value": 10.0},
        {"timestamp": 10, "value": 11.0},
        {"timestamp": 11, "value": 12.0},
        {"timestamp": 12, "value": 13.0},
        {"timestamp": 13, "value": 14.0},
        {"timestamp": 14, "value": 15.0},
        {"timestamp": 15, "value": 16.0},
        {"timestamp": 16, "value": 17.0},
        {"timestamp": 17, "value": 18.0},
        {"timestamp": 18, "value": 19.0},
        {"timestamp": 19, "value": 20.0},
        {"timestamp": 20, "value": 21.0},
        {"timestamp": 21, "value": 22.0},
        {"timestamp": 22, "value": 23.0},
        {"timestamp": 23, "value": 24.0},
        {"timestamp": 24, "value": 25.0}
    ]
}

req = urllib.request.Request("http://localhost:5177/api/train", method="POST")
req.add_header('Content-Type', 'application/json')

try:
    response = urllib.request.urlopen(req, data=json.dumps(data).encode('utf-8'))
    print(response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(e.code)
    print(e.read().decode('utf-8'))
