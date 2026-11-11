# FUTR 🚀
### Understand Your Habits. Explore Your Future.

**FUTR** is a personal habit and lifestyle tracking application designed to help people build consistency, understand their daily behavior, and visualize how small actions can shape their future.

Instead of simply tracking what you do today, FUTR helps you explore what your current habits could mean for tomorrow.

Built with **React, FastAPI, and Android integration**, FUTR brings habit management, lifestyle tracking, productivity analytics, nutrition planning, mindfulness, and future simulations together in one platform.

---

## ✨ Features

### 🎯 Habit Management
- Create and manage personalized daily habits.
- Mark habits as completed or pending.
- Track daily habit performance.
- Monitor consistency over time.

### 📊 Productivity Dashboard
- Daily productivity score.
- Habit completion statistics.
- Weekly performance analytics.
- Activity heatmap to visualize consistency.

### 🔮 Future Simulation
- Explore potential long-term outcomes based on current habits.
- Simulate different consistency levels.
- Compare current progress with improved routines.
- Visualize the impact of small daily improvements over time.

### 🥗 Weekly Nutrition
- Generate a personalized 7-day meal plan using AI.
- Review and edit generated meal plans.
- Organize meals across the week.
- Save nutrition plans for future reference.

### 🧘 Mindfulness Sessions
- Dedicated mindfulness experience.
- Guided breathing visual.
- Start and track mindfulness sessions.
- Encourage regular breaks and mental refreshment.

### 👟 Activity Tracking
- Native Android step tracking using the device's step sensor.
- Mobile integration through Capacitor.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React, Vite, JavaScript, CSS |
| Backend | Python, FastAPI |
| Database | SQLite, SQLAlchemy |
| Validation | Pydantic |
| AI Integration | Google Gemini API |
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
│   ├── requirements.txt
│   └── .env
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

Make sure you have the following installed:

- Python 3.10+
- Node.js and npm
- Git
- Android Studio (for Android development)

### 1. Clone the Repository

```bash
git clone https://github.com/adityadubey2211-prog/FUTR.git
cd FUTR
```

### 2. Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv venv
```

Activate it:

**Windows PowerShell**

```powershell
.\venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create a `.env` file inside the `backend` directory and add the required environment variables:

```env
GEMINI_API_KEY=your_gemini_api_key
```

Start the backend server:

```bash
uvicorn app.main:app --reload
```

Backend URL:

`http://127.0.0.1:8000`

Interactive API Documentation:

`http://127.0.0.1:8000/docs`

### 3. Frontend Setup

Open another terminal and navigate to the frontend:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local URL provided by Vite.

### 4. Android Setup

The Android project is available inside `frontend/android`.

Build the frontend:

```bash
npm run build
```

Synchronize the Capacitor project:

```bash
npx cap sync android
```

Open the Android project:

```bash
npx cap open android
```

You can then build and run the application through Android Studio.

---

## 🗺️ Roadmap

- [x] Daily habit creation and tracking.
- [x] Productivity dashboard.
- [x] Consistency analytics.
- [x] Activity heatmap.
- [x] Future simulation.
- [x] AI-powered weekly nutrition planning.
- [x] Mindfulness session experience.
- [x] Capacitor Android integration.
- [ ] Manual step entry for web users.
- [ ] Enhanced Health Connect integration.
- [ ] More detailed lifestyle insights.
- [ ] Improved future projections.
- [ ] Additional mobile capabilities.

---

## 🚧 Project Status

**FUTR is actively under development.**

The project is continuously evolving with a focus on improving lifestyle tracking, user experience, analytics, and mobile capabilities.

---

## 👨‍💻 Developer

**Aditya Dubey**

- GitHub: [@adityadubey2211-prog](https://github.com/adityadubey2211-prog)
- LinkedIn: [Aditya Dubey](https://linkedin.com/in/aditya-dubey-4182432a4/)

---

<div align="center">

# FUTR 🌱

**Small actions today. A better future tomorrow.**

</div>