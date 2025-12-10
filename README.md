# FinCompliance-AI

## Project Overview
FinCompliance-AI is an AI-driven tool for automating Suspicious Transaction Reports (STRs) under RBI/PMLA compliance in India. It ingests financial transactions, scores risks using rules-based engines, XGBoost ML, and Oumi LLM (via Hugging Face alternative), and generates FIU-IND compliant STRs with XML reports and natural language narratives.

Key Features:
- Ingest transactions via FastAPI.
- Risk scoring: 80% rules-based (from RBI JSON), 10% XGBoost, 10% LLM.
- Auto-STR generation in <10 seconds using lxml for XML and Oumi/HF LLM for narratives.
- Orchestrated via Kestra workflows.
- Real-time monitoring with Cline agents.
- Dashboard visualized with NextJS and Recharts, deployed on Vercel.

## Setup Instructions
1. Clone the repo: `git clone <repo-url>`.
2. Copy `.env.example` to `.env` and fill in values (e.g., DATABASE_URL=postgresql://user:pass@localhost:5432/db, HF_TOKEN=your_huggingface_token).
3. Start PostgreSQL and FastAPI with Docker: `docker-compose up -d`.
4. Set up DB: `python scripts/setup_db.py` (creates tables) and `python scripts/seed_data.py` (seeds mock data).
5. Run backend: `cd backend && uvicorn app.main:app --reload`.
6. Run frontend: `cd frontend && npm install && npm run dev`.
7. Run Kestra workflow: Configure Kestra server separately, then apply workflows/risk_pipeline.yaml.
8. Run Cline agent: `python agents/monitor_agent.py`.
9. Demo: Run `python scripts/demo_sim.py` to ingest mocks and trigger pipeline.

## Sponsor Shoutouts
- **Cline**: Powers autonomous agents for real-time monitoring (e.g., monitor_agent.py).
- **Kestra**: Orchestrates the risk pipeline for ingest, scoring, and STR generation.
- **Vercel**: Hosts the NextJS frontend dashboard for seamless deployment.
- **Oumi**: LLM layer for STR narratives (implemented via Hugging Face Inference API as free alternative).
- **CodeRabbit**: Conceptual AI code reviews integrated via comments for security and best practices.

For deployment: Deploy frontend to Vercel via `vercel --prod`. Backend can be containerized with Dockerfile.
