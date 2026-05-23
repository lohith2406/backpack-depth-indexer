import axios from "axios";

type Orderbook = {
    bids: Record<string, string>,
    asks: Record<string, string>
}

type Levels = [string, string][];

type Buffer = {
    updatedBids: Levels,
    updatedAsks: Levels,
    firstUpdateId: number,
    lastUpdateId: number
}

const orderbook: Orderbook = {
    bids: {},
    asks: {}
}

let isOrderbookInitialized = false;

const ws = new WebSocket("wss://ws.backpack.exchange/");
const buffer: Buffer[] = [];

function updateOrderbook(updatedAsks: Levels, updatedBids: Levels) {
    updatedAsks.forEach(([price, qty]: [string, string]) => {
        if (Number(qty) === 0) {
            delete orderbook.asks[price];
            return;
        }
        orderbook.asks[price] = qty;
    })
    updatedBids.forEach(([price, qty]: [string, string]) => {
        if (Number(qty) === 0) {
            delete orderbook.bids[price];
            return;
        }
        orderbook.bids[price] = qty;
    })
}

ws.onmessage = (msg) => {
    const parsedMessage = JSON.parse(msg.data);
    const updatedBids = parsedMessage.data.b;
    const updatedAsks = parsedMessage.data.a;
    const firstUpdateId = parsedMessage.data.U;
    const lastUpdateId = parsedMessage.data.u;

    if (!isOrderbookInitialized) {
        buffer.push({updatedBids, updatedAsks, firstUpdateId, lastUpdateId})
    } else {
        updateOrderbook(updatedAsks, updatedBids);
    }
}

ws.onopen = async () => {
    ws.send(JSON.stringify({ "method": "SUBSCRIBE", "params": ["depth.200ms.SOL_USDC"], id: 3 }));
    const res = await axios.get("https://api.backpack.exchange/api/v1/depth?symbol=SOL_USDC");
    const { bids, asks, lastUpdateId } = res.data;
    updateOrderbook(asks, bids);

    let foundStartingPoint = false;
    const nextExpectedUpdate = lastUpdateId + 1;
    buffer.forEach((msg) => {
        const overlapsSnapshot = msg.firstUpdateId <= nextExpectedUpdate && msg.lastUpdateId >= nextExpectedUpdate;

        if (overlapsSnapshot) {
            foundStartingPoint = true;
        }

        if (foundStartingPoint) {
            updateOrderbook(msg.updatedAsks, msg.updatedBids);
        }
    })

    isOrderbookInitialized = true;
}

setInterval(() => {
    const bestAsk = Object.keys(orderbook.asks).sort((a,b) => Number(a) - Number(b))[0];
    const bestBid = Object.keys(orderbook.bids).sort((a,b) => Number(b) - Number(a))[0];
    console.log(`best ask: ${bestAsk}`);
    console.log(`best bid: ${bestBid}`);
}, 5000)