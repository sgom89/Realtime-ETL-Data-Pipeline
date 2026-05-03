import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, AlertTriangle, TrendingUp, DollarSign, Database, Server, RefreshCw } from 'lucide-react';

// Types
interface MarketData {
  coin_id: string;
  symbol: string;
  current_price: number;
  market_cap: number;
  total_volume: number;
  timestamp: string;
}

interface HistoricalData {
  coin_id: string;
  current_price: number;
  timestamp: string;
}

interface Anomaly {
  id: number;
  coin_id: string;
  anomaly_type: string;
  description: string;
  severity: string;
  timestamp: string;
}

function App() {
  const [latestData, setLatestData] = useState<MarketData[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [timeRange, setTimeRange] = useState<string>('live');
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  const fetchData = async () => {
    setIsRefreshing(true);
    try {
      // Always fetch latest data and anomalies for KPIs and sidebar
      const marketRes = await axios.get('http://127.0.0.1:5000/api/market-data');
      setLatestData(marketRes.data.latest);
      
      if (marketRes.data.latest.length > 0) {
        setLastUpdate(new Date(marketRes.data.latest[0].timestamp).toLocaleTimeString());
      }

      const anomalyRes = await axios.get('http://127.0.0.1:5000/api/anomalies');
      setAnomalies(anomalyRes.data);

      // Handle Chart History
      if (timeRange === 'live') {
        const rawHistory: HistoricalData[] = marketRes.data.history;
        const grouped = rawHistory.reduce((acc: any, curr) => {
          const time = new Date(curr.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
          if (!acc[time]) acc[time] = { time };
          acc[time][curr.coin_id] = curr.current_price;
          return acc;
        }, {});
        setHistory(Object.values(grouped));
      } else {
        fetchHistoricalData(timeRange);
      }
    } catch (error) {
      console.error("Error fetching live data:", error);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const fetchHistoricalData = async (range: string) => {
    setIsLoadingHistory(true);
    let days = 1;
    if (range === '1w') days = 7;
    if (range === '1m') days = 30;
    
    try {
      const res = await axios.get(`http://127.0.0.1:5000/api/historical?days=${days}`);
      const formatted = res.data.map((item: any) => {
        // format timestamp depending on range
        const d = new Date(item.timestamp);
        const timeStr = range === '1d' 
          ? d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
          : d.toLocaleDateString([], {month: 'short', day: 'numeric'});
        return {
          time: timeStr,
          bitcoin: item.bitcoin,
          ethereum: item.ethereum
        };
      });
      setHistory(formatted);
    } catch (error) {
      console.error("Error fetching historical:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, [timeRange]);

  return (
    <div className="min-h-screen bg-navy text-slate p-8 font-sans">
      
      {/* Header */}
      <header className="mb-10 flex items-center justify-between border-b border-light-navy pb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-brand-blue/10 rounded-xl">
            <Activity className="text-brand-blue" size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-lightest-slate">Real-Time ETL Pipeline Dashboard</h1>
            <p className="text-sm font-mono mt-1 opacity-70">
              <Database size={12} className="inline mr-1"/> Extracting from CoinGecko API 
              <span className="mx-2">•</span> 
              <Server size={12} className="inline mr-1"/> Python/Pandas Processing 
              <span className="mx-2">•</span> 
              PostgreSQL Storage
            </p>
          </div>
        </div>
        <div className="text-right flex items-center gap-3">
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-brand-blue">Last Update</p>
            <p className="text-lg font-mono text-lightest-slate">{lastUpdate || 'Loading...'}</p>
          </div>
          <button 
            onClick={fetchData} 
            className="p-2 border border-brand-blue/30 rounded-lg text-brand-blue hover:bg-brand-blue/10 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {latestData.slice(0,4).map(coin => (
          <div key={coin.coin_id} className="bg-light-navy border border-lightest-navy/20 p-6 rounded-2xl shadow-lg hover:border-brand-blue/30 transition-all">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-lightest-slate uppercase">{coin.symbol}</h3>
              <DollarSign className="text-brand-blue" size={20} />
            </div>
            <p className="text-3xl font-mono text-white mb-2">
              ${coin.current_price.toLocaleString()}
            </p>
            <p className="text-xs opacity-60">Vol: ${(coin.total_volume/1000000).toFixed(1)}M</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-light-navy border border-lightest-navy/20 p-6 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="text-brand-blue" size={20}/>
              <h2 className="text-lg font-bold text-lightest-slate">Price Evolution</h2>
            </div>
            
            <div className="flex bg-navy rounded-lg p-1 border border-light-navy">
              {['live', '1d', '1w', '1m'].map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1 text-xs font-mono rounded-md transition-all ${
                    timeRange === range 
                      ? 'bg-light-navy text-brand-blue shadow-sm' 
                      : 'text-slate hover:text-lightest-slate'
                  }`}
                >
                  {range.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          
          <div className="h-80 w-full relative">
            {isLoadingHistory ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <RefreshCw className="animate-spin text-brand-blue opacity-50" size={32} />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#233554" />
                <XAxis dataKey="time" stroke="#8892b0" tick={{fontSize: 12}} />
                <YAxis domain={['auto', 'auto']} stroke="#8892b0" tick={{fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#112240', border: '1px solid #233554', borderRadius: '8px' }}
                  itemStyle={{ color: '#64ffda' }}
                />
                <Line type="monotone" dataKey="bitcoin" stroke="#64ffda" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="ethereum" stroke="#bd93f9" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Anomaly Alerts */}
        <div className="bg-light-navy border border-lightest-navy/20 p-6 rounded-2xl shadow-lg flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <AlertTriangle className="text-yellow-400" size={20}/>
            <h2 className="text-lg font-bold text-lightest-slate">Anomaly Alerts</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {anomalies.length === 0 ? (
              <div className="text-center opacity-50 py-10">
                <p>No anomalies detected yet.</p>
                <p className="text-xs mt-2">Waiting for sudden price movements...</p>
              </div>
            ) : (
              anomalies.map(anomaly => (
                <div key={anomaly.id} className="p-4 rounded-xl border border-red-500/20 bg-red-500/5">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-mono font-bold text-red-400">
                      {anomaly.anomaly_type}
                    </span>
                    <span className="text-xs opacity-50">
                      {new Date(anomaly.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm text-lightest-slate">{anomaly.description}</p>
                </div>
              ))
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
}

export default App;
