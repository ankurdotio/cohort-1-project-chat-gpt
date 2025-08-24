import React, { useCallback, useEffect, useState } from 'react';
import { io } from "socket.io-client";
import ChatMobileBar from '../components/chat/ChatMobileBar.jsx';
import ChatSidebar from '../components/chat/ChatSidebar.jsx';
import ChatMessages from '../components/chat/ChatMessages.jsx';
import ChatComposer from '../components/chat/ChatComposer.jsx';
import '../components/chat/ChatLayout.css';
import { fakeAIReply } from '../components/chat/aiClient.js';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import {
  ensureInitialChat,
  startNewChat,
  selectChat,
  setInput,
  sendingStarted,
  sendingFinished,
  addUserMessage,
  addAIMessage,
  setChats
} from '../store/chatSlice.js';

const Home = () => {
  const dispatch = useDispatch();
  const chats = useSelector(state => state.chat.chats);
  const activeChatId = useSelector(state => state.chat.activeChatId);
  const input = useSelector(state => state.chat.input);
  const isSending = useSelector(state => state.chat.isSending);
  const [ sidebarOpen, setSidebarOpen ] = React.useState(false);
  const [ socket, setSocket ] = useState(null);

  const activeChat = chats.find(c => c.id === activeChatId) || null;

  const [ messages, setMessages ] = useState([
    // {
    //   type: 'user',
    //   content: 'Hello, how can I help you today?'
    // },
    // {
    //   type: 'ai',
    //   content: 'Hi there! I need assistance with my account.'
    // }
  ]);

  const handleNewChat = async () => {
    // Prompt user for title of new chat, fallback to 'New Chat'
    let title = window.prompt('Enter a title for the new chat:', '');
    if (title) title = title.trim();
    if (!title) return

    const response = await axios.post("https://cohort-1-project-chat-gpt.onrender.com/api/chat", {
      title
    }, {
      withCredentials: true
    })
    const chatId = response.data.chat._id;
    getMessages(chatId);
    dispatch(startNewChat(response.data.chat));
    setSidebarOpen(false);
    // Join the new chat room
    if (socket) {
      socket.emit("join-chat", chatId);
    }
  }

  // Ensure at least one chat exists initially
  useEffect(() => {
    axios.get("https://cohort-1-project-chat-gpt.onrender.com/api/chat", { withCredentials: true })
      .then(response => {
        dispatch(setChats(response.data.chats.reverse()));
      })

    const tempSocket = io("https://cohort-1-project-chat-gpt.onrender.com", {
      withCredentials: true,
    })

    tempSocket.on("ai-response", (messagePayload) => {
      console.log("Received AI response:", messagePayload);
      // Only add message if it matches the current chat
      if (messagePayload.chat === activeChatId) {
        if (messagePayload.error) {
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              type: 'ai',
              content: messagePayload.content || 'An error occurred while processing your request.'
            }
          ]);
        } else {
          setMessages((prevMessages) => [ ...prevMessages, {
            type: 'ai',
            content: messagePayload.content
          } ]);
        }
      }
      // Only finish sending if not error (prevents double finish if error already handled)
      if (!messagePayload.error) {
        dispatch(sendingFinished());
      }
    });

    setSocket(tempSocket);

    return () => {
      tempSocket.disconnect();
      dispatch(sendingFinished());
    };
  }, [activeChatId]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    console.log("Sending message:", trimmed);
    if (!trimmed || !activeChatId || isSending) return;
    dispatch(sendingStarted());

    const newMessages = [ ...messages, {
      type: 'user',
      content: trimmed
    } ];

    console.log("New messages:", newMessages);

    setMessages(newMessages);
    dispatch(setInput(''));

    // Ensure we are in the correct chat room before sending
    if (socket) {
      socket.emit("join-chat", activeChatId);
      socket.emit("ai-message", {
        chat: activeChatId,
        content: trimmed
      });
    }
  }

  const getMessages = async (chatId) => {
    const response = await axios.get(`https://cohort-1-project-chat-gpt.onrender.com/api/chat/messages/${chatId}`, { withCredentials: true })
    console.log("Fetched messages:", response.data.messages);
    setMessages(response.data.messages.map(m => ({
      type: m.role === 'user' ? 'user' : 'ai',
      content: m.content
    })));
    // Join the chat room when messages are loaded
    if (socket) {
      socket.emit("join-chat", chatId);
    }
  }


return (
  <div className="chat-layout minimal">
    <ChatMobileBar
      onToggleSidebar={() => setSidebarOpen(o => !o)}
      onNewChat={handleNewChat}
    />
    <ChatSidebar
      chats={chats}
      activeChatId={activeChatId}
      onSelectChat={(id) => {
        dispatch(selectChat(id));
        setSidebarOpen(false);
        getMessages(id);
        // Join the selected chat room
        if (socket) {
          socket.emit("join-chat", id);
        }
      }}
      onNewChat={handleNewChat}
      open={sidebarOpen}
    />
    <main className="chat-main" role="main">
      {messages.length === 0 && (
        <div className="chat-welcome" aria-hidden="true">
          <div className="chip">Early Preview</div>
          <h1>ChatGPT Clone</h1>
          <p>Ask anything. Paste text, brainstorm ideas, or get quick explanations. Your chats stay in the sidebar so you can pick up where you left off.</p>
        </div>
      )}
      <ChatMessages messages={messages} isSending={isSending} />
      {
        activeChatId &&
        <ChatComposer
          input={input}
          setInput={(v) => dispatch(setInput(v))}
          onSend={sendMessage}
          isSending={isSending}
        />}
    </main>
    {sidebarOpen && (
      <button
        className="sidebar-backdrop"
        aria-label="Close sidebar"
        onClick={() => setSidebarOpen(false)}
      />
    )}
  </div>
);
};

export default Home;
