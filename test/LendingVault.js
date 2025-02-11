const {
	makeErc20Token,
	makeBorrowable,
	makeBorrowables,
	makeFactory,
	makeLendingVaultHarness,
	makeLendingVaultWatcher,
	LendingVaultV2,
} = require('./Utils/Impermax');
const {
	expectAlmostEqualMantissa,
	expectEqual,
	expectRevert,
	expectEvent,
	bnMantissa,
	BN,
} = require('./Utils/JS');
const {
	address,
	encode,
} = require('./Utils/Ethereum');
const { keccak256, toUtf8Bytes } = require('ethers/utils');

const FlashAllocatePoC = artifacts.require('FlashAllocatePoC');

const oneMantissa = (new BN(10)).pow(new BN(18));
const K_TRACKER = (new BN(2)).pow(new BN(128));
const INITIAL_EXCHANGE_RATE = oneMantissa;

function slightlyIncrease(bn) {
	return bn.mul( bnMantissa(1.00001) ).div( oneMantissa );
}
function slightlyDecrease(bn) {
	return bn.mul( oneMantissa ).div( bnMantissa(1.00001) );
}
async function setBorrowablesTimestamp(borrowables, time) {
	for(let i = 0; i < borrowables.length; i++) {
		await borrowables[i].setBlockTimestamp(time);
	}
}
async function printSnapshot(vault, borrowables) {
	return;
	const exchangeRate = await vault.exchangeRate.call() / 1e18;
	const totalSupply = await vault.totalSupply() / 1e18;
	const underlyingBalance = totalSupply * exchangeRate;
	const vaultDust = await borrowables[0].obj.token.balanceOf(vault.address) / 1e18;
	console.log("Vault data");
	console.log("exchangeRate", exchangeRate);
	console.log("calculated underlyingBalance", underlyingBalance);
	console.log("vault dust", vaultDust);
	console.log();
	//return;
	for (let i = 0; i < borrowables.length; i++) {
		await borrowables[i].sync();
		const exchangeRate = await borrowables[i].exchangeRate.call() / 1e18;
		const vaultBalance = await borrowables[i].balanceOf(vault.address) / 1e18;
		const kinkBorrowAPR = await borrowables[i].kinkBorrowRate() / 1e18 * 3600 * 24 * 365;
		const borrowAPR = await borrowables[i].borrowRate() / 1e18 * 3600 * 24 * 365;
		const totalBalance = await borrowables[i].totalBalance() / 1e18;
		const totalBorrows = await borrowables[i].totalBorrows() / 1e18;
		const reserveFactor = await borrowables[i].reserveFactor() / 1e18;
		const utilizationRate = totalBorrows / (totalBalance + totalBorrows);
		const supplyAPR = borrowAPR * utilizationRate * (1 - reserveFactor);
		// print 
		console.log("Borrowable", i);
		console.log("totalBalance", totalBalance);
		console.log("exchangeRate", exchangeRate);
		console.log("vault underlying balance", vaultBalance * exchangeRate);
		console.log("kinkBorrowAPR", kinkBorrowAPR);
		console.log("borrowAPR", borrowAPR);
		console.log("utilizationRate", utilizationRate);
		console.log("supplyAPR", supplyAPR);
		console.log();
	}
	console.log();
}

//TODO add expect

contract('LendingVaultV2', function (accounts) {
	let root = accounts[0];
	let user = accounts[1];
	let admin = accounts[2];		
	let borrower = accounts[3];		
	let receiver = accounts[4];		
	let reservesManager = accounts[5];		
	let reservesAdmin = accounts[6];	
	let reallocateManager = accounts[7];	

	describe('preliminarary test', () => {
		let token;
		
		it(`test`, async () => {
			token = await makeErc20Token();
			const borrowable1 = await makeBorrowable({token});
			const borrowable2 = await makeBorrowable({token});
			const borrowable3 = await makeBorrowable({token});
			const borrowable4 = await makeBorrowable({token});
			const factory = await makeFactory({admin, reservesAdmin});
			//await factory._setReallocateManager(reallocateManager, {from: admin});
			const vaultAddress = await factory.createVault.call(token.address, "", "");
			await factory.createVault(token.address, "", "");
			const vault = await LendingVaultV2.at(vaultAddress);
			
			//first borrowable
			await vault.addBorrowable(borrowable1.address, {from: admin});
			await token.mint(user, oneMantissa);
			await token.transfer(vault.address, oneMantissa, {from: user});
			console.log("exchangeRate", await vault.exchangeRate.call() / 1e18);
			await vault.mint(user);
			console.log("exchangeRate", await vault.exchangeRate.call() / 1e18);
			const userBalance1 = await vault.balanceOf(user);
			console.log("userBalance1", userBalance1 * 1);
			const balanceToken1 = await token.balanceOf(vault.address);
			console.log("balanceToken1", balanceToken1 * 1);
			const balanceBorrowable11 = await borrowable1.balanceOf(vault.address);
			console.log("balanceBorrowable11", balanceBorrowable11 * 1);
			
			//second borrowable
			console.log();
			await vault.addBorrowable(borrowable2.address, {from: admin});
			await token.mint(user, oneMantissa.div(BN(2)));
			await token.transfer(vault.address, oneMantissa.div(BN(2)), {from: user});
			await vault.mint(user);
			console.log("exchangeRate", await vault.exchangeRate.call() / 1e18);
			const userBalance2 = await vault.balanceOf(user);
			console.log("userBalance2", userBalance2 * 1);
			const balanceToken2 = await token.balanceOf(vault.address);
			console.log("balanceToken2", balanceToken2 * 1);
			const balanceBorrowable12 = await borrowable1.balanceOf(vault.address);
			console.log("balanceBorrowable12", balanceBorrowable12 * 1);
			const balanceBorrowable21 = await borrowable2.balanceOf(vault.address);
			console.log("balanceBorrowable21", balanceBorrowable21 * 1);
			
			console.log();
			await borrowable1.simulateBorrow(1000000);
			await borrowable2.simulateBorrow(5000000);
			await borrowable1.setBlockTimestamp(100000);
			await borrowable2.setBlockTimestamp(100000);
			await vault.reallocate({from: reallocateManager});
			console.log("exchangeRate", await vault.exchangeRate.call() / 1e18);
			const userBalance3 = await vault.balanceOf(user);
			console.log("userBalance3", userBalance3 * 1);
			const balanceToken3 = await token.balanceOf(vault.address);
			console.log("balanceToken3", balanceToken3 * 1);
			const balanceBorrowable13 = await borrowable1.balanceOf(vault.address);
			console.log("balanceBorrowable1", balanceBorrowable13 * 1);
			const balanceBorrowable23 = await borrowable2.balanceOf(vault.address);
			console.log("balanceBorrowable23", balanceBorrowable23 * 1);
			
			console.log();
			await vault.addBorrowable(borrowable3.address, {from: admin});
			await vault.addBorrowable(borrowable4.address, {from: admin});
			await borrowable3.setBlockTimestamp(100000);
			await borrowable4.setBlockTimestamp(100000);
			await borrowable3.simulateBorrow(500000);
			await borrowable4.simulateBorrow(3000000);
			await vault.reallocate({from: reallocateManager});
			console.log("exchangeRate", await vault.exchangeRate.call() / 1e18);
			await borrowable1.setBlockTimestamp(2000000);
			await borrowable2.setBlockTimestamp(2000000);
			await borrowable3.setBlockTimestamp(2000000);
			await borrowable4.setBlockTimestamp(2000000);
			console.log("exchangeRate", await vault.exchangeRate.call() / 1e18);
			console.log("balanceBorrowable1", await borrowable1.balanceOf(vault.address) * 1);
			console.log("balanceBorrowable2", await borrowable2.balanceOf(vault.address) * 1);
			console.log("balanceBorrowable3", await borrowable3.balanceOf(vault.address) * 1);
			console.log("balanceBorrowable4", await borrowable4.balanceOf(vault.address) * 1);
		});
	
	});
	

	describe('test first scenario, reallocate and APRs convergence', () => {
		let token;
		let borrowables;
		let factory;
		let vaultAddress;
		let vault;
		let lendingVaultWatcher;
		
		it(`test first scenario, reallocate and APRs convergence`, async () => {
			token = await makeErc20Token();
			borrowables = await makeBorrowables(token, 6);
			factory = await makeFactory({admin, reservesAdmin});
			//await factory._setReallocateManager(reallocateManager, {from: admin});
			//vaultAddress = await factory.createVault.call(token.address, "", "");
			//await factory.createVault(token.address, "", "");
			//vault = await LendingVaultV2.at(vaultAddress);
			vault = await makeLendingVaultHarness({token, factory: factory.address});
			lendingVaultWatcher = await makeLendingVaultWatcher();
			
			await factory._setReservesManager(reservesManager, {from: reservesAdmin});
			await vault._setReserveFactor(bnMantissa(0), {from: admin});
			
			// initialize
			for(let i = 0; i < borrowables.length; i++) {
				await vault.addBorrowable(borrowables[i].address, {from: admin});
				await borrowables[i].simulateBorrow(oneMantissa.mul(BN(300)));
			}
			await token.mint(user, oneMantissa.mul(BN(600)));
			await token.transfer(vault.address, oneMantissa.mul(BN(600)), {from: user});
			await vault.mint(user);
			console.log("INITIAL STATE");
			await printSnapshot(vault, borrowables);
		});
		
		it(`test first scenario, reallocate and APRs convergence`, async () => {
			// do borrows and external mint
			await token.mint(user, oneMantissa.mul(BN(300)));
			await token.transfer(borrowables[0].address, oneMantissa.mul(BN(100)), {from: user});
			await token.transfer(borrowables[1].address, oneMantissa.mul(BN(200)), {from: user});
			await borrowables[0].mint(user);
			await borrowables[1].mint(user);
			await borrowables[2].simulateBorrow(oneMantissa.mul(BN(150)));
			await borrowables[3].simulateBorrow(oneMantissa.mul(BN(300)));
			console.log("AFTER MINT AND BORROWS");
			await printSnapshot(vault, borrowables);
			const reallocateReceipt = await vault.reallocate({from: reallocateManager});
			console.log("AFTER REALLOCATE - gas used:", reallocateReceipt.receipt.gasUsed);
			await printSnapshot(vault, borrowables);
		});

		it(`test first scenario, reallocate and APRs convergence`, async () => {
			// wait some time
			await setBorrowablesTimestamp(borrowables, 3600 * 24 * 5);
			console.log("AFTER 5 DAYS");
			await printSnapshot(vault, borrowables);
			// increase APR of borrowable 4
			await borrowables[4].simulateBorrow(oneMantissa.mul(BN(600)));
			await setBorrowablesTimestamp(borrowables, 3600 * 24 * 10);
			console.log("AFTER 10 DAYS");
			// wasting around 14% of mint/redeem tx cost with current implementation of getTotalSupplied
			const receipt1 = await vault.getTotalSupplied();
			const receipt2 = await vault.getTotalSupplied();
			console.log(receipt1.receipt.gasUsed, receipt2.receipt.gasUsed)
			await printSnapshot(vault, borrowables);
			const reallocateReceipt = await vault.reallocate({from: reallocateManager});
			console.log("AFTER REALLOCATE - gas used:", reallocateReceipt.receipt.gasUsed);
			await printSnapshot(vault, borrowables);
			console.log("FACTORY", factory.address, await vault.factory());
		});
		
		it(`test first scenario, reallocate and APRs convergence`, async () => {
			// increase APR of borrowable 1
			await borrowables[1].simulateBorrow(oneMantissa.mul(BN(1500)));
			await setBorrowablesTimestamp(borrowables, 3600 * 24 * 13);
			console.log("AFTER 13 DAYS");
			await printSnapshot(vault, borrowables);
			const reallocateReceipt = await vault.reallocate({from: reallocateManager});
			console.log("AFTER REALLOCATE - gas used:", reallocateReceipt.receipt.gasUsed);
			await printSnapshot(vault, borrowables);
		});
		
		it(`test first scenario, reallocate and APRs convergence`, async () => {
			await setBorrowablesTimestamp(borrowables, 3600 * 24 * 16);
			await token.mint(user, oneMantissa.mul(BN(600)));
			await token.transfer(vault.address, oneMantissa.mul(BN(600)), {from: user});
			const mintReceipt = await vault.mint(user);
			console.log("AFTER 16 DAYS AND MINT - gas used:", mintReceipt.receipt.gasUsed);
			await printSnapshot(vault, borrowables);
		});
		
		it(`after 19 days, and test mintReserves`, async () => {
			const initialExchangeRate = await vault.exchangeRate.call();
			await vault.exchangeRate();
			const totalSupply = await vault.totalSupply();
			const initialBalance = await vault.balanceOf(reservesManager);
			expectEqual(initialBalance, bnMantissa(0));
			await vault._setReserveFactor(bnMantissa(0.1), {from: admin});
			
			await setBorrowablesTimestamp(borrowables, 3600 * 24 * 19);
			const reallocateReceipt = await vault.reallocate({from: reallocateManager});
			console.log("AFTER 19 DAYS AND REALLOCATE - gas used:", reallocateReceipt.receipt.gasUsed);
			await printSnapshot(vault, borrowables);
			
			console.log("FACTORY", factory.address, await vault.factory());
			console.log("totalSupply", await vault.totalSupply() / 1e18);
			console.log("totalBalance", await vault.totalBalance() / 1e18);
			console.log("exchangeRateLast", await vault.exchangeRateLast() / 1e18);
			console.log("reserveFactor", await vault.reserveFactor() / 1e18);
			console.log("getTotalSupplied", await vault.getTotalSupplied.call() / 1e18);
			console.log("reservesManager", await factory.reservesManager());
			
			const finalExchangeRate = await vault.exchangeRate.call();
			await vault.exchangeRate();
			const finalBalance = await vault.balanceOf(reservesManager);
			const expectedBalance = bnMantissa(((finalExchangeRate - initialExchangeRate) * 0.1 / 0.9) / finalExchangeRate * totalSupply / 1e18);
			expectAlmostEqualMantissa(finalBalance, expectedBalance);
		});
		
		it(`test first scenario, reallocate and APRs convergence`, async () => {
			await setBorrowablesTimestamp(borrowables, 3600 * 24 * 22);
			const reallocateReceipt = await vault.reallocate({from: reallocateManager});
			console.log("AFTER 22 DAYS AND REALLOCATE - gas used:", reallocateReceipt.receipt.gasUsed);
			await printSnapshot(vault, borrowables);
		});
		
		it(`test first scenario, reallocate and APRs convergence`, async () => {
			// redeem
			await setBorrowablesTimestamp(borrowables, 3600 * 24 * 24);
			await vault.transfer(vault.address, oneMantissa.mul(BN(900)), {from: user});
			const redeemReceipt = await vault.redeem(user);
			console.log("user balance:", await token.balanceOf(user) / 1e18); 
			console.log("AFTER 24 DAYS AND REDEEM - gas used:", redeemReceipt.receipt.gasUsed);
			await printSnapshot(vault, borrowables);
		});
		
		it(`test first scenario, reallocate and APRs convergence`, async () => {
			// borrow and redeem
			await borrowables[4].simulateBorrowBurningTokens(oneMantissa.mul(BN(80)));
			await vault.transfer(vault.address, oneMantissa.mul(BN(150)), {from: user});
			const redeemReceipt = await vault.redeem(user);
			console.log("AFTER BORROW AND REDEEM WITH LOCKED LIQUIDITY - gas used:", redeemReceipt.receipt.gasUsed);
			await printSnapshot(vault, borrowables);
		});
		
		it(`make the exchangeRate grow to test with high number`, async () => {
			await setBorrowablesTimestamp(borrowables, 3600 * 24 * 40);
			const reallocateReceipt = await vault.reallocate({from: reallocateManager});
			console.log("AFTER 40 DAYS AND REALLOCATE - gas used:", reallocateReceipt.receipt.gasUsed);
			await printSnapshot(vault, borrowables);
		});
		
		it(`make the exchangeRate grow to test with high number`, async () => {
			await setBorrowablesTimestamp(borrowables, 3600 * 24 * 60);
			const reallocateReceipt = await vault.reallocate({from: reallocateManager});
			console.log("AFTER 60 DAYS AND REALLOCATE - gas used:", reallocateReceipt.receipt.gasUsed);
			await printSnapshot(vault, borrowables);
		});
		
		it(`make the exchangeRate grow to test with high number`, async () => {
			await setBorrowablesTimestamp(borrowables, 3600 * 24 * 100);
			const reallocateReceipt = await vault.reallocate({from: reallocateManager});
			console.log("AFTER 100 DAYS AND REALLOCATE - gas used:", reallocateReceipt.receipt.gasUsed);
			await printSnapshot(vault, borrowables);
		});
		
		it(`make the exchangeRate grow to test with high number`, async () => {
			await setBorrowablesTimestamp(borrowables, 3600 * 24 * 200);
			const reallocateReceipt = await vault.reallocate({from: reallocateManager});
			console.log("AFTER 200 DAYS AND REALLOCATE - gas used:", reallocateReceipt.receipt.gasUsed);
			await printSnapshot(vault, borrowables);
		});
		
		it(`make the exchangeRate grow to test with high number`, async () => {
			await setBorrowablesTimestamp(borrowables, 3600 * 24 * 400);
			const reallocateReceipt = await vault.reallocate({from: reallocateManager});
			console.log("AFTER 400 DAYS AND REALLOCATE - gas used:", reallocateReceipt.receipt.gasUsed);
			await printSnapshot(vault, borrowables);
		});
		
		it(`make the exchangeRate grow to test with high number`, async () => {
			await vault.transfer(vault.address, bnMantissa(0.0001), {from: user});
			const redeemReceipt = await vault.redeem(user);
			console.log("REDEEM - gas used:", redeemReceipt.receipt.gasUsed);
			await printSnapshot(vault, borrowables);
		});
		
		it(`make the exchangeRate grow to test with high number`, async () => {
			await setBorrowablesTimestamp(borrowables, 3600 * 24 * 405);
			await token.mint(user, oneMantissa.mul(BN(200000)));
			await token.transfer(vault.address, oneMantissa.mul(BN(200000)), {from: user});
			const mintReceipt = await vault.mint(user);
			console.log("AFTER 405 DAYS AND MINT - gas used:", mintReceipt.receipt.gasUsed);
			await printSnapshot(vault, borrowables);
		});
		
		it(`make the exchangeRate grow to test with high number`, async () => {
			await setBorrowablesTimestamp(borrowables, 3600 * 24 * 410);
			await token.mint(user, oneMantissa.mul(BN(1000000)));
			await token.transfer(vault.address, oneMantissa.mul(BN(1000000)), {from: user});
			const mintReceipt = await vault.mint(user);
			console.log("AFTER 410 DAYS AND MINT - gas used:", mintReceipt.receipt.gasUsed);
			await printSnapshot(vault, borrowables);
		});
		
		it(`make the exchangeRate grow to test with high number`, async () => {
			await setBorrowablesTimestamp(borrowables, 3600 * 24 * 415);
			await borrowables[4].simulateBorrowBurningTokens(oneMantissa.mul(BN(200000)));
			await vault.transfer(vault.address, oneMantissa.mul(BN(50)), {from: user});
			const redeemReceipt = await vault.redeem(user);
			console.log("415 DAYS BORROW AND REDEEM - gas used:", redeemReceipt.receipt.gasUsed);
			await printSnapshot(vault, borrowables);
		});
		
		it(`make the exchangeRate grow to test with high number`, async () => {
			const availableLiquidity = await lendingVaultWatcher.getAvailableLiquidity.call(vault.address);
			const exchangeRate = await vault.exchangeRate.call();
			const availableTokens = availableLiquidity.mul(oneMantissa).div(exchangeRate);
			console.log("availableLiquidity", availableLiquidity / 1e18);
			await vault.transfer(vault.address, availableTokens, {from: user});
			const redeemReceipt = await vault.redeem(user);
			console.log("REDEEM ALL AVAILABLE LIQUIDITY - gas used:", redeemReceipt.receipt.gasUsed);
			await printSnapshot(vault, borrowables);
		});
		
		it(`revert with insufficient liquidity`, async () => {
			await vault.transfer(vault.address, oneMantissa.mul(BN(100)), {from: user});
			await expectRevert(vault.redeem(user), 'LendingVaultV2: INSUFFICIENT_LIQUIDITY');
		});
	
	});
	

	describe('test unwinding', () => {
		let token;
		
		it(`test unwinding`, async () => {
			token = await makeErc20Token();
			const borrowables = await makeBorrowables(token, 4);
			const factory = await makeFactory({admin, reservesAdmin});
			//await factory._setReallocateManager(reallocateManager, {from: admin});
			const vaultAddress = await factory.createVault.call(token.address, "", "");
			await factory.createVault(token.address, "", "");
			const vault = await LendingVaultV2.at(vaultAddress);
			
			// initialize
			for(let i = 0; i < borrowables.length; i++) {
				await vault.addBorrowable(borrowables[i].address, {from: admin});
				await borrowables[i].simulateBorrow(oneMantissa.mul(BN(300)));
			}
			await token.mint(user, oneMantissa.mul(BN(400)));
			await token.transfer(vault.address, oneMantissa.mul(BN(400)), {from: user});
			await vault.mint(user);
			console.log("INITIAL STATE");
			await printSnapshot(vault, borrowables);
			
			// disable and unwind
			await setBorrowablesTimestamp(borrowables, 3600 * 24 * 3);
			await vault.disableBorrowable(borrowables[1].address, {from: admin});
			await vault.unwindBorrowable(borrowables[1].address, {from: admin});
			console.log("AFTER UNWIND");
			await printSnapshot(vault, borrowables);
			await vault.reallocate({from: reallocateManager});
			console.log("AFTER REALLOCATE");
			await printSnapshot(vault, borrowables);
			
			// do mint to have enough liqudity to unwind all
			await token.mint(user, oneMantissa.mul(BN(10)));
			await token.transfer(borrowables[1].address, oneMantissa.mul(BN(10)), {from: user});
			await borrowables[1].mint(user);
			await vault.unwindBorrowable(borrowables[1].address, {from: admin});
			console.log("AFTER UNWIND 100%");
			await printSnapshot(vault, borrowables);
			console.log("borrowablesLength0", await vault.getBorrowablesLength() * 1);
			await vault.removeBorrowable(borrowables[1].address, {from: admin});
			console.log("borrowablesLength1", await vault.getBorrowablesLength() * 1);
			await vault.reallocate({from: reallocateManager});
			console.log("AFTER REALLOCATE");
			await printSnapshot(vault, borrowables);
		});
	});
	

	describe('test flashAllocate', () => {
		let token;
		let borrowables;
		let factory;
		let vault;
		let flashAllocator;
		
		beforeEach(async () => {
			factory = await makeFactory({admin, reservesAdmin});
			flashAllocator = await FlashAllocatePoC.new();
			token = await makeErc20Token();
			borrowables = await makeBorrowables(token, 2);
			const vaultAddress = await factory.createVault.call(token.address, "", "");
			await factory.createVault(token.address, "", "");
			vault = await LendingVaultV2.at(vaultAddress);
		});
				
		it(`test initial checks`, async () => {
			for(let i = 0; i < borrowables.length; i++) {
				await vault.addBorrowable(borrowables[i].address, {from: admin});
			}
			await vault.disableBorrowable(borrowables[0].address, {from: admin});
			await vault.disableBorrowable(borrowables[1].address, {from: admin});
			await vault.removeBorrowable(borrowables[0].address, {from: admin});
			await expectRevert(flashAllocator.executeFlashAllocate(vault.address, borrowables[0].address, bnMantissa(1)), "LendingVaultV2: BORROWABLE_DOESNT_EXISTS");
			await expectRevert(flashAllocator.executeFlashAllocate(vault.address, borrowables[1].address, bnMantissa(1)), "LendingVaultV2: BORROWABLE_DISABLED");
		});
		
		it(`(almost) all available liquidity can be flash allocated under normal conditions`, async () => {
			// initialize
			for(let i = 0; i < borrowables.length; i++) {
				await vault.addBorrowable(borrowables[i].address, {from: admin});
				await borrowables[i].simulateBorrow(oneMantissa.mul(BN(300)));
			}
			await token.mint(user, oneMantissa.mul(BN(400)));
			await token.transfer(vault.address, oneMantissa.mul(BN(400)), {from: user});
			await vault.mint(user);
			console.log("INITIAL STATE");
			await printSnapshot(vault, borrowables);
			
			// disable and unwind
			await flashAllocator.executeFlashAllocate(vault.address, borrowables[0].address, bnMantissa(399));
			console.log("AFTER EXECUTE");
			await printSnapshot(vault, borrowables);
		});
		
		it(`flash allocate reverts if inconvenient`, async () => {
			// initialize
			for(let i = 0; i < borrowables.length; i++) {
				await vault.addBorrowable(borrowables[i].address, {from: admin});
				await borrowables[i].simulateBorrow(oneMantissa.mul(BN(300)));
			}
			await token.mint(user, oneMantissa.mul(BN(400)));
			await token.transfer(vault.address, oneMantissa.mul(BN(400)), {from: user});
			await vault.mint(user);
			await borrowables[1].simulateBorrow(oneMantissa.mul(BN(3000)));
			await setBorrowablesTimestamp(borrowables, 3600 * 24 * 2);
			console.log("INITIAL STATE");
			await printSnapshot(vault, borrowables);
			
			// disable and unwind
			await expectRevert(flashAllocator.executeFlashAllocate(vault.address, borrowables[0].address, bnMantissa(1)), "LendingVaultV2: INCONVENIENT_REALLOCATION");
			await flashAllocator.executeFlashAllocate(vault.address, borrowables[1].address, bnMantissa(1));
		});
	});
});