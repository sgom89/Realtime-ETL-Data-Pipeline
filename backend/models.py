from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime

Base = declarative_base()

class MarketData(Base):
    __tablename__ = 'market_data'
    
    id = Column(Integer, primary_key=True)
    coin_id = Column(String, index=True)
    symbol = Column(String)
    current_price = Column(Float)
    market_cap = Column(Float)
    total_volume = Column(Float)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

class AnomalyAlert(Base):
    __tablename__ = 'anomaly_alerts'
    
    id = Column(Integer, primary_key=True)
    coin_id = Column(String)
    anomaly_type = Column(String) # e.g., 'PRICE_DROP', 'PRICE_SPIKE'
    description = Column(String)
    severity = Column(String) # 'LOW', 'MEDIUM', 'HIGH'
    timestamp = Column(DateTime, default=datetime.utcnow)

def init_db(db_path='sqlite:///market_data.db'):
    engine = create_engine(db_path)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    return Session()
