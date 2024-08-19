// src/components/VideoChat.js

import React, { useEffect, useRef, useState } from 'react';
import { ACTIONS } from '../Actions';

const VideoChat = ({ socketRef, roomId }) => {
  const [peerConnections, setPeerConnections] = useState({});
  const [localStream, setLocalStream] = useState(null);
  const videoRef = useRef(null);

  useEffect(() => {
    const initializeVideoChat = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      videoRef.current.srcObject = stream;

      socketRef.current.on(ACTIONS.SENDING_SIGNAL, handleSignal);
      socketRef.current.on(ACTIONS.RECEIVING_RETURNED_SIGNAL, handleReturnedSignal);
      socketRef.current.on(ACTIONS.JOINED, handleNewPeer);
    };

    const handleSignal = (data) => {
      const { signal, socketId } = data;
      if (peerConnections[socketId]) {
        peerConnections[socketId].addIceCandidate(new RTCIceCandidate(signal));
      }
    };

    const handleReturnedSignal = (data) => {
      const { signal, socketId } = data;
      if (peerConnections[socketId]) {
        peerConnections[socketId].setRemoteDescription(new RTCSessionDescription(signal));
      }
    };

    const handleNewPeer = ({ socketId }) => {
      const peerConnection = new RTCPeerConnection();
      peerConnection.addStream(localStream);
      setPeerConnections((prev) => ({ ...prev, [socketId]: peerConnection }));

      peerConnection.onicecandidate = (e) => {
        if (e.candidate) {
          socketRef.current.emit(ACTIONS.SENDING_SIGNAL, { signal: e.candidate, socketId });
        }
      };

      peerConnection.onaddstream = (e) => {
        // Handle remote stream
        const remoteVideo = document.createElement('video');
        remoteVideo.srcObject = e.stream;
        remoteVideo.autoplay = true;
        document.getElementById('remote-videos').appendChild(remoteVideo);
      };

      peerConnection.createOffer().then((offer) => {
        peerConnection.setLocalDescription(offer);
        socketRef.current.emit(ACTIONS.SENDING_SIGNAL, { signal: offer, socketId });
      });
    };

    initializeVideoChat();

    return () => {
      Object.values(peerConnections).forEach((pc) => pc.close());
      socketRef.current.off(ACTIONS.SENDING_SIGNAL);
      socketRef.current.off(ACTIONS.RECEIVING_RETURNED_SIGNAL);
      socketRef.current.off(ACTIONS.JOINED);
    };
  }, [socketRef, peerConnections, localStream]);

  return (
    <div className="video-chat-container">
      <div className="local-video-container">
        <video ref={videoRef} autoPlay muted></video>
      </div>
      <div id="remote-videos" className="remote-videos-container"></div>
    </div>
  );
};

export default VideoChat;
