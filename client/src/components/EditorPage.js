import React, { useEffect, useRef, useState } from "react";
import Client from "./Client";
import Editor from "./Editor";
import Chat from "./Chat";
import { initSocket } from "../Socket";
import { ACTIONS } from "../Actions";
import { useNavigate, useLocation, Navigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";

function EditorPage() {
  const [clients, setClients] = useState([]);
  const [resOutput, setResOutput] = useState('');
  const [language, setLanguage] = useState('javascript'); // Default language

  const codeRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { roomId } = useParams();

  const socketRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      socketRef.current = await initSocket();
      socketRef.current.on("connect_error", (err) => handleErrors(err));
      socketRef.current.on("connect_failed", (err) => handleErrors(err));

      const handleErrors = (err) => {
        console.log("Error", err);
        toast.error("Socket connection failed, Try again later");
        navigate("/");
      };

      socketRef.current.emit(ACTIONS.JOIN, {
        roomId,
        username: location.state?.username,
      });

      socketRef.current.on(ACTIONS.JOINED, ({ clients, username, socketId }) => {
        if (username !== location.state?.username) {
          toast.success(`${username} joined the room.`);
        }
        setClients(clients);
        socketRef.current.emit(ACTIONS.SYNC_CODE, {
          code: codeRef.current,
          socketId,
        });
      });

      socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
        toast.success(`${username} left the room`);
        setClients((prev) => prev.filter((client) => client.socketId !== socketId));
      });

      socketRef.current.on("codeOutput", (data) => {
        console.log("Received code output:", data);
        setResOutput(data.output || data.error);
      });
    };
    init();

    return () => {
      socketRef.current && socketRef.current.disconnect();
      socketRef.current.off(ACTIONS.JOINED);
      socketRef.current.off(ACTIONS.DISCONNECTED);
      socketRef.current.off("codeOutput");
    };
  }, []);

  if (!location.state) {
    return <Navigate to="/" />;
  }

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      toast.success(`Room ID is copied`);
    } catch (error) {
      console.log(error);
      toast.error("Unable to copy the room ID");
    }
  };

  const leaveRoom = async () => {
    navigate("/");
  };

  const runCode = async () => {
    try {
      const code = codeRef.current;
      socketRef.current.emit('runCode', { code, roomId, language });
    } catch (error) {
      console.error('Error running code:', error);
    }
  };

  return (
    <div className="container-fluid vh-100">
      <div className="row h-100">
        {/* Client panel */}
        <div className="col-md-2 bg-dark text-light d-flex flex-column h-100" style={{ boxShadow: "2px 0px 4px rgba(0, 0, 0, 0.1)" }}>
          <img
            src="/images/codemate.png"
            alt="Logo"
            className="img-fluid mx-auto"
            style={{ maxWidth: "auto", marginBottom: "70px" }}
          />
          <hr style={{ marginTop: "-3rem" }} />

          <div className="d-flex flex-column flex-grow-1 overflow-auto">
            <span className="mb-2">Members</span>
            {clients.map((client) => (
              <Client key={client.socketId} username={client.username} />
            ))}
          </div>

          <hr />
          <div className="mt-auto">
            <button className="btn btn-success" onClick={copyRoomId}>Copy Room ID</button>
            <button className="btn btn-danger mt-2 mb-2 px-3 btn-block" onClick={leaveRoom}>Leave Room</button>
          </div>
        </div>

        {/* Editor panel */}
        <div className="col-md-8 text-light d-flex flex-column h-100">
          <Editor
            socketRef={socketRef}
            roomId={roomId}
            onCodeChange={(code) => {
              codeRef.current = code;
            }}
          />
          <Chat socketRef={socketRef} roomId={roomId} />
        </div>

        {/* Output panel */}
        <div className="col-md-2 bg-dark text-light d-flex flex-column h-100 overflow-auto" style={{ boxShadow: "2px 0px 4px rgba(0, 0, 0, 0.1)" }}>
          <div className="md-auto" style={{ marginLeft: "20px", marginTop: "15px" }}>
            <div className="mb-2">
              <select
                className="form-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="c++">C++</option>
                <option value="c">C</option>
              </select>
            </div>
            <button className="btn btn-success" onClick={runCode}>Run Code</button>
            <hr />
          </div>
          <div className="d-flex flex-column flex-grow-1 overflow-auto">
            <span className="mb-2">Output:</span>
            <pre>{resOutput}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditorPage;
