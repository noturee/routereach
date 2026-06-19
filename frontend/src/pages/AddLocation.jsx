/**
 * AddLocation — Dedicated page for creating a new outreach location.
 */

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import LocationFormModal from "../components/LocationFormModal.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import apiClient from "../api/apiClient.js";

export default function AddLocation() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (!isAdmin) return;
    apiClient
      .get("/users?per_page=200")
      .then((r) => setUsers(r.data.users || []))
      .catch(() => setUsers([]));
  }, [isAdmin]);

  const handleSave = async (payload) => {
    const response = await apiClient.post("/locations", payload);
    const createdId = response?.data?.location?.id;
    if (createdId) {
      navigate(`/locations/${createdId}`, { replace: true });
      return;
    }
    navigate("/locations", { replace: true });
  };

  return (
    <PageLayout title="Add Location">
      <section className="section">
        <div className="alert" style={{ marginBottom: 12 }}>
          Create a new outreach location and assign it for routing, mapping, and visit logs.
        </div>
      </section>

      <LocationFormModal
        location={null}
        users={users}
        isAdmin={isAdmin}
        onSave={handleSave}
        onClose={() => navigate("/locations", { replace: true })}
      />
    </PageLayout>
  );
}
