const WS_HOST = "localhost";
const WS_PORT = 5678;

const websocket = new WebSocket(`ws://${WS_HOST}:${WS_PORT}/`);

websocket.addEventListener("message", function(event) {
    if (event.data === "reload") {
        window.location.reload();
    }
});

