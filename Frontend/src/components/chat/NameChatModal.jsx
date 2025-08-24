import React, { useState } from 'react';
import './NameChatModal.css';

const NameChatModal = ({ isOpen, onCancel, onSubmit }) => {
  const [chatName, setChatName] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (chatName.trim()) {
      onSubmit(chatName.trim());
      setChatName('');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Name your chat</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={chatName}
            onChange={(e) => setChatName(e.target.value)}
            placeholder="Enter chat name"
            autoFocus
          />
          <div className="modal-actions">
            <button type="button" onClick={onCancel} className="cancel-btn">Cancel</button>
            <button type="submit" className="submit-btn">Create</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NameChatModal;
