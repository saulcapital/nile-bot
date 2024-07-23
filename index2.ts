import { Pool, Position } from "ramsesexchange-v3-sdk";
import { Token } from "@uniswap/sdk-core";
import JSBI from "jsbi";
import {
  getPositionFromChain,
  getPoolSlot0AndLiquidity,
  getPositionRewards,
} from "./api";
import GaugeV2 from "./abi/GaugeV2.json";
import ClGaugeFactory from "./abi/ClGaugeFactory.json";
import { ethers } from "ethers";
import { provider } from "./api";
import { computeAerodromeClPoolAddress } from "./helpers";

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
  // const gaugev2address = "0x7ebe6015ddb02fe34ba5dd15b289ed4935a5a824";
  const nileProvider = provider("nile");
  // const gaugev2Contract = new ethers.Contract(
  //   gaugev2address,
  //   GaugeV2,
  //   nileProvider,
  // );
  // const earned = await gaugev2Contract.earned(
  //   "0xAAAac83751090C6ea42379626435f805DDF54DC8",
  //   130814,
  // );
  // console.log(earned);
  const pool = "0xce6f03c4f2d1f23ed1996c85b6ff047fb049b61f";
  const clGaugeFactoryContract = new ethers.Contract(
    "0xAAA2D4987EEd427Ba5E2c933EeFCD75C84b446B7",
    ClGaugeFactory,
    nileProvider,
  );
  const gaugeAddress = await clGaugeFactoryContract.getGauge(pool);
  console.log(gaugeAddress);
  const gaugev2Contract = new ethers.Contract(
    gaugeAddress,
    GaugeV2,
    nileProvider,
  );
  const earned = await gaugev2Contract.earned(
    "0xAAAac83751090C6ea42379626435f805DDF54DC8",
    130814,
  );
  console.log(earned);
}

async function tryGetPositionRewards() {
  console.log(
    await getPositionRewards(
      "0x02efd69765a2f8df9797b13a046b7f080ad40cd7",
      "nuri",
      79639,
    ),
  );
}

async function tryAerodrome() {
  const onChainPosition = await getPositionFromChain(250059, "aerodrome");
  console.log("onChainPosition", onChainPosition);
  console.log(
    "onChainPosition.position!.tickSpacing",
    onChainPosition.position![4],
  );
  const poolInfo = await getPoolSlot0AndLiquidity(
    onChainPosition.position!.token0,
    onChainPosition.position!.token1,
    onChainPosition.position!.fee,
    "aerodrome",
    onChainPosition.position![4],
  );
  console.log("poolInfo", poolInfo);
}

async function getAerodromeAddress() {
  const aerodromeProvider = provider("aerodrome");
  const address = await computeAerodromeClPoolAddress(
    "0x5e7BB104d84c7CB9B682AaC2F3d509f5F406809A",
    [
      "0x4200000000000000000000000000000000000006",
      "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
    ],
    100,
    aerodromeProvider,
  );
  console.log(address);
}

// POSIX compliant apps should report an exit status
tryAerodrome()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error(err); // Writes to stderr
    process.exit(1);
  });
