#!/usr/bin/env node
/** Simple gas benchmark harness for FeeController critical functions */
const { ethers } = require('hardhat');

async function measure(txPromise, label) {
  const tx = await txPromise;
  const r = await tx.wait();
  console.log(label, 'gasUsed=', r.gasUsed.toString());
  return r.gasUsed;
}

async function main() {
  const [deployer, stratA, stratB, recipient] = await ethers.getSigners();
  const FeeController = await ethers.getContractFactory('FeeController');
  const ERC20Mock = await ethers.getContractFactory('ERC20Mock');
  const token = await ERC20Mock.deploy('MockUSD','mUSD');
  const controller = await FeeController.deploy(deployer.address, recipient.address);

  await measure(controller.registerStrategy(stratA.address, true), 'registerStrategy A');
  await measure(controller.registerStrategy(stratB.address, true), 'registerStrategy B');

  await token.mint(stratA.address, ethers.parseUnits('100',18));
  await token.connect(stratA).transfer(controller.target, ethers.parseUnits('50',18));
  await controller.connect(stratA).notifyFee(token.target, ethers.parseUnits('50',18));

  await token.mint(stratB.address, ethers.parseUnits('100',18));
  await token.connect(stratB).transfer(controller.target, ethers.parseUnits('60',18));
  await controller.connect(stratB).notifyFee(token.target, ethers.parseUnits('60',18));

  await measure(controller.withdrawFees(token.target), 'withdrawFees (2 strategies)');
  await measure(controller.removeStrategy(stratB.address), 'removeStrategy B');
}

main().catch(e => { console.error(e); process.exit(1); });
