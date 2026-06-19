import apiClient from "../api/apiClient.js";

export async function generateForm104(applicantId: number, createdBy?: string) {
  const response = await apiClient.post(
    `/reports/form-104/${applicantId}/generate`,
    { created_by: createdBy }
  );

  return response.data;
}

export async function getForm104(reportId: number) {
  const response = await apiClient.get(`/reports/form-104/${reportId}`);

  return response.data;
}

export async function updateForm104(reportId: number, content: any) {
  const response = await apiClient.put(`/reports/form-104/${reportId}`, {
    content,
  });

  return response.data;
}

export function downloadForm104Pdf(reportId: number) {
  const base = import.meta.env.VITE_API_BASE_URL || "/api";
  window.open(`${base}/reports/form-104/${reportId}/pdf`, "_blank");
}
