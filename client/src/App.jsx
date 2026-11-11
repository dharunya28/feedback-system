
import React, { useState } from "react";
import axios from "axios";
import "./App.css";

// Render Backend API URL (used when page is opened on GitHub Pages)
const RENDER_BACKEND_URL = "https://feedback-system-icc6.onrender.com";

const API = window.location.origin.includes("github.io")
  ? (import.meta.env.VITE_API_URL || RENDER_BACKEND_URL)
  : (import.meta.env.VITE_API_URL || "");

function App() {
  const [page, setPage] = useState("form");

  const [form, setForm] = useState({
    name: "",
    department: "",
    session: "",
    feedback: "",
    suggestions: ""
  });

  const [allFeedback, setAllFeedback] = useState([]);
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post(
        `${API}/api/feedback`,
        form
      );

      setMessage(response.data.message);

      setForm({
        name: "",
        department: "",
        session: "",
        feedback: "",
        suggestions: ""
      });

    } catch (error) {
      setMessage(
        error.response?.data?.message ||
        "Unable to submit feedback. Check backend connection."
      );
    }
  };

  const getFeedback = async () => {
    try {
      const response = await axios.get(
        `${API}/api/getfeedback`
      );

      setAllFeedback(response.data.data);
      setPage("view");

    } catch (error) {
      alert("Unable to fetch feedback. Check backend.");
    }
  };

  return (
    <div className="app">

      <nav className="navbar">
        <h2>Feed<span>Back</span></h2>

        <div className="nav-links">
          <button onClick={() => {
            setPage("form");
            setMessage("");
          }}>
            Home
          </button>

          <button onClick={getFeedback}>
            View Feedback
          </button>
        </div>
      </nav>

      {page === "form" ? (

        <div className="main-container">

          <div className="welcome">
            <p className="small-title">YOUR VOICE MATTERS</p>

            <h1>Share Your Experience</h1>

            <p>
              Help us improve our sessions by sharing
              your valuable feedback.
            </p>
          </div>

          <div className="form-card">

            <h2>Feedback Form</h2>

            <p className="description">
              Please fill in the details below.
            </p>

            {message && (
              <div className="message">
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit}>

              <label>Full Name</label>
              <input
                type="text"
                name="name"
                placeholder="Enter your name"
                value={form.name}
                onChange={handleChange}
                required
              />

              <label>Department</label>
              <input
                type="text"
                name="department"
                placeholder="Enter your department"
                value={form.department}
                onChange={handleChange}
                required
              />

              <label>Session Title</label>
              <input
                type="text"
                name="session"
                placeholder="Enter session name"
                value={form.session}
                onChange={handleChange}
                required
              />

              <label>Your Feedback</label>
              <textarea
                name="feedback"
                placeholder="Share your experience..."
                value={form.feedback}
                onChange={handleChange}
                required
              />

              <label>Suggestions</label>
              <textarea
                name="suggestions"
                placeholder="Any suggestions for improvement?"
                value={form.suggestions}
                onChange={handleChange}
              />

              <button type="submit" className="submit-btn">
                Submit Feedback
              </button>

            </form>

          </div>
        </div>

      ) : (

        <div className="feedback-container">

          <h1>All Student Feedback</h1>

          <p>Feedback submitted by students</p>

          <button
            className="back-btn"
            onClick={() => setPage("form")}
          >
            Back to Form
          </button>

          {allFeedback.length === 0 ? (

            <div className="empty">
              No feedback submitted yet.
            </div>

          ) : (

            <div className="feedback-grid">

              {allFeedback.map((item) => (

                <div className="feedback-card" key={item._id}>

                  <h3>{item.name}</h3>

                  <p>
                    <strong>Department:</strong> {item.department}
                  </p>

                  <p>
                    <strong>Session:</strong> {item.session}
                  </p>

                  <p>
                    <strong>Feedback:</strong> {item.feedback}
                  </p>

                  <p>
                    <strong>Suggestions:</strong>{" "}
                    {item.suggestions || "No suggestions"}
                  </p>

                  <small>
                    {new Date(item.createdAt).toLocaleString()}
                  </small>

                </div>

              ))}

            </div>

          )}

        </div>

      )}

      <footer>
        <p>© 2026 Online Survey Application | Feedback System</p>
      </footer>

    </div>
  );
}

export default App;
