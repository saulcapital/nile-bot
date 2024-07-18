import * as dotenv from "dotenv";
dotenv.config({ path: __dirname + "/.env" });
import { Bot } from "grammy";
import {
  getPoolSlot0AndLiquidity,
  getPositionFromChain,
  getPositionsFromDatabase,
  insertPositionIntoDatabase,
  updateDatabasePositionBurned,
  removePositionFromDatabase,
  removeAllPositionsFromDatabase,
  getUserTrackedPools,
} from "./api";
import { Pool, Position } from "ramsesexchange-v3-sdk";
import JSBI from "jsbi";
import { Token } from "@uniswap/sdk-core";
import { ethers } from "ethers";

const bot = new Bot(process.env.BOT_KEY || "");

bot.command("start", (ctx) =>
  ctx.reply(
    "<b>Welcome to the Wizard of Az Bot 🪄!</b> \n" +
      "Track when your CL positions (currently supporting Ramses, Nile, Nuri, Cleopatra) CL positions get out of range.\n\n" +
      "Follow us on twitter: https://x.com/Wizard_of_Az_\n\n" +
      "Type /commands to see the list of available commands.",
    { parse_mode: "HTML" },
  ),
);

bot.command("track", async (ctx) => {
  const userId = ctx.message?.from.id;
  if (!userId) {
    await ctx.reply("No user id.");
    return;
  }
  const username = ctx.message?.from.username;
  if (!username) {
    await ctx.reply("You must set a telegram username to use this bot.");
    return;
  }
  const args = ctx.match?.split(" ");
  if (!args || args.length < 2) {
    await ctx.reply(
      "Must provide a position id and exchange name, ie /track 71255 nile.",
    );
    return;
  }

  const positionId = Number(args[0]);
  const exchange = args[1];

  if (!(Number.isInteger(positionId) && positionId > 0)) {
    await ctx.reply("Must provide a valid position id.");
    return;
  }

  const onChainPosition = await getPositionFromChain(positionId, exchange);
  if (onChainPosition.status == "error") {
    await ctx.reply("Error calling getPosition().");
    return;
  }

  const databasePositions = await getPositionsFromDatabase(
    positionId,
    exchange,
  );
  if (onChainPosition.status == "success") {
    const poolInfo = await getPoolSlot0AndLiquidity(
      onChainPosition.position!.token0,
      onChainPosition.position!.token1,
      onChainPosition.position!.fee,
      exchange,
    );
    if (!poolInfo) {
      await ctx.reply("Error calling getPoolSlot0().");
      return;
    }
    const { slot0, liquidity } = poolInfo;
    const inRange =
      onChainPosition.position!.tickLower <= slot0[1] &&
      onChainPosition.position!.tickUpper > slot0[1];

    if (databasePositions.length == 0) {
      await insertPositionIntoDatabase(
        positionId,
        userId.toString(),
        inRange,
        username.toString(),
        exchange,
        onChainPosition.position!.token0,
        onChainPosition.position!.token1,
        onChainPosition.position!.fee,
        onChainPosition.token0Symbol!,
        onChainPosition.token1Symbol!,
        onChainPosition.position!.tickLower,
        onChainPosition.position!.tickUpper,
        onChainPosition.position!.liquidity,
      );
      await ctx.reply(
        `Now tracking ${exchange} ${onChainPosition.token0Symbol}/${onChainPosition.token1Symbol} CL position ${positionId}. It is currently ${inRange ? "in range." : "out of range."}`,
      );
      console.log(
        `Tracking ${exchange} ${onChainPosition.token0Symbol}/${onChainPosition.token1Symbol} CL position ${positionId} for ${username} on ${new Date().toLocaleString()}`,
      );
    } else {
      const userAlreadyTracking = databasePositions.some(
        (pos) => pos.tg_id === userId.toString(),
      );
      if (!userAlreadyTracking) {
        await insertPositionIntoDatabase(
          positionId,
          userId.toString(),
          inRange,
          username.toString(),
          exchange,
          onChainPosition.position!.token0,
          onChainPosition.position!.token1,
          onChainPosition.position!.fee,
          onChainPosition.token0Symbol!,
          onChainPosition.token1Symbol!,
          onChainPosition.position!.tickLower,
          onChainPosition.position!.tickUpper,
          onChainPosition.position!.liquidity,
        );
        await ctx.reply(
          `Now tracking ${exchange} ${onChainPosition.token0Symbol}/${onChainPosition.token1Symbol} CL position ${positionId} for you. It is currently ${inRange ? "in range." : "out of range."}`,
        );
        console.log(
          `Tracking ${exchange} ${onChainPosition.token0Symbol}/${onChainPosition.token1Symbol} CL position ${positionId} for ${username} on ${new Date().toLocaleString()}`,
        );
      } else {
        await ctx.reply("This position is already being tracked by you.");
      }
    }
  } else if (onChainPosition.status == "burned") {
    if (databasePositions.length > 0) {
      await updateDatabasePositionBurned(positionId, exchange);
      await ctx.reply(
        "That position has been burned and the tracking information has been updated.",
      );
    } else {
      await ctx.reply("That position has been burned.");
    }
  }
});

bot.command("untrack", async (ctx) => {
  const userId = ctx.message?.from.id;
  if (!userId) {
    await ctx.reply("No user id.");
    return;
  }
  const args = ctx.match?.split(" ");
  if (args.length === 1 && args[0] === "all") {
    await removeAllPositionsFromDatabase(userId.toString());
    await ctx.reply("Stopped tracking all positions for you.");
    return;
  }
  if (args.length < 2) {
    await ctx.reply(
      "Must provide a position id and exchange name, ie `/untrack 71255 nile` or use `/untrack all` to stop tracking all positions.",
    );
    return;
  }

  const positionId = Number(args[0]);
  const exchange = args[1];

  if (!(Number.isInteger(positionId) && positionId > 0)) {
    await ctx.reply("Must provide a valid position id.");
    return;
  }

  const databasePositions = await getPositionsFromDatabase(
    positionId,
    exchange,
  );
  const userTrackingPosition = databasePositions.some(
    (pos) => pos.tg_id === userId.toString(),
  );

  if (userTrackingPosition) {
    const onChainPosition = await getPositionFromChain(positionId, exchange);
    if (onChainPosition.status === "success") {
      await removePositionFromDatabase(positionId, userId.toString(), exchange);
      await ctx.reply(
        `Stopped tracking ${exchange} ${onChainPosition.token0Symbol}/${onChainPosition.token1Symbol} CL position ${positionId} for you.`,
      );
    } else {
      await ctx.reply("Error fetching position data. Please try again.");
    }
  } else {
    await ctx.reply("You are not tracking this position.");
  }
});

bot.command("pools", async (ctx) => {
  const userId = ctx.message?.from.id;
  if (!userId) {
    await ctx.reply("No user id.");
    return;
  }

  const trackedPools = await getUserTrackedPools(userId.toString());

  if (trackedPools.length === 0) {
    await ctx.reply("You are not tracking any pools.");
  } else {
    let response = "You are tracking the following pools:\n";
    for (const pool of trackedPools) {
      const poolInfo = await getPoolSlot0AndLiquidity(
        pool.token0,
        pool.token1,
        pool.fee,
        pool.exchange,
      );
      const inRangeText = pool.in_range ? "In Range" : "Out of Range";

      const poolLiquidity = poolInfo!.liquidity.toString();
      const currentTick = Number(poolInfo!.slot0[1]);
      const sqrtRatiox96 = poolInfo!.slot0[0].toString();
      // I believe chainId can be anything when instantiating Tokens
      const token0 = new Token(1, pool.token0, 18);
      const token1 = new Token(1, pool.token1, 18);
      const position = new Position({
        pool: new Pool(
          token0,
          token1,
          pool.fee,
          JSBI.BigInt(sqrtRatiox96),
          poolLiquidity,
          currentTick,
        ),
        liquidity: JSBI.BigInt(pool.positionliquidity),
        tickLower: pool.ticklower,
        tickUpper: pool.tickupper,
      });
      const { amount0, amount1 } = position.mintAmounts;

      response += `- ${pool.token0symbol} (${ethers.formatEther(JSBI.toNumber(amount0).toString())})/${pool.token1symbol} (${ethers.formatEther(JSBI.toNumber(amount1).toString())}) on ${pool.exchange} (#${pool.position_id}), ${inRangeText}\n`;
    }
    const username = ctx.message?.from.username;
    console.log(
      `${username} just called /pools on ${new Date().toLocaleString()}`,
    );
    await ctx.reply(response);
  }
});

bot.command("commands", async (ctx) => {
  await ctx.reply(
    "Available commands:\n" +
      "/start - Welcome message\n" +
      "/track <position-id> <exchange-name> - Track a position\n" +
      "/untrack <position-id> <exchange-name> - Stop tracking a position\n" +
      "/untrack all - Stop tracking all positions\n" +
      "/pools - List all your tracked pools\n" +
      "/help - Get help about the bot\n" +
      "/commands - List all available commands\n\n" +
      "exchanges: ramses, nile, nuri, ra, cleo, pharaoh",
  );
});

bot.command("help", async (ctx) => {
  await ctx.reply(
    "This bot will send you a message when your tracked CL positions move out of range.\n\n" +
      "Type /commands for the command list.\n\n" +
      "Contact AzFlin on Twitter or TG for any questions!",
  );
});

bot.catch((err) => {
  const ctx = err.ctx;
  console.error(
    `Error while handling update ${ctx.update.update_id}: ${new Date().toISOString()} ${ctx.from?.username}`,
  );
  const e = err.error;
  console.error("Error:", e);
  ctx.reply(`Error: ${e}`);
});

bot.start();
