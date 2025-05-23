require('dotenv').config();
const axios = require('axios')

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

  socket.on("commentTask", async (commentData, idTask) => {
    console.log(commentData);
    await axios.post(`${process.env.REACT_APP_BASE_URL}tasks/comment-task/${idTask}`, {
      comment: commentData,
    });
    io.emit("commentTask", commentData);
  });

  socket.on("commentProjectTache", async (commentData, idTask,token, type) => {
    let endpoint;
    if(type === "faculty"){
      endpoint = `${process.env.REACT_APP_BASE_URL}faculty/comment-tache-faculty/${idTask}`;
    }else if(type === "centreDeFormation"){
      endpoint = `${process.env.REACT_APP_BASE_URL}training-company/comment-tache-center-formation/${idTask}`
    }
    await axios.post(endpoint, {
      comment: commentData,
    },
    {
      headers: {
        'Authorization': `Bearer ${token}`, 
        'Content-Type': 'application/json',
      }
    });
    io.emit("commentProjectTache", commentData);
  });



  socket.on("accesDeniedForRule", (rule, userId) => {
    io.emit("accesDeniedForRule", { rule, userId });
  }
  );


});




mobileController(io)
