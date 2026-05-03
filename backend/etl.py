import requests
import pandas as pd
from datetime import datetime
import time
from models import MarketData, AnomalyAlert, init_db

# CoinGecko API URL for top coins
API_URL = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana,cardano,ripple&order=market_cap_desc&per_page=10&page=1&sparkline=false"

def fetch_data():
    """Extract: Fetch live market data from API"""
    try:
        response = requests.get(API_URL, timeout=10)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Error fetching data: {e}")
        return []

def detect_anomalies(df, session):
    """Transform: Detect simple anomalies like sudden price changes"""
    # For a real pipeline, we'd compare against historical data.
    # Here we'll simulate anomaly detection by looking at 24h change logic or static thresholds.
    # We will fetch the last known price from DB to calculate change.
    
    anomalies = []
    
    for _, row in df.iterrows():
        # Get the previous record for this coin
        last_record = session.query(MarketData).filter(MarketData.coin_id == row['id']).order_by(MarketData.timestamp.desc()).first()
        
        if last_record:
            # Calculate percentage change since last fetch
            pct_change = ((row['current_price'] - last_record.current_price) / last_record.current_price) * 100
            
            # If price changed more than 1% in a single tick (which is huge for a few minutes), alert!
            if abs(pct_change) > 1.0:
                severity = 'HIGH' if abs(pct_change) > 5.0 else 'MEDIUM'
                anomaly_type = 'PRICE_SPIKE' if pct_change > 0 else 'PRICE_DROP'
                
                alert = AnomalyAlert(
                    coin_id=row['id'],
                    anomaly_type=anomaly_type,
                    description=f"{row['symbol'].upper()} price changed by {pct_change:.2f}% since last tick.",
                    severity=severity
                )
                anomalies.append(alert)
                
    return anomalies

def run_etl():
    """Execute the ETL Pipeline"""
    print(f"[{datetime.utcnow()}] Running ETL Pipeline...")
    session = init_db()
    
    # 1. EXTRACT
    raw_data = fetch_data()
    if not raw_data:
        return
        
    # 2. TRANSFORM
    df = pd.DataFrame(raw_data)
    # Ensure relevant columns
    df = df[['id', 'symbol', 'current_price', 'market_cap', 'total_volume']]
    
    anomalies = detect_anomalies(df, session)
    
    # 3. LOAD
    # Load market data
    for _, row in df.iterrows():
        record = MarketData(
            coin_id=row['id'],
            symbol=row['symbol'],
            current_price=row['current_price'],
            market_cap=row['market_cap'],
            total_volume=row['total_volume']
        )
        session.add(record)
    
    # Load anomalies
    for anomaly in anomalies:
        session.add(anomaly)
        print(f"ANOMALY DETECTED: {anomaly.description}")
        
    session.commit()
    print(f"[{datetime.utcnow()}] ETL Pipeline completed. Inserted {len(df)} records and {len(anomalies)} anomalies.")
    session.close()

if __name__ == "__main__":
    # Run once for testing
    run_etl()
