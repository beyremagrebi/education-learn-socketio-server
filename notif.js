const axios = require("axios").default;

const sendNotificationToUser = async(
    title,
    body,
    token,
    screen,
    image,
    userImage
) => {
    try {
        const resp = await axios.post(
            "https://fcm.googleapis.com/fcm/send", {
                notification: {
                    //random notification id
                    title: title,
                    body: body,
                    OrganizationId: "1",
                    sound: "default",
                    badge: "1",
                    priority: "high",
                    image: image,
                },
                data: {
                    id: Math.random().toString(36).substring(7),
                    title: title,
                    body: body,
                    image: image,
                    priority: "high",
                    content_available: true,
                    click_action: "FLUTTER_NOTIFICATION_CLICK",
                    sound: "default",
                    status: "done",
                    screen: screen,
                    image: image,
                    createdAt: new Date().toISOString(),
                    userImage: userImage,
                },
                to: token,
            }, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${process.env.FCM_SERVER_KEY}`,
                },
            }
        );
        console.log(resp.data);
    } catch (err) {
        // Handle Error Here
        console.error(err);
    }
};

module.exports = sendNotificationToUser;