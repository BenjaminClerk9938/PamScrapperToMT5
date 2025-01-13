import asyncio
import websockets
import json
import MetaTrader5 as mt5


# Initialize MetaTrader5 connection
def initialize_mt5():
    if not mt5.initialize():
        print("Failed to initialize MetaTrader5")
        quit()
    print("MetaTrader5 initialized successfully")


openPositions = []


# Place an order on MT5
def open_position(order_data):
    symbol = "NDX100"
    volume = float(order_data.get("volume"))
    orderId = order_data.get("order_id")
    side = order_data.get("side")
    # price = float(order_data.get("open_price"))
    price = (
        mt5.symbol_info_tick(symbol).ask
        if side == "Buy"
        else mt5.symbol_info_tick(symbol).bid
    )

    order_type = mt5.ORDER_TYPE_BUY if side == "Buy" else mt5.ORDER_TYPE_SELL

    request = {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": "NDX100",
        "volume": volume,
        "type": order_type,
        "price": price,
        "slippage": 10,
        "deviation": 20,
        "magic": 234000,
        "comment": "Open Position",
        "type_filling": mt5.ORDER_FILLING_IOC,
        "type_time": mt5.ORDER_TIME_GTC,
    }

    result = mt5.order_send(request)
    if result.retcode != mt5.TRADE_RETCODE_DONE:
        print(f"Order failed with error code: {result.retcode}")
    else:
        openPositions.append({"orderId": orderId, "Ticket": result.order})
        print("Order: ", openPositions)
        print(f"Order placed successfully! Ticket: {result.order}")


# WebSocket server logic
async def handle_client(websocket, path):
    print("Client connected")

    try:
        async for message in websocket:
            data = json.loads(message)
            print("Received data:", data)

            # Place orders for each position
            for order_data in data:
                open_position(order_data)

    except websockets.ConnectionClosed:
        print("Client disconnected")


# Start WebSocket server
async def start_server():
    initialize_mt5()
    server = await websockets.serve(handle_client, "127.0.0.1", 8765)
    print("WebSocket server running on ws://127.0.0.1:8765")
    await server.wait_closed()


if __name__ == "__main__":
    asyncio.run(start_server())
