exports.mobileController = (socketio) => {
  const connectedUsersByFacilites = new Map();
  socketio.on("connection", (userSocket) => {


    userSocket.on('new-connection-by-facilities', (data) => {
      const { userId, fullName, facilityId } = data;
      let users;
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
        userSocket.join(facilityId);
        connectedUsersByFacilites.set(facilityId, users);
        console.log(`${fullName} => was connected `, data);
        socketio.in(facilityId).emit("new-user-connected", connectedUsersByFacilites.get(facilityId));
      }
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


    userSocket.on("typing-mobile", (room, userId) => {
      socketio.in(room).emit("typing-mobile", { userId, room })
    });


    userSocket.on("stop-typing-mobile", (room) => { socketio.in(room).emit("stop-typing-mobile") });


    userSocket.on("send-message-mobile", async (room, message, senderId) => {
      socketio.in(room).emit("message-recieved-mobile", { room, message, senderId })
    });


  })
}
