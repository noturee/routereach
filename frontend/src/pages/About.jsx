/**
 * About — Public About Page
 *
 * Describes RouteReach Pro and credits the developer.
 */

import React from "react";
import { useNavigate } from "react-router-dom";

export default function About() {
  const navigate = useNavigate();

  return (
    <div className="about-container">
      {/* Header */}
      <header className="about-header">
        <button className="about-back-btn" onClick={() => navigate("/")}>
          ← Back to Home
        </button>
      </header>

      {/* Main Content */}
      <main className="about-main">
        {/* About Section */}
        <section className="about-section">
          <h1 className="about-title">About RouteReach Pro</h1>
          <p className="about-intro">
            RouteReach Pro is a map-based outreach and performance platform
            designed to help organizations plan targeted routes, track field
            activity, and generate meaningful reports from operational data.
          </p>

          <h2 className="about-subtitle">What We Do</h2>
          <div className="about-features">
            <div className="about-feature-card">
              <div className="about-feature-icon">🗺️</div>
              <h3>Map & Target</h3>
              <p>
                Visualize applicants and locations by geography, identify high-demand
                areas, and plan outreach routes with data-driven precision.
              </p>
            </div>
            <div className="about-feature-card">
              <div className="about-feature-icon">📝</div>
              <h3>Track Activity</h3>
              <p>
                Log visits, distribute materials, record contacts, and document
                follow-up needs in one connected workflow.
              </p>
            </div>
            <div className="about-feature-card">
              <div className="about-feature-icon">📊</div>
              <h3>Report with Confidence</h3>
              <p>
                Generate monthly summaries and performance updates using live
                operational data instead of memory or scattered spreadsheets.
              </p>
            </div>
          </div>
        </section>

        {/* Developer Section */}
        <section className="about-section about-developer">
          <h2 className="about-subtitle">About the Developer</h2>
          <div className="about-developer-card">
            <div className="about-developer-content">
              <h3 className="about-developer-name">Charisma DeZonie</h3>
              <p className="about-developer-title">
                Full-Stack Developer & Architect
              </p>
              <p className="about-developer-bio">
                Charisma DeZonie designed and developed RouteReach Pro from
                conception to production. With expertise in full-stack development,
                cloud architecture, and data-driven applications, she built RouteReach
                Pro to simplify outreach management and empower field teams with
                actionable insights.
              </p>
              <div className="about-developer-links">
                <a
                  href="https://github.com/noturee"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="about-link"
                >
                  GitHub
                </a>
                <a
                  href="mailto:info@thelincolnheritagegroup.com"
                  className="about-link"
                >
                  Contact
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Technology Section */}
        <section className="about-section">
          <h2 className="about-subtitle">Built With Modern Technology</h2>
          <div className="about-tech-grid">
            <div className="about-tech-item">
              <strong>Frontend:</strong> React, Vite, JavaScript
            </div>
            <div className="about-tech-item">
              <strong>Backend:</strong> Python, Flask, PostgreSQL
            </div>
            <div className="about-tech-item">
              <strong>Infrastructure:</strong> AWS, ECS, S3, CloudFront, Route 53
            </div>
            <div className="about-tech-item">
              <strong>Maps:</strong> Google Maps API
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section className="about-section about-contact">
          <h2 className="about-subtitle">Get in Touch</h2>
          <p>
            Have questions or feedback? Reach out to the team behind RouteReach Pro.
          </p>
          <a href="mailto:info@thelincolnheritagegroup.com" className="about-cta-btn">
            Contact Support
          </a>
        </section>
      </main>

      {/* Footer */}
      <footer className="about-footer">
        <p>
          &copy; 2026 RouteReach Pro. Designed and developed by Charisma DeZonie.
        </p>
      </footer>
    </div>
  );
}
