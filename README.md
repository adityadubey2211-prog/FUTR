# FUTR 🚀
### Build Better Habits. Track Your Present. Shape Your Future.

**FUTR** is a personal habit and productivity tracking application designed to help users build consistency, monitor daily performance, and understand how small daily actions can shape their long-term future.

Built with **React, FastAPI, and native Android integration**, FUTR combines habit management, consistency analytics, activity tracking, and future simulations in one platform.

---

## ✨ Features

- **Habit Management** — Create and manage personalized daily habits.
- **Daily Habit Tracking** — Mark habits as completed or pending for each day.
- **Consistency Analytics** — Monitor completion rates and daily performance.
- **Daily Progress Dashboard** — Track productivity scores and overall progress.
- **Activity Heatmap** — Visualize consistency and activity over time.
- **Future Simulation** — Explore potential long-term improvements based on consistency.
- **Native Step Tracking** — Track daily steps using Android's native step sensor.
- **Android Application** — Access FUTR through a Capacitor-powered Android app.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React, Vite, JavaScript, CSS |
| Backend | Python, FastAPI |
| Database | SQLite, SQLAlchemy |
| Validation | Pydantic |
| Mobile Integration | Capacitor, Android, Java |
| API Communication | REST APIs |

---

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
│   │   └── app/
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── capacitor.config.json
│
├── .gitignore
└── README.md
```

---

## ⚙️ Getting Started

### Prerequisites

- Python 3.10+
- Node.js and npm
- Android Studio (for Android development)

### 1. Clone the Repository

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

Backend:
`http://127.0.0.1:8000`

API Documentation:
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

The Android project is located inside `frontend/android`.

Build the frontend:

```bash
npm run build
```

Synchronize Capacitor:

```bash
npx cap sync android
```

Open the Android project in Android Studio to build and run the application.

---

## 🚧 Project Status

**FUTR is actively under development.**

Current development priorities include:

- Improving habit tracking and analytics.
- Enhancing native Android activity tracking.
- Improving the dashboard and user experience.
- Expanding future simulation capabilities.

---

## 🔮 Roadmap

- [ ] Manual step entry for web users.
- [ ] Enhanced Health Connect integration.
- [ ] Weekly nutrition and diet tracking.
- [ ] More detailed productivity insights.
- [ ] Improved future projections.
- [ ] Additional mobile capabilities.

---

## 👨‍💻 Developer

**Aditya Dubey**

- GitHub: [@adityadubey2211-prog](https://github.com/adityadubey2211-prog)

---

<div align="center">

### FUTR 🌱

*Small actions today. A better future tomorrow.*

</div>
