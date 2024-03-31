import { createClient } from "redis";

export const client = createClient({
    socket: {
        reconnectStrategy: function (retries) {
            if (retries > 10) {
                console.log(
                    "Too many attempts to reconnect. Redis connection was terminated"
                );
                return new Error("Too many retries.");
            } else {
                return retries * 500;
            }
        },
    },
});

client.on("error", (error) => {
    console.log("Redis client error\n", error);
});

export const createRedisClient = async () => {
    try {
        await client.connect();
        console.log("Redis client connected");
    } catch (error) {
        console.error("Error connecting to redis client\n", error);
    }
};
