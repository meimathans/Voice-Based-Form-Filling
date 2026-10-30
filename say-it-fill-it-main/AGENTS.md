# MozhiFill AI Development Guidelines

This project is an AI-powered voice-to-form filling application supporting English, தமிழ் (Tamil), and Tanglish (Tamil + English mixed speech).

## Architecture
- **Framework:** TanStack Start & TanStack Router
- **UI:** React 19, Tailwind CSS v4, Radix UI, Lucide React
- **AI Processing:** Google Gemini API (`GEMINI_API_KEY`) via `@google/genai` with fallback support
- **Audio Processing:** Native Web Audio API WAV recorder
