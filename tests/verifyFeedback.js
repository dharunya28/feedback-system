/**
 * Verification Test Suite for Feedback System
 */
const path = require("path");
module.paths.push(path.join(__dirname, "../server/node_modules"));
require("dotenv").config({ path: path.join(__dirname, "../server/.env") });
const http = require("http");
const mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");
const fs = require("fs");

const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI;

async function runTests() {
    console.log("=================================================");
    console.log("🧪 STARTING FEEDBACK SYSTEM VERIFICATION TESTS");
    console.log("=================================================");

    if (!mongoURI) {
        console.error("❌ MONGODB_URI (or MONGO_URI) is not defined in server/.env");
        process.exit(1);
    }

    await mongoose.connect(mongoURI);
    console.log("✅ Connected to MongoDB for testing");

    // Express app setup matching server/server.js
    const app = express();
    app.use(cors());
    app.use(express.json());

    app.get("/api/health", (req, res) => {
        res.status(200).json({ success: true, message: "Feedback server is healthy" });
    });

    app.get("/test", (req, res) => {
        res.send("NEW FEEDBACK SERVER WORKING");
    });

    const feedbackSchema = new mongoose.Schema({
        name: { type: String, required: true },
        department: { type: String, required: true },
        session: { type: String, required: true },
        feedback: { type: String, required: true },
        suggestions: { type: String, default: "" }
    }, { timestamps: true });

    const Feedback = mongoose.models.Feedback || mongoose.model("Feedback", feedbackSchema);

    app.post("/api/feedback", async (req, res) => {
        try {
            const { name, department, session, feedback, suggestions } = req.body;
            if (!name || !department || !session || !feedback) {
                return res.status(400).json({ success: false, message: "Missing required fields" });
            }
            const newFeedback = new Feedback({ name, department, session, feedback, suggestions });
            const savedFeedback = await newFeedback.save();
            res.status(201).json({ success: true, message: "Feedback submitted successfully!", data: savedFeedback });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    });

    app.get("/api/getfeedback", async (req, res) => {
        try {
            const allFeedback = await Feedback.find().sort({ createdAt: -1 });
            res.status(200).json({ success: true, data: allFeedback });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    });

    const clientDist = path.join(__dirname, "../client/dist");
    if (fs.existsSync(clientDist)) {
        app.use(express.static(clientDist));
        app.use((req, res, next) => {
            if (req.method === "GET" && !req.path.startsWith("/api") && req.path !== "/test") {
                return res.sendFile(path.join(clientDist, "index.html"));
            }
            next();
        });
    }

    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;
    console.log(`✅ Test server running on ${baseUrl}\n`);

    let passed = 0;
    let failed = 0;

    const assert = (condition, desc) => {
        if (condition) {
            console.log(`  ✅ PASS: ${desc}`);
            passed++;
        } else {
            console.error(`  ❌ FAIL: ${desc}`);
            failed++;
        }
    };

    const testTimestamp = Date.now();
    const testPayload = {
        name: `Test Student ${testTimestamp}`,
        department: "Information Technology",
        session: "Cloud Computing Workshop",
        feedback: "Very informative and practical session!",
        suggestions: "Add more hands-on lab time."
    };

    let createdId = null;

    try {
        // 1. Health check
        console.log("1. Health Endpoint");
        const resHealth = await fetch(`${baseUrl}/api/health`);
        const jsonHealth = await resHealth.json();
        assert(resHealth.status === 200 && jsonHealth.success === true, "GET /api/health returns 200 OK");

        // 2. Test route
        console.log("\n2. Test Endpoint");
        const resTest = await fetch(`${baseUrl}/test`);
        const textTest = await resTest.text();
        assert(resTest.status === 200 && textTest.includes("WORKING"), "GET /test returns working string");

        // 3. Post feedback
        console.log("\n3. Submit Feedback");
        const resPost = await fetch(`${baseUrl}/api/feedback`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(testPayload)
        });
        const jsonPost = await resPost.json();
        assert(resPost.status === 201 && jsonPost.success === true, "POST /api/feedback saves feedback");
        createdId = jsonPost.data?._id;

        // 4. Get all feedback
        console.log("\n4. Get All Feedback");
        const resGet = await fetch(`${baseUrl}/api/getfeedback`);
        const jsonGet = await resGet.json();
        assert(
            resGet.status === 200 &&
            Array.isArray(jsonGet.data) &&
            jsonGet.data.some(f => f._id === createdId),
            "GET /api/getfeedback contains the newly submitted feedback"
        );

        // 5. Frontend index.html served
        console.log("\n5. Client Production Build Serving");
        const resHome = await fetch(`${baseUrl}/`);
        const homeHtml = await resHome.text();
        assert(resHome.status === 200 && homeHtml.includes("<html"), "GET / serves the built React client index.html");

    } finally {
        if (createdId) {
            console.log("\n🧹 Cleaning up test feedback record...");
            await Feedback.findByIdAndDelete(createdId);
            console.log("Test feedback cleaned up successfully.");
        }
        await new Promise((resolve) => server.close(resolve));
        await mongoose.disconnect();
        console.log("Disconnected test server and database.");
    }

    console.log("\n=================================================");
    console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("=================================================");

    if (failed > 0) {
        process.exit(1);
    }
}

runTests().catch((err) => {
    console.error("Test threw error:", err);
    process.exit(1);
});
