# CogniFYP2

A powerful AI-driven document management and analysis system. This project integrates vector search, LLM-based summarization, and a modern dashboard to help users manage and extract insights from their documents.

## 🚀 Features

- **AI Summarization**: Automatically generate summaries for uploaded documents using Groq LLM.
- **Vector Search**: Search through documents using Pinecone vector database for semantic relevance.
- **Admin Dashboard**: Visualize system usage and manage documents.
- **Secure Authentication**: Integrated with Supabase for user management and secure data storage.

## 📂 Project Structure

- **`frontend/`**: React application built with Vite and TypeScript. Includes a modern UI for document interaction.
- **`backend/`**: Flask-based REST API providing AI services and database integration.
- **`database/`**: Contains SQL schemas and database configuration files.

## 🛠️ Setup Instructions

### Backend
1. Navigate to the `backend/` directory.
2. Create a virtual environment: `python -m venv venv`
3. Activate the virtual environment:
   - Windows: `venv\Scripts\activate`
   - Mac/Linux: `source venv/bin/activate`
4. Install dependencies: `pip install -r requirements.txt`
5. Create a `.env` file with your API keys (Supabase, Pinecone, Groq).
6. Run the server: `python run.py`

### Frontend
1. Navigate to the `frontend/` directory.
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`

## 🔒 Security

Sensitive information like API keys and environment variables are stored in `.env` files and are **not** pushed to the repository. Ensure you have your own credentials set up before running the project.

## 📄 License

[Insert License Info Here]
