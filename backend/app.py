from flask import Flask, jsonify
from flask_cors import CORS
from models import init_db, MarketData, AnomalyAlert
import threading
import schedule
import time
from etl import run_etl

app = Flask(__name__)
CORS(app)

# Initialize DB
session = init_db()

def run_scheduler():
    """Run the ETL pipeline periodically in a background thread"""
    # Run every 1 minute
    schedule.every(1).minutes.do(run_etl)
    
    # Run once at startup
    run_etl()
    
    while True:
        schedule.run_pending()
        time.sleep(1)

@app.route('/api/market-data', methods=['GET'])
def get_market_data():
    """Return latest market data and historical series for charts"""
    try:
        # Get the latest timestamp
        latest_record = session.query(MarketData).order_by(MarketData.timestamp.desc()).first()
        if not latest_record:
            return jsonify({'data': [], 'latest': []})
            
        latest_time = latest_record.timestamp
        
        # Get all records from the latest batch
        latest_batch = session.query(MarketData).filter(MarketData.timestamp == latest_time).all()
        
        # We also want historical data for charts (last 50 records per coin)
        # For simplicity in this demo, let's just send the last 100 total records sorted by time
        history = session.query(MarketData).order_by(MarketData.timestamp.asc()).limit(500).all()
        
        return jsonify({
            'latest': [{
                'coin_id': r.coin_id,
                'symbol': r.symbol,
                'current_price': r.current_price,
                'market_cap': r.market_cap,
                'total_volume': r.total_volume,
                'timestamp': r.timestamp.isoformat()
            } for r in latest_batch],
            'history': [{
                'coin_id': r.coin_id,
                'current_price': r.current_price,
                'timestamp': r.timestamp.isoformat()
            } for r in history]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/anomalies', methods=['GET'])
def get_anomalies():
    """Return recent anomalies"""
    try:
        anomalies = session.query(AnomalyAlert).order_by(AnomalyAlert.timestamp.desc()).limit(20).all()
        return jsonify([{
            'id': a.id,
            'coin_id': a.coin_id,
            'anomaly_type': a.anomaly_type,
            'description': a.description,
            'severity': a.severity,
            'timestamp': a.timestamp.isoformat()
        } for a in anomalies])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

import requests
from flask import request

@app.route('/api/historical', methods=['GET'])
def get_historical_data():
    """Proxy to fetch historical data from CoinGecko for Bitcoin and Ethereum"""
    days = request.args.get('days', '1')
    try:
        coins = ['bitcoin', 'ethereum']
        combined_data = {}
        
        for coin in coins:
            url = f"https://api.coingecko.com/api/v3/coins/{coin}/market_chart?vs_currency=usd&days={days}"
            res = requests.get(url, timeout=10)
            res.raise_for_status()
            data = res.json()
            
            # data['prices'] is a list of [timestamp, price]
            for point in data['prices']:
                # round timestamp to nearest minute to align them somewhat
                ts = int(point[0] / 60000) * 60000
                if ts not in combined_data:
                    combined_data[ts] = {'timestamp': ts}
                combined_data[ts][coin] = point[1]
                
        # Filter out incomplete data points
        result = []
        for ts, vals in sorted(combined_data.items()):
            if 'bitcoin' in vals and 'ethereum' in vals:
                result.append(vals)
                
        return jsonify(result)
        
    except Exception as e:
        print("Error fetching historical:", e)
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Start the background ETL scheduler
    scheduler_thread = threading.Thread(target=run_scheduler, daemon=True)
    scheduler_thread.start()
    
    # Start Flask API
    app.run(port=5000, debug=True, use_reloader=False)
