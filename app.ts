import express, { Application, Request, Response } from 'express'
import redisClient from './redis-client'

const app: Application = express()

app.use(express.json())

/**
 * Takes in maximum number of requests per window and the window in seconds and returns a middleware
 * that will limit the number of requests per window.
 */
function rateLimiter ({ maxApiCallInWindow, window }: { maxApiCallInWindow: number, window: number }) {
  return async (req: Request, res: Response, next: Function) => {
    const { ip } = req
    const key = `rate-limit:${ip}`
    const current = await redisClient.incr(key)
    let ttl = window

    if (current === 1) {
        await redisClient.expire(key, window)
    } else {
        ttl = await redisClient.ttl(key)
    }

    res.set('X-RateLimit-Limit', `max: ${maxApiCallInWindow}, window: ${window}`)
    if (current > maxApiCallInWindow) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: `You have exceeded the ${maxApiCallInWindow} requests in ${window} seconds limit!`,
        callsInAMinute: current,
        retryAfter: `${ttl} seconds`
      })
    }
    (req as any).requestFromIp = current;

    (req as any).requestFromIpTtl = ttl
    next()
  }
}

// Rate limit middleware
// Request from a single IP is limited to 5 requests per minute
app.use(rateLimiter({ maxApiCallInWindow: 5, window: 60 }))

app.get('/', (_: Request, res: Response) => {
    res.send('Hello World!')
})

app.get('/app/1', async (req: Request, res: Response) => {
    const requestFromIp: number = (req as any).requestFromIp
    const ttl = (req as any).requestFromIpTtl
    const ip = req.ip

    return res.json({
        response: `You have made ${requestFromIp} requests from ${ip} in the last 60 seconds`,
        callsInAMinute: requestFromIp,
        ttl
    })
})

app.get('/app/2', (req: Request, res: Response) => {
    const requestFromIp: number = (req as any).requestFromIp
    const ttl = (req as any).requestFromIpTtl
    const ip = req.ip
    return res.json({
        response: `You have made ${requestFromIp} requests from ${ip} in the last 60 seconds`,
        callsInAMinute: requestFromIp,
        ttl
    })
})

app.get('/app/3', (req: Request, res: Response) => {
    const requestFromIp: number = (req as any).requestFromIp
    const ttl = (req as any).requestFromIpTtl
    const ip = req.ip
    return res.json({
        response: `You have made ${requestFromIp} requests from ${ip} in the last 60 seconds`,
        callsInAMinute: requestFromIp,
        ttl
    })
})

app.listen(3000, () => {
    console.log('Server is running on port 3000')
})
