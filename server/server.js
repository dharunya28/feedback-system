const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const app = express();

const isProduction = process.env.NODE_ENV === "production";

// Trust Render reverse proxy in production
if (isProduction) {
    app.set("trust proxy", 1);
}

// Middleware
app.use(cors());
app.use(express.json());

// Log all requests in PowerShell / console
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// HEALTH CHECK ROUTE (for Render deployment monitoring)
app.get("/api/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Feedback server is healthy",
        timestamp: new Date().toISOString()
    });
});

// TEST ROUTE
app.get("/test", (req, res) => {
    res.send("NEW FEEDBACK SERVER WORKING");
});

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!MONGODB_URI) {
    console.error(
        "WARNING: MONGODB_URI (or MONGO_URI) is not defined in environment variables! Please check your .env file or Render environment settings."
    );
} else {
    mongoose.connect(MONGODB_URI)
        .then(() => {
            console.log("MongoDB Connected Successfully");
        })
        .catch((error) => {
            console.log("MongoDB Connection Error:", error.message);
        });
}

// Feedback Schema
const feedbackSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    department: {
        type: String,
        required: true
    },
    session: {
        type: String,
        required: true
    },
    feedback: {
        type: String,
        required: true
    },
    suggestions: {
        type: String,
        default: ""
    }
}, {
    timestamps: true
});

const Feedback = mongoose.model("Feedback", feedbackSchema);

// POST FEEDBACK
app.post("/api/feedback", async (req, res) => {
    try {
        const {
            name,
            department,
            session,
            feedback,
            suggestions
        } = req.body;

        const newFeedback = new Feedback({
            name,
            department,
            session,
            feedback,
            suggestions
        });

        const savedFeedback = await newFeedback.save();

        // Display submitted details in PowerShell
        console.log("\n==================================");
        console.log("       NEW FEEDBACK RECEIVED");
        console.log("==================================");
        console.log("Name:", savedFeedback.name);
        console.log("Department:", savedFeedback.department);
        console.log("Session:", savedFeedback.session);
        console.log("Feedback:", savedFeedback.feedback);
        console.log("Suggestions:", savedFeedback.suggestions);
        console.log("Date:", savedFeedback.createdAt);
        console.log("==================================\n");

        res.status(201).json({
            success: true,
            message: "Feedback submitted successfully!",
            data: savedFeedback
        });

    } catch (error) {
        console.log("Submission Error:", error.message);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// GET ALL FEEDBACK
app.get("/api/getfeedback", async (req, res) => {
    try {
        const allFeedback = await Feedback.find().sort({
            createdAt: -1
        });

        res.status(200).json({
            success: true,
            data: allFeedback
        });

    } catch (error) {
        console.log("Fetch Error:", error.message);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// FRONTEND STATIC ASSETS (Serve built React client in production)
const clientDist = path.join(__dirname, "../client/dist");

if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));

    app.use((req, res, next) => {
        if (req.method === "GET" && !req.path.startsWith("/api") && req.path !== "/test") {
            return res.sendFile(path.join(clientDist, "index.html"));
        }
        next();
    });
} else {
    // HOME ROUTE (Fallback when frontend build is not present)
    app.get("/", (req, res) => {
        res.send("Online Survey Application Backend is Running");
    });
}

// INVALID API ROUTE
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "API endpoint not found"
    });
});

// START SERVER
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log("==================================");
    console.log("ONLINE SURVEY APPLICATION");
    console.log(`Server running at http://localhost:${PORT}`);
    console.log("==================================");
});
