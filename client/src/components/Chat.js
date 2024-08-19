import React, { useState, useEffect, useRef } from "react";
import { ACTIONS } from "../Actions";
import { toast } from "react-hot-toast";
import { FaComments, FaChevronDown, FaChevronUp, FaBell } from "react-icons/fa";
import "bootstrap/dist/css/bootstrap.min.css"; // Import Bootstrap

function Chat({ socketRef, roomId, username }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Load messages from local storage
    const storedMessages = JSON.parse(localStorage.getItem(`chatMessages_${roomId}`)) || [];
    setMessages(storedMessages);

    if (socketRef.current) {
      socketRef.current.on(ACTIONS.CHAT_MESSAGE, ({ username: sender, message }) => {
        const newMessages = [...messages, { username: sender, message }];
        setMessages(newMessages);
        localStorage.setItem(`chatMessages_${roomId}`, JSON.stringify(newMessages));
        if (sender !== username) {
          setHasNewMessage(true); // Indicate new message
        }
      });

      socketRef.current.on(ACTIONS.NEW_MESSAGE_NOTIFICATION, () => {
        if (!isChatVisible) {
          setHasNewMessage(true); // Show notification if chat is not visible
        }
      });
    }

    return () => {
      socketRef.current.off(ACTIONS.CHAT_MESSAGE);
      socketRef.current.off(ACTIONS.NEW_MESSAGE_NOTIFICATION);
    };
  }, [socketRef.current, isChatVisible, messages, roomId, username]);

  const sendMessage = () => {
    if (message.trim()) {
      socketRef.current.emit(ACTIONS.CHAT_MESSAGE, { roomId, message });
      setMessage("");
    } else {
      toast.error("Message cannot be empty");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault(); // Prevents default behavior (e.g., adding a new line)
      sendMessage(); // Sends the message
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleChatVisibility = () => {
    setIsChatVisible(!isChatVisible);
    if (isChatVisible && isChatMinimized) {
      setIsChatMinimized(false);
    }
    if (isChatVisible) {
      setHasNewMessage(false); // Clear new message indicator when chat is opened
    }
  };

  return (
    <div>
      {/* Button to toggle chat visibility */}
      <button
        className="btn btn-dark rounded-circle position-fixed bottom-0 end-0 m-4"
        onClick={handleChatVisibility}
      >
        <FaComments size={24} />
        {hasNewMessage && !isChatVisible && (
          <div className="position-relative">
            <div
              className="badge bg-danger position-absolute top-0 start-100 translate-middle rounded-pill"
              style={{ transform: "translate(-50%, -50%)" }}
            >
              New
            </div>
          </div>
        )}
      </button>

      {/* Chat container */}
      {isChatVisible && (
        <div
          className={`card position-fixed bottom-0 end-0 m-4 ${isChatMinimized ? "chat-minimized" : ""}`}
          style={{ width: "300px", maxHeight: "400px", transition: "all 0.3s ease" }}
        >
          <div className="card-header bg-dark text-white d-flex justify-content-between align-items-center">
            <span>Chat Room</span>
            <button
              className="btn btn-light"
              onClick={() => setIsChatMinimized(!isChatMinimized)}
            >
              {isChatMinimized ? <FaChevronUp /> : <FaChevronDown />}
            </button>
            {hasNewMessage && !isChatMinimized && (
              <div className="position-relative">
                <FaBell size={20} className="text-warning" />
              </div>
            )}
          </div>
          {!isChatMinimized && (
            <>
              <div className="card-body overflow-auto d-flex flex-column-reverse" style={{ maxHeight: "300px" }}>
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`d-flex ${msg.username === username ? "justify-content-end" : "justify-content-start"} mb-2`}
                  >
                    <div
                      className={`p-2 rounded ${msg.username === username ? "bg-info text-white" : "bg-secondary text-light"}`}
                      style={{ maxWidth: "70%" }}
                    >
                      <strong>{msg.username}: </strong>{msg.message}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <div className="card-footer">
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control rounded-0"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Chat with peers..."
                  />
                  <button
                    className="btn btn-primary rounded-0 ms-2"
                    onClick={sendMessage}
                  >
                    Send
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default Chat;
