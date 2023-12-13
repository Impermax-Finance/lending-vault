const {
	makeLendingVaultHarness,
	makeBorrowable,
	makeBorrowableObjectHarness,
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
const SECONDS_IN_YEAR = new BN(31536000);


contract('BorrowableObject', function (accounts) {
	let root = accounts[0];
	let user = accounts[1];
	
	describe('borrowableObject Math', () => {
		let borrowableObject; 
		
		before(async () => {
			borrowableObject = await makeBorrowableObjectHarness();
		});
		
		[
			{
				input: {
					totalBorrows: 42,
					externalSupply: 30,
					ownedSupply: 20,
					kinkBorrowAPR: 0.1,
					kinkUtilizationRate: 0.75,
					reserveFactor: 0.1,
					kinkMultiplier: 2,
					desiredAPR: 0.05,
				},
				output: {
					totalSupply: 50,
					utilizationRate: 0.84,
					kinkAPR: .0675,
					supplyAPR: .102816,
				},
			},
			{
				input: {
					totalBorrows: 40,
					externalSupply: 30,
					ownedSupply: 50,
					kinkBorrowAPR: 1.2,
					kinkUtilizationRate: 0.8,
					reserveFactor: 0.2,
					kinkMultiplier: 2,
					desiredAPR: 0.149294,
				},
				output: {
					totalSupply: 80,
					utilizationRate: 0.5,
					kinkAPR: .768,
					supplyAPR: .3,
				},
			},
			{
				input: {
					totalBorrows: 204.7739,
					externalSupply: 221.497,
					ownedSupply: 0,
					kinkBorrowAPR: 0.01005,
					kinkUtilizationRate: 0.8,
					reserveFactor: 0.1,
					kinkMultiplier: 2,
					desiredAPR: 0.01,
				},
				output: {
					totalSupply: 221.497,
					utilizationRate: 0.9245,
					kinkAPR: .007236,
					supplyAPR: 0.013569,
				},
			},
			{
				input: {
					totalBorrows: 70,
					externalSupply: 30,
					ownedSupply: 50,
					kinkBorrowAPR: 1.2,
					kinkUtilizationRate: 0.8,
					reserveFactor: 0.2,
					kinkMultiplier: 5,
					desiredAPR: 1.2,
				},
				output: {
					totalSupply: 80,
					utilizationRate: 0.875,
					kinkAPR: .768,
					supplyAPR: 2.1,
				},
			},
			{
				input: {
					totalBorrows: 70,
					externalSupply: 30,
					ownedSupply: 50,
					kinkBorrowAPR: 1.2,
					kinkUtilizationRate: 0.8,
					reserveFactor: 0.2,
					kinkMultiplier: 5,
					desiredAPR: 0.2,
				},
				output: {
					totalSupply: 80,
					utilizationRate: 0.875,
					kinkAPR: .768,
					supplyAPR: 2.1,
				},
			},
		].forEach(scenario => {
			it('check scenario ' + JSON.stringify(scenario), async () => {
				a = 1
				b = 0.6
				c = 0.177
				
				const borrowableObjectData = {
					borrowableContract: address(0),
					exchangeRate: oneMantissa.toString(),
					totalBorrows: bnMantissa(scenario.input.totalBorrows).toString(),
					externalSupply: bnMantissa(scenario.input.externalSupply).toString(),
					initialOwnedSupply: bnMantissa(scenario.input.ownedSupply).toString(),
					ownedSupply: bnMantissa(scenario.input.ownedSupply).toString(),
					kinkBorrowRate: bnMantissa(scenario.input.kinkBorrowAPR).div(SECONDS_IN_YEAR).toString(),
					kinkUtilizationRate: bnMantissa(scenario.input.kinkUtilizationRate).toString(),
					reserveFactor: bnMantissa(scenario.input.reserveFactor).toString(),
					kinkMultiplier: (new BN(scenario.input.kinkMultiplier)).toString(),
					cachedSupplyRate: MAX_UINT_256.toString(),
				};
				const desiredRate = bnMantissa(scenario.input.desiredAPR).div(SECONDS_IN_YEAR).toString();
				const expectedTotalSupply = bnMantissa(scenario.output.totalSupply);
				const expectedUtilizationRate = bnMantissa(scenario.output.utilizationRate);
				const expectedKinkRate = bnMantissa(scenario.output.kinkAPR).div(SECONDS_IN_YEAR);
				const expectedSupplyRate = bnMantissa(scenario.output.supplyAPR).div(SECONDS_IN_YEAR);
								
				expectAlmostEqualMantissa(await borrowableObject.totalSupply(borrowableObjectData), expectedTotalSupply);
				expectAlmostEqualMantissa(await borrowableObject.utilizationRate(borrowableObjectData), expectedUtilizationRate);
				expectAlmostEqualMantissa(await borrowableObject.kinkRate(borrowableObjectData), expectedKinkRate);
				expectAlmostEqualMantissa(await borrowableObject.supplyRate(borrowableObjectData), expectedSupplyRate);
				
				const nextUtilizationRate = await borrowableObject.calculateUtilizationForRate(borrowableObjectData, desiredRate);
				const amount = await borrowableObject.calculateAmountForRate(borrowableObjectData, desiredRate);
				
				borrowableObjectData.ownedSupply = (new BN(borrowableObjectData.ownedSupply)).add(amount).toString();
				
				expectAlmostEqualMantissa(await borrowableObject.utilizationRate(borrowableObjectData), nextUtilizationRate);
				expectAlmostEqualMantissa(await borrowableObject.supplyRate(borrowableObjectData), desiredRate);
			});
		});
	});

	describe('allocate and deallocate', () => {
		let vault;
		let borrowable;
		let exchangeRate;
	
		const TOTAL_BORROWS_1 = bnMantissa(40);
		const EXTERNAL_SUPPLY_1 = bnMantissa(50);
		const INITIAL_KINK_RATE = bnMantissa(0.2 * 0.75 * 0.9).div(SECONDS_IN_YEAR);
		
		const INITIAL_OWNED_SUPPLY = bnMantissa(2);
		const UTILIZATION_RATE_1 = bnMantissa(0.76923);
		const SUPPLY_RATE_1 = bnMantissa(0.14913).div(SECONDS_IN_YEAR);
		
		const ADDITIONAL_ALLOCATE = bnMantissa(20);
		const UTILIZATION_RATE_2 = bnMantissa(0.55555);
		const SUPPLY_RATE_2 = bnMantissa(0.074074).div(SECONDS_IN_YEAR);
		
		const DEALLOCATE = bnMantissa(1);
		const UTILIZATION_RATE_3 = bnMantissa(0.78431);
		const SUPPLY_RATE_3 = bnMantissa(0.16055).div(SECONDS_IN_YEAR);
		
		const UTILIZATION_RATE_4 = bnMantissa(0.8);
		const SUPPLY_RATE_4 = bnMantissa(0.1728).div(SECONDS_IN_YEAR);
		
		const EXTERNAL_SUPPLY_5 = bnMantissa(38.5);
		const OWNED_SUPPLY_5 = bnMantissa(1.5);
		const UTILIZATION_RATE_5 = bnMantissa(1);
		const SUPPLY_RATE_5 = bnMantissa(0.36).div(SECONDS_IN_YEAR);

		before(async () => {
			vault = await makeLendingVaultHarness();
			borrowable = await makeBorrowable({token: vault.obj.token});
			{
				// Increase exchangeRate for testing in extreme scenario
				await borrowable.setAdjustSpeed(0);
				await borrowable.simulateBorrow(bnMantissa(1));
//				await borrowable.setBlockTimestamp(3600 * 24 * 5);
				await borrowable.setBlockTimestamp(3600 * 24 * 5000);
				exchangeRate = await borrowable.exchangeRate.call();
//				await borrowable.simulateRepay(bnMantissa(1.005479452057));
				await borrowable.simulateRepay(bnMantissa(6.479452057));
			}
			exchangeRate = await borrowable.exchangeRate.call();
			await vault.obj.token.mint(user, oneMantissa.mul(BN(1000)));
			await vault.obj.token.transfer(borrowable.address, EXTERNAL_SUPPLY_1, {from: user});
			await borrowable.mint(user);
			await borrowable.simulateBorrowBurningTokens(TOTAL_BORROWS_1);
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
				kinkRate,
				cachedSupplyRate
			} = await vault.getBorrowableInfo.call(borrowable.address);
			const totalBorrows = await borrowable.totalBorrows();
			expectAlmostEqualMantissa(externalSupply, EXTERNAL_SUPPLY_1);
			expectAlmostEqualMantissa(initialOwnedSupply, INITIAL_OWNED_SUPPLY);
			expectAlmostEqualMantissa(ownedSupply, INITIAL_OWNED_SUPPLY);
			expectAlmostEqualMantissa(totalSupply, ownedSupply.add(externalSupply));
			expectAlmostEqualMantissa(utilizationRate, UTILIZATION_RATE_1);
			expectAlmostEqualMantissa(kinkRate, INITIAL_KINK_RATE);
			expectAlmostEqualMantissa(cachedSupplyRate, SUPPLY_RATE_1);
		});
		
		it('test allocate', async () => {
			const {
				externalSupply,
				initialOwnedSupply,
				ownedSupply,
				totalSupply,
				utilizationRate,
				kinkRate,
				cachedSupplyRate
			} = await vault.testAllocate.call(borrowable.address, ADDITIONAL_ALLOCATE);;
			expectAlmostEqualMantissa(externalSupply, EXTERNAL_SUPPLY_1);
			expectAlmostEqualMantissa(initialOwnedSupply, INITIAL_OWNED_SUPPLY);
			expectAlmostEqualMantissa(ownedSupply, INITIAL_OWNED_SUPPLY.add(ADDITIONAL_ALLOCATE));
			expectAlmostEqualMantissa(totalSupply, ownedSupply.add(externalSupply));
			expectAlmostEqualMantissa(utilizationRate, UTILIZATION_RATE_2);
			expectAlmostEqualMantissa(cachedSupplyRate, SUPPLY_RATE_2);
		});
		
		it('test deallocate', async () => {
			const {
				externalSupply,
				initialOwnedSupply,
				ownedSupply,
				totalSupply,
				utilizationRate,
				kinkRate,
				cachedSupplyRate
			} = await vault.testDeallocate.call(borrowable.address, DEALLOCATE);;
			expectAlmostEqualMantissa(externalSupply, EXTERNAL_SUPPLY_1);
			expectAlmostEqualMantissa(initialOwnedSupply, INITIAL_OWNED_SUPPLY);
			expectAlmostEqualMantissa(ownedSupply, INITIAL_OWNED_SUPPLY.sub(DEALLOCATE));
			expectAlmostEqualMantissa(totalSupply, ownedSupply.add(externalSupply));
			expectAlmostEqualMantissa(utilizationRate, UTILIZATION_RATE_3);
			expectAlmostEqualMantissa(cachedSupplyRate, SUPPLY_RATE_3);
		});
		
		it('test deallocateMax 1', async () => {
			const {
				externalSupply,
				initialOwnedSupply,
				ownedSupply,
				totalSupply,
				utilizationRate,
				kinkRate,
				cachedSupplyRate
			} = await vault.testDeallocateMax.call(borrowable.address);;
			expectAlmostEqualMantissa(externalSupply, EXTERNAL_SUPPLY_1);
			expectAlmostEqualMantissa(initialOwnedSupply, INITIAL_OWNED_SUPPLY);
			expectAlmostEqualMantissa(ownedSupply, bnMantissa(0));
			expectAlmostEqualMantissa(totalSupply, externalSupply);
			expectAlmostEqualMantissa(utilizationRate, UTILIZATION_RATE_4);
			expectAlmostEqualMantissa(cachedSupplyRate, SUPPLY_RATE_4);
		});
		
		it('test deallocateMax 2 (withdraw all available liquidity)', async () => {
			const withdrawTokens = EXTERNAL_SUPPLY_1.sub(EXTERNAL_SUPPLY_5).mul(oneMantissa).div(exchangeRate);
			await borrowable.transfer(borrowable.address, withdrawTokens, {from: user});
			await borrowable.redeem(user);
			const {
				externalSupply,
				initialOwnedSupply,
				ownedSupply,
				totalSupply,
				utilizationRate,
				kinkRate,
				cachedSupplyRate
			} = await vault.testDeallocateMax.call(borrowable.address);;
			expectAlmostEqualMantissa(externalSupply, EXTERNAL_SUPPLY_5);
			expectAlmostEqualMantissa(initialOwnedSupply, INITIAL_OWNED_SUPPLY);
			expectAlmostEqualMantissa(ownedSupply, OWNED_SUPPLY_5);
			expectAlmostEqualMantissa(totalSupply, ownedSupply.add(externalSupply));
			expectAlmostEqualMantissa(utilizationRate, UTILIZATION_RATE_5);
			expectAlmostEqualMantissa(cachedSupplyRate, SUPPLY_RATE_5);
		});
		
		it('test deallocate revert', async () => {
			await expectRevert(
				vault.testDeallocate.call(borrowable.address, DEALLOCATE), 
				"ERROR: DEALLOCATE AMOUNT > AVAILABLE LIQUIDITY"
			);		
		});
		
	});
	
});