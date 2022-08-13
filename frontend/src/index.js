/* eslint-disable no-undef */
import { ethers } from "ethers";
// eslint-disable-next-line node/no-unpublished-import
import SpaceCoinJSON from "../../artifacts/contracts/SpaceCoin.sol/SpaceCoin.json";
import IcoJSON from "../../artifacts/contracts/SpaceCoinICO.sol/SpaceCoinICO.json";
import RouterJSON from "../../artifacts/contracts/SpaceRouter.sol/SpaceRouter.json";

const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();

const spaceCoinAddr = "0x6dce6D3C01657156A628Df999a26Ec6470c2563c";
const spaceCoin = new ethers.Contract(
  spaceCoinAddr,
  SpaceCoinJSON.abi,
  provider
);

const icoAddr = "0x2Dae42f82d93D93fC005ED1780752c47AE3D132b";
const ico = new ethers.Contract(icoAddr, IcoJSON.abi, provider);

const spaceRouterAddr = "0xEC469B61AD5C24cFFb9692fddAC92522E171CAD5";
const spaceRouter = new ethers.Contract(
  spaceRouterAddr,
  RouterJSON.abi,
  provider
);

const treasuryAddr = "0xb4204d2D9A51572E858Ef53715486899bB6fe112";

async function connectToMetamask() {
  try {
    console.log("Signed in as", await signer.getAddress());
  } catch (err) {
    console.log("Not signed in");
    await provider.send("eth_requestAccounts", []);
  }
}

//
// ICO
//

// eslint-disable-next-line no-undef
ico_set_general.addEventListener("submit", async (e) => {
  e.preventDefault();

  await connectToMetamask();

  try {
    console.log("before GENERAL phase");
    (await ico.connect(signer).moveToNextPhase(0)).wait();
    console.log("after GENERAL phase");
  } catch (err) {
    console.log("error in set general", err);
  }
});

// eslint-disable-next-line no-undef
ico_set_open.addEventListener("submit", async (e) => {
  e.preventDefault();

  await connectToMetamask();

  try {
    console.log("before OPEN phase");
    (await ico.connect(signer).moveToNextPhase(1)).wait();
    console.log("after OPEN phase");
  } catch (err) {
    console.log("error in set open", err);
  }
});

// eslint-disable-next-line no-undef
ico_spc_buy.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const eth = ethers.utils.parseEther(form.eth.value);
  console.log("Buying", eth, "eth");

  await connectToMetamask();
  // TODO: Call ico contract contribute function
  try {
    console.log("before contribute");
    (await ico.connect(signer).contribute({ value: eth })).wait();
    console.log("after contribute");
  } catch (err) {
    console.log("error in spc buy", err);
  }
});

//
// LP
//
const currentSpcToEthPrice = 5;

provider.on("block", (n) => {
  console.log("New block", n);
  // TODO: Update currentSpcToEthPrice
});

lp_deposit.eth.addEventListener("input", (e) => {
  lp_deposit.spc.value = +e.target.value * currentSpcToEthPrice;
});

lp_deposit.spc.addEventListener("input", (e) => {
  lp_deposit.eth.value = +e.target.value / currentSpcToEthPrice;
});

lp_deposit.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const eth = ethers.utils.parseEther(form.eth.value);
  const spc = ethers.utils.parseEther(form.spc.value);
  console.log("Depositing", eth, "eth and", spc, "spc");

  await connectToMetamask();
  // TODO: Call router contract deposit function
  try {
    console.log("before adding liquidity");

    await spaceCoin.connect(signer).increaseAllowance(spaceRouterAddr, spc * 2);
    await spaceRouter.connect(signer).addLiquidity(spc, { value: eth });

    console.log("after adding liqduity");
  } catch (err) {
    console.log("error in adding liquidity", err);
  }
});

lp_withdraw.addEventListener("submit", async (e) => {
  e.preventDefault();
  console.log("Withdrawing 100% of LP");

  await connectToMetamask();
  // TODO: Call router contract withdraw function
  try {
    console.log("before removing liquidity");

    await spaceRouter.connect(signer).removeLiquidity();

    console.log("after removing liqduity");
  } catch (err) {
    console.log("error in removing liquidity", err);
  }
});

//
// Swap
//
let swapIn = { type: "eth", value: 0 };
let swapOut = { type: "spc", value: 0 };
switcher.addEventListener("click", () => {
  [swapIn, swapOut] = [swapOut, swapIn];
  swap_in_label.innerText = swapIn.type.toUpperCase();
  swap.amount_in.value = swapIn.value;
  updateSwapOutLabel();
});

swap.amount_in.addEventListener("input", updateSwapOutLabel);

function updateSwapOutLabel() {
  swapOut.value =
    swapIn.type === "eth"
      ? +swap.amount_in.value * currentSpcToEthPrice
      : +swap.amount_in.value / currentSpcToEthPrice;

  swap_out_label.innerText = `${swapOut.value} ${swapOut.type.toUpperCase()}`;
}

swap.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const amountIn = ethers.utils.parseEther(form.amount_in.value);
  const minimumETHSlippageAmount = ethers.utils.parseEther(
    form.eth_slippage_amount.value
  );
  const minimumSPCSlippageAmount = ethers.utils.parseEther(
    form.spc_slippage_amount.value
  );

  console.log("Swapping", amountIn, swapIn.type, "for", swapOut.type);

  await connectToMetamask();
  // TODO: Call router contract swap function
  try {
    console.log("before swapping");

    if (swapIn.type === "eth") {
      await spaceRouter
        .connect(signer)
        .swapToken(0, minimumETHSlippageAmount, minimumSPCSlippageAmount, {
          value: amountIn,
        });
    } else {
      await spaceCoin
        .connect(signer)
        .increaseAllowance(spaceRouterAddr, spc * 2);
      await spaceRouter
        .connect(signer)
        .swapToken(
          amountIn,
          minimumETHSlippageAmount,
          minimumSPCSlippageAmount
        );
    }

    console.log("after swapping");
  } catch (err) {
    console.log("error in swapping", err);
  }
});
