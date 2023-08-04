const {
	makeErc20Token,
	makeBorrowable,
	makeBorrowables,
	LendingVaultV1Factory,
	LendingVaultV1,
} = require('./Utils/Impermax');
const {
	expectAlmostEqualMantissa,
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

const oneMantissa = (new BN(10)).pow(new BN(18));
const K_TRACKER = (new BN(2)).pow(new BN(128));
const INITIAL_EXCHANGE_RATE = oneMantissa;

function slightlyIncrease(bn) {
	return bn.mul( bnMantissa(1.00001) ).div( oneMantissa );
}
function slightlyDecrease(bn) {
	return bn.mul( oneMantissa ).div( bnMantissa(1.00001) );
}
async function printSnapshot(vault, borrowables) {
	/*const exchangeRate = await vault.exchangeRate.call() / 1e18;
	const totalSupply = await vault.totalSupply() / 1e18;
	const underlyingBalance = totalSupply * exchangeRate;
	console.log("Vault data");
	console.log("exchangeRate", exchangeRate);
	console.log("calculated underlyingBalance", underlyingBalance);
	console.log();
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
	console.log();*/
}

//TODO add expect

contract('LendingVaultV1', function (accounts) {
	let root = accounts[0];
	let user = accounts[1];
	let admin = accounts[2];		
	let borrower = accounts[3];		
	let receiver = accounts[4];		
	let reservesManager = accounts[5];		
	let reservesAdmin = accounts[6];	
	let reallocateManager = accounts[7];

	describe('main', () => {
		let token;
		
		it(`preliminarary test`, async () => {
			token = await makeErc20Token();
			const borrowable1 = await makeBorrowable({token});
			const borrowable2 = await makeBorrowable({token});
			const borrowable3 = await makeBorrowable({token});
			const borrowable4 = await makeBorrowable({token});
			const factory = await LendingVaultV1Factory.new(admin, reservesAdmin);
			//await factory._setReallocateManager(reallocateManager, {from: admin});
			const vaultAddress = await factory.createVault.call(token.address, "", "");
			await factory.createVault(token.address, "", "");
			const vault = await LendingVaultV1.at(vaultAddress);
			
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
		
		it(`test first scenario, reallocate and APRs convergence`, async () => {
			token = await makeErc20Token();
			const borrowables = await makeBorrowables(token, 6);
			const factory = await LendingVaultV1Factory.new(admin, reservesAdmin);
			//await factory._setReallocateManager(reallocateManager, {from: admin});
			const vaultAddress = await factory.createVault.call(token.address, "", "");
			await factory.createVault(token.address, "", "");
			const vault = await LendingVaultV1.at(vaultAddress);
			
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
			await vault.reallocate({from: reallocateManager});
			console.log("AFTER REALLOCATE");
			await printSnapshot(vault, borrowables);
			
			// wait some time
			for(let i = 0; i < borrowables.length; i++) {
				await borrowables[i].setBlockTimestamp(3600 * 24 * 5);
			}
			console.log("AFTER 5 DAYS");
			await printSnapshot(vault, borrowables);
			
			// increase APR of borrowable 4
			await borrowables[4].simulateBorrow(oneMantissa.mul(BN(600)));
			for(let i = 0; i < borrowables.length; i++) {
				await borrowables[i].setBlockTimestamp(3600 * 24 * 10);
			}
			console.log("AFTER 10 DAYS");
			await printSnapshot(vault, borrowables);
			await vault.reallocate({from: reallocateManager});
			console.log("AFTER REALLOCATE");
			await printSnapshot(vault, borrowables);
			
			// increase APR of borrowable 1
			await borrowables[1].simulateBorrow(oneMantissa.mul(BN(1500)));
			for(let i = 0; i < borrowables.length; i++) {
				await borrowables[i].setBlockTimestamp(3600 * 24 * 13);
			}
			console.log("AFTER 13 DAYS");
			await printSnapshot(vault, borrowables);
			await vault.reallocate({from: reallocateManager});
			console.log("AFTER REALLOCATE");
			await printSnapshot(vault, borrowables);
			
			for(let i = 0; i < borrowables.length; i++) {
				await borrowables[i].setBlockTimestamp(3600 * 24 * 16);
			}
			await token.mint(user, oneMantissa.mul(BN(600)));
			await token.transfer(vault.address, oneMantissa.mul(BN(600)), {from: user});
			await vault.mint(user);
			console.log("AFTER 16 DAYS AND MINT");
			await printSnapshot(vault, borrowables);
			
			for(let i = 0; i < borrowables.length; i++) {
				await borrowables[i].setBlockTimestamp(3600 * 24 * 19);
			}
			await vault.reallocate({from: reallocateManager});
			console.log("AFTER 19 DAYS AND REALLOCATE");
			await printSnapshot(vault, borrowables);
			
			for(let i = 0; i < borrowables.length; i++) {
				await borrowables[i].setBlockTimestamp(3600 * 24 * 22);
			}
			await vault.reallocate({from: reallocateManager});
			console.log("AFTER 22 DAYS AND REALLOCATE");
			await printSnapshot(vault, borrowables);
			
			// redeem
			for(let i = 0; i < borrowables.length; i++) {
				await borrowables[i].setBlockTimestamp(3600 * 24 * 24);
			}
			await vault.transfer(vault.address, oneMantissa.mul(BN(900)), {from: user});
			await vault.redeem(user);
			console.log("user balance:", await token.balanceOf(user) / 1e18); 
			console.log("AFTER 24 DAYS AND REDEEM");
			await printSnapshot(vault, borrowables);
			
			// borrow and redeem
			await borrowables[4].simulateBorrowBurningTokens(oneMantissa.mul(BN(80)));
			await vault.transfer(vault.address, oneMantissa.mul(BN(150)), {from: user});
			await vault.redeem(user);
			console.log("AFTER BORROW AND REDEEM WITH LOCKED LIQUIDITY");
			await printSnapshot(vault, borrowables);
			
			await vault.transfer(vault.address, oneMantissa.mul(BN(100)), {from: user});
			await expectRevert(vault.redeem(user), 'LendingVaultV1: INSUFFICIENT_LIQUIDITY');
		});
		
		it(`test unwinding`, async () => {
			token = await makeErc20Token();
			const borrowables = await makeBorrowables(token, 4);
			const factory = await LendingVaultV1Factory.new(admin, reservesAdmin);
			//await factory._setReallocateManager(reallocateManager, {from: admin});
			const vaultAddress = await factory.createVault.call(token.address, "", "");
			await factory.createVault(token.address, "", "");
			const vault = await LendingVaultV1.at(vaultAddress);
			
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
			for(let i = 0; i < borrowables.length; i++) {
				await borrowables[i].setBlockTimestamp(3600 * 24 * 3);
			}
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
});