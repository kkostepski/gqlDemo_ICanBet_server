// A map of functions which return data for the schema.
import { teams, games, getGame, getTeam, gamblers, getGambler } from './data'
import { recalculatePointsAndPlaces } from './pointsAndPlace'

recalculatePointsAndPlaces(gamblers)

const resolvers = {
  Mutation: {
    makeBet: (_root, { gameId, gamblerId, betInput }) => {
      const gambler = getGambler(gamblerId)
      const gamblersBetForGame = getGamblersBetForGame(gambler, gameId)

      gamblersBetForGame.betNumbers = [betInput.a, betInput.b]
      if (betInput.winInPenalties) {
        if (betInput.winInPenalties === 'A') {
          gamblersBetForGame.betNumbers.push(1)
        } else {
          gamblersBetForGame.betNumbers.push(2)
        }
      }
      // !recalculate points and places
      recalculatePointsAndPlaces(gamblers)

      return getGamblersBetForGame(gambler, gameId)
    },
    editGameResult: (_root, { id, resultInput }) => {
      const game = getGame(id)
      game.result[0] = resultInput.a
      game.result[1] = resultInput.b
      game.result[2] = resultInput.aPenalties
      game.result[3] = resultInput.bPenalties

      const errorMessage = getResultInputValidationMessage(game)
      if (errorMessage) {
        throw new Error(errorMessage)
      }

      recalculatePointsAndPlaces(gamblers)

      return game
    },
    addGameResult: (_root, { phase, date, teamA, teamB, resultInput }) => {
      const lastGame = games[games.length - 1]

      const game = {
        id: lastGame.id + 1,
        phase,
        date,
        teamA: getTeam(teamA),
        teamB: getTeam(teamB),
        result: [
          resultInput.a,
          resultInput.b,
          resultInput.aPenalties,
          resultInput.bPenalties
        ]
      }
      const errorMessage = getResultInputValidationMessage(game)

      if (errorMessage) {
        throw new Error(errorMessage)
      }

      games.push(game)

      recalculatePointsAndPlaces(gamblers)

      return game
    }
  },
  Query: {
    teams: () => teams,
    games: () => games,
    game: (_obj, args) => getGame(args.id),
    gamblers: () => gamblers,
    gambler: (_obj, args) => getGambler(args.id),
    bets: () =>
      gamblers.reduce((allBets, gambler) => {
        const gamblerBets = gambler.bets
        return [...allBets, ...gamblerBets]
      }, [])
  },
  Game: {
    result: game => {
      return {
        a: game.result[0],
        b: game.result[1],
        aPenalties: game.result[2],
        bPenalties: game.result[3]
      }
    },
    bets: game =>
      gamblers.reduce((allBets, gambler) => {
        const gamblerBetsForGame = gambler.bets.filter(
          bet => bet.gameId === game.id
        )

        return [...allBets, ...gamblerBetsForGame]
      }, [])
  },
  Gambler: {
    name: gambler => gambler.nick,
    id: gambler => gambler.nick
  },
  Bet: {
    game: userBetForGame => getGame(userBetForGame.gameId),
    gambler: userBetForGame => getGambler(userBetForGame.gamblerId),
    betNumbers: userBetForGame => {
      let winInPenalties
      if (!userBetForGame.betNumbers[2]) {
        winInPenalties = null
      } else {
        winInPenalties = userBetForGame.betNumbers[2] === 1 ? 'A' : 'B'
      }
      return {
        a: userBetForGame.betNumbers[0],
        b: userBetForGame.betNumbers[1],
        winInPenalties
      }
    }
  }
}

const getGamblersBetForGame = (gambler, gameId) => {
  if (!Array.isArray(gambler.bets)) {
    gambler.bets = []
  }

  let bet = gambler.bets.find(bet => String(bet.gameId) === String(gameId))
  if (!bet) {
    bet = {
      gamblerId: gambler.id,
      gameId,
      betNumbers: null
    }
  }
  return bet
}

const getResultInputValidationMessage = gameData => {
  const resultA = gameData.result[0]
  const resultB = gameData.result[1]
  const resultAPenalties = gameData.result[2] || null
  const resultBPenalties = gameData.result[3] || null

  if (resultAPenalties !== null || resultBPenalties !== null) {
    if (resultAPenalties === null || resultBPenalties === null) {
      return 'Wprowadź kompletny wynik karnych.'
    }

    if (resultAPenalties === resultBPenalties) {
      return 'Nie można dodać remisu w rzutach karnych.'
    }
  }

  if (
    resultA < 0 ||
    resultB < 0 ||
    resultAPenalties < 0 ||
    resultBPenalties < 0
  ) {
    return 'Minusowy wynik?'
  }

  if (
    gameData.phase !== 'Grupa' &&
    resultA === resultB &&
    (resultAPenalties === null && resultBPenalties === null)
  ) {
    return 'Wprowadź wynik rzutów karnych.'
  }

  return null
}

export default resolvers
