require('dotenv').config();
const axios = require('axios')
const { getUser } = require('./utils/user.js')
const { mobileController } = require('./controllers/mobile-controller.js')








// create an instance of socket.io and configure it
const io = require("socket.io")(8800, {
  pingTimeout: 60000, // set the ping timeout to 60 seconds
  cors: {
    origin: "*", // allow connections from this origin
  },
});
// create a Map to keep track of connected users
const connectedUsers = new Map();
const connectedUsersByFacilites = new Map();
// listen for connections to the socket.io server
io.on("connection", (socket) => {
  socket.on("newConnection", (userId) => {
    console.log("new", userId);
    connectedUsers.set(userId, {
      userId: userId,
      socketId: socket.id,
      status: "online",
    });
    const connUsers = Array.from(connectedUsers.values());
    io.emit("connectedUsers", connUsers);
    console.log("new user connected")
  })

  
  console.log("connected to socket.io");
  // listen for the "setup" event, which is emitted by the client when they connect
  socket.on("setup", (userData) => {
    // join the room with the user's id
    socket.join(userData._id);
    console.log(userData.firstName + " " + userData.lastName + " connected");
    // emit a "connected" event back to the client
    socket.on("connected", () => {
      return connectedUsers.set(userData._id, {
        userId: userData._id,
        socketId: socket.id,
        status: "online",
      });
    });
    // add the user to the connectedUsers map
    connectedUsers.set(userData._id, {
      userId: userData._id,
      socketId: socket.id,
      status: "online",
    });

    const connUsers = Array.from(connectedUsers.values());
    io.emit("connectedUsers", connUsers);
    console.log("connected users", connectedUsers);
  });
  // listen for the "join chat" event, which is emitted by the client when they join a chat room
  socket.on("join", (room) => {

    socket.join(room);
    console.log("User Joined Room: " + room);
    //emit a joined chat event back to the client to let them know they joined the chat
    socket.emit("joined", { room });

  });


  // // ------------------------------------ mobile --------------------------------------------


  socket.on('new-connection-by-facilities', (data) => {
    const { userId,facilityName, fullName, facilityId } = data;
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
        socketId: socket.id,
        status: "online",
      });
      socket.join(facilityId);
      connectedUsersByFacilites.set(facilityId, users);
      console.log(`${fullName} => was connected `,data);
      io.in(facilityId).emit("new-user-connected", connectedUsersByFacilites.get(facilityId));
    }
  });
  
  
  
// Handle custom disconnection by facilities
socket.on('disconnect-by-facilities', (data) => {
  const { userId, facilityId } = data;

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
          io.in(facilityId).emit("disconnect-user", {
              userId,
              room: facilityId,
          });

          socket.leave(facilityId);
      }
  }
});


  
  // listen for the "typing" event, which is emitted by the client when they start typing
  socket.on("typing", (room) => socket.in(room).emit("typing"));
  // listen for the "stop typing" event, which is emitted by the client when they stop typing
  socket.on("stop typing", (room) => socket.in(room).emit("stop typing"));

  // listen for the "new message" event, which is emitted by the client when they send a new message
  socket.on("new message", (newMessageRecieved) => {
    console.log(JSON.parse(newMessageRecieved));
    //decode newMessageRecieved object
    newMessageRecieved = JSON.parse(newMessageRecieved);
    var chat = newMessageRecieved[1];
    newMessageRecieved = newMessageRecieved[0];
    // check if the chat object is valid
    if (!chat) return console.log("chat is not defined");
    // check if the message object is valid
    if (!newMessageRecieved) return console.log("message is not defined");

    // send the new message to all users in the chat except for the sender
    chat.users.forEach(async (user) => {
      //if the user is the sender, skip them
      if (user._id === newMessageRecieved.author.id) return;
      socket.in(user._id).emit("message recieved", JSON.stringify(newMessageRecieved));
      //find the user in the connectedUsers map
      reciever = connectedUsers.get(user._id);
      //if the user is is offline, undefined, null or false, send them a notification
      // if ((!reciever && user.fcmToken) || (reciever && reciever.status === "offline")) {
      //     console.log("sending notification to " + user.firstName + " " + user.lastName)
      //         //send the notification
      //     const result = await sendNotificationToUser(
      //         newMessageRecieved.author.firstName + " " + newMessageRecieved.author.lastName + " sent you a message",
      //         newMessageRecieved.text,
      //         user.fcmToken,
      //         "/chat/" + chat._id,
      //         null,
      //         newMessageRecieved.author.imageUrl
      //     );
      // }
      const data = await axios.post("http://localhost:4001/save-notif", {
        userId: user._id,
        title: newMessageRecieved.author.firstName + " " + newMessageRecieved.author.lastName + " sent you a message",
        body: newMessageRecieved.text,
        screen: "/chat/" + chat._id,
        image: newMessageRecieved.author.imageUrl
      })




      //console log the response body
      console.log("message sent to " + user.firstName + " " + user.lastName)
    });
  });
  /// ---------------------- mobile chat   ---------------------

    socket.on("typing-mobile", (room , userId)=> {
      console.log("typing here now")
      io.in(room).emit("typing-mobile",{userId , room})
    });

    socket.on("stop-typing-mobile", (room) =>{ io.in(room).emit("stop-typing-mobile")});

    socket.on("send-message-mobile", async (room , message,senderId)=> {
      console.log("new message get it in" + room)
      io.in(room).emit("message-recieved-mobile",{room,message,senderId})
    });

  /// ----------------------------------------- 


  // listen for the "disconnect" event, which is emitted by the client when they disconnect
  socket.on("disconnect", () => {
    // Find the user in the connectedUsers map and set their status to offline
    for (let [userId, user] of connectedUsers.entries()) {
      if (user.socketId === socket.id) {
        user.status = "offline";
        connectedUsers.set(userId, user);
        const connUsers = Array.from(connectedUsers.values());
        io.emit("connectedUsers", connUsers);
        console.log(userId + " disconnected");
        break;
      }
    }
  });
  // stop listening for the "setup" event when the client disconnects
  socket.off("setup", () => {
    console.log("User Disconnected");
    socket.leave(userData._id);
  });

  socket.on('comments', (msg) => {
    io.emit("new comments", msg)
  })
  socket.on("like", ({ postId, userId }) => {
    console.log("Like event received:", postId, userId);
    // Broadcast the 'like' event to all connected clients
    socket.broadcast.emit("like", { postId, userId });
  });

  socket.on("comment", (commentData, idTask) => {
    console.log(commentData);
    axios.post(`${process.env.REACT_APP_BASE_URL}tasks/comment-task/${idTask}`, {
      comment: commentData,
    });
    io.emit("comment", commentData);
  });

      socket.on("comment2", (commentData, idTask,token) => {
        console.log(commentData);
        axios.post(`${process.env.REACT_APP_BASE_URL}faculty/comment-tache-faculty/${idTask}`, {
          comment: commentData,
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`, 
            'Content-Type': 'application/json',
          }
        });
        io.emit("comment2", commentData);
      });

    
      socket.on("comment3", (commentData, idTask,token) => {
        console.log(commentData);
        axios.post(`${process.env.REACT_APP_BASE_URL}training-company/comment-tache-center-formation/${idTask}`, {
          comment: commentData,
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`, 
            'Content-Type': 'application/json',
          }
        }
         );
        io.emit("comment3", commentData);
      });




  socket.on("comment3", (commentData, idTask) => {
    console.log(commentData);
    axios.post(`http://localhost:4001/training-company/comment-tache-center-formation/${idTask}`, {
      comment: commentData,
    });
    io.emit("comment3", commentData);
  });

  socket.on("accesDeniedForRule", (rule, userId) => {
    io.emit("accesDeniedForRule", { rule, userId });
  }
  );
});

mobileController(io)
