exports.mobileController = (socketio) => {
    socketio.on("connection", (userSocket) => {
        userSocket.on("send_message", (message) => {
            socketio.emit("receive_message", message);
        });
    })
}