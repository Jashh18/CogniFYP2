# CogniFYP2

A web-based AI-powered academic assistant designed to support English literature undergraduates in processing and understanding complex textual materials. It transforms uploaded PDF documents into structured learning resources by generating summaries, explanations, and flashcards through a Retrieval-Augmented Generation (RAG) framework.


## 🚀 Features

- **Summaries**: It condenses long texts into clear, concise summaries helping users save time and quickly understand the main ideas.
- **Explanations Generation**: It acts as a dialogue partner. Students can ask questions and receive answers that are strictly evidenced by passages from their uploaded PDF, ensuring academic fidelity.
- **Study Flashcards**: It identifies key concepts and generates Q&A flashcards for effective revision.
- **Admin Dashboard**: Visualize system usage and manage documents.


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

