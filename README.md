# Real-Time ETL Data Pipeline

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white)


An end-to-end data engineering pipeline that extracts live financial data, performs transformations using Python and Pandas, and loads it into a SQL database. The data is then visualized through a full-stack React dashboard featuring interactive real-time charting and anomaly detection.

![Dashboard Preview](https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80)

## Features

- **Automated Data Extraction**: A scheduled Python script fetches real-time market data (Bitcoin, Ethereum, Solana, etc.) from the CoinGecko API.
- **Data Transformation (Pandas)**: Cleans data and detects sudden market anomalies (e.g., rapid price drops or spikes).
- **Relational Storage**: Stores historical market data and alerts in a SQLite/PostgreSQL database using SQLAlchemy.
- **RESTful API**: A Flask backend serves the historical and live data to the frontend.
- **Interactive Dashboard**: A React + Vite frontend styled with Tailwind CSS, displaying real-time KPIs and Recharts-powered graphs.

## Tech Stack

### Backend (Data Engineering)
- Python 3
- Pandas (Data processing)
- Flask & Flask-CORS (REST API)
- SQLAlchemy (ORM & Database connection)
- Schedule (Cron-like task runner)
- Requests (API calls)

### Frontend (Software Engineering)
- React 18 + TypeScript
- Vite (Build tool)
- Tailwind CSS v4 (Styling)
- Recharts (Data visualization)
- Lucide React (Icons)
- Axios (HTTP requests)

## How to Run Locally

### 1. Start the Backend (ETL + API)

```bash
cd backend
python -m venv venv
# Activate the environment (Windows)
.\venv\Scripts\activate
# Install dependencies
pip install -r requirements.txt
# Run the server (this will also start the background ETL scheduler)
python app.py
```
The Flask API will run on `http://127.0.0.1:5000`.

### 2. Start the Frontend (Dashboard)

```bash
cd frontend
npm install
npm run dev
```
The React app will be available on `http://localhost:5173/` (or whichever port Vite assigns).

## Architecture Flow

1. **Extract**: Every 1 minute, `etl.py` hits the CoinGecko API.
2. **Transform**: The data is loaded into a Pandas DataFrame. We calculate percentage changes compared to the last database entry to detect anomalies.
3. **Load**: The cleaned metrics and generated alerts are saved via SQLAlchemy into `market_data.db`.
4. **Serve**: The Flask API queries the database and serves JSON to the frontend.
5. **Visualize**: The React dashboard polls the Flask API every 30 seconds (or via manual refresh) and updates the UI.

## License

MIT
