pragma solidity =0.5.16;
pragma experimental ABIEncoderV2;

import "./SafeMath.sol";
import "./Math.sol";
import "../interfaces/IBorrowable.sol";

// TODO: IN GENERALE DEVO CONTROLLARE TUTTA LA MATEMATIC PER CONVERSIONE TOKEN AMOUNT E IN GENERALE CHECKARE CHE NON CI SIANO ERRORI CHE POSSANO SALTARE FUORI IN CASISTICHE PARTICOLARI (PER QUANTO RIGUARDA ALGORITMO REALLOCATE)

library BorrowableObject {
	using SafeMath for uint;
	using BorrowableObject for Borrowable;

	struct Borrowable {
		IBorrowable borrowableContract;
		uint exchangeRate;
		uint totalBorrows;       // in underlyings
		uint externalSupply;     // in underlyings
		uint initialOwnedSupply; // in underlyings
		uint ownedSupply;        // in underlyings
		uint kinkBorrowRate;
		uint kinkUtilizationRate;
		uint reserveFactor;
		uint kinkMultiplier;
		uint cachedSupplyRate;
	}

	function newBorrowable(IBorrowable borrowableContract, address lendingVault) internal returns (Borrowable memory borrowable) {
		borrowableContract.sync();
		uint exchangeRate = borrowableContract.exchangeRate();
		uint totalSupplyInTokens = borrowableContract.totalSupply();
		uint ownedSupplyInTokens = borrowableContract.balanceOf(lendingVault);
		uint externalSupplyInTokens = totalSupplyInTokens.sub(ownedSupplyInTokens);
		borrowable = Borrowable({
			borrowableContract: borrowableContract,
			exchangeRate: exchangeRate,
			totalBorrows: borrowableContract.totalBorrows(),
			externalSupply: externalSupplyInTokens.mul(exchangeRate).div(1e18),
			initialOwnedSupply: ownedSupplyInTokens.mul(exchangeRate).div(1e18),
			ownedSupply: ownedSupplyInTokens.mul(exchangeRate).div(1e18),
			kinkBorrowRate: borrowableContract.kinkBorrowRate(),
			kinkUtilizationRate: borrowableContract.kinkUtilizationRate(),
			reserveFactor: borrowableContract.reserveFactor(),
			kinkMultiplier: borrowableContract.KINK_MULTIPLIER(),
			cachedSupplyRate: 0
		});
		borrowable.cachedSupplyRate = supplyRate(borrowable);
		return borrowable;
	}

	function totalSupply(Borrowable memory borrowable) internal pure returns (uint) {
		return borrowable.externalSupply.add(borrowable.ownedSupply);
	}

	function utilizationRate(Borrowable memory borrowable) internal pure returns (uint) {
		uint _totalSupply = totalSupply(borrowable);
		if (_totalSupply == 0) return 0;
		return borrowable.totalBorrows.mul(1e18).div(_totalSupply);
	}

	function kinkRate(Borrowable memory borrowable) internal pure returns (uint) {
		return borrowable.kinkUtilizationRate
			.mul(borrowable.kinkBorrowRate).div(1e18)
			.mul(uint(1e18).sub(borrowable.reserveFactor)).div(1e18);
	}

	function supplyRate(Borrowable memory borrowable) internal pure returns (uint rate) {
		uint utilizationRate_ = utilizationRate(borrowable);
		if (utilizationRate_ < borrowable.kinkUtilizationRate) {
			uint ratio = utilizationRate_.mul(1e18).div(borrowable.kinkUtilizationRate);
			rate = ratio.mul(ratio).div(1e18).mul(kinkRate(borrowable)).div(1e18);
		} else {
			rate = utilizationRate_.sub(borrowable.kinkUtilizationRate)
				.mul(1e18).div(uint(1e18).sub(borrowable.kinkUtilizationRate))
				.mul(borrowable.kinkMultiplier.sub(1))
				.add(1e18)
				.mul(kinkRate(borrowable)).div(1e18);
		}
	}

	function allocate(Borrowable memory borrowable, uint amount) internal pure returns (Borrowable memory) {
		borrowable.ownedSupply = borrowable.ownedSupply.add(amount);
		borrowable.cachedSupplyRate = supplyRate(borrowable);
		return borrowable;
	}

	function deallocate(Borrowable memory borrowable, uint amount) internal pure returns (Borrowable memory) {
		borrowable.ownedSupply = borrowable.ownedSupply.sub(amount);
		borrowable.cachedSupplyRate = supplyRate(borrowable);
		return borrowable;
	}

	function deallocateMax(Borrowable memory borrowable) internal pure returns (Borrowable memory, uint) {
		uint amount = borrowable.externalSupply >= borrowable.totalBorrows
			? borrowable.ownedSupply
			: totalSupply(borrowable).sub(borrowable.totalBorrows); // TODO CAPIRE COSA SUCCEDE ESATTAMENTE IN QUESTO CALCOLO
		return (deallocate(borrowable, amount), amount);
	}

	function calculateAmountForRate(Borrowable memory borrowable, uint rate) internal pure returns (uint) {
		require(rate > 0, "ERROR: rate = 0");
		require(rate <= borrowable.cachedSupplyRate, "ERROR: TARGET rate > CACHED rate");
		uint targetUtilizationRate;
		if (rate <= kinkRate(borrowable)) {
			targetUtilizationRate = Math.sqrt(
				rate.mul(1e18).div(kinkRate(borrowable)).mul(1e18)
			).mul(borrowable.kinkUtilizationRate).div(1e18);
		} else {
			uint tmp = rate.mul(1e18).div(kinkRate(borrowable))
				.sub(1e18)
				.mul(uint(1e18).sub(borrowable.kinkUtilizationRate)).div(1e18);
			targetUtilizationRate = tmp
				.div(borrowable.kinkMultiplier.sub(1))
				.add(borrowable.kinkUtilizationRate);
		}
		require(targetUtilizationRate <= utilizationRate(borrowable), "ERROR: TARGET UTILIZATION > CURRENT UTILIZATION");
		uint targetSupply = borrowable.totalBorrows.mul(1e18).div(targetUtilizationRate);
		return targetSupply.sub(totalSupply(borrowable), "ERROR: TARGET SUPPLY > TOTAL SUPPLY");
	}

	function compare(Borrowable memory borrowableA, Borrowable memory borrowableB) internal pure returns (bool) {
		return borrowableA.cachedSupplyRate > borrowableB.cachedSupplyRate;
	}
}