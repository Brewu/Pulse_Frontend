import React, { createContext, useContext, useState } from 'react';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);

  // Don't auto-connect for now
  // useEffect(() => {
  //   if (user && token && !socket) {
  //     const newSocket = io('http://localhost:5000');
  //     setSocket(newSocket);
  //   }
  // }, [user, token]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};