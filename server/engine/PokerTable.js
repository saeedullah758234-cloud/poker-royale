const Hand = require('pokersolver').Hand;

class PokerTable {
    constructor(id, name, smallBlind = 5, bigBlind = 10, maxSeats = 9) {
        this.id = id;
        this.tableName = name;
        this.smallBlind = smallBlind;
        this.bigBlind = bigBlind;
        this.maxSeats = maxSeats;
        this.seats = new Array(maxSeats).fill(null);
        
        this.deck = [];
        this.communityCards = [];
        this.mainPot = 0;
        this.currentBet = 0;
        
        this.dealerIndex = 0;
        this.currentTurnIndex = -1;
        this.turnEndTime = 0; // Turn Timer
        this.gameStage = 'WAITING'; // WAITING, PREFLOP, FLOP, TURN, RIVER, SHOWDOWN
        
        this.lastMessage = "Waiting for players...";
    }

    addPlayer(user, seatIndex) {
        if (seatIndex < 0 || seatIndex >= this.maxSeats || this.seats[seatIndex]) return false;
        this.seats[seatIndex] = { ...user, cards: [], currentBet: 0, folded: false, allIn: false };
        return true;
    }

    removePlayer(userId) {
        const idx = this.seats.findIndex(s => s && s.id === userId);
        if (idx !== -1) {
            this.seats[idx] = null;
            if (this.currentTurnIndex === idx) this.advanceTurn();
            return true;
        }
        return false;
    }

    generateDeck() {
        const suits = ['s', 'h', 'd', 'c'];
        const values = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
        this.deck = [];
        suits.forEach(suit => values.forEach(value => this.deck.push({ value, suit })));
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    startNewHand() {
        const active = this.seats.filter(s => s && s.chips > 0);
        if (active.length < 2) {
            this.gameStage = 'WAITING';
            this.lastMessage = "Not enough players to start.";
            return false;
        }

        this.generateDeck();
        this.communityCards = [];
        this.mainPot = 0;
        
        this.seats.forEach(s => { if(s) { s.cards = []; s.currentBet = 0; s.folded = false; } });
        
        // Move Dealer
        do { this.dealerIndex = (this.dealerIndex + 1) % this.maxSeats; } while (!this.seats[this.dealerIndex] || this.seats[this.dealerIndex].chips <= 0);

        // Blinds Post
        let sbIndex = (this.dealerIndex + 1) % this.maxSeats;
        while (!this.seats[sbIndex]) sbIndex = (sbIndex + 1) % this.maxSeats;
        
        let bbIndex = (sbIndex + 1) % this.maxSeats;
        while (!this.seats[bbIndex]) bbIndex = (bbIndex + 1) % this.maxSeats;

        this.seats[sbIndex].chips -= this.smallBlind;
        this.seats[sbIndex].currentBet = this.smallBlind;
        this.seats[bbIndex].chips -= this.bigBlind;
        this.seats[bbIndex].currentBet = this.bigBlind;
        
        this.mainPot = this.smallBlind + this.bigBlind;
        this.currentBet = this.bigBlind;

        // Deal Hole Cards
        this.seats.forEach(s => {
            if (s && s.chips > 0) s.cards = [this.deck.pop(), this.deck.pop()];
        });

        this.gameStage = 'PREFLOP';
        this.lastMessage = "Hand Started. Preflop action.";
        
        this.currentTurnIndex = bbIndex;
        this.advanceTurn();
        return true;
    }

    handleAction(userId, action, amount = 0) {
        const seat = this.seats[this.currentTurnIndex];
        if (!seat || seat.id !== userId) return false;

        let toCall = this.currentBet - seat.currentBet;

        if (action === 'fold') {
            seat.folded = true;
        } else if (action === 'check') {
            if (toCall > 0) return false; // Cannot check if there's a bet
        } else if (action === 'call') {
            const pay = Math.min(toCall, seat.chips);
            seat.chips -= pay;
            seat.currentBet += pay;
            this.mainPot += pay;
        } else if (action === 'raise') {
            const pay = amount - seat.currentBet;
            if (pay > 0 && seat.chips >= pay) {
                seat.chips -= pay;
                seat.currentBet = amount;
                this.currentBet = amount;
                this.mainPot += pay;
            } else return false;
        }

        this.checkRoundEnd();
        return true;
    }

    advanceTurn() {
        let count = 0;
        do {
            this.currentTurnIndex = (this.currentTurnIndex + 1) % this.maxSeats;
            count++;
        } while ((!this.seats[this.currentTurnIndex] || this.seats[this.currentTurnIndex].folded) && count <= this.maxSeats);
        
        this.turnEndTime = Date.now() + 20000; // 20 Seconds Turn Timer
    }

    checkRoundEnd() {
        const active = this.seats.filter(s => s && !s.folded);
        if (active.length === 1) return this.distributePot(active[0], "Everyone folded");

        // Simple next stage logic for demo
        this.seats.forEach(s => { if(s) s.currentBet = 0; });
        this.currentBet = 0;

        if (this.gameStage === 'PREFLOP') {
            this.gameStage = 'FLOP';
            this.communityCards = [this.deck.pop(), this.deck.pop(), this.deck.pop()];
            this.lastMessage = "Flop dealt.";
        } else if (this.gameStage === 'FLOP') {
            this.gameStage = 'TURN';
            this.communityCards.push(this.deck.pop());
            this.lastMessage = "Turn card dealt.";
        } else if (this.gameStage === 'TURN') {
            this.gameStage = 'RIVER';
            this.communityCards.push(this.deck.pop());
            this.lastMessage = "River card dealt.";
        } else if (this.gameStage === 'RIVER') {
            this.evaluateShowdown();
            return;
        }
        this.currentTurnIndex = this.dealerIndex;
        this.advanceTurn();
    }

    evaluateShowdown() {
        this.gameStage = 'SHOWDOWN';
        const active = this.seats.filter(s => s && !s.folded);
        
        let bestRank = -1;
        let winners = [];
        let winningHandName = "";

        active.forEach(player => {
            const handCards = [...player.cards, ...this.communityCards].map(c => c.value + c.suit);
            const hand = Hand.solve(handCards);
            if (hand.rank > bestRank) {
                bestRank = hand.rank;
                winners = [player];
                winningHandName = hand.name;
            } else if (hand.rank === bestRank) {
                winners.push(player); // Tie
            }
        });

        const winAmount = this.mainPot / winners.length;
        winners.forEach(w => w.chips += winAmount);
        this.lastMessage = `${winners.map(w=>w.username).join(', ')} wins $${this.mainPot} with ${winningHandName}!`;
        this.mainPot = 0;

        setTimeout(() => this.startNewHand(), 5000); // Wait 5 seconds, auto-start next hand
    }

    distributePot(winner, reason) {
        winner.chips += this.mainPot;
        this.lastMessage = `${winner.username} wins $${this.mainPot} (${reason})`;
        this.mainPot = 0;
        this.gameStage = 'WAITING';
        setTimeout(() => this.startNewHand(), 4000);
    }

    getSanitizedState(userId = null) {
        return {
            id: this.id,
            tableName: this.tableName,
            mainPot: this.mainPot,
            currentBet: this.currentBet,
            communityCards: this.communityCards,
            currentTurnIndex: this.currentTurnIndex,
            dealerIndex: this.dealerIndex,
            gameStage: this.gameStage,
            turnTimeRemaining: Math.max(0, this.turnEndTime - Date.now()),
            lastMessage: this.lastMessage,
            seats: this.seats.map(s => s ? {
                id: s.id, username: s.username, avatar: s.avatar, chips: s.chips,
                currentBet: s.currentBet, folded: s.folded,
                cards: (this.gameStage === 'SHOWDOWN' || s.id === userId) ? s.cards : [{hidden:true},{hidden:true}]
            } : null)
        };
    }
}
module.exports = { PokerTable };