const BASE = (
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:5000/v1"
).replace(/\/$/, "");

async function request(
  path: string,
  options: RequestInit = {}
) {
  const token =
    localStorage.getItem(
      "doctor_access_token"
    );

  const headers = new Headers(
    options.headers
  );

  headers.set(
    "Content-Type",
    "application/json"
  );

  headers.set(
    "Accept",
    "application/json"
  );

  if (token) {
    headers.set(
      "Authorization",
      `Bearer ${token}`
    );
  }

  const url = `${BASE}${path}`;

  console.log("API Request:", {
    method:
      options.method || "GET",
    url,
  });

  try {
    const response = await fetch(
      url,
      {
        ...options,
        headers,
      }
    );

    const text =
      await response.text();

    let data: any = {};

    try {
      data = text
        ? JSON.parse(text)
        : {};
    } catch {
      data = {
        message:
          text ||
          "Invalid server response",
      };
    }

    console.log(
      "API Response:",
      {
        status:
          response.status,
        url,
        data,
      }
    );

    if (!response.ok) {
      throw new Error(
        data?.message ||
          `Request failed (${response.status})`
      );
    }

    return data;
  } catch (error: any) {
    console.error(
      "API Error:",
      {
        url,
        error,
      }
    );

    throw error;
  }
}

export const api = {

  // =====================================================
  // AUTH
  // =====================================================

  login: (
    email: string,
    password: string
  ) =>
    request(
      "/doctor-portal/login",
      {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
        }),
      }
    ),

  register: (
    data: any
  ) =>
    request(
      "/doctor-portal/register",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    ),

  // =====================================================
  // PROFILE
  // =====================================================

  profile: () =>
    request(
      "/doctor-portal/profile"
    ),

  status: () =>
    request(
      "/doctor-portal/status"
    ),

  updateProfile: (
    data: any
  ) =>
    request(
      "/doctor-portal/profile",
      {
        method: "PATCH",
        body: JSON.stringify(data),
      }
    ),

  // =====================================================
  // APPOINTMENTS
  // =====================================================

  appointments: () =>
    request(
      "/doctor-portal/appointments"
    ),

  appointmentDetails: (
    appointmentId: string
  ) =>
    request(
      `/doctor-portal/appointments/${encodeURIComponent(
        appointmentId
      )}`
    ),

  appointmentStatus: (
    appointmentId: string,
    status: string
  ) =>
    request(
      `/doctor-portal/appointments/${encodeURIComponent(
        appointmentId
      )}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({
          status,
        }),
      }
    ),

  // =====================================================
  // PATIENTS
  // =====================================================

  patients: () =>
    request(
      "/doctor-portal/patients"
    ),

  patientDetails: (
    patientId: string
  ) =>
    request(
      `/doctor-portal/patients/${encodeURIComponent(
        patientId
      )}`
    ),

  // =====================================================
  // DOCTOR VIDEO CALL
  // =====================================================

  getVideoCall: (
    appointmentId: string
  ) =>
    request(
      `/doctor-portal/appointments/${encodeURIComponent(
        appointmentId
      )}/call`
    ),

  acceptVideoCall: (
    appointmentId: string
  ) =>
    request(
      `/doctor-portal/appointments/${encodeURIComponent(
        appointmentId
      )}/call/accept`,
      {
        method: "POST",
      }
    ),

  rejectVideoCall: (
    appointmentId: string
  ) =>
    request(
      `/doctor-portal/appointments/${encodeURIComponent(
        appointmentId
      )}/call/reject`,
      {
        method: "POST",
      }
    ),

  endVideoCall: (
    appointmentId: string
  ) =>
    request(
      `/doctor-portal/appointments/${encodeURIComponent(
        appointmentId
      )}/call/end`,
      {
        method: "POST",
      }
    ),

  // =====================================================
  // WEBRTC ICE SERVERS
  // =====================================================

  iceServers: () =>
    request(
      "/video-call/ice-servers"
    ),
};