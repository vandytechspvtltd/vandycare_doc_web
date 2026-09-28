import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

type VideoCallProps = {
  appointmentId: string;
  callSessionId: string;
  onClose: () => void;
};

type IceServer = {
  urls: string | string[];
  username?: string;
  credential?: string;
};

export default function VideoCall({
  appointmentId,
  callSessionId,
  onClose,
}: VideoCallProps) {

  const localVideoRef =
    useRef<HTMLVideoElement | null>(null);

  const remoteVideoRef =
    useRef<HTMLVideoElement | null>(null);

  const socketRef =
    useRef<Socket | null>(null);

  const peerRef =
    useRef<RTCPeerConnection | null>(null);

  const localStreamRef =
    useRef<MediaStream | null>(null);

  const remoteStreamRef =
    useRef<MediaStream | null>(null);

  const pendingIceRef =
    useRef<RTCIceCandidateInit[]>([]);

  const [connected, setConnected] =
    useState(false);

  const [error, setError] =
    useState("");

  const token =
    localStorage.getItem(
      "doctor_access_token"
    );

  // =====================================================
  // START WEBRTC
  // =====================================================

  useEffect(() => {

    let mounted = true;

    async function startCall() {

      try {

        if (!token) {
          throw new Error(
            "Doctor authentication token missing."
          );
        }

        console.log(
          "Starting doctor WebRTC call",
          {
            appointmentId,
            callSessionId,
          }
        );

        // -------------------------------------------------
        // 1. GET ICE SERVERS
        // -------------------------------------------------

        const apiBase =
          (
            import.meta.env.VITE_API_BASE_URL ||
            "http://localhost:5000/v1"
          ).replace(/\/$/, "");

        const iceResponse =
          await fetch(
            `${apiBase}/video-call/ice-servers`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        if (!iceResponse.ok) {
          throw new Error(
            `ICE server API failed: ${iceResponse.status}`
          );
        }

        const iceData =
          await iceResponse.json();

        console.log(
          "ICE servers response:",
          iceData
        );

        const iceServers: IceServer[] =
          iceData?.data?.iceServers ||
          iceData?.iceServers ||
          [];

        if (!iceServers.length) {
          throw new Error(
            "No ICE servers received."
          );
        }

        // -------------------------------------------------
        // 2. GET CAMERA + MICROPHONE
        // -------------------------------------------------

        const localStream =
          await navigator.mediaDevices.getUserMedia({
            video: {
              width: {
                ideal: 1280,
              },
              height: {
                ideal: 720,
              },
              facingMode: "user",
            },
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });

        if (!mounted) {

          localStream
            .getTracks()
            .forEach((track) => track.stop());

          return;
        }

        localStreamRef.current =
          localStream;

        console.log(
          "Local audio tracks:",
          localStream.getAudioTracks()
        );

        console.log(
          "Local video tracks:",
          localStream.getVideoTracks()
        );

        if (localVideoRef.current) {

          localVideoRef.current.srcObject =
            localStream;

          localVideoRef.current.muted =
            true;

          localVideoRef.current.autoplay =
            true;

          localVideoRef.current.playsInline =
            true;

          await localVideoRef.current
            .play()
            .catch(() => {});
        }

        // -------------------------------------------------
        // 3. CREATE PEER CONNECTION
        // -------------------------------------------------

        const peer =
          new RTCPeerConnection({
            iceServers:
              iceServers.map((server) => ({
                urls: server.urls,
                username: server.username,
                credential: server.credential,
              })),
          });

        peerRef.current =
          peer;

        // -------------------------------------------------
        // 4. ADD LOCAL AUDIO + VIDEO
        // -------------------------------------------------

        localStream
          .getTracks()
          .forEach((track) => {

            console.log(
              "Adding local track:",
              track.kind,
              track.id,
              track.enabled
            );

            peer.addTrack(
              track,
              localStream
            );
          });

        // -------------------------------------------------
        // 5. REMOTE STREAM
        // -------------------------------------------------

        const remoteStream =
          new MediaStream();

        remoteStreamRef.current =
          remoteStream;

        if (remoteVideoRef.current) {

          remoteVideoRef.current.srcObject =
            remoteStream;

          remoteVideoRef.current.autoplay =
            true;

          remoteVideoRef.current.playsInline =
            true;

          remoteVideoRef.current.muted =
            false;
        }

        // -------------------------------------------------
        // 6. REMOTE TRACK
        // -------------------------------------------------

        peer.ontrack = async (event) => {

          console.log(
            "REMOTE TRACK RECEIVED:",
            event.track.kind,
            event.track.id,
            "enabled=",
            event.track.enabled
          );

          event.track.enabled =
            true;

          if (
            remoteStreamRef.current &&
            !remoteStreamRef.current
              .getTracks()
              .some(
                (track) =>
                  track.id === event.track.id
              )
          ) {

            remoteStreamRef.current.addTrack(
              event.track
            );
          }

          if (remoteVideoRef.current) {

            remoteVideoRef.current.srcObject =
              remoteStreamRef.current;

            remoteVideoRef.current.muted =
              false;

            try {
              await remoteVideoRef.current.play();
            } catch (e) {

              console.warn(
                "Remote video play blocked:",
                e
              );
            }
          }

          console.log(
            "Remote stream tracks:",
            remoteStreamRef.current
              ?.getTracks()
              .map((track) => ({
                kind: track.kind,
                id: track.id,
                enabled: track.enabled,
                readyState:
                  track.readyState,
              }))
          );
        };

        // -------------------------------------------------
        // 7. ICE CANDIDATE
        // -------------------------------------------------

        peer.onicecandidate =
          (event) => {

            if (!event.candidate) {
              return;
            }

            console.log(
              "Sending doctor ICE:",
              event.candidate
            );

            socketRef.current?.emit(
              "call:ice-candidate",
              {
                callSessionId,
                candidate: {
                  candidate:
                    event.candidate.candidate,
                  sdpMid:
                    event.candidate.sdpMid,
                  sdpMLineIndex:
                    event.candidate.sdpMLineIndex,
                  usernameFragment:
                    event.candidate.usernameFragment,
                },
              }
            );
          };

        // -------------------------------------------------
        // 8. CONNECTION STATE
        // -------------------------------------------------

        peer.onconnectionstatechange =
          () => {

            console.log(
              "Doctor PeerConnection:",
              peer.connectionState
            );

            if (
              peer.connectionState ===
              "connected"
            ) {

              setConnected(true);
            }

            if (
              peer.connectionState ===
                "failed" ||
              peer.connectionState ===
                "disconnected" ||
              peer.connectionState ===
                "closed"
            ) {

              setConnected(false);
            }
          };

        peer.oniceconnectionstatechange =
          () => {

            console.log(
              "Doctor ICE state:",
              peer.iceConnectionState
            );
          };

        // -------------------------------------------------
        // 9. SOCKET
        // -------------------------------------------------

        const socketUrl =
          (
            import.meta.env.VITE_API_BASE_URL ||
            "http://localhost:5000/v1"
          ).replace(
            /\/v1\/?$/,
            ""
          );

        const socket =
          io(
            socketUrl,
            {
              transports: ["websocket"],
              auth: {
                token,
              },
            }
          );

        socketRef.current =
          socket;

        socket.on(
          "connect",
          () => {

            console.log(
              "Doctor WebRTC socket connected:",
              socket.id
            );

            // IMPORTANT:
            // Doctor joins after accept.
            socket.emit(
              "call:join",
              {
                callSessionId,
              }
            );
          }
        );

        socket.on(
          "connect_error",
          (err) => {

            console.error(
              "Doctor socket error:",
              err
            );

            if (mounted) {
              setError(
                err.message ||
                "Socket connection failed."
              );
            }
          }
        );

        // -------------------------------------------------
        // 10. CALL JOINED
        // -------------------------------------------------

        socket.on(
          "call:joined",
          (data) => {

            console.log(
              "Doctor call:joined:",
              data
            );
          }
        );

        // -------------------------------------------------
        // 11. PATIENT OFFER
        // -------------------------------------------------

        socket.on(
          "call:offer",
          async (data) => {

            try {

              console.log(
                "PATIENT OFFER RECEIVED:",
                data
              );

              const description =
                data?.description;

              if (!description?.sdp) {

                console.error(
                  "Invalid offer:",
                  data
                );

                return;
              }

              const remoteDescription =
                new RTCSessionDescription({
                  type:
                    description.type,
                  sdp:
                    description.sdp,
                });

              await peer.setRemoteDescription(
                remoteDescription
              );

              console.log(
                "Patient offer applied"
              );

              // ------------------------------------------------
              // ADD QUEUED ICE AFTER REMOTE DESCRIPTION
              // ------------------------------------------------

              for (
                const candidate
                of pendingIceRef.current
              ) {

                try {

                  await peer.addIceCandidate(
                    candidate
                  );

                } catch (e) {

                  console.error(
                    "Queued ICE failed:",
                    e
                  );
                }
              }

              pendingIceRef.current =
                [];

              // ------------------------------------------------
              // CREATE ANSWER
              // ------------------------------------------------

              const answer =
                await peer.createAnswer();

              console.log(
                "Doctor answer created:",
                {
                  type: answer.type,
                  sdpLength:
                    answer.sdp?.length,
                }
              );

              await peer.setLocalDescription(
                answer
              );

              console.log(
                "Doctor local answer set"
              );

              // ------------------------------------------------
              // SEND ANSWER
              // ------------------------------------------------

              socket.emit(
                "call:answer",
                {
                  callSessionId,

                  description: {
                    type:
                      answer.type,
                    sdp:
                      answer.sdp,
                  },
                }
              );

              console.log(
                "Doctor ANSWER sent"
              );

            } catch (e: any) {

              console.error(
                "Offer handling failed:",
                e
              );

              if (mounted) {

                setError(
                  e?.message ||
                  "Unable to process video call offer."
                );
              }
            }
          }
        );

        // -------------------------------------------------
        // 12. REMOTE ICE
        // -------------------------------------------------

        socket.on(
          "call:ice-candidate",
          async (data) => {

            try {

              const candidate =
                data?.candidate;

              if (
                !candidate ||
                !candidate.candidate
              ) {
                return;
              }

              console.log(
                "REMOTE PATIENT ICE:",
                candidate
              );

              if (
                !peer.remoteDescription
              ) {

                console.log(
                  "Queueing ICE until remote description is set"
                );

                pendingIceRef.current
                  .push(candidate);

                return;
              }

              await peer.addIceCandidate(
                new RTCIceCandidate(
                  candidate
                )
              );

            } catch (e) {

              console.error(
                "Remote ICE failed:",
                e
              );
            }
          }
        );

        // -------------------------------------------------
        // 13. CALL ENDED
        // -------------------------------------------------

        socket.on(
          "call:ended",
          (data) => {

            console.log(
              "Call ended:",
              data
            );

            cleanup();
          }
        );

        // -------------------------------------------------
        // 14. CALL REJECTED
        // -------------------------------------------------

        socket.on(
          "call:rejected",
          (data) => {

            console.log(
              "Call rejected:",
              data
            );

            cleanup();
          }
        );

      } catch (e: any) {

        console.error(
          "Doctor WebRTC initialization failed:",
          e
        );

        if (mounted) {

          setError(
            e?.message ||
            "Unable to start video call."
          );
        }
      }
    }

    startCall();

    return () => {

      mounted = false;

      cleanup();
    };

  }, [
    appointmentId,
    callSessionId,
    token,
  ]);

  // =====================================================
  // CLEANUP
  // =====================================================

  function cleanup() {

    console.log(
      "Cleaning doctor WebRTC"
    );

    try {

      socketRef.current
        ?.removeAllListeners();

      socketRef.current
        ?.disconnect();

    } catch {}

    socketRef.current =
      null;

    try {

      peerRef.current
        ?.close();

    } catch {}

    peerRef.current =
      null;

    pendingIceRef.current =
      [];

    localStreamRef.current
      ?.getTracks()
      .forEach(
        (track) => track.stop()
      );

    localStreamRef.current =
      null;

    remoteStreamRef.current
      ?.getTracks()
      .forEach(
        (track) => track.stop()
      );

    remoteStreamRef.current =
      null;
  }

  // =====================================================
  // END CALL
  // =====================================================

  async function endCall() {

    try {

      const apiBase =
        (
          import.meta.env.VITE_API_BASE_URL ||
          "http://localhost:5000/v1"
        ).replace(/\/$/, "");

      await fetch(
        `${apiBase}/doctor-portal/appointments/${encodeURIComponent(
          appointmentId
        )}/call/end`,
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

    } catch (e) {

      console.error(
        "End call API failed:",
        e
      );

    } finally {

      socketRef.current?.emit(
        "call:end",
        {
          callSessionId,
        }
      );

      cleanup();

      onClose();
    }
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="video-call-container">

      <div className="video-call-header">

        <div>
          <h2>
            Video Consultation
          </h2>

          <span>
            {connected
              ? "Connected"
              : "Connecting..."}
          </span>
        </div>

        <button
          type="button"
          onClick={endCall}
        >
          End Call
        </button>

      </div>

      {error && (
        <div className="video-call-error">
          {error}
        </div>
      )}

      <div className="video-grid">

        {/* REMOTE */}
        <div className="remote-video">

          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            controls={false}
          />

          <span>
            Patient
          </span>

        </div>

        {/* LOCAL */}
        <div className="local-video">

          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            controls={false}
          />

          <span>
            You
          </span>

        </div>

      </div>

    </div>
  );
}