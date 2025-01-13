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
    OrderId = order_data.get("order_id")
    side = order_data.get("side")
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
        openPositions.append(
            {
                "OrderId": OrderId,
                "symbol": "NDX100",
                "volume": volume,
                "type": order_type,
                "Ticket": result.order,
            }
        )
        print("Order: ", openPositions)
        print(f"Order placed successfully! Ticket: {result.order}")


def close_position(OrderId):
    position = next(
        (item for item in openPositions if item["OrderId"] == OrderId), None
    )
    if position is None:
        print(f"No open position found with OrderId: {OrderId}")
        return
    print("position:", position)
    openPositions.remove(position)
    volume = position["volume"]
    order_type = position["type"]
    symbol = position["symbol"]
    ticket = position["Ticket"]
    price = (
        mt5.symbol_info_tick(symbol).bid
        if order_type == mt5.ORDER_TYPE_BUY
        else mt5.symbol_info_tick(symbol).ask
    )
    close_request = {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": symbol,
        "volume": volume,
        "type": mt5.ORDER_TYPE_SELL if order_type == mt5.ORDER_TYPE_BUY else mt5.ORDER_TYPE_BUY,
        "price": price,
        "deviation": 20,
        "position": ticket,
        }
    # Send the close request
    result = mt5.order_send(close_request)
    if result.retcode == mt5.TRADE_RETCODE_DONE:
        print(f"Position {ticket} closed successfully.")
    else:
        print(f"Failed to close position {ticket}: {result.retcode}")
    
    return result

# WebSocket server logic
async def handle_client(websocket, path):
    print("Client connected")

    try:
        async for message in websocket:
            data = json.loads(message)
            print("Received data:", data)
            if "openPositions" in data and data["openPositions"]:
                # Place orders for each position
                for order_data in data["openPositions"]:
                    open_position(order_data)
            if "closedPositions" in data and data["closedPositions"]:
                for order_data in data["closedPositions"]:
                    close_position(order_data.get("order_id"))

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
