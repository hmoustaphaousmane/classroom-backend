import AgentAPI from "apminsight";
AgentAPI().config();

import express from "express";
import cors from "cors";

import subjectsRouter from "./routes/subjects.js";
import securityMiddleware from "./middleware/security.js";

import {toNodeHandler} from "better-auth/node";
import { auth } from "./lib/auth.js";

const app = express();
const PORT = process.env.PORT || 8000;
app.set("trust proxy", 1);

if (!process.env.FRONTEND_URL) throw new Error('FRONTEND_URL is not set in .env file');
app.use(cors({
  origin: process.env.FRONTEND_URL,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));

app.all('/api/auth/{*splat}', toNodeHandler(auth));

app.use(express.json());

app.use(securityMiddleware);

app.use('/api/subjects', subjectsRouter);

app.get("/", (_req, res) => {
  res.send("Server is running.");
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
