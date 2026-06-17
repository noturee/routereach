/**
 * AddLocation — Redirects to OutreachLocations with the add modal open.
 * The LocationFormModal on OutreachLocations handles all creation.
 */
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function AddLocation() {
  const navigate = useNavigate();
  useEffect(() => {
    // Redirect to the locations list; the "+ Add Location" button opens the modal there.
    navigate("/locations", { replace: true });
  }, [navigate]);
  return null;
}
