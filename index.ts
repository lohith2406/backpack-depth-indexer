import axios from "axios";

type Orderbook = {
    bids: Record<string, string>,
    asks: Record<string, string>
}

type Levels = [string, string][];

type Buffer = {
    updatedBids: Levels,
    updatedAsks: Levels
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
        orderbook.asks[price] = qty;
    })
    updatedBids.forEach(([price, qty]: [string, string]) => {
        orderbook.bids[price] = qty;
    })
}

ws.onmessage = (msg) => {
    const parsedMessage = JSON.parse(msg.data);
    const updatedBids = parsedMessage.b;
    const updatedAsks = parsedMessage.a;

    if (!isOrderbookInitialized) {
        buffer.push({updatedBids, updatedAsks})
    } else {
        updateOrderbook(updatedAsks, updatedBids);
    }
}

ws.onopen = async () => {
    ws.send(JSON.stringify({ "method": "SUBSCRIBE", "params": ["depth.200ms.SOL_USDC"], id: 3 }));
    const res = await axios.get("https://api.backpack.exchange/api/v1/depth?symbol=SOL_USDC");
    const { bids, asks, lastUpdateId } = res.data;
    bids.forEach(([price, qty]: [string, string]) => {
        orderbook.bids[price] = qty
    });
    asks.forEach(([price, qty]: [string, string]) => {
        orderbook.asks[price] = qty
    });
    isOrderbookInitialized = true;

    buffer.forEach((msg) => {
        if (msg.lastUpdatedId)
    })
}