const { PokerTable } = require('./engine/PokerTable');
const tables = new Map();

function getTable(id) {
    if (!tables.has(id)) tables.set(id, new PokerTable(id, `VIP Table #${id}`));
    return tables.get(id);
}

function initSockets(io) {
    io.on('connection', (socket) => {
        console.log(`[SOCKET CONNECTED]: ${socket.id}`);

        socket.on('join_table', (data) => {
            const tableId = data.tableId || '1';
            socket.join(`table_${tableId}`);
            socket.tableId = tableId;
            socket.userId = data.user ? data.user.id : socket.id;

            const table = getTable(tableId);
            io.to(`table_${tableId}`).emit('table_state', table.getSanitizedState(socket.userId));
        });

        socket.on('sit_down', (data) => {
            const table = getTable(data.tableId);
            const user = {
                id: socket.id,
                username: data.username || `Player_${socket.id.substring(0, 4)}`,
                avatar: 'assets/avatars/default.png',
                chips: parseFloat(data.chips) || 500
            };

            if (table.addPlayer(user, data.seatIndex)) {
                io.to(`table_${data.tableId}`).emit('player_joined', { user, seatIndex: data.seatIndex });
                
                if (table.gameStage === 'WAITING') {
                    table.startNewHand();
                }
                
                io.to(`table_${data.tableId}`).emit('table_state', table.getSanitizedState());
            }
        });

        socket.on('player_action', (data) => {
            const table = getTable(data.tableId);
            if (table.handleAction(socket.id, data.action, data.amount)) {
                io.to(`table_${data.tableId}`).emit('action_performed', {
                    username: socket.id,
                    action: data.action,
                    amount: data.amount
                });
                io.to(`table_${data.tableId}`).emit('table_state', table.getSanitizedState());
            }
        });

        // REALTIME CHAT BROADCAST TO ROOM
        socket.on('send_chat', (data) => {
            console.log(`[CHAT] Table ${data.tableId} | ${data.username}: ${data.message}`);
            io.to(`table_${data.tableId}`).emit('chat_message', {
                username: data.username,
                message: data.message,
                timestamp: new Date().toLocaleTimeString()
            });
        });

        socket.on('disconnect', () => {
            if (socket.tableId) {
                const table = getTable(socket.tableId);
                table.removePlayer(socket.id);
                io.to(`table_${socket.tableId}`).emit('table_state', table.getSanitizedState());
            }
        });
    });

    // Turn Timer Auto-Fold Loop
    setInterval(() => {
        tables.forEach((table, id) => {
            if (table.gameStage !== 'WAITING' && table.gameStage !== 'SHOWDOWN') {
                if (Date.now() > table.turnEndTime) {
                    const seat = table.seats[table.currentTurnIndex];
                    if (seat) {
                        table.handleAction(seat.id, (table.currentBet > seat.currentBet) ? 'fold' : 'check');
                        io.to(`table_${id}`).emit('table_state', table.getSanitizedState());
                    }
                }
            }
        });
    }, 1000);
}

module.exports = { initSockets };