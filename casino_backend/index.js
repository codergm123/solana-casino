const dotenv = require("dotenv");
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const { init } = require("./db");
const app = express();
const http = require("http").Server(app);
const cors = require("cors");
const routes = require("./routes");
const { ROOM_STATE_WAITING, ROOM_STATE_ROUND_DEAL } = require("./constants");
const Game = require("./game/game");

var corsOptions = {
  origin: "*",
};
init();

app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(routes);

const server = require("http").createServer(app);
let io = require("socket.io")(server, { cors: { origin: "*" } });

global.io = io;

app.use((req, res, next) => {
  req.io = io;
  return next();
});

let timers = new Array(1000);
let room = {
  roomNumber: -1,
  gameOrderNum: -1,
  members: [],
  memberIds: [],
  roomState: ROOM_STATE_WAITING,
  chips: -1,
  timer: null,
  progress: 0,
  nowCounting: false,

  reset: function () {
    this.roomNumber = -1;
    this.gameOrderNum = -1;
    this.members = [];
    this.memberIds = [];
    this.roomState = ROOM_STATE_WAITING;
    this.chips = -1;
    this.timer = null;
    this.progress = 0;
    this.nowCounting = false;
  },
  isNewPlayer: function (other) {
    for (let i = 0; i < this.members.length; i++) {
      if (this.members[i] == other) {
        return false;
      }
    }
    return true;
  },
  startWaitTimer: function (callback) {
    timers[this.roomNumber] = setInterval(() => {
      const step = 20;

      if (this.progress < 100 && this.progress + step >= 100) {
        this.progress = 100;
      } else if (this.progress == 100) {
        this.stopWaitTimer();
        io.to(this.roomNumber).emit("stop waiting");
        callback();
      } else {
        this.progress += step;
      }
      this.timer = timers[this.roomNumber];
    }, 1000);

    this.nowCounting = true;
  },
  stopWaitTimer: function () {
    if (this.timer) clearInterval(this.timer);
    this.progress = 0;
    this.timer = null;
    this.nowCounting = false;

    io.to(this.roomNumber).emit("stop waiting");
  },
};
const startGameAfter =
  ({ roomNumber }) =>
  () => {
    for (let i = 0; i < rooms.length; i++) {
      if (rooms[i].roomNumber == roomNumber) {
        games[i].start();
        for (let j = 0; j < rooms[i].memberIds.length; j++) {
          const players = [];
          for (let k = 0; k < games[i].players.length; k++) {
            players.push({
              name: games[i].players[k].name,
              chips: games[i].players[k].chips,
              bet: games[i].players[k].bet,
              lastAction: games[i].players[k].lastAction,
              hasActed: games[i].players[k].hasActed,
              hasDone: games[i].players[k].hasDone,
            });
          }
          const responseData = {
            firstcard: games[i].players[j].firstCard,
            secondcard: games[i].players[j].secondCard,
            curPlayer: games[i].getCurrentPlayer().name,
            dealer: games[i].players[games[i].dealerPos].name,
            players: JSON.stringify(players),
            BET: games[i].BET,
            round: games[i].round,
            dealerPos: games[i].dealerPos,
            turnPos: games[i].turnPos,
            pot: games[i].pot,
            communityCards: JSON.stringify(games[i].communityCards),
          };
          io.to(rooms[i].memberIds[j]).emit("start game", responseData);
        }

        if (rooms[i].nowCounting) rooms[i].stopWaitTimer();

        rooms[i].startWaitTimer(foldAfter(roomNumber));
        io.to(roomNumber).emit("wait player action");

        break;
      }
    }
  };
const foldAfter = (roomNumber) => () => {
  console.log("fold After-------------");
  for (let i = 0; i < rooms.length; i++) {
    if (rooms[i].roomNumber == roomNumber) {
      console.log("before fold");

      games[i].getCurrentPlayer().fold();

      console.log("fold now ---------------");

      for (let j = 0; j < rooms[i].memberIds.length; j++) {
        const players = [];
        for (let k = 0; k < games[i].players.length; k++) {
          players.push({
            name: games[i].players[k].name,
            chips: games[i].players[k].chips,
            bet: games[i].players[k].bet,
            lastAction: games[i].players[k].lastAction,
            hasActed: games[i].players[k].hasActed,
            hasDone: games[i].players[k].hasDone,
          });
        }
        const responseData = {
          firstcard: games[i].players[j].firstCard,
          secondcard: games[i].players[j].secondCard,
          curPlayer: games[i].getCurrentPlayer().name,
          dealer: games[i].players[games[i].dealerPos].name,
          players: JSON.stringify(players),
          BET: games[i].BET,
          round: games[i].round,
          dealerPos: games[i].dealerPos,
          turnPos: games[i].turnPos,
          pot: games[i].pot,
          communityCards: JSON.stringify(games[i].communityCards),
          isEndRound: games[i].isEndRound(),
          isEndGame: games[i].gameoverInfo.gameover,
          winner: games[i].gameoverInfo.winner,
          gets: games[i].gameoverInfo.gets,
        };
        console.log('before sending fold action', responseData)
        io.to(rooms[i].memberIds[j]).emit("after player action", responseData);
        console.log("after player action");
      }

      if (!games[i].isEndRound()) {
        rooms[i].stopWaitTimer();
        rooms[i].startWaitTimer(foldAfter(roomNumber));
        io.to(roomNumber).emit("wait player action");
      } else {
        console.log("-------- This round has been ended ---------");
      }

      break;
    }
  }
};

let rooms = [];
let games = [];

const PORT = process.env.PORT;
server.listen(process.env.PORT || 5000, () => {
  console.log(`server is running on port ${process.env.PORT}`);
});

const initSocketServer = () => {
  io.on("connection", (socket) => {
    console.log("new connection");

    socket.on("join room", ({ roomNumber, email, chips }) => {
      // check if same email already exist
      for (let i = 0; i < rooms.length; i++) {
        if (rooms[i].roomNumber == roomNumber) {
          const isSameEmail = rooms[i].members.includes(email);

          if (isSameEmail) return;
          else break;
        }
      }

      socket.join(roomNumber);
      // check if room is already exists
      if (rooms.length == 0) {
        room.roomNumber = roomNumber;
        room.members.push(email);
        room.memberIds.push(socket.id);
        room.roomState = ROOM_STATE_WAITING;
        room.chips = chips;
        room.dealer = email;
        rooms.push(room);
        games.push(new Game());
        games[0].addPlayer({ name: email, chips });
        room.gameOrderNum = 0;
      } else {
        let alreadyCreated = false;

        for (let i = 0; i < rooms.length; i++) {
          if (rooms[i].roomNumber == roomNumber) {
            if (rooms[i].isNewPlayer(email)) {
              rooms[i].members.push(email);
              rooms[i].memberIds.push(socket.id);
              // save to current room
              room = rooms[i];
              if (rooms[i].roomState == ROOM_STATE_WAITING) {
                rooms[i].roomState = ROOM_STATE_ROUND_DEAL;
              }
              if (rooms) {
                alreadyCreated = true;
              }

              // determine dealer
              if (room.members.length == 1) {
                room.dealer = email;
              }

              // add to game object
              games[i].addPlayer({ name: email, chips });
            }
          }
        }

        if (!alreadyCreated) {
          room.roomNumber = roomNumber;
          room.members.push(email);
          room.memberIds.push(socket.id);
          room.roomState = ROOM_STATE_WAITING;
          room.chips = chips;
          rooms.push(room);

          // determine dealer
          if (room.members.length == 1) {
            room.dealer = email;
          }

          // add to game object
          const gameOrderNum = rooms.length - 1;

          games.push(new Game());
          games[gameOrderNum].addPlayer({ name: email, chips });
          room.gameOrderNum = gameOrderNum;
        }
      }

      if (room.members.length >= 2) {
        if (room.nowCounting) {
          room.stopWaitTimer();
          io.to(roomNumber).emit("stop wait new user");
        }

        room.startWaitTimer(startGameAfter({ roomNumber }));
        io.to(roomNumber).emit("wait new user");
      }

      console.log("check if game started", games[room.gameOrderNum].round);

      io.to(roomNumber).emit("new user joined", { room });
    });
    socket.on("call", (data) => {
      console.log("call received");
      for (let i = 0; i < rooms.length; i++) {
        if (rooms[i].roomNumber == data.roomNumber) {
          console.log("inside of if", data.roomNumber);
          games[i].getCurrentPlayer().callOrCheck();
          const players = [];

          for (let j = 0; j < rooms[i].memberIds.length; j++) {
            const players = [];
            for (let k = 0; k < games[i].players.length; k++) {
              players.push({
                name: games[i].players[k].name,
                chips: games[i].players[k].chips,
                bet: games[i].players[k].bet,
                lastAction: games[i].players[k].lastAction,
                hasActed: games[i].players[k].hasActed,
                hasDone: games[i].players[k].hasDone,
              });
            }
            const responseData = {
              firstcard: games[i].players[j].firstCard,
              secondcard: games[i].players[j].secondCard,
              curPlayer: games[i].getCurrentPlayer().name,
              dealer: games[i].players[games[i].dealerPos].name,
              players: JSON.stringify(players),
              BET: games[i].BET,
              chips: games[i].getCurrentPlayer().chips,
              round: games[i].round,
              dealerPos: games[i].dealerPos,
              turnPos: games[i].turnPos,
              pot: games[i].pot,
              communityCards: JSON.stringify(games[i].communityCards),
              isEndRound: games[i].isEndRound(),
              isEndGame: games[i].gameoverInfo.gameover,
              winner: games[i].gameoverInfo.winner,
              gets: games[i].gameoverInfo.gets,
            };
            // console.log("before sending call", data, responseData);
            io.to(rooms[i].memberIds[j]).emit("after player action", responseData);
          }

          // if (!games[i].isEndRound()) {
            rooms[i].stopWaitTimer();
            rooms[i].startWaitTimer(foldAfter(data.roomNumber));
            io.to(data.roomNumber).emit("wait player action");
          // } else {
          //   io.to(data.roomNumber).emit("game over", {});
          // }

          break;
        }
      }
    });
    socket.on("fold", (data) => {
      console.log("fold received");
      foldAfter(data.roomNumber)();
    });
    socket.on("check", (data) => {
      console.log("check received");
      for (let i = 0; i < rooms.length; i++) {
        if (rooms[i].roomNumber == data.roomNumber) {
          games[i].getCurrentPlayer().callOrCheck();
          const players = [];

          for (let j = 0; j < rooms[i].memberIds.length; j++) {
            const players = [];
            for (let k = 0; k < games[i].players.length; k++) {
              players.push({
                name: games[i].players[k].name,
                chips: games[i].players[k].chips,
                bet: games[i].players[k].bet,
                lastAction: games[i].players[k].lastAction,
                hasActed: games[i].players[k].hasActed,
                hasDone: games[i].players[k].hasDone,
              });
            }
            const responseData = {
              firstcard: games[i].players[j].firstCard,
              secondcard: games[i].players[j].secondCard,
              curPlayer: games[i].getCurrentPlayer().name,
              dealer: games[i].players[games[i].dealerPos].name,
              players: JSON.stringify(players),
              BET: games[i].BET,
              chips: games[i].getCurrentPlayer().chips,
              round: games[i].round,
              dealerPos: games[i].dealerPos,
              turnPos: games[i].turnPos,
              pot: games[i].pot,
              communityCards: JSON.stringify(games[i].communityCards),
              isEndRound: games[i].isEndRound(),
              isEndGame: games[i].gameoverInfo.gameover,
              winner: games[i].gameoverInfo.winner,
              gets: games[i].gameoverInfo.gets,
            };
            console.log("before sending check", data, responseData);
            io.to(rooms[i].memberIds[j]).emit("after player action", responseData);
          }

          if (!games[i].isEndRound()) {
            rooms[i].stopWaitTimer();
            rooms[i].startWaitTimer(foldAfter(data.roomNumber));
            io.to(data.roomNumber).emit("wait player action");
          }

          break;
        }
      }
    });
    socket.on("raise", ({ roomNumber, raisevalue }) => {
      console.log("raise received");
      for (let i = 0; i < rooms.length; i++) {
        if (rooms[i].roomNumber == roomNumber) {
          games[i].getCurrentPlayer().raise(raisevalue);
          const players = [];

          for (let j = 0; j < rooms[i].memberIds.length; j++) {
            const players = [];
            for (let k = 0; k < games[i].players.length; k++) {
              players.push({
                name: games[i].players[k].name,
                chips: games[i].players[k].chips,
                bet: games[i].players[k].bet,
                lastAction: games[i].players[k].lastAction,
                hasActed: games[i].players[k].hasActed,
                hasDone: games[i].players[k].hasDone,
              });
            }
            const responseData = {
              firstcard: games[i].players[j].firstCard,
              secondcard: games[i].players[j].secondCard,
              curPlayer: games[i].getCurrentPlayer().name,
              dealer: games[i].players[games[i].dealerPos].name,
              players: JSON.stringify(players),
              BET: games[i].BET,
              chips: games[i].getCurrentPlayer().chips,
              round: games[i].round,
              dealerPos: games[i].dealerPos,
              turnPos: games[i].turnPos,
              pot: games[i].pot,
              communityCards: JSON.stringify(games[i].communityCards),
              isEndRound: games[i].isEndRound(),
              isEndGame: games[i].gameoverInfo.gameover,
              winner: games[i].gameoverInfo.winner,
              gets: games[i].gameoverInfo.gets,
            };
            console.log("before sending check", responseData);
            io.to(rooms[i].memberIds[j]).emit("after player action", responseData);
          }

          if (!games[i].isEndRound()) {
            rooms[i].stopWaitTimer();
            rooms[i].startWaitTimer(foldAfter(roomNumber));
            io.to(roomNumber).emit("wait player action");
          }

          break;
        }
      }
    });
    socket.on("reset room", ({ roomNumber }) => {
      console.log("----------- reset room --------------");
      rooms = [];
      games = [];
      room.reset();
      io.to(roomNumber).emit("reseted room");

      //////////////////// reset socket server //////////////////////
      io = require("socket.io")(server, { cors: { origin: "*" } });
      initSocketServer();
      // socket.disconnect();
    });
    socket.on("start action timer", ({ roomNumber }) => {
      for (let i = 0; i < rooms.length; i++) {
        let room = rooms[i];
        let game = games[i];

        if (room.roomNumber == roomNumber) {
          // restart room wait timer
          room.stopWaitTimer();
          room.startWaitTimer(foldAfter);

          break;
        }
      }
    });
  });
};

initSocketServer();
