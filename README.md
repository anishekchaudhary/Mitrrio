# ⬢ Mitrrio

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-black?style=for-the-badge&logo=socket.io&badgeColor=010101)
![MongoDB](https://img.shields.io/badge/MongoDB-%234ea94b.svg?style=for-the-badge&logo=mongodb&logoColor=white)

**Mitrrio** is a real-time, highly strategic multiplayer game built on a custom procedural hex-grid rendering engine. Players compete to capture territory, manage unit interactions, and climb the Elo leaderboards in competitive matchmaking or private custom lobbies.

---

## Key Features

* **Procedural Hex-Grid Engine:** Custom SVG/Canvas rendering mapping backend coordinate data to a responsive frontend UI.
* **Real-Time Multiplayer:** Low-latency unit movement, territory capture, and state synchronization powered by WebSockets.
* **Social & Party System:** Real-time global chat, private lobbies, party color selection, and spectator mode.
* **Competitive Matchmaking:** Automated matchmaking system with an Elo rating distribution algorithm.
* **Admin Dashboard:** Centralized view for managing active sessions, users, and server health.
* **Secure Authentication:** JWT-based user persistence and password hashing.

---

## Tech Stack

* **Frontend:** React.js, Vite, Tailwind CSS
* **Backend:** Node.js, Express.js
* **Real-Time Communication:** Socket.io
* **Database:** MongoDB (Mongoose ODM)
* **Deployment (Phase 3.2):** Vercel (Frontend), Render/AWS (Backend)

---

## Installation & Setup Instructions

The project uses a monorepo structure, separating the client and server environments. Follow these steps to run Mitrrio locally.

### Prerequisites
* Node.js (v18 or higher recommended)
* MongoDB (running locally or a MongoDB Atlas URI)
* Git

### 1. Clone the Repository
```bash
git clone [https://github.com/YOUR_GITHUB_USERNAME/Mitrrio.git](https://github.com/YOUR_GITHUB_USERNAME/Mitrrio.git)
cd Mitrrio
```
###2. Backend Setup (Server)
Open a terminal and navigate to the server directory:

```Bash
cd server
npm install
```
Create a .env file in the /server directory and add the following variables:

```Code snippet
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_super_secret_jwt_key
CLIENT_URL=http://localhost:5173
```
Start the backend server:

```Bash
npm run dev
```
3. Frontend Setup (Client)
Open a new terminal window and navigate to the client directory:

```Bash
cd client
npm install
```
Create a .env file in the /client directory and add the following variable:

```Code snippet
VITE_SERVER_URL=http://localhost:5000
```
Start the frontend development server:

```Bash
npm run dev
```
4. Play the Game
Open your browser and navigate to http://localhost:5173 to start playing!

Code Structure Overview
Plaintext
```Mitrrio/
├── client/                 # React Frontend Environment
│   ├── src/
│   │   ├── components/     # Reusable UI widgets (Chat, GamePanel, Lobby)
│   │   ├── pages/          # Top-level routing views (Home, Game, Admin)
│   │   ├── utils/          # Client-side helpers (socket.js, polyominoes.js)
│   │   └── App.jsx         # Main application router
├── server/                 # Node/Express Backend Environment
│   ├── models/             # Mongoose schemas (User, Match, Party)
│   ├── routes/             # RESTful API endpoints (Auth, Admin)
│   ├── socket/             # Socket.io handlers (Game, Chat, Matchmaking)
│   ├── utils/              # Server-side logic (Elo calculations, grid validation)
│   └── server.js           # Express app and server initialization
└── README.md
```
## Contributors
Anishek Chaudhary (@anishekchaudhary) - Engine Integration, Deployment, Auth Systems

Rohit (@ImprovingEveryday) - Game Mechanics, Socket Architecture, Core Loop

Ritika Jaiswal (@jaiswalritika) - UI/UX, Spectator Polish, Social Features
