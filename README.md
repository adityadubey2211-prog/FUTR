# FUTR 🚀
### Build Better Habits. Track Your Present. Shape Your Future.

FUTR is a personal habit and productivity tracking application designed to help users build consistency, monitor daily progress, and understand how their habits can influence their future.

It combines a React frontend, FastAPI backend, and an Android application powered by Capacitor.

## ✨ Features

- **Habit Management** — Create and manage personal habits.
- **Daily Habit Tracking** — Mark habits as completed or pending each day.
- **Consistency Analytics** — Track completion rates and daily performance.
- **Daily Progress** — Monitor habit completion and productivity scores.
- **Activity Heatmap** — Visualize consistency over time.
- **Future Simulation** — Explore potential long-term progress based on consistency.
- **Android Support** — Run FUTR as an Android application.

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React, Vite, JavaScript, CSS |
| Backend | Python, FastAPI |
| Database | SQLite, SQLAlchemy |
| Validation | Pydantic |
| Mobile | Capacitor, Android |
| API Communication | REST APIs |

## 📁 Project Structure

```text
FUTR/
│
├── backend/
│   ├── app/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── database.py
│   │   └── main.py
│   │
│   └── requirements.txt
│
├── frontend/
│   ├── android/
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── capacitor.config.json
│
├── .gitignore
└── README.md
```

## ⚙️ Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/adityadubey2211-prog/FUTR.git
cd FUTR
```

### 2. Backend Setup

```bash
cd backend

python -m venv venv
```

Activate the virtual environment:

**Windows:**
```powershell
.\venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Start the backend:

```bash
uvicorn app.main:app --reload
```

Backend runs at:

`http://127.0.0.1:8000`

Interactive API documentation:

`http://127.0.0.1:8000/docs`

### 3. Frontend Setup

Open another terminal:

```bash
cd frontend

npm install
npm run dev
```

Open the local URL provided by Vite.

### 4. Android Setup

The Android project is available inside `frontend/android`.

To synchronize frontend changes:

```bash
npm run build
npx cap sync android
```

Open the Android project in Android Studio to build and run the application.

## 🗺️ Project Status

FUTR is actively under development.

The current focus is improving habit tracking, analytics, mobile integration, and the overall user experience.

## 🔮 What's Next?

- Health Connect integration
- Improved health and activity tracking
- More detailed productivity insights
- Enhanced future projections
- Additional mobile capabilities

## 👨‍💻 Developer

**Aditya Dubey**

- GitHub: [@adityadubey2211-prog](https://github.com/adityadubey2211-prog)

---

*FUTR — Small actions today. A better future tomorrow.*