import { Pool, Position } from "ramsesexchange-v3-sdk";
import { Token } from "@uniswap/sdk-core";
import JSBI from "jsbi";
import { getPositionFromChain, getPoolSlot0AndLiquidity } from "./api";
import GaugeV2 from "./abi/GaugeV2.json";
import { ethers } from "ethers";
import { provider } from "./api";

async function tryPositionMintAmounts() {
  const positionFromChain = await getPositionFromChain(125111, "nile");
  const chainId = 59144;
  const WETH = "0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f";
  const weETH = "0x1Bf74C010E6320bab11e2e5A532b5AC15e0b8aA6";
  const token0 = new Token(chainId, weETH, 18);
  const token1 = new Token(chainId, WETH, 18);
  const fee = Number(positionFromChain.position!.fee);
  const poolInfo = await getPoolSlot0AndLiquidity(
    token0.address,
    token1.address,
    fee,
    "nile",
  );
  const poolLiquidity = poolInfo!.liquidity.toString();
  const currentTick = Number(poolInfo!.slot0[1]);
  const sqrtRatiox96 = poolInfo!.slot0[0].toString();
  const tickLower = Number(positionFromChain.position!.tickLower);
  const tickUpper = Number(positionFromChain.position!.tickUpper);
  console.log({
    poolInfo,
    liquidity: poolLiquidity,
    currentTick,
    sqrtRatiox96,
    fee,
    tickLower,
    tickUpper,
  });
  const position = new Position({
    pool: new Pool(
      token0,
      token1,
      fee,
      JSBI.BigInt(sqrtRatiox96),
      poolLiquidity,
      currentTick,
    ),
    liquidity: JSBI.BigInt(positionFromChain.position!.liquidity.toString()),
    tickLower,
    tickUpper,
  });
  const { amount0, amount1 } = position.mintAmounts;
  console.log({
    amount0: JSBI.toNumber(amount0),
    amount1: JSBI.toNumber(amount1),
  });
}

async function estimateRewards() {
  const gaugev2address = "0x7ebe6015ddb02fe34ba5dd15b289ed4935a5a824";
  const nileProvider = provider("nile");
  const gaugev2Contract = new ethers.Contract(
    gaugev2address,
    GaugeV2,
    nileProvider,
  );
  // console.log(await gaugev2Contract.feeCollector());
  const tx = {
    to: gaugev2address,
    data: gaugev2Contract.interface.encodeFunctionData("getReward(uint256[],address[])", [
      ["124114"], ["0xAAAac83751090C6ea42379626435f805DDF54DC8"],
    ]),
    from: "0xEF330d6F0B4375c39D8eD3d0D690a5B69e9EcD0c"
  };
  const txResponse = await nileProvider.call(tx);
  console.log(txResponse);
}

// POSIX compliant apps should report an exit status
estimateRewards()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error(err); // Writes to stderr
    process.exit(1);
  });
