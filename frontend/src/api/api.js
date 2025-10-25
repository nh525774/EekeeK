const API_URL = import.meta.env.VITE_API_URL || "/api";

export const getServerStatus = async () => {
  const response = await fetch(`${API_URL}/`);
  return response.text();
};