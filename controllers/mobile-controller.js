exports.mobileController = (socketio) => {
  const connectedUsersByFacilites = new Map();
  socketio.on("connection", (userSocket) => {


    userSocket.on('new-connection-by-facilities', (data) => {
      const { userId, fullName, facilityId } = data;
      let users;
      const rooms = userSocket.rooms;
      if (!rooms.has(userId)) {
        userSocket.join(userId);
        console.log("Room created and user joined: " + userId);
        userSocket.emit("room-created", { userId });
      } 
      if (connectedUsersByFacilites.has(facilityId)) {
        users = connectedUsersByFacilites.get(facilityId);
      } else {
        users = [];
      }
      const userExists = users.some(user => user.userId === userId);
      if (!userExists) {
        users.push({
          userId: userId,
          socketId: userSocket.id,
          status: "online",
        });

        connectedUsersByFacilites.set(facilityId, users);
        console.log(`${fullName} => was connected `, data);
        
      
      }
      socketio.in(facilityId).emit("new-user-connected", connectedUsersByFacilites.get(facilityId));
    });

    userSocket.on('disconnect-by-facilities', (data) => {
      const { userId, facilityName, fullName, facilityId } = data;

      if (connectedUsersByFacilites.has(facilityId)) {
        let users = connectedUsersByFacilites.get(facilityId);
        const userIndex = users.findIndex(user => user.userId === userId);
        if (userIndex !== -1) {
          users.splice(userIndex, 1);
          if (users.length > 0) {
            connectedUsersByFacilites.set(facilityId, users);
          } else {
            connectedUsersByFacilites.delete(facilityId);
          }
          console.log(`${fullName} was disconnected From =>`, { facility: facilityName });
          socketio.in(facilityId).emit("disconnect-user", connectedUsersByFacilites.get(facilityId));
          userSocket.leave(facilityId);
        }
      }
    });

    userSocket.on("join-facility",(facilityId)=>{
      const rooms = userSocket.rooms;
      if (!rooms.has(facilityId)) {
        userSocket.join(facilityId);
      } 
    });

    userSocket.on("join-chatroom", (room) => {
      const rooms = userSocket.rooms;
    
      if (!rooms.has(room)) {
        userSocket.join(room);
        console.log("User Joined Room: " + room);
        userSocket.emit("joined-chatroom", { room });
      } 
    });

    userSocket.on("send-message-mobile", async (message,messageId,chatId,userId , senderId) => {

      socketio.in(chatId).emit("message-recieved-mobile",{userId , message ,messageId, chatId ,senderId})
    });
    
    userSocket.on("read-message", (room, userId,messageId) => {
      socketio.in(room).emit("message-readed", { userId, room,messageId })
    });

    userSocket.on("typing-mobile", (room, userId) => {
      socketio.in(room).emit("typing-mobile", { userId, room })
    });

    userSocket.on("stop-typing-mobile", (room,userId) => { socketio.in(room).emit("stop-typing-mobile", { room ,userId}) });

    userSocket.on("check-private-room", async (chatId, userId) => {
      socketio.in(userId).emit("update-private-room", { chatId })
    });


    userSocket.on("check-group-room", async (chatId) => {
      socketio.in(chatId).emit("update-group-room", { chatId})
    });

  

  })
}
