const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const authRoute = require('./routes/auth');
const adminRoute = require('./routes/admin'); 
const socketManager = require('./socket');

dotenv.config();

const app = express();
const server = http.createServer(app);

// --- UPDATED: Socket CORS to include live CLIENT_URL ---
const io = new Server(server, {
  cors: {
    origin: [process.env.CLIENT_URL, "http://localhost:5173", "http://127.0.0.1:5173"],
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

app.use(express.json());

// --- UPDATED: Express CORS to include live CLIENT_URL ---
app.use(cors({
  origin: [process.env.CLIENT_URL, "http://localhost:5173", "http://127.0.0.1:5173"],
  credentials: true
}));

mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("DB Connection Successful"))
  .catch((err) => console.log(err));

// Init Socket Logic
socketManager(io);

// REST API Routes
app.use("/api/auth", authRoute);
app.use("/api/admin", adminRoute); 

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});