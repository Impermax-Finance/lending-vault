const {
	makeLendingVaultHarness,
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


const oneMantissa = (new BN(10)).pow(new BN(18));
const MAX_UINT_256 = (new BN(2)).pow(new BN(256)).sub(new BN(1));


contract('LVAllocator', function (accounts) {
	let root = accounts[0];
	let user = accounts[1];
	let vault;
	let borrowable;

	
	describe('allocate and deallocate', () => {

		before(async () => {
			vault = await makeLendingVaultHarness();
			borrowable = await makeBorrowable({token: vault.obj.token});
			await vault.obj.token.mint(user, oneMantissa.mul(BN(1000)));
			await vault.obj.token.transfer(borrowable.address, oneMantissa.mul(BN(1)), {from: user});
			// initialize borrowable
			await borrowable.mint(user);
			await borrowable.simulateBorrow(oneMantissa.mul(BN(1)));
			await borrowable.setBlockTimestamp(4000000000);
		});
		
		it('allocate', async () => {
			const mintAmount = oneMantissa.mul(BN(100));
			const exchangeRate = await borrowable.exchangeRate.call();
			const mintTokens = mintAmount.mul(oneMantissa).div(exchangeRate);
			
			await vault.obj.token.transfer(vault.address, mintAmount, {from: user});
			expectEqual(await vault.allocate.call(borrowable.address, mintAmount), mintTokens);
			const receipt = await vault.allocate(borrowable.address, mintAmount);
			
			expectEvent(receipt, "AllocateIntoBorrowable", {
				borrowable: borrowable.address, 
				mintAmount, 
				mintTokens
			});
			expectEvent(receipt, "Mint", {
				sender: vault.address, 
				minter: vault.address, 
				mintAmount, 
				mintTokens
			});
		});
		
		it('deallocate', async () => {
			const redeemTokens = oneMantissa.mul(BN(1));
			const exchangeRate = await borrowable.exchangeRate.call();
			const redeemAmount = redeemTokens.mul(exchangeRate).div(oneMantissa);
			
			expectEqual(await vault.deallocate.call(borrowable.address, redeemTokens), redeemAmount);
			const receipt = await vault.deallocate(borrowable.address, redeemTokens);
			
			expectEvent(receipt, "DeallocateFromBorrowable", {
				borrowable: borrowable.address, 
				redeemAmount, 
				redeemTokens
			});
			expectEvent(receipt, "Redeem", {
				sender: vault.address, 
				redeemer: vault.address, 
				redeemAmount, 
				redeemTokens
			});
		});
	});
	
	describe('deallocate math', () => {

		before(async () => {
			vault = await makeLendingVaultHarness();
		});
		
		[
			{ redeemTokens: oneMantissa,					exchangeRate: oneMantissa },
			{ redeemTokens: bnMantissa(15.3538458),			exchangeRate: oneMantissa },
			{ redeemTokens: bnMantissa(0.00005493),			exchangeRate: oneMantissa },
			{ redeemTokens: bnMantissa(1487583.49),			exchangeRate: oneMantissa },
			{ redeemTokens: BN("7238974987389745343"),		exchangeRate: oneMantissa },
			{ redeemTokens: BN("43578"),					exchangeRate: oneMantissa },
			{ redeemTokens: BN("4958737475"),				exchangeRate: oneMantissa },
			{ redeemTokens: bnMantissa(15.3538458),			exchangeRate: BN("1238974987389745343") },
			{ redeemTokens: BN("723845697498738974534983"),	exchangeRate: BN("1072847347574965954") },
			{ redeemTokens: BN("2894877747375"),			exchangeRate: BN("1072847347574965954") },
			{ redeemTokens: BN("3247438957589475348976"),	exchangeRate: BN("1334785489674893745") },
			{ redeemTokens: BN("46777"),					exchangeRate: BN("1334785489674893745") },
			{ redeemTokens: BN("723897498738974534983"),	exchangeRate: BN("1432847347574965954") },
			{ redeemTokens: BN("4568876"),					exchangeRate: BN("1432847347574965954") },
			{ redeemTokens: BN("3723897498738974534983"),	exchangeRate: BN("1756767347574965957") },
			{ redeemTokens: BN("4829496584032039549"),		exchangeRate: BN("2432847347574959459") },
			{ redeemTokens: BN("1723897498738974534983"),	exchangeRate: BN("4432838958738945954") },
			{ redeemTokens: BN("987356984749759823479867"),	exchangeRate: BN("9432847347574965954") },
			{ redeemTokens: BN("17356984749759823479867"),	exchangeRate: BN("15876787476789675954") },
			{ redeemTokens: BN("9563569849759823479867"),	exchangeRate: BN("75483895845985768956") },
			{ redeemTokens: BN("9563569849759823479867"),	exchangeRate: BN("775483895845985768956") },
			{ redeemTokens: BN("9563569849759823479867"),	exchangeRate: BN("2575483895845985768956") },
			{ redeemTokens: BN("4389756894765974548757646"),exchangeRate: BN("154895576983476985678096") },
		].forEach((testCase) => {
			it(`calculate redeemTokens for ${JSON.stringify(testCase)} (obtainable amounts)`, async () => {
				const {redeemTokens, exchangeRate} = testCase;
				const redeemAmount = redeemTokens.mul(exchangeRate).div(oneMantissa);
				
				const redeemTokensForAtMost = await vault.tokensForAtMost(redeemAmount, exchangeRate);
				expectEqual(redeemTokensForAtMost, redeemTokens);
				
				const redeemTokensForAtLeast = await vault.tokensForAtLeast(redeemAmount, exchangeRate);
				expectEqual(redeemTokensForAtLeast, redeemTokens);
			});
		});
		
		[
			{ redeemAmount: oneMantissa,					exchangeRate: oneMantissa },
			{ redeemAmount: bnMantissa(15.3538458),			exchangeRate: oneMantissa },
			{ redeemAmount: bnMantissa(0.00005493),			exchangeRate: oneMantissa },
			{ redeemAmount: bnMantissa(1487583.49),			exchangeRate: oneMantissa },
			{ redeemAmount: BN("7238974987389745343"),		exchangeRate: oneMantissa },
			{ redeemAmount: BN("43578"),					exchangeRate: oneMantissa },
			{ redeemAmount: BN("4958737475"),				exchangeRate: oneMantissa },
			{ redeemAmount: bnMantissa(15.3538458),			exchangeRate: BN("1238974987389745343") },
			{ redeemAmount: BN("723845697498738974534983"),	exchangeRate: BN("1072847347574965954") },
			{ redeemAmount: BN("2894877747375"),			exchangeRate: BN("1072847347574965954") },
			{ redeemAmount: BN("3247438957589475348976"),	exchangeRate: BN("1334785489674893745") },
			{ redeemAmount: BN("46777"),					exchangeRate: BN("1334785489674893745") },
			{ redeemAmount: BN("723897498738974534983"),	exchangeRate: BN("1432847347574965954") },
			{ redeemAmount: BN("4568876"),					exchangeRate: BN("1432847347574965954") },
			{ redeemAmount: BN("3723897498738974534983"),	exchangeRate: BN("1756767347574965957") },
			{ redeemAmount: BN("4829496584032039549"),		exchangeRate: BN("2432847347574959459") },
			{ redeemAmount: BN("1723897498738974534983"),	exchangeRate: BN("4432838958738945954") },
			{ redeemAmount: BN("987356984749759823479867"),	exchangeRate: BN("9432847347574965954") },
			{ redeemAmount: BN("17356984749759823479867"),	exchangeRate: BN("15876787476789675954") },
			{ redeemAmount: BN("9563569849759823479867"),	exchangeRate: BN("75483895845985768956") },
			{ redeemAmount: BN("9563569849759823479867"),	exchangeRate: BN("775483895845985768956") },
			{ redeemAmount: BN("9563569849759823479867"),	exchangeRate: BN("2575483895845985768956") },
			{ redeemAmount: BN("4389756894765974548757646"),exchangeRate: BN("154895576983476985678096") },
		].forEach((testCase) => {
			it(`calculate redeemAmount for ${JSON.stringify(testCase)} (random amount)`, async () => {
				const {redeemAmount, exchangeRate} = testCase;
				
				const redeemTokensForAtMost = await vault.tokensForAtMost(redeemAmount, exchangeRate);
				const actualRedeemAmountForAtMost = redeemTokensForAtMost.mul(exchangeRate).div(oneMantissa);
				const nextRedeemAmountForAtMost = redeemTokensForAtMost.add(BN(1)).mul(exchangeRate).div(oneMantissa);
				assert.ok(actualRedeemAmountForAtMost.lte(redeemAmount));
				assert.ok(nextRedeemAmountForAtMost.gt(redeemAmount));
				
				const redeemTokensForAtLeast = await vault.tokensForAtLeast(redeemAmount, exchangeRate);
				const actualRedeemAmountForAtLeast = redeemTokensForAtLeast.mul(exchangeRate).div(oneMantissa);
				const nextRedeemAmountForAtLeast = redeemTokensForAtLeast.sub(BN(1)).mul(exchangeRate).div(oneMantissa);
				assert.ok(actualRedeemAmountForAtLeast.gte(redeemAmount));
				assert.ok(nextRedeemAmountForAtLeast.lt(redeemAmount));
			});
		});
	
	});
	
	describe('reallocate', () => {
	
	});
});