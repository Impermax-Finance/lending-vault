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


contract('BorrowableObject', function (accounts) {
	let root = accounts[0];
	let user = accounts[1];
	let vault;
	let borrowable;

	
	describe('allocate and deallocate', () => {
		const INITIAL_OWNED_SUPPLY = oneMantissa.mul(BN(2));

		before(async () => {
			vault = await makeLendingVaultHarness();
			borrowable = await makeBorrowable({token: vault.obj.token});
			await vault.obj.token.mint(user, oneMantissa.mul(BN(1000)));
			await vault.obj.token.transfer(borrowable.address, oneMantissa.mul(BN(10)), {from: user});
			await borrowable.mint(user);
			await borrowable.simulateBorrow(oneMantissa.mul(BN(40)));
			await borrowable.setBlockTimestamp(3600 * 24 * 5);
			await vault.obj.token.transfer(vault.address, INITIAL_OWNED_SUPPLY, {from: user});
			await vault.allocate(borrowable.address, INITIAL_OWNED_SUPPLY);
		});
		
		it('check borrowable object initialization', async () => {
			const {
				externalSupply,
				initialOwnedSupply,
				ownedSupply,
				totalSupply,
				utilizationRate,
				kinkAPR,
				cachedSupplyAPR
			} = await vault.getBorrowableInfo.call(borrowable.address);
			const totalBorrows = await borrowable.totalBorrows();
			expectAlmostEqualMantissa(initialOwnedSupply, INITIAL_OWNED_SUPPLY);
			expectAlmostEqualMantissa(ownedSupply, INITIAL_OWNED_SUPPLY);
			expectAlmostEqualMantissa(totalSupply, ownedSupply.add(externalSupply).add(totalBorrows));
			console.log("totalSupply", totalSupply / 1e18);
			console.log("utilizationRate", utilizationRate / 1e18);
			console.log("kinkAPR", kinkAPR / 1e18 * 365 * 24 * 3600);
			console.log("cachedSupplyAPR", cachedSupplyAPR / 1e18 * 365 * 24 * 3600);
		});
	});
	
});