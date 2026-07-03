import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";

import connectDB from "./utils/mongo_connection.mjs";
import { authenticateCookie } from "./middlewares.mjs";
import startCronJobs from "./utils/cronJobs.mjs";

import authRoutes from "./pages/Auth/routes.mjs";
import AdminRouter from "./pages/admin/AdminRoute.mjs";
import ChapterRouter from "./pages/chapter/MainRoute.mjs";
import ProfileRouter from "./pages/profile/profileRoute.mjs";
import MeetingRouter from "./pages/meetings/meetingRoute.mjs";
import slipsRouter from "./pages/slips/slipsRoute.mjs";
import MemberRouter from "./pages/members/memberRoute.mjs";
import EventRouter from "./pages/events/eventRoute.mjs";
import DashboardRouter from "./pages/dashboard/dashboardRoute.mjs";
import NotificationRouter from "./pages/notifications/notificationRoute.mjs";
import ActivityRouter from "./pages/activity/activityRoute.mjs";
import Public from "./pages/public/public.mjs";
import Galery from "./pages/galery/galeryRoute.mjs";
import GamificationRouter from "./pages/dashboard/GamificationRoute.mjs";

dotenv.config();

connectDB();
if (!process.env.VERCEL) {
  startCronJobs();
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const allowedOrigins = [
  "https://www.senguntharinbusiness.in",
  "https://senguntharinbusiness.in",
  "https://www.senguntharinbusiness.com",
  "https://senguntharinbusiness.com",
  "https://localhost",
  "http://localhost",
  "capacitor://localhost",
  "http://localhost:5173",
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log("❌ Blocked by CORS:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
};

app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOptions));

app.get("/favicon.ico", (_req, res) => res.status(204).end());

app.get("/", (_req, res) => {
  res.status(200).sendFile(path.join(__dirname, "index.html"));
});

app.use("/public", Public);
app.use("/auth", authRoutes);
app.use("/gallery", Galery);

app.use(authenticateCookie);

app.get("/authenticate", (req, res) => {
  const admins = process.env.ADMIN_UIDS ? process.env.ADMIN_UIDS.split(",") : [];
  const isAdmin = admins.includes(req.uid);
  res.status(200).json({ message: "Authenticated", user: req.user, isAdmin});
});

app.use("/admin", AdminRouter);
app.use("/chapter", ChapterRouter);
app.use("/profile", ProfileRouter);
app.use("/meeting", MeetingRouter);
app.use("/slips", slipsRouter);
app.use("/member", MemberRouter);
app.use("/event", EventRouter);
app.use("/dashboard", DashboardRouter);
app.use("/notification", NotificationRouter);
app.use("/activity", ActivityRouter);
app.use("/gamification", GamificationRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((err, _req, res, _next) => {
  console.error("Error:", err.message);
  res.status(err.status || 500).json({ error: err.message || "Internal Server Error" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
