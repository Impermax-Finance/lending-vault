"use strict";

const { 
	dfn,
	bnMantissa,
	BN,
	expectEqual,
} = require('./JS');
const {
	encodeParameters,
	etherBalance,
	etherUnsigned,
	address,
	encode,
	encodePacked,
} = require('./Ethereum');
const { hexlify, keccak256, toUtf8Bytes } = require('ethers/utils');
const { ecsign } = require('ethereumjs-util');

const MockERC20 = artifacts.require('MockERC20');
const ImpermaxERC20 = artifacts.require('ImpermaxERC20Harness');
const Borrowable = artifacts.require('BorrowableHarness');
const LVDeployerV1 = artifacts.require('LVDeployerV1');
const LendingVaultV1Factory = artifacts.require('LendingVaultV1Factory');
const LendingVaultV1 = artifacts.require('LendingVaultV1');
const LendingVaultV1Harness = artifacts.require('LendingVaultV1Harness');
const BorrowableObjectHarness = artifacts.require('BorrowableObjectHarness');
const LendingVaultWatcher01 = artifacts.require('LendingVaultWatcher01');


async function makeErc20Token(opts = {}) {
	const quantity = etherUnsigned(dfn(opts.quantity, 1e25));
	const decimals = etherUnsigned(dfn(opts.decimals, 18));
	const symbol = opts.symbol || 'DAI';
	const name = opts.name || `Erc20 ${symbol}`;
	return await ImpermaxERC20.new(name, symbol);
}

async function makeBorrowable(opts = {}) {
	const token = opts.token || await makeErc20Token();
	const borrowable = await Borrowable.new();
	await borrowable.setAccrualTimestamp(0);
	await borrowable.setRateUpdateTimestamp(0);
	await borrowable.setBlockTimestamp(0);
	await borrowable._setFactory();
	await borrowable._initialize("Impermax Borrowable", "imxB", token.address, address(0));
	return Object.assign(borrowable, {obj: {token}});
}

async function makeBorrowables(token, size) {
	const borrowables = [];
	for (let i = 0; i < size; i++) {
		borrowables.push(await makeBorrowable({token}))
	}
	return borrowables;
}

async function makeLVDeployerV1(opts = {}) {
	return await LVDeployerV1.new();
}

async function makeFactory(opts = {}) {
	const admin = opts.admin || address(0);
	const reservesAdmin = opts.reservesAdmin || address(0);
	const reallocateManager = opts.reallocateManager || address(0);
	const LVDeployerV1 = await makeLVDeployerV1();
	const factory = await LendingVaultV1Factory.new(admin, reservesAdmin, LVDeployerV1.address);
	return Object.assign(factory, {obj: {admin, reservesAdmin, reallocateManager}});
}

async function makeLendingVault(opts = {}) {
	const token = opts.token || await makeErc20Token();
	const factory = opts.factory || await makeFactory(opts);
	const vaultAddress = await factory.createVault.call(token.address, "", "");
	await factory.createVault(token.address, "", "");
	const vault = await LendingVaultV1.at(vaultAddress);
	return Object.assign(vault, {obj: {token, factory}});
}

async function makeLendingVaultHarness(opts = {}) {
	const token = opts.token || await makeErc20Token();
	const vault = await LendingVaultV1Harness.new();
	await vault._setFactory();
	await vault._initialize(token.address, "", "");
	return Object.assign(vault, {obj: {token}});
}

async function makeBorrowableObjectHarness(opts = {}) {
	return await BorrowableObjectHarness.new();
}

async function makeLendingVaultWatcher(opts = {}) {
	return await LendingVaultWatcher01.new();
}


module.exports = {
	MockERC20,
	ImpermaxERC20,
	Borrowable,
	LendingVaultV1Factory,
	LendingVaultV1,
	
	makeErc20Token,
	makeBorrowable,
	makeBorrowables,
	makeLVDeployerV1,
	makeFactory,
	makeLendingVault,
	makeLendingVaultHarness,
	makeBorrowableObjectHarness,
	makeLendingVaultWatcher,
};
