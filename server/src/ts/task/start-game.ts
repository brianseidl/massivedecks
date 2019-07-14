import wu from "wu";
import * as event from "../event";
import * as gameStarted from "../events/game-event/game-started";
import * as decks from "../games/cards/decks";
import * as source from "../games/cards/source";
import * as sources from "../games/cards/sources";
import * as game from "../games/game";
import * as round from "../games/game/round";
import { Lobby } from "../lobby";
import { Change } from "../lobby/change";
import { GameCode } from "../lobby/game-code";
import { ServerState } from "../server-state";
import * as task from "../task";

export class StartGame extends task.TaskBase<decks.Templates[]> {
  private readonly decks: Iterable<source.External>;

  public constructor(gameCode: GameCode, decks: Iterable<source.External>) {
    super(gameCode);
    this.decks = decks;
  }

  protected async begin(server: ServerState): Promise<decks.Templates[]> {
    return Promise.all(
      wu(this.decks).map(deck =>
        sources.resolver(server.cache, deck).templates()
      )
    );
  }

  protected resolve(lobby: Lobby, work: decks.Templates[]): Change {
    if (lobby.game !== undefined) {
      return {};
    }
    const lobbyGame = game.start(work, lobby.users.keys(), lobby.config.rules);
    const gameRound = round.censor(lobbyGame.round);
    const baseEvent = gameStarted.of(gameRound);
    const events = [
      event.playerSpecificAddition(baseEvent, (id, user, player) => ({
        hand: player.hand
      }))
    ];
    lobby.game = lobbyGame;
    return { lobby, events };
  }

  // This is super unlikely timing-wise, and if it happens, the user just has
  // to click start again. They'll live.
  public static *discover(
    gameCode: GameCode,
    lobby: Lobby
  ): Iterable<StartGame> {}
}