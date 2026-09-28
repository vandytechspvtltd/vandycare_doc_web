import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  io,
  Socket,
} from "socket.io-client";

import { api } from "./api";

type Props = {
  appointmentId: string;
  callSessionId: string;
  onClose: () => void;
};

const SOCKET_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:5000/v1"
).replace(
  /\/v1\/?$/,
  ""
);

export default function VideoCall({
  appointmentId,
  callSessionId,
  onClose,
}: Props) {
  const localVideoRef =
    useRef<HTMLVideoElement | null>(
      null
    );

  const remoteVideoRef =
    useRef<HTMLVideoElement | null>(
      null
    );

  const socketRef =
    useRef<Socket | null>(null);

  const peerRef =
    useRef<RTCPeerConnection | null>(
      null
    );

  const localStreamRef =
    useRef<MediaStream | null>(
      null
    );

  const mountedRef =
    useRef(true);

  const [status, setStatus] =
    useState("Connecting...");

  const [error, setError] =
    useState("");

  useEffect(() => {
    mountedRef.current = true;

    let socket: Socket | null = null;

    async function start() {
      try {
        setStatus(
          "Preparing camera..."
        );

        const iceResponse =
          await api.iceServers();

        const iceServers =
          iceResponse?.data
            ?.iceServers || [];

        const stream =
          await navigator.mediaDevices.getUserMedia(
            {
              video: true,
              audio: true,
            }
          );

        if (!mountedRef.current) {
          stream
            .getTracks()
            .forEach((track) =>
              track.stop()
            );

          return;
        }

        localStreamRef.current =
          stream;

        if (
          localVideoRef.current
        ) {
          localVideoRef.current.srcObject =
            stream;
        }

        const peer =
          new RTCPeerConnection({
            iceServers,
          });

        peerRef.current = peer;

        stream
          .getTracks()
          .forEach((track) => {
            peer.addTrack(
              track,
              stream
            );
          });

        // ==========================================
        // REMOTE TRACK
        // ==========================================

        peer.ontrack = (
          event
        ) => {
          const remoteStream =
            event.streams?.[0];

          if (
            remoteStream &&
            remoteVideoRef.current
          ) {
            remoteVideoRef.current.srcObject =
              remoteStream;

            remoteVideoRef.current
              .play()
              .catch(() => {});
          }
        };

        // ==========================================
        // ICE CANDIDATE
        // ==========================================

        peer.onicecandidate = (
          event
        ) => {
          if (
            !event.candidate
          ) {
            return;
          }

          socketRef.current?.emit(
            "call:ice-candidate",
            {
              callSessionId,

              candidate: {
                sdpMid:
                  event.candidate
                    .sdpMid,

                sdpMLineIndex:
                  event.candidate
                    .sdpMLineIndex,

                candidate:
                  event.candidate
                    .candidate,
              },
            }
          );
        };

        // ==========================================
        // CONNECTION STATE
        // ==========================================

        peer.onconnectionstatechange =
          () => {
            const state =
              peer.connectionState;

            console.log(
              "WebRTC connection state:",
              state
            );

            if (
              state ===
              "connected"
            ) {
              setStatus(
                "Consultation active"
              );
            }

            if (
              state ===
                "failed" ||
              state ===
                "disconnected"
            ) {
              console.warn(
                "WebRTC connection:",
                state
              );
            }
          };

        const token =
          localStorage.getItem(
            "doctor_access_token"
          );

        if (!token) {
          throw new Error(
            "Doctor access token missing."
          );
        }

        // ==========================================
        // SOCKET CONNECTION
        // ==========================================

        socket = io(
          SOCKET_URL,
          {
            transports: [
              "websocket",
            ],

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
              "Video socket connected:",
              socket?.id
            );

            setStatus(
              "Joining consultation..."
            );

            socket?.emit(
              "call:join",
              {
                callSessionId,
              }
            );
          }
        );

        // ==========================================
        // JOINED
        // ==========================================

        socket.on(
          "call:joined",
          (data: any) => {
            console.log(
              "Call joined:",
              data
            );

            setStatus(
              "Waiting for patient..."
            );
          }
        );

        // ==========================================
        // OFFER
        // ==========================================

        socket.on(
          "call:offer",
          async (
            data: any
          ) => {
            try {
              const description =
                data?.description;

              if (
                !description?.sdp ||
                !description?.type
              ) {
                console.warn(
                  "Invalid offer received"
                );

                return;
              }

              console.log(
                "📨 Offer received"
              );

              await peer.setRemoteDescription(
                new RTCSessionDescription(
                  {
                    type:
                      description.type,

                    sdp:
                      description.sdp,
                  }
                )
              );

              const answer =
                await peer.createAnswer();

              await peer.setLocalDescription(
                answer
              );

              socket?.emit(
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

              setStatus(
                "Consultation active"
              );
            } catch (e) {
              console.error(
                "Offer handling failed:",
                e
              );

              setError(
                "Unable to establish video connection."
              );
            }
          }
        );

        // ==========================================
        // ICE CANDIDATE
        // ==========================================

        socket.on(
          "call:ice-candidate",
          async (
            data: any
          ) => {
            try {
              const candidate =
                data?.candidate;

              if (!candidate) {
                return;
              }

              await peer.addIceCandidate(
                new RTCIceCandidate(
                  {
                    sdpMid:
                      candidate.sdpMid,

                    sdpMLineIndex:
                      candidate.sdpMLineIndex,

                    candidate:
                      candidate.candidate,
                  }
                )
              );
            } catch (e) {
              console.error(
                "ICE candidate failed:",
                e
              );
            }
          }
        );

        // ==========================================
        // CALL ENDED
        // ==========================================

        socket.on(
          "call:ended",
          () => {
            setStatus(
              "Call ended"
            );

            cleanup();

            onClose();
          }
        );

        // ==========================================
        // CALL REJECTED
        // ==========================================

        socket.on(
          "call:rejected",
          () => {
            setStatus(
              "Call rejected"
            );

            cleanup();

            onClose();
          }
        );

        // ==========================================
        // SOCKET CALL ERROR
        // ==========================================

        socket.on(
          "call:error",
          (data: any) => {
            console.error(
              "Call socket error:",
              data
            );

            setError(
              data?.message ||
                "Video call error."
            );
          }
        );

        socket.on(
          "connect_error",
          (err) => {
            console.error(
              "Socket connection error:",
              err
            );

            setError(
              "Unable to connect to video call."
            );
          }
        );
      } catch (e: any) {
        console.error(
          "Video call start failed:",
          e
        );

        setError(
          e?.message ||
            "Unable to start video call."
        );
      }
    }

    start();

    return () => {
      mountedRef.current =
        false;

      cleanup();
    };
  }, [
    appointmentId,
    callSessionId,
  ]);

  // ======================================================
  // CLEANUP
  // ======================================================

  function cleanup() {
    localStreamRef.current
      ?.getTracks()
      .forEach((track) =>
        track.stop()
      );

    localStreamRef.current =
      null;

    if (
      localVideoRef.current
    ) {
      localVideoRef.current.srcObject =
        null;
    }

    if (
      remoteVideoRef.current
    ) {
      remoteVideoRef.current.srcObject =
        null;
    }

    peerRef.current
      ?.close();

    peerRef.current =
      null;

    socketRef.current
      ?.removeAllListeners();

    socketRef.current
      ?.disconnect();

    socketRef.current =
      null;
  }

  // ======================================================
  // END CALL
  // ======================================================

  async function endCall() {
    try {
      await api.endVideoCall(
        appointmentId
      );
    } catch (e) {
      console.error(
        "End call API failed:",
        e
      );
    }

    socketRef.current?.emit(
      "call:end",
      {
        callSessionId,
      }
    );

    cleanup();

    onClose();
  }

  // ======================================================
  // UI
  // ======================================================

  return (
    <div className="video-call">

      <div className="video-header">
        <div>
          <h2>
            Video Consultation
          </h2>

          <span>
            {status}
          </span>
        </div>

        <button
          type="button"
          onClick={endCall}
          className="danger"
        >
          End Call
        </button>
      </div>

      {error && (
        <div className="alert error">
          {error}
        </div>
      )}

      <div className="video-grid">

        <div className="remote-video">
          <video
            ref={
              remoteVideoRef
            }
            autoPlay
            playsInline
          />

          <span>
            Patient
          </span>
        </div>

        <div className="local-video">
          <video
            ref={
              localVideoRef
            }
            autoPlay
            muted
            playsInline
          />

          <span>
            You
          </span>
        </div>

      </div>
    </div>
  );
}