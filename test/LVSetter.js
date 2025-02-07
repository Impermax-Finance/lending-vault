const {
	makeLendingVault,
	makeBorrowable,
} = require('./Utils/Impermax');
const {
	expectEqual,
	expectAlmostEqualMantissa,
	expectRevert,
	expectEvent,
	bnMantissa,
	BN,
} = require('./Utils/JS');
const {
	address,
} = require('./Utils/Ethereum');
const { keccak256, toUtf8Bytes } = require('ethers/utils');


const oneMantissa = (new BN(10)).pow(new BN(18));
const TEST_AMOUNT = bnMantissa(100);
const MAX_UINT_256 = (new BN(2)).pow(new BN(256)).sub(new BN(1));
const RESERVE_FACTOR_TEST = bnMantissa(0.15);
const RESERVE_FACTOR_MAX = bnMantissa(0.9);

function slightlyIncrease(bn) {
	return bn.mul( bnMantissa(1.0001) ).div( oneMantissa );
}
function slightlyDecrease(bn) {
	return bn.mul( oneMantissa ).div( bnMantissa(1.0001) );
}


contract('LVSetter', function (accounts) {
	let root = accounts[0];
	let user = accounts[1];
	let admin = accounts[2];
	let robber = accounts[3];
	let vault;
	let borrowable0;
	let borrowable1;
	let borrowableDiffentUnderlying;
	

	describe('main', () => {
		before(async () => {
			vault = await makeLendingVault({admin});
			borrowable0 = await makeBorrowable({token: vault.obj.token});
			borrowable1 = await makeBorrowable({token: vault.obj.token});
			borrowableDiffentUnderlying = await makeBorrowable();
		});
		
		it('initialization check', async () => {
			const reserveFactor = bnMantissa(0);
			expectAlmostEqualMantissa(await vault.reserveFactor(), reserveFactor);
			expectEqual(await vault.getBorrowablesLength(), BN(0));
			expectEqual(await vault.exchangeRate.call(), await vault.exchangeRateLast());
		});

		it('permissions check', async () => {
			expect(await vault.obj.factory.admin()).to.eq(admin);
			await vault._setReserveFactor(RESERVE_FACTOR_TEST, {from: admin});
			await expectRevert(vault._setReserveFactor(RESERVE_FACTOR_TEST, {from: user}), 'LendingVaultV1: UNAUTHORIZED');
			await expectRevert(vault.addBorrowable(address(0), {from: user}), 'LendingVaultV1: UNAUTHORIZED');
			await expectRevert(vault.removeBorrowable(address(0), {from: user}), 'LendingVaultV1: UNAUTHORIZED');
			await expectRevert(vault.disableBorrowable(address(0), {from: user}), 'LendingVaultV1: UNAUTHORIZED');
			await expectRevert(vault.enableBorrowable(address(0), {from: user}), 'LendingVaultV1: UNAUTHORIZED');
			await expectRevert(vault.unwindBorrowable(address(0), {from: user}), 'LendingVaultV1: UNAUTHORIZED');
		});

		it('set reserve factor', async () => {
			const receipt = await vault._setReserveFactor(RESERVE_FACTOR_TEST, {from: admin});
			expectEvent(receipt, 'NewReserveFactor', {});
			expectEqual(await vault.reserveFactor(), RESERVE_FACTOR_TEST);
		});

		it('reserve factor boundaries', async () => {
			const succeedMin = BN(0);
			const succeedMax = slightlyDecrease(RESERVE_FACTOR_MAX);
			const failMax = slightlyIncrease(RESERVE_FACTOR_MAX);
			await vault._setReserveFactor(succeedMin, {from: admin});
			expectEqual(await vault.reserveFactor(), succeedMin);
			await vault._setReserveFactor(succeedMax, {from: admin});
			expectEqual(await vault.reserveFactor(), succeedMax);
			await expectRevert(vault._setReserveFactor(failMax, {from: admin}), 'LendingVaultV1: INVALID_SETTING');
		});

		it('add borrowable 0', async () => {
			const receipt = await vault.addBorrowable(borrowable0.address, {from: admin});
			expectEvent(receipt, 'AddBorrowable', {borrowable: borrowable0.address});
			expectEqual(await vault.getBorrowablesLength(), BN(1));
			const borrowableAddress = await vault.borrowables(0);
			expectEqual(borrowableAddress, borrowable0.address);
			const borrowableInfo = await vault.borrowableInfo(borrowable0.address);
			expectEqual(borrowableInfo.exists ? 1 : 0, 1);
			expectEqual(borrowableInfo.enabled ? 1 : 0, 1);
		});

		it('add borrowable 1', async () => {
			await vault.addBorrowable(borrowable1.address, {from: admin});
			expectEqual(await vault.getBorrowablesLength(), BN(2));
			const borrowableAddress = await vault.borrowables(1);
			expectEqual(borrowableAddress, borrowable1.address);
			const borrowableInfo = await vault.borrowableInfo(borrowable1.address);
			expectEqual(borrowableInfo.exists ? 1 : 0, 1);
			expectEqual(borrowableInfo.enabled ? 1 : 0, 1);
		});

		it('add borrowable reverts', async () => {
			await expectRevert(vault.addBorrowable(address(0), {from: user}), 'LendingVaultV1: UNAUTHORIZED');
			await expectRevert(
				vault.addBorrowable(borrowableDiffentUnderlying.address, {from: admin}), 
				'LendingVaultV1: INVALID_UNDERLYING'
			);
			await expectRevert(
				vault.addBorrowable(borrowable0.address, {from: admin}), 
				'LendingVaultV1: BORROWABLE_EXISTS'
			);
		});

		it('disable borrowable 0', async () => {
			const receipt = await vault.disableBorrowable(borrowable0.address, {from: admin});
			expectEvent(receipt, 'DisableBorrowable', {borrowable: borrowable0.address});
			expectEqual(await vault.getBorrowablesLength(), BN(2));
			const borrowableAddress = await vault.borrowables(0);
			expectEqual(borrowableAddress, borrowable0.address);
			const borrowableInfo = await vault.borrowableInfo(borrowable0.address);
			expectEqual(borrowableInfo.exists ? 1 : 0, 1);
			expectEqual(borrowableInfo.enabled ? 1 : 0, 0);
		});

		it('disable borrowable reverts', async () => {
			await expectRevert(vault.disableBorrowable(address(0), {from: user}), 'LendingVaultV1: UNAUTHORIZED');
			await expectRevert(
				vault.disableBorrowable(borrowableDiffentUnderlying.address, {from: admin}), 
				'LendingVaultV1: BORROWABLE_DOESNT_EXISTS'
			);
			await expectRevert(
				vault.disableBorrowable(borrowable0.address, {from: admin}), 
				'LendingVaultV1: BORROWABLE_DISABLED'
			);
		});

		it('enable borrowable 0', async () => {
			const receipt = await vault.enableBorrowable(borrowable0.address, {from: admin});
			expectEvent(receipt, 'EnableBorrowable', {borrowable: borrowable0.address});
			expectEqual(await vault.getBorrowablesLength(), BN(2));
			const borrowableAddress = await vault.borrowables(0);
			expectEqual(borrowableAddress, borrowable0.address);
			const borrowableInfo = await vault.borrowableInfo(borrowable0.address);
			expectEqual(borrowableInfo.exists ? 1 : 0, 1);
			expectEqual(borrowableInfo.enabled ? 1 : 0, 1);
		});

		it('enable borrowable reverts', async () => {
			await expectRevert(vault.enableBorrowable(address(0), {from: user}), 'LendingVaultV1: UNAUTHORIZED');
			await expectRevert(
				vault.enableBorrowable(borrowableDiffentUnderlying.address, {from: admin}), 
				'LendingVaultV1: BORROWABLE_DOESNT_EXISTS'
			);
			await expectRevert(
				vault.enableBorrowable(borrowable1.address, {from: admin}), 
				'LendingVaultV1: BORROWABLE_ENABLED'
			);
		});

		it('remove borrowable reverts', async () => {
			await expectRevert(vault.removeBorrowable(address(0), {from: user}), 'LendingVaultV1: UNAUTHORIZED');
			await expectRevert(
				vault.removeBorrowable(borrowableDiffentUnderlying.address, {from: admin}), 
				'LendingVaultV1: BORROWABLE_DOESNT_EXISTS'
			);
			await expectRevert(
				vault.removeBorrowable(borrowable1.address, {from: admin}), 
				'LendingVaultV1: BORROWABLE_ENABLED'
			);
		});

		it('remove borrowable 0 empty', async () => {
			await vault.disableBorrowable(borrowable0.address, {from: admin});
			const receipt = await vault.removeBorrowable(borrowable0.address, {from: admin});
			expectEvent(receipt, 'RemoveBorrowable', {borrowable: borrowable0.address});
			expectEqual(await vault.getBorrowablesLength(), BN(1));
			const borrowableAddress = await vault.borrowables(0);
			expectEqual(borrowableAddress, borrowable1.address);
			const borrowableInfo = await vault.borrowableInfo(borrowable0.address);
			expectEqual(borrowableInfo.exists ? 1 : 0, 0);
			expectEqual(borrowableInfo.enabled ? 1 : 0, 0);
		});

		it('remove and add', async () => {
			await vault.disableBorrowable(borrowable1.address, {from: admin});
			await vault.removeBorrowable(borrowable1.address, {from: admin});
			expectEqual(await vault.getBorrowablesLength(), BN(0));
			await vault.addBorrowable(borrowable0.address, {from: admin});
			await vault.addBorrowable(borrowable1.address, {from: admin});
		});

		it('remove not empty', async () => {
			await borrowable0.simulateBorrow(oneMantissa.mul(BN(300)));
			await borrowable1.simulateBorrow(oneMantissa.mul(BN(300)));
			await vault.obj.token.mint(user, oneMantissa.mul(BN(200)));
			await vault.obj.token.transfer(vault.address, oneMantissa.mul(BN(200)), {from: user});
			await vault.mint(user);
			await vault.disableBorrowable(borrowable1.address, {from: admin});
			await expectRevert(
				vault.removeBorrowable(borrowable1.address, {from: admin}), 
				'LendingVaultV1: NOT_EMPTY'
			);
			await vault.enableBorrowable(borrowable1.address, {from: admin});
		});

		it('solution: disable, unwind, remove', async () => {
			await vault.disableBorrowable(borrowable1.address, {from: admin});
			await expectRevert(
				vault.removeBorrowable(borrowable1.address, {from: admin}), 
				'LendingVaultV1: NOT_EMPTY'
			);
			await vault.unwindBorrowable(borrowable1.address, {from: admin});
			await vault.removeBorrowable(borrowable1.address, {from: admin});
		});

		it('unwind borrowable reverts', async () => {
			await expectRevert(vault.unwindBorrowable(address(0), {from: user}), 'LendingVaultV1: UNAUTHORIZED');
			await expectRevert(
				vault.unwindBorrowable(borrowable1.address, {from: admin}), 
				'LendingVaultV1: BORROWABLE_DOESNT_EXISTS'
			);
			await expectRevert(
				vault.unwindBorrowable(borrowable0.address, {from: admin}), 
				'LendingVaultV1: BORROWABLE_ENABLED'
			);
		});

		it('unwind borrowable 0 liquid', async () => {
			await vault.disableBorrowable(borrowable0.address, {from: admin});
			// exchangeRate must be 1
			const underlyingBalance = await borrowable0.balanceOf(vault.address);
			const actualRedeemAmount = underlyingBalance;
			expectEqual(underlyingBalance, oneMantissa.mul(BN(100)));
			const receipt = await vault.unwindBorrowable(borrowable0.address, {from: admin});
			expectEvent(receipt, 'UnwindBorrowable', {borrowable: borrowable0.address, underlyingBalance, actualRedeemAmount});
			expectEqual(await borrowable0.balanceOf(vault.address), BN(0));
			await expectRevert(
				vault.unwindBorrowable(borrowable0.address, {from: admin}), 
				'LendingVaultV1: ZERO_AMOUNT'
			);
		});

		it('unwind borrowable 0 illiquid', async () => {
			await vault.enableBorrowable(borrowable0.address, {from: admin});
			await vault.reallocate();
			// exchangeRate must be 1
			const underlyingBalance = await borrowable0.balanceOf(vault.address);
			const lockedAmount = underlyingBalance.div(BN(2));
			const actualRedeemAmount = underlyingBalance.sub(lockedAmount);
			expectEqual(actualRedeemAmount, oneMantissa.mul(BN(100)));
			await borrowable0.simulateBorrowBurningTokens(lockedAmount);
			await vault.disableBorrowable(borrowable0.address, {from: admin});
			const receipt = await vault.unwindBorrowable(borrowable0.address, {from: admin});
			expectEvent(receipt, 'UnwindBorrowable', {borrowable: borrowable0.address, underlyingBalance, actualRedeemAmount});
			expectEqual(await borrowable0.balanceOf(vault.address), lockedAmount);
		});

		it('deposit in borrowable 0, unwind and remove', async () => {
			await vault.obj.token.mint(user, oneMantissa.mul(BN(100)));
			await vault.obj.token.transfer(borrowable0.address, oneMantissa.mul(BN(100)), {from: user});
			await borrowable0.mint(user);
			await vault.unwindBorrowable(borrowable0.address, {from: admin});
			expectEqual(await borrowable0.balanceOf(vault.address), BN(0));
			await vault.removeBorrowable(borrowable0.address, {from: admin});
		});

		it('after unwind the balance cant be stolen', async () => {
			const initialVaultBalance = await vault.obj.token.balanceOf(vault.address);
			await vault.skim(robber);
			const vaultBalance = await vault.obj.token.balanceOf(vault.address);
			expectEqual(initialVaultBalance, vaultBalance);
			await expectRevert(vault.mint(robber), "LendingVaultV1: MINT_AMOUNT_ZERO");
		});
	});
	
	describe('unwind edge cases (high exchange rate)', () => {
		const AMOUNT = oneMantissa.mul(BN(100));
		beforeEach(async () => {
			vault = await makeLendingVault({admin});
			borrowable0 = await makeBorrowable({token: vault.obj.token});
			await vault.addBorrowable(borrowable0.address, {from: admin});
			await vault.obj.token.mint(user, AMOUNT);
			await vault.obj.token.transfer(vault.address, AMOUNT, {from: user});
			await vault.mint(user);
			await borrowable0.simulateBorrow(AMOUNT.mul(BN(3)));
		});

		it('unwind to zero - amount * 1e18 % exchangeRate == 0', async () => {
			const exchangeRate = await borrowable0.exchangeRate.call();
			const tokens = await borrowable0.balanceOf(vault.address);
			const redeemAmount = tokens.mul(exchangeRate).div(oneMantissa);
			assert.ok(redeemAmount.mul(oneMantissa).mod(exchangeRate).eq(BN(0)), "Mod is not 0");
			await vault.disableBorrowable(borrowable0.address, {from: admin});
			await vault.unwindBorrowable(borrowable0.address, {from: admin});
			expectEqual(await borrowable0.balanceOf(vault.address), BN(0));
		});

		it('unwind to zero - amount * 1e18 % exchangeRate != 0', async () => {
			await borrowable0.setBlockTimestamp(4000000000);
			const exchangeRate = await borrowable0.exchangeRate.call();
			const tokens = await borrowable0.balanceOf(vault.address);
			const redeemAmount = tokens.mul(exchangeRate).div(oneMantissa);
			assert.ok(redeemAmount.mul(oneMantissa).mod(exchangeRate).gt(BN(0)), "Mod is 0");
			await vault.obj.token.mint(user, AMOUNT.mul(BN(100)));
			await vault.obj.token.transfer(borrowable0.address, AMOUNT.mul(BN(100)), {from: user});
			await borrowable0.mint(user);
			await vault.disableBorrowable(borrowable0.address, {from: admin});
			await vault.unwindBorrowable(borrowable0.address, {from: admin});
			expectEqual(await borrowable0.balanceOf(vault.address), BN(0));
		});

		it('unwind available liquidity - amount * 1e18 % exchangeRate == 0', async () => {
			await borrowable0.simulateBorrowBurningTokens(AMOUNT.div(BN(2)));
			const exchangeRate = await borrowable0.exchangeRate.call();
			const redeemAmount = await vault.obj.token.balanceOf(borrowable0.address);
			assert.ok(redeemAmount.mul(oneMantissa).mod(exchangeRate).eq(BN(0)), "Mod is not 0");
			await vault.disableBorrowable(borrowable0.address, {from: admin});
			await vault.unwindBorrowable(borrowable0.address, {from: admin});
			expectEqual(await vault.obj.token.balanceOf(borrowable0.address), BN(0));
		});

		it('unwind available liquidity - unobtainable amount', async () => {
			await borrowable0.setBlockTimestamp(4000000000);
			const exchangeRate = await borrowable0.exchangeRate.call();
			const availableAmount = await vault.obj.token.balanceOf(borrowable0.address);
			const redeemTokens = availableAmount.mul(oneMantissa).div(exchangeRate);
			const redeemTokens2 = redeemTokens.add(BN(1));
			const initialTokens = await borrowable0.balanceOf(vault.address);
			//console.log(availableAmount.mul(oneMantissa).mod(exchangeRate) * 1);
			//console.log(availableAmount.toString());
			//console.log(redeemTokens.mul(exchangeRate).div(oneMantissa).toString());
			//console.log(redeemTokens2.mul(exchangeRate).div(oneMantissa).toString());
			assert.ok(availableAmount.mul(oneMantissa).mod(exchangeRate).gt(BN(0)), "Mod is 0");
			assert.ok(redeemTokens.mul(exchangeRate).div(oneMantissa).lt(availableAmount), "Not less than availableAmount");
			assert.ok(redeemTokens2.mul(exchangeRate).div(oneMantissa).gt(availableAmount), "Not greater than availableAmount");
			await vault.disableBorrowable(borrowable0.address, {from: admin});
			await vault.unwindBorrowable(borrowable0.address, {from: admin});
			expectEqual(await borrowable0.balanceOf(vault.address), initialTokens.sub(redeemTokens));
			assert.ok((await vault.obj.token.balanceOf(borrowable0.address)).gt(BN(0)), "Final balance is 0");
		});
	});
});