# FinCompliance-AI

## Project Overview

**FinCompliance-AI** is an AI-powered RegTech solution designed to automate the detection and reporting of suspicious transactions in full compliance with RBI/PMLA guidelines in India. The system simulates real-time transaction monitoring, applies hybrid risk scoring, and generates FIU-IND compliant Suspicious Transaction Reports (STRs) in XML format with detailed narratives.
The project demonstrates a complete end-to-end compliance workflow for banks, NBFCs, and fintechs, reducing manual STR filing time from hours to seconds while ensuring regulatory traceability and explainability.

**Live:** https://fin-compliance-ai.vercel.app/


## Key Objectives Met

- Real-time transaction ingestion and risk assessment
- RBI/FIU-IND compliant STR generation (A–F codes + narrative)
- Live dashboard with risk visualization and alerts
- Integration of mandatory hackathon tools: Cline, Kestra, Oumi, Vercel, CodeRabbit
- Support for domestic & international high-risk scenarios


## Features

- **Transaction Ingestion:** Single, bulk, or live data input with processing simulation
- **Risk Scoring:**
   - Rule-based (amount, velocity, jurisdiction, PEP, etc.)
   - Simulated XGBoost boost
   - Gemini AI for narrative generation
   - Velocity & location-jump detection
- **Dashboard:**
   - KPI cards (total txns, alerts, compliance rate)
   - Live volume bar chart & risk pie chart
   - Transaction table with search/filter
   - Velocity alerts (⚡)
- **Live Monitoring:** Floating Cline agent widget with real-time logs & high-risk alerts
- **Workflow Visualization:** Kestra-style orchestration steps


## Run Locally

1. Clone the repository:
```bash
git clone https://github.com/mdkamranalam/FinCompliance-AI.git
cd FinCompliance-AI
```
2. Install dependencies:
```bash
npm install
```
3. Create `.env` in the root and ad your Gemini API key:
```bash
GEMINI_API_KEY=your-gemini-api-key-here
```
4. Run the app:
```bash
npm run dev
```


## Usage

1. Open the app → see the live dashboard.
2. Use the **Transaction Form** to add single or bulk transactions (in CSV format).
3. Watch the **Kestra workflow animation** and **Cline agent logs**.
4. High-risk transactions appear in red with velocity alerts (⚡).
5. Click any transaction → view risk breakdown, narrative, and XML payload.
6. Download STR XML for FIU-IND demo.


## Example Test Case:

```csv
Sender Account,Amount,Currency,Receiver Account,Type,Location,Receiver Country
ACC-1001-IN (Rajesh Kumar),980000,INR,CRYPTO-EX-001,RTGS,Delhi,India
```


## License

MIT License — free to use, modify, and share.


## Acknowledgments
Built for hackathon using:
- Vercel
- Cline
- Kestra
- Oumi
- CodeRabbit
- Gemini AI