import express, { Request, Response } from "express";
import { client, createRedisClient } from "./redis";

const app = express();
createRedisClient();
// rate limiting

const options = {
    limit: 50,
    expiry: 60 * 60 * 1, // 1 hour
};
app.get("/rate-limit", async (req: Request, res: Response) => {
    // "::1" corresponds to current user's local IP in IPv6
    const ip = req.ip === "::1" ? "127.0.0.1" : (req.ip as string);
    // check if user exists in cache
    const user = await client.hGetAll(`users:${ip}`);

    // add user if none, and return
    if (Object.keys(user).length === 0) {
        await client.hSet(`users:${ip}`, {
            ip,
            limit: 0,
        });
        await client.expire(`users:${ip}`, options.expiry);

        // set appropriate headers
        res.set("X-RateLimit-Limit", `${options.limit}`);
        res.set("X-RateLimit-Remaining", `${options.limit}`);
        return res.status(200).json("Limit not exceeded!");
    }

    // return error if limit has exceeded
    if (parseInt(user.limit) === options.limit) {
        const userTTL = await client.ttl(`users:${ip}`);
        const retryAfter = new Date(Date.now() + 1000 * userTTL);

        res.set("Retry-After", `${retryAfter}`);
        return res.status(429).json("Too many requests. Try again later");
    }

    // increment limit and return
    // set appropriate headers
    res.set("X-RateLimit-Limit", `${options.limit}`);
    res.set("X-RateLimit-Remaining", `${options.limit - parseInt(user.limit)}`);
    await client.hSet(`users:${ip}`, {
        ip,
        limit: parseInt(user.limit) + 1,
    });
    return res.status(200).json({ user });
});

app.listen(8000, () => {
    console.log("server listening on port 8000");
});
