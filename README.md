# 🌌 ExpertMesh: Agentic Skill Orchestration

> **Winning Talent with Multi-Agent Intelligence & MongoDB Atlas.**

ExpertMesh is a high-fidelity platform designed to discover, extract, and orchestrate expert talent. Whether you're searching through established professionals or extracting "hidden gems" from unformatted project briefs, ExpertMesh uses a collaborative multi-agent architecture to match the right mind to the right task.

---

## Performance-Driven Tech Stack

Built for the **Cerebral Valley: Agentic Orchestration & Collaboration Hackathon**, leveraging cutting-edge infrastructure:

- **Database**: [MongoDB Atlas](https://www.mongodb.com/atlas) (Vector Search, TTL Caching, Agent Memory)
- **Embeddings**: [Voyage AI](https://www.voyageai.com/) (`voyage-2` model for 1024D vectors)
- **Inference**: [Fireworks AI](https://fireworks.ai/) (Utilizing `llama-v3p3-70b` for high-reasoning agents)
- **Frontend**: Next.js 15 (App Router) + Framer Motion (Generative UI)
- **Integration**: pdf-parse (Document Extraction Engine)

---

## 🚀 Key Features

### 1. Discovery Mode (Intelligent RAG)
Traditional keyword search is dead. ExpertMesh uses **Vector Retrieval** to understand intent.
- **Multi-Agent Consensus**: 5 specialized agents (Analyst, Scout, Verifier, Recommender, Orchestrator) collaborate live to rank and justify every match.
- **Deep Insights**: Don't just see a name; see *why* the AI chose them based on your specific project nuances.

### 2. Extraction Mode (Document to Expert)
Have a project brief but no team? 
- Drop a **PDF** or **TXT** file into the extraction engine.
- ExpertMesh parses requirements and uses AI to **synthesize "Synthetic Experts"**—ideal profiles who *should* exist for your project.
- These experts are automatically vectorized and stored in your Atlas collection.

### 3. MeshBoard (Agentic Whiteboard)
A full-screen, zoomable canvas where you can:
- Drag & Drop experts from your global "Ally Pool."
- Create **Project Containers** that automatically "envelop" experts near them.
- Get **AI Strategy Insights** on project composition and team synergy.

---

##  Powered by MongoDB Atlas

We utilize MongoDB as more than just a database; it is the **backbone of our agentic memory**:

- **Atlas Vector Search**: Implemented with a `HSNW` index on `voyage-2` vectors for sub-second semantic matching.
- **Multi-Level Caching**:
    - **Embedding Cache**: We hash input text and store Voyage vectors in a dedicated collection to reduce API latency and costs.
    - **Orchestration TTL Cache**: Full multi-agent search results are cached for 1 hour using **Atlas TTL Indexes**, providing instant responses for trending queries.
- **Agent Handshakes**: The `agent_conversation` log is stored and streamed live to the UI, providing a transparent "window" into the AI's thought process.

---

## Try it Yourself

### 1. Setup Environment
Create a `.env.local` file with the following:
```env
MONGODB_URI=your_mongodb_uri
VOYAGE_API_KEY=your_voyage_key
FIREWORKS_API_KEY=your_fireworks_key
```

### 2. Run Locally
```bash
npm install
npm run dev
```

### 3. Test the Extraction Feature
Download our sample project brief and drop it into **Extraction Mode**:
📄 **[Download Sample Project Brief](./sample_project_brief.txt)**

---

## The Agentic Architecture

ExpertMesh runs a "Meeting of the Minds" for every query:
1.  **Analyst**: Breaks down the prompt into raw technical requirements.
2.  **Scout**: Performs Vector Search on Atlas to find candidates.
3.  **Verifier**: Cross-references candidate bios against specific project constraints.
4.  **Recommender**: Ranks the top 3 and writes the reasoning.
5.  **Orchestrator**: Syncs the states and handles the final Generative UI response.

---

*Built with ❤️ for the MongoDB Agentic Orchestration Hackathon.*
A
By Sathvik Vempati: --> vempati.honey@gmail.com; 510-516-1323
MIT LICENSE
