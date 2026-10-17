/**
 * PokerRoyale - Realtime Client Engine & Synchronized Chat
 */

class PokerGameClient {
    constructor() {
        this.socket = null;
        this.tableId = new URLSearchParams(window.location.search).get('id') || '1';
        this.selectedSeatForBuyin = null;
        
        let savedUser = JSON.parse(localStorage.getItem('pr_user') || 'null');
        if (!savedUser) {
            const randomId = Math.floor(1000 + Math.random() * 9000);
            savedUser = {
                id: 'guest_' + randomId,
                username: 'Player_' + randomId,
                avatar: 'assets/avatars/default.png',
                balance: 5000
            };
            localStorage.setItem('pr_user', JSON.stringify(savedUser));
        }
        this.currentUser = savedUser;
        this.currentGameState = null;

        this.init();
    }

    init() {
        this.socket = io(window.location.origin, { transports: ['websocket', 'polling'] });
        this.setupSocketEvents();
        this.setupUIListeners();
    }

    setupSocketEvents() {
        // Connected to server
        this.socket.on('connect', () => {
            console.log("Connected with Socket ID:", this.socket.id);
            this.socket.emit('join_table', { tableId: this.tableId, user: this.currentUser });
        });

        // Table State Updates
        this.socket.on('table_state', (state) => {
            this.currentGameState = state;
            this.renderTable(state);
            this.handleWinnerOverlay(state);
        });

        // REAL-TIME CHAT RECEIVE (Dono Users ko Message Milega)
        this.socket.on('chat_message', (data) => {
            console.log("Chat Message Received:", data);
            this.appendChat(data.username, data.message);
        });

        this.socket.on('player_joined', (data) => {
            this.appendSystemChat(`${data.user.username} took a seat.`);
        });

        this.socket.on('action_performed', (data) => {
            this.appendSystemChat(`${data.username}: ${data.action.toUpperCase()} ${data.amount ? '$' + data.amount : ''}`);
        });
    }

    setupUIListeners() {
        // Sit Down Modal Trigger
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-sit')) {
                this.selectedSeatForBuyin = parseInt(e.target.dataset.seat);
                document.getElementById('modal-buyin').style.display = 'flex';
            }
        });

        // Modal Controls
        document.getElementById('btn-buyin-cancel').onclick = () => {
            document.getElementById('modal-buyin').style.display = 'none';
        };

        document.getElementById('btn-buyin-confirm').onclick = () => {
            const amount = parseFloat(document.getElementById('buyin-amount').value);
            if (amount > 0 && this.selectedSeatForBuyin !== null) {
                this.socket.emit('sit_down', {
                    tableId: this.tableId,
                    seatIndex: this.selectedSeatForBuyin,
                    chips: amount,
                    username: this.currentUser.username
                });
                document.getElementById('modal-buyin').style.display = 'none';
            }
        };

        // Action Buttons
        document.getElementById('btn-fold').onclick = () => this.sendAction('fold');
        document.getElementById('btn-check').onclick = () => this.sendAction('check');
        document.getElementById('btn-call').onclick = () => this.sendAction('call');
        
        const rSlider = document.getElementById('raise-slider');
        const rInput = document.getElementById('raise-input');
        
        document.getElementById('btn-raise').onclick = () => {
            this.sendAction('raise', parseFloat(rInput.value || rSlider.value));
        };

        // Slider Sync
        rSlider.addEventListener('input', (e) => rInput.value = e.target.value);
        rInput.addEventListener('input', (e) => rSlider.value = e.target.value);

        // Raise Shortcuts
        document.getElementById('btn-raise-min').onclick = () => rInput.value = rSlider.min;
        document.getElementById('btn-raise-half').onclick = () => {
            if(this.currentGameState) rInput.value = Math.min(rSlider.max, Math.max(rSlider.min, this.currentGameState.mainPot / 2));
        };
        document.getElementById('btn-raise-pot').onclick = () => {
            if(this.currentGameState) rInput.value = Math.min(rSlider.max, Math.max(rSlider.min, this.currentGameState.mainPot));
        };
        document.getElementById('btn-raise-max').onclick = () => rInput.value = rSlider.max;

        // REAL-TIME CHAT SEND FORM
        const chatForm = document.getElementById('chat-form');
        if (chatForm) {
            chatForm.onsubmit = (e) => {
                e.preventDefault();
                const input = document.getElementById('chat-input');
                const messageText = input.value.trim();
                
                if (messageText !== '') {
                    // Send to Server Room
                    this.socket.emit('send_chat', {
                        tableId: this.tableId,
                        message: messageText,
                        username: this.currentUser.username
                    });
                    input.value = ''; // Clear Input
                }
            };
        }

        document.getElementById('btn-leave').onclick = () => window.location.href = 'index.html';
    }

    sendAction(actionType, amount = 0) {
        this.socket.emit('player_action', { tableId: this.tableId, userId: this.socket.id, action: actionType, amount: amount });
        document.getElementById('action-panel').style.display = 'none';
    }

    renderTable(state) {
        document.getElementById('table-name').innerText = state.tableName || 'VIP Table';
        document.getElementById('pot-amount').innerText = `$${(state.mainPot || 0).toFixed(2)}`;

        // Render Community Cards
        const board = document.getElementById('board-cards');
        board.innerHTML = '';
        const cards = state.communityCards || [];
        cards.forEach(c => board.innerHTML += this.getCardHTML(c));
        for (let i = cards.length; i < 5; i++) board.innerHTML += `<div class="card-slot"></div>`;

        // Render Seats
        for (let i = 0; i < 9; i++) {
            const seatEl = document.getElementById(`seat-${i}`);
            const player = state.seats ? state.seats[i] : null;

            if (player) {
                const isMe = player.id === this.socket.id;
                const isActive = (state.currentTurnIndex === i && state.gameStage !== 'WAITING');
                const hasCards = player.cards && player.cards.length > 0 && !player.folded;

                let cardsHTML = '';
                if (hasCards) {
                    cardsHTML = `<div class="pocket-cards">${player.cards.map(c => this.getCardHTML(c, isMe)).join('')}</div>`;
                }

                const timePct = isActive ? Math.max(0, (state.turnTimeRemaining / 20000) * 100) : 0;

                seatEl.innerHTML = `
                    ${player.currentBet > 0 ? `<div class="current-bet-visual">$${player.currentBet}</div>` : ''}
                    <div class="player-wrap ${hasCards ? 'has-cards' : ''}">
                        ${cardsHTML}
                        <div class="avatar-ring ${isActive ? 'active-turn' : ''}">
                            <img src="${player.avatar || 'assets/avatars/default.png'}" alt="User">
                            ${state.dealerIndex === i ? `<div class="dealer-button">D</div>` : ''}
                        </div>
                        <div class="info-plate">
                            <span class="name">${player.username} ${isMe ? '(You)' : ''}</span>
                            <span class="chips">$${player.chips.toFixed(2)}</span>
                        </div>
                        <div class="timer-bar-bg"><div class="timer-bar-fill" style="width: ${timePct}%;"></div></div>
                    </div>
                `;
            } else {
                seatEl.innerHTML = `<button class="btn-sit" data-seat="${i}">+ SIT HERE</button>`;
            }
        }

        this.updateControls(state);
    }

    handleWinnerOverlay(state) {
        const banner = document.getElementById('winner-banner');
        if (!banner) return;
        
        if (state.gameStage === 'SHOWDOWN' || (state.lastMessage && state.lastMessage.includes('wins'))) {
            banner.innerText = state.lastMessage;
            banner.style.display = 'block';
        } else {
            banner.style.display = 'none';
        }
    }

    getCardHTML(card, isSelf = true) {
        if (!card || card.hidden || card === 'CARD_BACK') return `<div class="playing-card hidden"></div>`;
        const s = card.suit.toLowerCase();
        const symbol = s === 'h' ? '♥' : s === 'd' ? '♦' : s === 'c' ? '♣' : '♠';
        const color = (s === 'h' || s === 'd') ? 'red' : 'black';
        return `<div class="playing-card ${color}"><span>${card.value}</span><span>${symbol}</span></div>`;
    }

    updateControls(state) {
        const panel = document.getElementById('action-panel');
        const myIndex = state.seats.findIndex(s => s && s.id === this.socket.id);
        
        if (myIndex === -1 || state.currentTurnIndex !== myIndex || state.gameStage === 'WAITING') {
            panel.style.display = 'none';
            return;
        }

        panel.style.display = 'flex';
        const mySeat = state.seats[myIndex];
        const toCall = (state.currentBet || 0) - (mySeat.currentBet || 0);

        const btnCheck = document.getElementById('btn-check');
        const btnCall = document.getElementById('btn-call');
        
        if (toCall <= 0) {
            btnCheck.style.display = 'block';
            btnCall.style.display = 'none';
        } else {
            btnCheck.style.display = 'none';
            btnCall.style.display = 'block';
            btnCall.innerText = `CALL $${toCall}`;
        }

        const minRaise = (state.currentBet > 0 ? state.currentBet * 2 : state.bigBlind || 10);
        const maxRaise = mySeat.chips;
        const slider = document.getElementById('raise-slider');
        const input = document.getElementById('raise-input');
        
        slider.min = minRaise;
        slider.max = maxRaise;
        slider.value = minRaise;
        input.value = minRaise;
    }

    // APPEND CHAT MESSAGE TO UI
    appendChat(user, msg) {
        const box = document.getElementById('chat-box');
        if (!box) return;
        
        const msgDiv = document.createElement('div');
        msgDiv.className = 'msg';
        msgDiv.innerHTML = `<span class="author">${user}:</span> ${msg}`;
        box.appendChild(msgDiv);
        box.scrollTop = box.scrollHeight; // Auto Scroll down
    }

    appendSystemChat(msg) {
        const box = document.getElementById('chat-box');
        if (!box) return;
        
        const sysDiv = document.createElement('div');
        sysDiv.className = 'msg system';
        sysDiv.innerHTML = `<i>${msg}</i>`;
        box.appendChild(sysDiv);
        box.scrollTop = box.scrollHeight;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.pokerClient = new PokerGameClient();
});