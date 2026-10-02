import React, {
  useEffect,
  useState,
} from "react";
import { io, Socket } from "socket.io-client";
import { api } from "./api";
import VideoCall from "./VideoCall";
import logo from "./assets/vandycins-logo.png";
type View =
  | "overview"
  | "appointments"
  | "patients"
  | "profile";

type Doctor = Record<string, any>;

type IncomingCall = {
  id: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  status: string;
  createdAt?: string;
};

const arr = (x: any): any[] => {
  if (Array.isArray(x)) return x;
  if (Array.isArray(x?.data)) return x.data;
  if (Array.isArray(x?.data?.items)) return x.data.items;
  if (Array.isArray(x?.items)) return x.items;
  return [];
};

// ======================================================
// LOGIN
// ======================================================

function Login({
  done,
  showRegister,
}: {
  done: (doctor: any, token: string) => void;
  showRegister: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    setError("");
    setBusy(true);

    try {
      const response: any = await api.login(
        email.trim(),
        password
      );

      const token =
        response?.access_token ||
        response?.data?.accessToken;

      if (!token) {
        throw new Error(
          response?.message ||
            "Access token missing from server response."
        );
      }

      const doctor =
        response?.data?.doctor ||
        response?.data?.user ||
        response?.data ||
        {};

      localStorage.setItem(
        "doctor_access_token",
        token
      );

      localStorage.setItem(
        "doctor_user",
        JSON.stringify(doctor)
      );

      done(doctor, token);
    } catch (e: any) {
      setError(
        e?.message ||
          "Unable to login. Please check your credentials."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <div className="authcard">
        <div className="brand brand-logo"><img
  src={logo}
  alt="VandyCins"
  className="brand-logo"
/></div>

        <h1>Doctor Portal</h1>
                      
        <p>
          Sign in to manage appointments and patients.
        </p>

        {error && (
          <div className="alert error">
            {error}
          </div>
        )}

        <form onSubmit={submit}>
          <label>Email</label>

          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            placeholder="doctor@example.com"
          />

          <label>Password</label>

          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            placeholder="••••••••"
          />

          <button
            type="submit"
            className="primary full"
            disabled={busy}
          >
            {busy
              ? "Signing In..."
              : "Sign In"}
          </button>
        </form>

        <div className="auth-switch">
          <span>
            Don't have a doctor account?
          </span>

          <button
            type="button"
            className="link"
            onClick={showRegister}
          >
            Register
          </button>
        </div>

        <small>
          Only approved and active doctors can access
          the portal.
        </small>
      </div>
    </div>
  );
}

// ======================================================
// REGISTRATION
// ======================================================

function Registration({
  showLogin,
}: {
  showLogin: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    mobile: "",
    password: "",
    specialization: "",
    qualification: "",
    experience: "",
    registrationNumber: "",
    clinicName: "",
    clinicAddress: "",
    bio: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  function setField(
    field: string,
    value: string
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    setError("");
    setSuccess("");
    setBusy(true);

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        mobile: form.mobile.trim(),
        password: form.password,
        specialization:
          form.specialization.trim(),
        qualification:
          form.qualification.trim(),
        experience:
          form.experience === ""
            ? null
            : Number(form.experience),
        registrationNumber:
          form.registrationNumber.trim(),
        clinicName: form.clinicName.trim(),
        clinicAddress:
          form.clinicAddress.trim(),
        bio: form.bio.trim(),
      };

      const response: any =
        await api.register(payload);

      if (!response?.success) {
        throw new Error(
          response?.message ||
            "Registration failed."
        );
      }

      setSuccess(
        response?.message ||
          "Registration submitted successfully. Please wait for admin approval."
      );

      setForm({
        name: "",
        email: "",
        mobile: "",
        password: "",
        specialization: "",
        qualification: "",
        experience: "",
        registrationNumber: "",
        clinicName: "",
        clinicAddress: "",
        bio: "",
      });
    } catch (e: any) {
      setError(
        e?.message ||
          "Unable to submit registration."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth registration-page">
      <div className="authcard registration-card">
        <div className="brand brand-logo"><img src="/vandycins-logo.png" alt="VandyCare" /></div>

        <h1>Doctor Registration</h1>

        <p>
          Create your doctor account for portal
          access.
        </p>

        {error && (
          <div className="alert error">
            {error}
          </div>
        )}

        {success && (
          <div className="alert info">
            {success}
          </div>
        )}

        <form onSubmit={submit}>
          <div className="form-grid">
            <div>
              <label>Full Name</label>

              <input
                type="text"
                required
                value={form.name}
                onChange={(e) =>
                  setField(
                    "name",
                    e.target.value
                  )
                }
                placeholder="Dr. Ananya Verma"
              />
            </div>

            <div>
              <label>Email</label>

              <input
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={(e) =>
                  setField(
                    "email",
                    e.target.value
                  )
                }
                placeholder="doctor@example.com"
              />
            </div>

            <div>
              <label>Mobile</label>

              <input
                type="tel"
                required
                value={form.mobile}
                onChange={(e) =>
                  setField(
                    "mobile",
                    e.target.value
                  )
                }
                placeholder="9123456780"
              />
            </div>

            <div>
              <label>Password</label>

              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={form.password}
                onChange={(e) =>
                  setField(
                    "password",
                    e.target.value
                  )
                }
                placeholder="Minimum 8 characters"
              />
            </div>

            <div>
              <label>Specialization</label>

              <input
                type="text"
                required
                value={form.specialization}
                onChange={(e) =>
                  setField(
                    "specialization",
                    e.target.value
                  )
                }
                placeholder="Dermatologist"
              />
            </div>

            <div>
              <label>Qualification</label>

              <input
                type="text"
                required
                value={form.qualification}
                onChange={(e) =>
                  setField(
                    "qualification",
                    e.target.value
                  )
                }
                placeholder="MBBS, MD"
              />
            </div>

            <div>
              <label>
                Experience (Years)
              </label>

              <input
                type="number"
                min="0"
                value={form.experience}
                onChange={(e) =>
                  setField(
                    "experience",
                    e.target.value
                  )
                }
                placeholder="6"
              />
            </div>

            <div>
              <label>
                Registration Number
              </label>

              <input
                type="text"
                value={form.registrationNumber}
                onChange={(e) =>
                  setField(
                    "registrationNumber",
                    e.target.value
                  )
                }
                placeholder="MP654321"
              />
            </div>

            <div>
              <label>Clinic Name</label>

              <input
                type="text"
                value={form.clinicName}
                onChange={(e) =>
                  setField(
                    "clinicName",
                    e.target.value
                  )
                }
                placeholder="Verma Skin Care Clinic"
              />
            </div>

            <div>
              <label>Clinic Address</label>

              <input
                type="text"
                value={form.clinicAddress}
                onChange={(e) =>
                  setField(
                    "clinicAddress",
                    e.target.value
                  )
                }
                placeholder="Palasia, Indore"
              />
            </div>

            <div className="wide">
              <label>Bio</label>

              <textarea
                rows={4}
                value={form.bio}
                onChange={(e) =>
                  setField(
                    "bio",
                    e.target.value
                  )
                }
                placeholder="Tell us about your professional experience..."
              />
            </div>
          </div>

          <button
            type="submit"
            className="primary full"
            disabled={busy}
          >
            {busy
              ? "Submitting..."
              : "Submit Registration"}
          </button>
        </form>

        <div className="auth-switch">
          <span>
            Already have an account?
          </span>

          <button
            type="button"
            className="link"
            onClick={showLogin}
          >
            Sign In
          </button>
        </div>

        <small>
          Your registration will be reviewed by
          the admin before you can access the
          portal.
        </small>
      </div>
    </div>
  );
}

// ======================================================
// MAIN APP
// ======================================================

function App() {
  const [doctor, setDoctor] =
    useState<Doctor | null>(() => {
      try {
        return JSON.parse(
          localStorage.getItem(
            "doctor_user"
          ) || "null"
        );
      } catch {
        return null;
      }
    });

  const [authPage, setAuthPage] =
    useState<"login" | "register">(
      "login"
    );

  const [view, setView] =
    useState<View>("overview");

  const [appointments, setAppointments] =
    useState<any[]>([]);

  const [patients, setPatients] =
    useState<any[]>([]);

  const [profile, setProfile] =
    useState<Doctor>(doctor || {});

  const [notice, setNotice] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  // ====================================================
  // VIDEO CALL STATE
  // ====================================================

  const [videoCall, setVideoCall] =
    useState<{
      appointmentId: string;
      callSessionId: string;
    } | null>(null);

  // ====================================================
  // INCOMING CALL STATE
  // ====================================================

  const [incomingCall, setIncomingCall] =
    useState<IncomingCall | null>(null);

  const logged =
    !!doctor &&
    !!localStorage.getItem(
      "doctor_access_token"
    );

  // ====================================================
  // LOAD DATA
  // ====================================================

  useEffect(() => {
    if (logged) {
      load();
    }
  }, [logged]);

  // ====================================================
  // GLOBAL VIDEO CALL SOCKET
  // ====================================================

  useEffect(() => {
    if (!logged) return;

    const token = localStorage.getItem(
      "doctor_access_token"
    );

    if (!token) return;

    const socketUrl = (
      import.meta.env.VITE_API_BASE_URL ||
      "http://localhost:5000/v1"
    ).replace(/\/v1\/?$/, "");

    const socket: Socket = io(
      socketUrl,
      {
        transports: ["websocket"],
        auth: {
          token,
        },
      }
    );

    console.log(
      "Creating doctor call socket..."
    );

    socket.on("connect", () => {
      console.log(
        "Doctor call socket connected:",
        socket.id
      );
    });

    // ==================================================
    // INCOMING CALL
    // ==================================================

    socket.on(
      "call:incoming",
      (session: IncomingCall) => {
        console.log(
          "📞 Incoming video call:",
          session
        );

        if (
          session?.status === "RINGING" &&
          session?.appointmentId
        ) {
          setIncomingCall(session);
        }
      }
    );

    // ==================================================
    // CALL ACCEPTED
    // ==================================================

    socket.on(
      "call:accepted",
      (session: any) => {
        console.log(
          "✅ Call accepted:",
          session
        );
      }
    );

    // ==================================================
    // CALL ENDED
    // ==================================================

    socket.on(
      "call:ended",
      (session: any) => {
        console.log(
          "📴 Call ended:",
          session
        );

        setIncomingCall(
          (current) => {
            if (
              current?.id === session?.id ||
              current?.appointmentId ===
                session?.appointmentId
            ) {
              return null;
            }

            return current;
          }
        );

        setVideoCall(
          (current) => {
            if (
              current?.callSessionId ===
              session?.id
            ) {
              return null;
            }

            return current;
          }
        );
      }
    );

    // ==================================================
    // CALL REJECTED
    // ==================================================

    socket.on(
      "call:rejected",
      (session: any) => {
        console.log(
          "❌ Call rejected:",
          session
        );

        setIncomingCall(
          (current) => {
            if (
              current?.id === session?.id ||
              current?.appointmentId ===
                session?.appointmentId
            ) {
              return null;
            }

            return current;
          }
        );
      }
    );

    // ==================================================
    // SOCKET ERROR
    // ==================================================

    socket.on(
      "connect_error",
      (error) => {
        console.error(
          "Doctor call socket error:",
          error
        );
      }
    );

    return () => {
      console.log(
        "Disconnecting doctor call socket"
      );

      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [logged]);

  // ====================================================
  // LOAD DATA
  // ====================================================

  async function load() {
    setLoading(true);
    setNotice("");

    const results =
      await Promise.allSettled([
        api.profile(),
        api.appointments(),
        api.patients(),
      ]);

    if (
      results[0].status === "fulfilled"
    ) {
      const response: any =
        results[0].value;

      const profileData =
        response?.data?.doctor ||
        response?.data ||
        {};

      setProfile(profileData);
      setDoctor(profileData);

      localStorage.setItem(
        "doctor_user",
        JSON.stringify(profileData)
      );
    }

    if (
      results[1].status === "fulfilled"
    ) {
      setAppointments(
        arr(results[1].value)
      );
    }

    if (
      results[2].status === "fulfilled"
    ) {
      setPatients(
        arr(results[2].value)
      );
    }

    if (
      results.every(
        (item) =>
          item.status === "rejected"
      )
    ) {
      setNotice(
        "API is not reachable. Check VITE_API_BASE_URL and backend routes."
      );
    }

    setLoading(false);
  }

  // ====================================================
  // LOGOUT
  // ====================================================

  function logout() {
    setIncomingCall(null);
    setVideoCall(null);

    localStorage.removeItem(
      "doctor_access_token"
    );

    localStorage.removeItem(
      "doctor_user"
    );

    setDoctor(null);
    setProfile({});
    setAppointments([]);
    setPatients([]);
    setView("overview");
    setAuthPage("login");
  }

  // ====================================================
  // APPOINTMENT STATUS
  // ====================================================

  async function changeAppointmentStatus(
    id: string,
    status: string
  ) {
    try {
      await api.appointmentStatus(
        id,
        status
      );

      setNotice(
        `Appointment ${status.toLowerCase()}.`
      );

      await load();
    } catch (e: any) {
      setNotice(
        e?.message ||
          "Unable to update appointment."
      );
    }
  }

  // ====================================================
  // ACCEPT VIDEO CALL
  // ====================================================

  async function acceptCall(
    appointmentId: string
  ) {
    try {
      const current: any =
        await api.getVideoCall(
          appointmentId
        );

      let session =
        current?.data || null;

      if (!session?.id) {
        throw new Error(
          "No incoming video call found for this appointment."
        );
      }

      const currentStatus =
        String(
          session.status || ""
        ).toUpperCase();

      if (currentStatus !== "RINGING") {
        throw new Error(
          `Call is no longer ringing. Current status: ${currentStatus}`
        );
      }

      const accepted: any =
        await api.acceptVideoCall(
          appointmentId
        );

      session =
        accepted?.data || null;

      if (
        !session?.id ||
        String(session.status).toUpperCase() !==
          "ACCEPTED"
      ) {
        throw new Error(
          "Call was not accepted successfully."
        );
      }

      console.log(
        "✅ Doctor accepted call:",
        session
      );

      setIncomingCall(null);

      setVideoCall({
        appointmentId,
        callSessionId: session.id,
      });

      setNotice("");
    } catch (e: any) {
      console.error(
        "Accept call failed:",
        e
      );

      setNotice(
        e?.message ||
          "Unable to accept video call."
      );
    }
  }

  // ====================================================
  // REJECT VIDEO CALL
  // ====================================================

  async function rejectCall(
    appointmentId: string
  ) {
    try {
      await api.rejectVideoCall(
        appointmentId
      );

      setIncomingCall(null);

      setNotice(
        "Video call rejected."
      );
    } catch (e: any) {
      console.error(
        "Reject call failed:",
        e
      );

      setNotice(
        e?.message ||
          "Unable to reject video call."
      );
    }
  }

  // ====================================================
  // AUTH SCREEN
  // ====================================================

  if (!logged) {
    if (authPage === "register") {
      return (
        <Registration
          showLogin={() =>
            setAuthPage("login")
          }
        />
      );
    }

    return (
      <Login
        done={(data) => {
          setDoctor(data);
          setProfile(data);
        }}
        showRegister={() =>
          setAuthPage("register")
        }
      />
    );
  }

  // ====================================================
  // STATS
  // ====================================================

  const active =
    appointments.filter(
      (appointment) =>
        ![
          "COMPLETED",
          "CANCELLED",
        ].includes(
          String(
            appointment.status || ""
          ).toUpperCase()
        )
    ).length;

  const completed =
    appointments.filter(
      (appointment) =>
        String(
          appointment.status || ""
        ).toUpperCase() ===
        "COMPLETED"
    ).length;

  // ====================================================
  // MAIN UI
  // ====================================================

  return (
    <div className="shell">

      {/* ================================================
          INCOMING CALL POPUP
      ================================================= */}

      {incomingCall && !videoCall && (
        <div className="incoming-call-overlay">
          <div className="incoming-call-card">

            <div className="incoming-call-icon">
              📞
            </div>

            <h2>
              Incoming Video Call
            </h2>

            <p>
              Patient is calling you...
            </p>

            <small>
              Please accept the call to start
              the consultation.
            </small>

            <div className="incoming-call-actions">

              <button
                type="button"
                className="primary"
                onClick={() =>
                  acceptCall(
                    incomingCall.appointmentId
                  )
                }
              >
                Accept
              </button>

              <button
                type="button"
                className="danger"
                onClick={() =>
                  rejectCall(
                    incomingCall.appointmentId
                  )
                }
              >
                Reject
              </button>

            </div>

          </div>
        </div>
      )}

      <aside>
        <div className="brand brand-logo">
          <img src="/vandycins-logo.png" alt="VandyCare" />
        </div>

        <small>Doctor Portal</small>

        <nav>
          <button
            className={
              view === "overview"
                ? "active"
                : ""
            }
            onClick={() =>
              setView("overview")
            }
          >
            Overview
          </button>

          <button
            className={
              view === "appointments"
                ? "active"
                : ""
            }
            onClick={() =>
              setView("appointments")
            }
          >
            Appointments
          </button>

          <button
            className={
              view === "patients"
                ? "active"
                : ""
            }
            onClick={() =>
              setView("patients")
            }
          >
            Patients
          </button>

          <button
            className={
              view === "profile"
                ? "active"
                : ""
            }
            onClick={() =>
              setView("profile")
            }
          >
            My Profile
          </button>
        </nav>

        <button
          className="logout"
          onClick={logout}
        >
          Sign Out
        </button>
      </aside>

      <main>
        <header>
          <div>
            <h2>
              {view === "overview"
                ? "Overview"
                : view[0].toUpperCase() +
                  view.slice(1)}
            </h2>

            <span>
              Doctor workspace
            </span>
          </div>

          <div className="user">
            <b>
              {profile.name ||
                doctor?.name ||
                "Doctor"}
            </b>

            <small>
              {profile.specialization ||
                "Doctor"}
            </small>
          </div>
        </header>

        {notice && (
          <div className="alert info">
            {notice}
          </div>
        )}

        {/* ============================================
            OVERVIEW
        ============================================ */}

        {view === "overview" && (
          <>
            <section className="welcome">
              <div>
                <em>
                  WELCOME BACK
                </em>

                <h1>
                  {profile.name ||
                    "Doctor"}
                </h1>

                <p>
                  {profile.specialization ||
                    "Medical professional"}{" "}
                  ·{" "}
                  {profile.qualification ||
                    "Qualification not available"}
                </p>
              </div>

              <button
                onClick={load}
                disabled={loading}
              >
                {loading
                  ? "Refreshing..."
                  : "Refresh Data"}
              </button>
            </section>

            <section className="stats">
              <Stat
                t="Appointments"
                v={appointments.length}
              />

              <Stat
                t="Active"
                v={active}
              />

              <Stat
                t="Completed"
                v={completed}
              />

              <Stat
                t="Patients"
                v={patients.length}
              />
            </section>

            <Panel
              title="Upcoming Appointments"
              action={() =>
                setView("appointments")
              }
            >
              <Appointments
                rows={appointments.slice(
                  0,
                  5
                )}
                change={
                  changeAppointmentStatus
                }
                onVideoCall={
                  acceptCall
                }
              />
            </Panel>
          </>
        )}

        {/* ============================================
            APPOINTMENTS
        ============================================ */}

        {view === "appointments" && (
          <Panel title="Appointments">
            <Appointments
              rows={appointments}
              change={
                changeAppointmentStatus
              }
              onVideoCall={
                acceptCall
              }
            />
          </Panel>
        )}

        {/* ============================================
            PATIENTS
        ============================================ */}

        {view === "patients" && (
          <Panel title="Patients">
            {patients.length ? (
              <table>
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Email</th>
                    <th>Mobile</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {patients.map(
                    (
                      patient,
                      index
                    ) => (
                      <tr
                        key={
                          patient.id ||
                          index
                        }
                      >
                        <td>
                          {patient.name ||
                            patient.patientName ||
                            "—"}
                        </td>

                        <td>
                          {patient.email ||
                            "—"}
                        </td>

                        <td>
                          {patient.mobile ||
                            patient.phone ||
                            "—"}
                        </td>

                        <td>
                          {patient.status ||
                            "ACTIVE"}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            ) : (
              <Empty />
            )}
          </Panel>
        )}

        {/* ============================================
            PROFILE
        ============================================ */}

        {view === "profile" && (
          <Profile
            p={profile}
            saved={(data) => {
              setProfile(data);
              setDoctor(data);

              localStorage.setItem(
                "doctor_user",
                JSON.stringify(data)
              );
            }}
          />
        )}

        {/* ============================================
            VIDEO CALL
        ============================================ */}

        {videoCall && (
          <VideoCall
            appointmentId={
              videoCall.appointmentId
            }
            callSessionId={
              videoCall.callSessionId
            }
            onClose={() =>
              setVideoCall(null)
            }
          />
        )}
      </main>
    </div>
  );
}

// ======================================================
// STAT
// ======================================================

function Stat({
  t,
  v,
}: {
  t: string;
  v: number;
}) {
  return (
    <div className="stat">
      <span>{t}</span>
      <b>{v}</b>
    </div>
  );
}

// ======================================================
// PANEL
// ======================================================

function Panel({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: () => void;
}) {
  return (
    <section className="panel">
      <div className="panelhead">
        <h3>{title}</h3>

        {action && (
          <button
            className="link"
            onClick={action}
          >
            View all
          </button>
        )}
      </div>

      {children}
    </section>
  );
}

// ======================================================
// APPOINTMENTS
// ======================================================

function Appointments({
  rows,
  change,
  onVideoCall,
}: {
  rows: any[];

  change: (
    id: string,
    status: string
  ) => void;

  onVideoCall: (
    appointmentId: string
  ) => void;
}) {
  if (!rows.length) {
    return <Empty />;
  }

  return (
    <div className="table">
      <table>
        <thead>
          <tr>
            <th>Patient</th>
            <th>Date</th>
            <th>Time</th>
            <th>Type</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {rows.map(
            (
              appointment,
              index
            ) => {
              const id = String(
                appointment.id || ""
              );

              const status =
                String(
                  appointment.status ||
                    "PENDING"
                ).toUpperCase();

              const consultationType =
                String(
                  appointment.consultationType ||
                    appointment.type ||
                    ""
                ).toUpperCase();

              return (
                <tr
                  key={
                    id || index
                  }
                >
                  <td>
                    {appointment.patientName ||
                      appointment.patient
                        ?.name ||
                      "—"}
                  </td>

                  <td>
                    {appointment.date ||
                      "—"}
                  </td>

                  <td>
                    {appointment.time ||
                      "—"}
                  </td>

                  <td>
                    {appointment.consultationType ||
                      appointment.type ||
                      "Consultation"}
                  </td>

                  <td>
                    <span className="badge">
                      {status}
                    </span>
                  </td>

                  <td>
                    {id &&
                    ![
                      "COMPLETED",
                      "CANCELLED",
                    ].includes(
                      status
                    ) ? (
                      <>
                        <button
                          className="mini"
                          onClick={() =>
                            change(
                              id,
                              "CONFIRMED"
                            )
                          }
                        >
                          Confirm
                        </button>

                        <button
                          className="mini"
                          onClick={() =>
                            change(
                              id,
                              "COMPLETED"
                            )
                          }
                        >
                          Complete
                        </button>

                        {consultationType ===
                          "VIDEO" && (
                          <button
                            className="mini"
                            onClick={() =>
                              onVideoCall(
                                id
                              )
                            }
                          >
                            Video Call
                          </button>
                        )}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            }
          )}
        </tbody>
      </table>
    </div>
  );
}

// ======================================================
// PROFILE
// ======================================================

function Profile({
  p,
  saved,
}: {
  p: Doctor;
  saved: (p: any) => void;
}) {
  const [form, setForm] =
    useState<Doctor>(p);

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    setForm(p);
  }, [p]);

  function setField(
    key: string,
    value: any
  ) {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  async function save(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setMessage("");

    try {
      const response: any =
        await api.updateProfile(
          form
        );

      const updated =
        response?.data?.doctor ||
        response?.data ||
        form;

      saved(updated);

      setMessage(
        "Profile updated successfully."
      );
    } catch (e: any) {
      setMessage(
        e?.message ||
          "Unable to update profile."
      );
    }
  }

  return (
    <section className="panel">
      <div className="panelhead">
        <h3>My Profile</h3>
      </div>

      {message && (
        <div className="alert info">
          {message}
        </div>
      )}

      <form
        className="grid"
        onSubmit={save}
      >
        {[
          ["name", "Full Name"],
          ["email", "Email"],
          ["mobile", "Mobile"],
          [
            "specialization",
            "Specialization",
          ],
          [
            "qualification",
            "Qualification",
          ],
          [
            "registrationNumber",
            "Registration Number",
          ],
          [
            "clinicName",
            "Clinic Name",
          ],
          [
            "clinicAddress",
            "Clinic Address",
          ],
        ].map(
          ([key, label]) => (
            <div key={key}>
              <label>{label}</label>

              <input
                value={form[key] || ""}
                onChange={(e) =>
                  setField(
                    key,
                    e.target.value
                  )
                }
                readOnly={
                  key === "email"
                }
              />
            </div>
          )
        )}

        <div className="wide">
          <label>Bio</label>

          <textarea
            rows={4}
            value={form.bio || ""}
            onChange={(e) =>
              setField(
                "bio",
                e.target.value
              )
            }
          />
        </div>

        <div className="wide">
          <button
            type="submit"
            className="primary"
          >
            Save Changes
          </button>
        </div>
      </form>
    </section>
  );
}

// ======================================================
// EMPTY
// ======================================================

function Empty() {
  return (
    <div className="empty">
      No data returned by the API.
    </div>
  );
}

export default App;